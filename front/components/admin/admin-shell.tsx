"use client";

import { useEffect, useMemo, useState } from "react";
import { Resolver, useForm, UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";

import { SideNav } from "@/components/dashboard/side-nav";
import { TopBar } from "@/components/dashboard/top-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, ShieldCheck, Sparkles, Trash2 } from "lucide-react";

import {
  useAssignSubscription,
  useCreateOrganization,
  useCreatePlan,
  useDeletePlan,
  useOrganizationSummary,
  useOrganizations,
  usePlans,
  useUpdateOrganization,
  useUpdateBranding,
  useUpdatePlan,
  useUpsertQuota,
} from "@/hooks/use-admin";
import type {
  Branding,
  Organization,
  OrganizationSummary,
  Plan,
  QuotaInput,
  QuotaUsage,
  Tenant,
} from "@/lib/admin-types";

const tabs = [
  { value: "overview", label: "Resumo" },
  { value: "plans", label: "Planos" },
  { value: "branding", label: "Branding" },
  { value: "quotas", label: "Quotas" },
  { value: "invoices", label: "Faturas" },
];

const planSchema = z.object({
  key: z.string().min(1, "Informe uma chave"),
  name: z.string().min(1, "Informe um nome"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Informe um valor"),
  currency: z.string().min(1),
  billing_period: z.string().min(1),
  features: z.string().optional(),
  limits: z.string().optional(),
  is_active: z.boolean().default(true),
});

const subscriptionSchema = z.object({
  plan_id: z.string().uuid({ message: "Selecione um plano" }),
  status: z.string().min(1),
  current_period_start: z.string().min(1),
  current_period_end: z.string().min(1),
  trial_ends_at: z.string().optional(),
  external_reference: z.string().optional(),
});

const brandingSchema = z.object({
  primary_color: z.string().optional(),
  secondary_color: z.string().optional(),
  accent_color: z.string().optional(),
  logo_url: z.string().optional(),
  favicon_url: z.string().optional(),
  custom_domain: z.string().optional(),
  login_message: z.string().optional(),
});

const quotaSchema = z.object({
  tenant_id: z.string().uuid({ message: "Selecione um tenant" }),
  metric: z.string().min(1, "Informe a métrica"),
  period_start: z.string().min(1),
  period_end: z.string().min(1),
  limit_value: z.union([z.coerce.number(), z.string().length(0)]).transform((value) => {
    if (typeof value === "number") return value;
    return value ? Number(value) : null;
  }),
  used_value: z.coerce.number().min(0),
});

const organizationSchema = z.object({
  name: z.string().min(1, "Informe o nome da organização"),
  slug: z.string().optional(),
  plan: z.string().min(1, "Selecione um plano base"),
  locale: z.string().min(1, "Informe o locale"),
  timezone: z.string().min(1, "Informe o fuso horário"),
  max_users: z.string().optional(),
  max_projects: z.string().optional(),
  max_storage_mb: z.string().optional(),
  settings: z.string().optional(),
});

type PlanFormValues = z.infer<typeof planSchema>;
type SubscriptionFormValues = z.infer<typeof subscriptionSchema>;
type BrandingFormValues = z.infer<typeof brandingSchema>;
type QuotaFormValues = z.infer<typeof quotaSchema>;
type OrganizationFormValues = z.infer<typeof organizationSchema>;

const planResolver = zodResolver(planSchema) as unknown as Resolver<PlanFormValues>;
const subscriptionResolver = zodResolver(subscriptionSchema) as unknown as Resolver<SubscriptionFormValues>;
const brandingResolver = zodResolver(brandingSchema) as unknown as Resolver<BrandingFormValues>;
const quotaResolver = zodResolver(quotaSchema) as unknown as Resolver<QuotaFormValues>;
const organizationResolver = zodResolver(organizationSchema) as unknown as Resolver<OrganizationFormValues>;

function formatCurrency(amountCents: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountCents / 100);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return format(new Date(value), "dd/MM/yyyy");
  } catch {
    return value;
  }
}

function toInputValue(value: string | null | undefined) {
  if (!value) return "";
  try {
    return new Date(value).toISOString().split("T")[0];
  } catch {
    return value;
  }
}

function organizationToFormValues(organization?: Organization | null): OrganizationFormValues {
  return {
    name: organization?.name ?? "",
    slug: organization?.slug ?? "",
    plan: organization?.plan ?? "free",
    locale: organization?.locale ?? "pt-BR",
    timezone: organization?.timezone ?? "America/Sao_Paulo",
    max_users: organization?.max_users !== null && organization?.max_users !== undefined ? String(organization.max_users) : "",
    max_projects:
      organization?.max_projects !== null && organization?.max_projects !== undefined
        ? String(organization.max_projects)
        : "",
    max_storage_mb:
      organization?.max_storage_mb !== null && organization?.max_storage_mb !== undefined
        ? String(organization.max_storage_mb)
        : "",
    settings:
      organization?.settings && Object.keys(organization.settings).length > 0
        ? JSON.stringify(organization.settings, null, 2)
        : "",
  };
}

export function AdminShell() {
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const [isEditOrgOpen, setIsEditOrgOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const organizationsQuery = useOrganizations();
  const plansQuery = usePlans();

  const createOrganization = useCreateOrganization();
  const updateOrganization = useUpdateOrganization();
  const createOrgForm = useForm<OrganizationFormValues>({
    resolver: organizationResolver,
    defaultValues: organizationToFormValues(),
  });
  const editOrgForm = useForm<OrganizationFormValues>({
    resolver: organizationResolver,
    defaultValues: organizationToFormValues(),
  });

  useEffect(() => {
    if (!activeOrgId && organizationsQuery.data && organizationsQuery.data.length > 0) {
      setActiveOrgId(organizationsQuery.data[0].id);
    }
  }, [activeOrgId, organizationsQuery.data]);

  const hasOrganizations = (organizationsQuery.data?.length ?? 0) > 0;
  const organizationId = activeOrgId ?? organizationsQuery.data?.[0]?.id ?? null;

  const selectedOrganization = useMemo(() => {
    return organizationsQuery.data?.find((org) => org.id === organizationId) ?? null;
  }, [organizationId, organizationsQuery.data]);

  const summaryQuery = useOrganizationSummary(organizationId ?? undefined);
  const assignSubscription = useAssignSubscription(organizationId ?? undefined);
  const updateBranding = useUpdateBranding(organizationId ?? undefined);
  const upsertQuota = useUpsertQuota(organizationId ?? undefined);
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();

  const isLoading =
    organizationsQuery.isLoading ||
    plansQuery.isLoading ||
    (organizationId !== null && summaryQuery.isLoading);

  const handleError = (error: unknown, fallback = "Operação não concluída") => {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
        ? error
        : fallback;
    setFeedback({ type: "error", message });
  };

  const handleSuccess = (message: string) => setFeedback({ type: "success", message });

  const openCreateDialog = () => {
    createOrgForm.reset(organizationToFormValues());
    createOrgForm.clearErrors();
    setIsCreateOrgOpen(true);
  };

  const openEditDialog = () => {
    if (!selectedOrganization) return;
    editOrgForm.reset(organizationToFormValues(selectedOrganization));
    editOrgForm.clearErrors();
    setIsEditOrgOpen(true);
  };

  const handleOrganizationSubmit = async (
    values: OrganizationFormValues,
    formInstance: UseFormReturn<OrganizationFormValues>,
    targetOrgId?: string,
  ) => {
    formInstance.clearErrors();

    let hasInvalidNumber = false;
    const parseIntegerField = (field: "max_users" | "max_projects" | "max_storage_mb") => {
      const rawValue = values[field];
      if (!rawValue) return null;
      const parsed = Number(rawValue);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
        formInstance.setError(field, { type: "manual", message: "Informe um número inteiro válido" });
        hasInvalidNumber = true;
        return null;
      }
      return parsed;
    };

    const maxUsers = parseIntegerField("max_users");
    const maxProjects = parseIntegerField("max_projects");
    const maxStorage = parseIntegerField("max_storage_mb");

    if (hasInvalidNumber) {
      return;
    }

    let settingsPayload: Record<string, unknown> | undefined;
    if (values.settings && values.settings.trim().length > 0) {
      try {
        settingsPayload = JSON.parse(values.settings);
      } catch {
        formInstance.setError("settings", { type: "manual", message: "JSON inválido" });
        return;
      }
    }

    const payload = {
      name: values.name.trim(),
      slug: values.slug?.trim() ? values.slug.trim() : undefined,
      plan: values.plan,
      locale: values.locale,
      timezone: values.timezone,
      max_users: maxUsers,
      max_projects: maxProjects,
      max_storage_mb: maxStorage,
      settings: settingsPayload,
    };

    try {
      if (targetOrgId) {
        await updateOrganization.mutateAsync({ organizationId: targetOrgId, payload });
        handleSuccess("Organização atualizada");
        setIsEditOrgOpen(false);
        formInstance.reset(
          selectedOrganization
            ? organizationToFormValues(selectedOrganization)
            : organizationToFormValues(),
        );
      } else {
        const organization = await createOrganization.mutateAsync(payload);
        handleSuccess("Organização criada");
        setActiveOrgId(organization.id);
        setIsCreateOrgOpen(false);
        formInstance.reset(organizationToFormValues());
      }
    } catch (error) {
      handleError(
        error,
        targetOrgId ? "Não foi possível atualizar a organização" : "Não foi possível criar a organização",
      );
    }
  };

  return (
    <section className="flex min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-950/95 to-slate-900 text-slate-100">
      <SideNav />
      <div className="flex flex-1 flex-col overflow-hidden px-8 pb-8 pt-6">
        <TopBar />

        <Dialog
          open={isCreateOrgOpen}
          onOpenChange={(open) => {
            setIsCreateOrgOpen(open);
            if (!open) {
              createOrgForm.reset(organizationToFormValues());
              createOrgForm.clearErrors();
            }
          }}
        >
          <DialogContent className="max-w-2xl border-white/10 bg-slate-950 text-slate-100">
            <DialogHeader>
              <DialogTitle>Cadastrar organização</DialogTitle>
            </DialogHeader>
            <OrganizationForm
              form={createOrgForm}
              onSubmit={(values, formInstance) => handleOrganizationSubmit(values, formInstance)}
              isSubmitting={createOrganization.isPending}
              submitLabel="Cadastrar"
            />
          </DialogContent>
        </Dialog>

        <Dialog
          open={isEditOrgOpen}
          onOpenChange={(open) => {
            setIsEditOrgOpen(open);
            if (open) {
              if (selectedOrganization) {
                editOrgForm.reset(organizationToFormValues(selectedOrganization));
              }
            } else {
              editOrgForm.reset(
                selectedOrganization ? organizationToFormValues(selectedOrganization) : organizationToFormValues(),
              );
              editOrgForm.clearErrors();
            }
          }}
        >
          <DialogContent className="max-w-2xl border-white/10 bg-slate-950 text-slate-100">
            <DialogHeader>
              <DialogTitle>Editar organização</DialogTitle>
            </DialogHeader>
            <OrganizationForm
              form={editOrgForm}
              onSubmit={(values, formInstance) =>
                selectedOrganization
                  ? handleOrganizationSubmit(values, formInstance, selectedOrganization.id)
                  : Promise.resolve()
              }
              isSubmitting={updateOrganization.isPending}
              submitLabel="Salvar alterações"
            />
          </DialogContent>
        </Dialog>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Administração</p>
            <h1 className="text-2xl font-semibold text-white">Controle enterprise</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="organization" className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Organização
            </label>
            <select
              id="organization"
              value={organizationId ?? ""}
              onChange={(event) => setActiveOrgId(event.target.value || null)}
              disabled={!hasOrganizations}
              className="h-10 rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 disabled:cursor-not-allowed disabled:text-slate-500"
            >
              {(organizationsQuery.data ?? []).map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
              {!hasOrganizations && <option value="">Nenhuma organização</option>}
            </select>
            <Button
              variant="outline"
              className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
              onClick={openCreateDialog}
              disabled={createOrganization.isPending}
            >
              Nova organização
            </Button>
            <Button
              variant="outline"
              className="border-white/10 bg-white/5 text-slate-200 hover:border-emerald-400/60 hover:bg-emerald-400/10"
              onClick={openEditDialog}
              disabled={!selectedOrganization || updateOrganization.isPending}
            >
              Editar detalhes
            </Button>
          </div>
        </div>

        {feedback && (
          <div
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              feedback.type === "success"
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-100"
                : "border-rose-500/50 bg-rose-500/10 text-rose-100"
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div className="mt-6 flex-1 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6">
          {!hasOrganizations ? (
            <EmptyState onCreate={openCreateDialog} isBusy={createOrganization.isPending} />
          ) : isLoading || !organizationId || !summaryQuery.data || !plansQuery.data ? (
            <LoadingState />
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <TabsList>
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="overview" className="mt-6 h-full">
                <OverviewTab
                  organization={selectedOrganization}
                  summary={summaryQuery.data}
                  onAssign={async (values) => {
                    try {
                      await assignSubscription.mutateAsync(values);
                      handleSuccess("Assinatura atualizada");
                    } catch (error) {
                      handleError(error, "Não foi possível atualizar a assinatura");
                    }
                  }}
                  plans={plansQuery.data}
                  isSubmitting={assignSubscription.isPending}
                />
              </TabsContent>
              <TabsContent value="plans" className="mt-6 h-full">
          <PlanManager
                  plans={plansQuery.data}
                  onCreate={async (payload) => {
                    try {
                      await createPlan.mutateAsync(payload);
                      handleSuccess("Plano criado com sucesso");
                    } catch (error) {
                      handleError(error, "Não foi possível criar o plano");
                    }
                  }}
                  onUpdate={async (planId, payload) => {
                    try {
                      await updatePlan.mutateAsync({ planId, payload });
                      handleSuccess("Plano atualizado");
                    } catch (error) {
                      handleError(error, "Não foi possível atualizar o plano");
                    }
                  }}
                  onDelete={async (planId) => {
                    try {
                      await deletePlan.mutateAsync(planId);
                      handleSuccess("Plano removido");
                    } catch (error) {
                      handleError(error, "Não foi possível remover o plano");
                    }
                  }}
                  isSubmitting={createPlan.isPending || updatePlan.isPending || deletePlan.isPending}
                />
              </TabsContent>
              <TabsContent value="branding" className="mt-6 h-full">
              <BrandingTab
                  branding={summaryQuery.data.branding}
                  onSubmit={async (values) => {
                    try {
                      await updateBranding.mutateAsync({
                        primary_color: values.primary_color || null,
                        secondary_color: values.secondary_color || null,
                        accent_color: values.accent_color || null,
                        logo_url: values.logo_url || null,
                        favicon_url: values.favicon_url || null,
                        custom_domain: values.custom_domain || null,
                        login_message: values.login_message || null,
                      });
                      handleSuccess("Branding atualizado");
                    } catch (error) {
                      handleError(error, "Não foi possível atualizar o branding");
                    }
                  }}
                  isSubmitting={updateBranding.isPending}
                />
              </TabsContent>
              <TabsContent value="quotas" className="mt-6 h-full">
                <QuotaTab
                  quotas={summaryQuery.data.quotas}
                  tenants={summaryQuery.data.tenants}
                  onSubmit={async (tenantId, values) => {
                    try {
                      await upsertQuota.mutateAsync({ tenantId, payload: values });
                      handleSuccess("Quota registrada");
                    } catch (error) {
                      handleError(error, "Não foi possível registrar a quota");
                    }
                  }}
                  isSubmitting={upsertQuota.isPending}
                />
              </TabsContent>
              <TabsContent value="invoices" className="mt-6 h-full">
                <InvoicesTab invoices={summaryQuery.data.invoices} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-[320px] w-full" />
      <Skeleton className="h-[240px] w-full" />
    </div>
  );
}

function EmptyState({ onCreate, isBusy }: { onCreate: () => void; isBusy: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center text-slate-300">
      <p className="text-lg font-semibold text-white">Nenhuma organização encontrada</p>
      <p className="mt-2 max-w-sm text-sm text-slate-400">
        Cadastre a primeira organização para liberar o controle de planos, quotas e branding.
      </p>
      <Button
        className="mt-6 border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
        variant="outline"
        onClick={onCreate}
        disabled={isBusy}
      >
        {isBusy ? "Criando..." : "Cadastrar organização"}
      </Button>
    </div>
  );
}

function OverviewTab({
  organization,
  summary,
  plans,
  onAssign,
  isSubmitting,
}: {
  organization: Organization | null;
  summary: OrganizationSummary;
  plans: Plan[];
  onAssign: (values: SubscriptionFormValues) => Promise<void>;
  isSubmitting: boolean;
}) {
  const form = useForm<SubscriptionFormValues>({
    resolver: subscriptionResolver,
    defaultValues: {
      plan_id: summary.subscription?.plan_id ?? summary.plan?.id ?? "",
      status: summary.subscription?.status ?? "active",
      current_period_start: toInputValue(summary.subscription?.current_period_start ?? new Date().toISOString()),
      current_period_end: toInputValue(summary.subscription?.current_period_end ?? new Date().toISOString()),
      trial_ends_at: summary.subscription?.trial_ends_at ? toInputValue(summary.subscription.trial_ends_at) : undefined,
      external_reference: summary.subscription?.external_reference ?? undefined,
    },
  });

  const activePlanName = summary.subscription?.plan?.name ?? summary.plan?.name ?? "Sem plano atribuído";
  const nextInvoiceAmount = summary.invoices.find((invoice) => invoice.status !== "Pago");
  const quotaAlerts = useMemo(
    () =>
      summary.quotas
        .map((quota) => ({
          quota,
          ratio: quota.limit_value ? quota.used_value / quota.limit_value : null,
        }))
        .filter((item) => item.ratio !== null && item.ratio >= 0.8),
    [summary.quotas],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-white/10 bg-white/5">
          <CardHeader className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Plano atual</CardTitle>
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
            </div>
            <CardDescription className="text-slate-300">
              Plano aplicado para {organization?.name ?? "a organização selecionada"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-lg font-semibold text-white">{activePlanName}</p>
            <p className="text-sm text-slate-300/80">Status: {summary.subscription?.status ?? "Sem assinatura"}</p>
            {summary.subscription && (
              <p className="text-xs text-slate-400">
                Vigência: {formatDate(summary.subscription.current_period_start)} - {formatDate(summary.subscription.current_period_end)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Quotas registradas</CardTitle>
              <Sparkles className="h-5 w-5 text-cyan-300" />
            </div>
            <CardDescription className="text-slate-300">
              {summary.quotas.length > 0
                ? `${summary.quotas.length} quotas monitoradas`
                : "Nenhuma quota registrada"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            {summary.quotas.slice(0, 3).map((quota) => {
              const ratio = quota.limit_value ? quota.used_value / quota.limit_value : null;
              const nearLimit = ratio !== null && ratio >= 0.8;
              return (
                <div key={quota.id} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    {nearLimit && <AlertTriangle className="h-4 w-4 text-amber-300" />}
                    {quota.metric}
                  </span>
                  <span className="text-emerald-100">
                    {quota.used_value}
                    {quota.limit_value ? ` / ${quota.limit_value}` : ""}
                  </span>
                </div>
              );
            })}
            {summary.quotas.length > 3 && (
              <p className="text-xs text-slate-400">...
                mais {summary.quotas.length - 3}
              </p>
            )}
            {quotaAlerts.length > 0 && (
              <p className="text-xs text-amber-200">
                {quotaAlerts.length} quota(s) acima de 80% do limite.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Próxima fatura</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-emerald-300" />
            </div>
            <CardDescription className="text-slate-300">
              {nextInvoiceAmount
                ? `Vencimento em ${formatDate(nextInvoiceAmount.due_at)}`
                : "Nenhuma fatura em aberto"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-white">
              {nextInvoiceAmount
                ? formatCurrency(nextInvoiceAmount.amount_cents, nextInvoiceAmount.currency)
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-white">Atualizar assinatura</CardTitle>
          <CardDescription className="text-slate-300">
            Altere o plano e o período ativo da organização selecionada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={form.handleSubmit(async (values) => {
              await onAssign({
                plan_id: values.plan_id,
                status: values.status,
                current_period_start: new Date(values.current_period_start).toISOString(),
                current_period_end: new Date(values.current_period_end).toISOString(),
                trial_ends_at: values.trial_ends_at ? new Date(values.trial_ends_at).toISOString() : undefined,
                external_reference: values.external_reference || undefined,
              });
            })}
          >
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Plano</label>
              <select
                className="h-10 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                {...form.register("plan_id")}
              >
                <option value="">Selecione</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.plan_id && (
                <p className="text-xs text-rose-300">{form.formState.errors.plan_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Status</label>
              <select
                className="h-10 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                {...form.register("status")}
              >
                <option value="active">Ativo</option>
                <option value="trialing">Trial</option>
                <option value="past_due">Pagamento pendente</option>
                <option value="canceled">Cancelado</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Início</label>
              <Input type="date" {...form.register("current_period_start")} />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Fim</label>
              <Input type="date" {...form.register("current_period_end")} />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Trial até</label>
              <Input type="date" {...form.register("trial_ends_at")} />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Referência externa</label>
              <Input placeholder="ID da fatura no gateway" {...form.register("external_reference")} />
            </div>

            <div className="md:col-span-2 flex items-center justify-end gap-3">
              <Button type="submit" className="rounded-full bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function OrganizationForm({
  form,
  onSubmit,
  isSubmitting,
  submitLabel = "Salvar",
}: {
  form: UseFormReturn<OrganizationFormValues>;
  onSubmit: (values: OrganizationFormValues, form: UseFormReturn<OrganizationFormValues>) => Promise<void>;
  isSubmitting: boolean;
  submitLabel?: string;
}) {
  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(values, form);
      })}
    >
      <div className="grid gap-2 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Nome</label>
          <Input placeholder="Aurora" {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="text-xs text-rose-300">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Slug</label>
          <Input placeholder="aurora" {...form.register("slug")} />
          {form.formState.errors.slug && (
            <p className="text-xs text-rose-300">{form.formState.errors.slug.message}</p>
          )}
          <p className="text-xs text-slate-500">Deixe em branco para gerar automaticamente.</p>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Plano base</label>
          <select
            className="h-10 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            {...form.register("plan")}
          >
            <option value="free">free</option>
            <option value="pro">pro</option>
            <option value="enterprise">enterprise</option>
          </select>
          {form.formState.errors.plan && (
            <p className="text-xs text-rose-300">{form.formState.errors.plan.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Locale</label>
          <Input placeholder="pt-BR" {...form.register("locale")} />
          {form.formState.errors.locale && (
            <p className="text-xs text-rose-300">{form.formState.errors.locale.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Timezone</label>
          <Input placeholder="America/Sao_Paulo" {...form.register("timezone")} />
          {form.formState.errors.timezone && (
            <p className="text-xs text-rose-300">{form.formState.errors.timezone.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Máx. usuários</label>
          <Input type="number" min={0} placeholder="100" {...form.register("max_users")} />
          {form.formState.errors.max_users && (
            <p className="text-xs text-rose-300">{form.formState.errors.max_users.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Máx. projetos</label>
          <Input type="number" min={0} placeholder="25" {...form.register("max_projects")} />
          {form.formState.errors.max_projects && (
            <p className="text-xs text-rose-300">{form.formState.errors.max_projects.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Armazenamento (MB)</label>
          <Input type="number" min={0} placeholder="1024" {...form.register("max_storage_mb")} />
          {form.formState.errors.max_storage_mb && (
            <p className="text-xs text-rose-300">{form.formState.errors.max_storage_mb.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Configurações (JSON)</label>
        <Textarea rows={4} placeholder="{\n  &quot;beta_features&quot;: true\n}" {...form.register("settings")} />
        {form.formState.errors.settings && (
          <p className="text-xs text-rose-300">{form.formState.errors.settings.message}</p>
        )}
        <p className="text-xs text-slate-500">Deixe em branco para manter as configurações padrão.</p>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
          variant="outline"
        >
          {isSubmitting ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function PlanManager({
  plans,
  onCreate,
  onUpdate,
  onDelete,
  isSubmitting,
}: {
  plans: Plan[];
  onCreate: (payload: ReturnType<typeof mapPlanValuesToPayload>) => Promise<void>;
  onUpdate: (planId: string, payload: UpdatePlanPayload) => Promise<void>;
  onDelete: (planId: string) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const createForm = useForm<PlanFormValues>({
    resolver: planResolver,
    defaultValues: {
      key: "",
      name: "",
      description: "",
      price: 0,
      currency: "BRL",
      billing_period: "monthly",
      features: "{}",
      limits: "{}",
      is_active: true,
    },
  });

  const editForm = useForm<PlanFormValues>({
    resolver: planResolver,
  });

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    editForm.reset({
      key: plan.key,
      name: plan.name,
      description: plan.description ?? "",
      price: plan.price_cents / 100,
      currency: plan.currency,
      billing_period: plan.billing_period,
      features: JSON.stringify(plan.features ?? {}, null, 2),
      limits: JSON.stringify(plan.limits ?? {}, null, 2),
      is_active: plan.is_active,
    });
    setIsEditOpen(true);
  };

  const submitPlan = async (
    values: PlanFormValues,
    planId?: string,
    reset?: () => void,
  ) => {
    const payload = mapPlanValuesToPayload(values);

    if (planId) {
      const { key: _unusedKey, ...rest } = payload;
      void _unusedKey;
      await onUpdate(planId, rest as UpdatePlanPayload);
    } else {
      await onCreate(payload);
    }
    reset?.();
    setIsCreateOpen(false);
    setIsEditOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Catálogo de planos</h2>
          <p className="text-sm text-slate-300">Gerencie os planos disponíveis para assinatura.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30">
              Novo plano
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl border-white/10 bg-slate-950 text-slate-100">
            <DialogHeader>
              <DialogTitle>Criar plano</DialogTitle>
            </DialogHeader>
            <PlanForm
              form={createForm}
              onSubmit={(values) => submitPlan(values, undefined, () => createForm.reset())}
              isSubmitting={isSubmitting}
            />
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="max-h-[560px]">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10">
              <TableHead className="text-slate-300">Nome</TableHead>
              <TableHead className="text-slate-300">Preço</TableHead>
              <TableHead className="text-slate-300">Ciclo</TableHead>
              <TableHead className="text-slate-300">Ativo</TableHead>
              <TableHead className="text-right text-slate-300">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id} className="border-white/5">
                <TableCell className="font-semibold text-white">{plan.name}</TableCell>
                <TableCell className="text-slate-200">{formatCurrency(plan.price_cents, plan.currency)}</TableCell>
                <TableCell className="text-slate-300">{plan.billing_period}</TableCell>
                <TableCell className="text-slate-300">{plan.is_active ? "Sim" : "Não"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/10 bg-white/5 text-slate-200 hover:border-emerald-400/60 hover:bg-emerald-400/10"
                      onClick={() => openEdit(plan)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/10 bg-rose-500/10 text-rose-100 hover:border-rose-400/60 hover:bg-rose-400/20"
                      disabled={isSubmitting}
                      onClick={async () => {
                        if (confirm(`Remover o plano ${plan.name}?`)) {
                          await onDelete(plan.id);
                        }
                      }}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Remover
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl border-white/10 bg-slate-950 text-slate-100">
          <DialogHeader>
            <DialogTitle>Editar plano</DialogTitle>
          </DialogHeader>
          <PlanForm
            form={editForm}
            onSubmit={(values) =>
              editingPlan ? submitPlan(values, editingPlan.id, () => setEditingPlan(null)) : Promise.resolve()
            }
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlanForm({
  form,
  onSubmit,
  isSubmitting,
}: {
  form: UseFormReturn<PlanFormValues>;
  onSubmit: (values: PlanFormValues) => Promise<void>;
  isSubmitting: boolean;
}) {
  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(values);
      })}
    >
      <div className="grid gap-2 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Chave</label>
          <Input {...form.register("key")} />
          {form.formState.errors.key && (
            <p className="text-xs text-rose-300">{form.formState.errors.key.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Nome</label>
          <Input {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="text-xs text-rose-300">{form.formState.errors.name.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Preço (R$)</label>
          <Input type="number" step="0.01" min={0} {...form.register("price")} />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Moeda</label>
          <Input {...form.register("currency")} />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Ciclo</label>
          <Input placeholder="monthly" {...form.register("billing_period")} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Recursos (JSON)</label>
          <Textarea rows={4} {...form.register("features")} />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Limites (JSON)</label>
          <Textarea rows={4} {...form.register("limits")} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Descrição</label>
        <Textarea rows={3} {...form.register("description")} />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-200">
        <input type="checkbox" {...form.register("is_active")} /> Plano ativo
      </label>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

function BrandingTab({
  branding,
  onSubmit,
  isSubmitting,
}: {
  branding: Branding | null;
  onSubmit: (values: BrandingFormValues) => Promise<void>;
  isSubmitting: boolean;
}) {
  const form = useForm<BrandingFormValues>({
    resolver: brandingResolver,
    defaultValues: {
      primary_color: branding?.primary_color ?? "",
      secondary_color: branding?.secondary_color ?? "",
      accent_color: branding?.accent_color ?? "",
      logo_url: branding?.logo_url ?? "",
      favicon_url: branding?.favicon_url ?? "",
      custom_domain: branding?.custom_domain ?? "",
      login_message: branding?.login_message ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      primary_color: branding?.primary_color ?? "",
      secondary_color: branding?.secondary_color ?? "",
      accent_color: branding?.accent_color ?? "",
      logo_url: branding?.logo_url ?? "",
      favicon_url: branding?.favicon_url ?? "",
      custom_domain: branding?.custom_domain ?? "",
      login_message: branding?.login_message ?? "",
    });
  }, [branding, form]);

  return (
    <Card className="border-white/10 bg-white/5">
      <CardHeader>
        <CardTitle className="text-white">Personalização</CardTitle>
        <CardDescription className="text-slate-300">
          Ajuste cores, domínios e mensagens públicas da organização.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
          })}
        >
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Cor primária</label>
            <Input placeholder="#22d3ee" {...form.register("primary_color")} />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Cor secundária</label>
            <Input placeholder="#0f172a" {...form.register("secondary_color")} />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Cor de destaque</label>
            <Input placeholder="#22c55e" {...form.register("accent_color")} />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Domínio custom</label>
            <Input placeholder="pulse.suaempresa.com" {...form.register("custom_domain")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Mensagem de login</label>
            <Textarea rows={3} {...form.register("login_message")} />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Logo URL</label>
            <Input placeholder="https://..." {...form.register("logo_url")} />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Favicon URL</label>
            <Input placeholder="https://..." {...form.register("favicon_url")} />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function QuotaTab({
  quotas,
  tenants,
  onSubmit,
  isSubmitting,
}: {
  quotas: QuotaUsage[];
  tenants: Tenant[];
  onSubmit: (tenantId: string, values: QuotaInput) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuota, setEditingQuota] = useState<QuotaUsage | null>(null);
  const form = useForm<QuotaFormValues>({
    resolver: quotaResolver,
    defaultValues: {
      tenant_id: tenants[0]?.id ?? "",
      metric: "",
      period_start: "",
      period_end: "",
      used_value: 0,
      limit_value: null,
    },
  });

  const openDialog = (quota?: QuotaUsage) => {
    if (quota) {
      setEditingQuota(quota);
      form.reset({
        tenant_id: quota.tenant_id,
        metric: quota.metric,
        period_start: toInputValue(quota.period_start),
        period_end: toInputValue(quota.period_end),
        used_value: quota.used_value,
        limit_value: quota.limit_value ?? null,
      });
    } else {
      setEditingQuota(null);
      form.reset({
        tenant_id: tenants[0]?.id ?? "",
        metric: "",
        period_start: "",
        period_end: "",
        used_value: 0,
        limit_value: null,
      });
    }
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Quotas</h2>
          <p className="text-sm text-slate-300">Registre e acompanhe limites por tenant.</p>
        </div>
        <Button
          className="rounded-full bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
          onClick={() => openDialog()}
        >
          Nova quota
        </Button>
      </div>

      <ScrollArea className="max-h-[520px]">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10">
              <TableHead className="text-slate-300">Tenant</TableHead>
              <TableHead className="text-slate-300">Métrica</TableHead>
              <TableHead className="text-slate-300">Período</TableHead>
              <TableHead className="text-slate-300">Uso</TableHead>
              <TableHead className="text-right text-slate-300">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotas.map((quota) => (
              <TableRow key={quota.id} className="border-white/5">
                <TableCell className="text-slate-200">{quota.tenant?.name ?? quota.tenant_id}</TableCell>
                <TableCell className="text-slate-200">{quota.metric}</TableCell>
                <TableCell className="text-slate-300">
                  {formatDate(quota.period_start)} – {formatDate(quota.period_end)}
                </TableCell>
                <TableCell className="text-slate-200">
                  {quota.used_value}
                  {quota.limit_value ? ` / ${quota.limit_value}` : ""}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10 bg-white/5 text-slate-200 hover:border-emerald-400/60 hover:bg-emerald-400/10"
                    onClick={() => openDialog(quota)}
                  >
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl border-white/10 bg-slate-950 text-slate-100">
          <DialogHeader>
            <DialogTitle>{editingQuota ? "Editar quota" : "Nova quota"}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit(values.tenant_id, {
                metric: values.metric,
                period_start: new Date(values.period_start).toISOString().split("T")[0],
                period_end: new Date(values.period_end).toISOString().split("T")[0],
                limit_value: values.limit_value ?? null,
                used_value: values.used_value,
              });
              setIsDialogOpen(false);
            })}
          >
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Tenant</label>
              <select
                className="h-10 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                {...form.register("tenant_id")}
              >
                <option value="">Selecione</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.tenant_id && (
                <p className="text-xs text-rose-300">{form.formState.errors.tenant_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Métrica</label>
              <Input {...form.register("metric")} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Início</label>
                <Input type="date" {...form.register("period_start")} />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Fim</label>
                <Input type="date" {...form.register("period_end")} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Uso</label>
              <Input type="number" min={0} step="0.01" {...form.register("used_value")} />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Limite</label>
                <Input type="number" step="0.01" {...form.register("limit_value")} />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InvoicesTab({ invoices }: { invoices: OrganizationSummary["invoices"] }) {
  return (
    <Card className="border-white/10 bg-white/5">
      <CardHeader>
        <CardTitle className="text-white">Faturas</CardTitle>
        <CardDescription className="text-slate-300">Histórico das cobranças emitidas.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-white/10">
              <TableHead className="text-slate-300">Fatura</TableHead>
              <TableHead className="text-slate-300">Emitida</TableHead>
              <TableHead className="text-slate-300">Vencimento</TableHead>
              <TableHead className="text-slate-300">Valor</TableHead>
              <TableHead className="text-right text-slate-300">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id} className="border-white/5">
                <TableCell className="text-slate-200">{invoice.id}</TableCell>
                <TableCell className="text-slate-300">{formatDate(invoice.issued_at)}</TableCell>
                <TableCell className="text-slate-300">{formatDate(invoice.due_at)}</TableCell>
                <TableCell className="text-slate-200">{formatCurrency(invoice.amount_cents, invoice.currency)}</TableCell>
                <TableCell className="text-right">
                  <Badge
                    className={`rounded-full border px-3 py-1 text-xs ${
                      invoice.status === "Pago"
                        ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
                        : "border-amber-400/50 bg-amber-500/15 text-amber-100"
                    }`}
                  >
                    {invoice.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

type PlanPayload = ReturnType<typeof mapPlanValuesToPayload>;
type UpdatePlanPayload = Omit<PlanPayload, "key">;

function mapPlanValuesToPayload(values: z.infer<typeof planSchema>) {
  return {
    key: values.key,
    name: values.name,
    description: values.description ?? null,
    price_cents: Math.round(values.price * 100),
    currency: values.currency,
    billing_period: values.billing_period,
    features: parseJsonField(values.features) ?? {},
    limits: parseJsonField(values.limits) ?? {},
    is_active: values.is_active,
  };
}

function parseJsonField(value?: string | null) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}
