"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import type { ColDef } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import "@/styles/ag-grid-theme.css";

// Registrar módulos do AG Grid
ModuleRegistry.registerModules([AllCommunityModule]);

import { SideNav } from "@/components/dashboard/side-nav";
import { TopBar } from "@/components/dashboard/top-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Edit, Plus, AlertTriangle } from "lucide-react";
import { getApiBaseUrl } from "@/lib/api-client";
import { agGridDefaultTextFilterParams, agGridPtBrLocale } from "@/lib/ag-grid-locale";

import {
  useAccounts,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
  usePlans,
  useCreatePlan,
  useUpdatePlan,
  useDeletePlan,
} from "@/hooks/use-admin";
import type { Account, Plan } from "@/lib/admin-types";

const planSchema = z.object({
  key: z.string().min(1, "Informe uma chave"),
  name: z.string().min(1, "Informe um nome"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Informe um valor"),
  currency: z.string().min(1),
  billing_period: z.string().min(1),
  features: z.string().optional(),
  is_active: z.boolean().default(true),
});

const accountSchema = z.object({
  name: z.string().min(1, "Informe o nome da conta"),
  slug: z.string().optional(),
  plan_id: z.string().optional(),
  locale: z.string().min(1, "Informe o locale"),
  timezone: z.string().min(1, "Informe o fuso horário"),
  settings: z.string().optional(),
});

type PlanFormValues = z.infer<typeof planSchema>;
type AccountFormValues = z.infer<typeof accountSchema>;

function formatCurrency(amountCents: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountCents / 100);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return format(new Date(value), "dd/MM/yyyy HH:mm");
  } catch {
    return value;
  }
}

export function AdminShell() {
  const [activeTab, setActiveTab] = useState<string>("accounts");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const accountsQuery = useAccounts();
  const plansQuery = usePlans();

  const handleError = (error: unknown, fallback = "Operação não concluída") => {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
        ? error
        : fallback;
    setFeedback({ type: "error", message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleSuccess = (message: string) => {
    setFeedback({ type: "success", message });
    setTimeout(() => setFeedback(null), 5000);
  };

  return (
    <section className="flex min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-950/95 to-slate-900 text-slate-100">
      <SideNav />
      <div className="flex flex-1 flex-col overflow-hidden px-8 pb-8 pt-6">
        <TopBar />

        <div className="mt-6 flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Administração</p>
          <h1 className="text-2xl font-semibold text-white">Gestão de Contas e Planos</h1>
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList>
              <TabsTrigger value="accounts">Contas</TabsTrigger>
              <TabsTrigger value="plans">Planos</TabsTrigger>
            </TabsList>
            <TabsContent value="accounts" className="flex-1 mt-6">
              <AccountsTab
                accounts={accountsQuery.data ?? []}
                plans={plansQuery.data ?? []}
                isLoading={accountsQuery.isLoading}
                isFetching={accountsQuery.isFetching}
                isError={accountsQuery.isError}
                error={accountsQuery.error}
                onRetry={accountsQuery.refetch}
                onSuccess={handleSuccess}
                onError={handleError}
              />
            </TabsContent>
            <TabsContent value="plans" className="flex-1 mt-6">
              <PlansTab
                plans={plansQuery.data ?? []}
                isLoading={plansQuery.isLoading}
                isFetching={plansQuery.isFetching}
                isError={plansQuery.isError}
                error={plansQuery.error}
                onRetry={plansQuery.refetch}
                onSuccess={handleSuccess}
                onError={handleError}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
}

function AccountsTab({
  accounts,
  plans,
  isLoading,
  isFetching,
  isError,
  error,
  onRetry,
  onSuccess,
  onError,
}: {
  accounts: Account[];
  plans: Plan[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => Promise<unknown>;
  onSuccess: (message: string) => void;
  onError: (error: unknown, fallback?: string) => void;
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();

  const handleDelete = useCallback(
    async (accountId: string, name: string) => {
      if (!confirm(`Remover a conta "${name}"?`)) return;
      try {
        await deleteAccount.mutateAsync(accountId);
        onSuccess("Conta removida com sucesso");
      } catch (error) {
        onError(error, "Não foi possível remover a conta");
      }
    },
    [deleteAccount, onError, onSuccess]
  );

  const ActionsCellRenderer = useCallback(
    (params: { data: Account }) => (
      <div className="flex h-full items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400"
          onClick={() => setEditingAccount(params.data)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-slate-300 hover:bg-rose-500/10 hover:text-rose-400"
          onClick={() => handleDelete(params.data.id, params.data.name)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ),
    [handleDelete]
  );

  const PlanCellRenderer = useCallback((params: { data: Account }) => {
    const planName = params.data.plan?.name ?? "Sem plano";
    return (
      <Badge className="rounded-full border-emerald-400/50 bg-emerald-500/15 text-emerald-100">
        {planName}
      </Badge>
    );
  }, []);

  const textFilterParams = useMemo(() => ({ ...agGridDefaultTextFilterParams }), []);

  const columnDefs: ColDef<Account>[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Nome",
        flex: 2,
        sortable: true,
        filter: "agTextColumnFilter",
        filterParams: textFilterParams,
      },
      {
        field: "slug",
        headerName: "Slug",
        flex: 2,
        sortable: true,
        filter: "agTextColumnFilter",
        filterParams: textFilterParams,
      },
      {
        field: "plan_id",
        headerName: "Plano",
        flex: 1.5,
        cellRenderer: PlanCellRenderer,
      },
      {
        field: "created_at",
        headerName: "Criado em",
        flex: 1.5,
        valueFormatter: (params) => formatDate(params.value),
        sortable: true,
      },
      {
        headerName: "Ações",
        cellRenderer: ActionsCellRenderer,
        width: 120,
        pinned: "right",
        suppressHeaderMenuButton: true,
        sortable: false,
        filter: false,
      },
    ],
    [ActionsCellRenderer, PlanCellRenderer, textFilterParams]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: false,
      filter: false,
    }),
    []
  );

  const submitAccount = async (values: AccountFormValues, accountId?: string) => {
    let settingsPayload: Record<string, unknown> | undefined;
    if (values.settings && values.settings.trim().length > 0) {
      try {
        settingsPayload = JSON.parse(values.settings);
      } catch {
        onError("JSON inválido no campo configurações");
        return;
      }
    }

    const payload = {
      name: values.name.trim(),
      slug: values.slug?.trim() || undefined,
      plan_id: values.plan_id || undefined,
      locale: values.locale,
      timezone: values.timezone,
      settings: settingsPayload,
    };

    try {
      if (accountId) {
        await updateAccount.mutateAsync({ accountId, payload });
        onSuccess("Conta atualizada com sucesso");
        setEditingAccount(null);
      } else {
        await createAccount.mutateAsync(payload);
        onSuccess("Conta criada com sucesso");
        setIsCreateOpen(false);
      }
    } catch (error) {
      onError(error, accountId ? "Não foi possível atualizar a conta" : "Não foi possível criar a conta");
    }
  };

  useEffect(() => {
    if (isError && error) {
      onError(error, "Não foi possível carregar as contas");
    }
  }, [error, isError, onError]);

  const showEmptyState = !isError && !isLoading && !isFetching && accounts.length === 0;
  const loadingTemplate = '<div class="ag-pulsehub-loader">Carregando contas...</div>';
  const emptyTemplate =
    '<div class="ag-pulsehub-empty"><strong>Nenhuma conta</strong><span>Crie uma conta para começar</span></div>';

  if (isError && accounts.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60 p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-rose-500/40 bg-rose-500/10 text-rose-200">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">Não foi possível carregar as contas</h3>
            <p className="text-sm text-slate-400">
              Verifique se a API está ativa em <code className="rounded bg-slate-900/70 px-1 text-xs">{getApiBaseUrl()}</code> e tente novamente.
            </p>
          </div>
          <Button onClick={() => onRetry()} className="bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Contas cadastradas</h2>
          <p className="text-sm text-slate-400">Empresas clientes do seu SaaS</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30">
              <Plus className="h-4 w-4" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl border-white/10 bg-slate-950 text-slate-100">
            <DialogHeader>
              <DialogTitle>Criar nova conta</DialogTitle>
            </DialogHeader>
            <AccountForm
              plans={plans}
              onSubmit={(values) => submitAccount(values)}
              isSubmitting={createAccount.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 min-h-[320px] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 shadow-[0_32px_80px_-48px_rgba(2,6,23,0.9)]">
        <div className="ag-theme-quartz-dark ag-theme-pulsehub h-full w-full">
          <AgGridReact<Account>
            theme="legacy"
            rowData={accounts}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            domLayout="normal"
            rowHeight={50}
            headerHeight={45}
            suppressCellFocus
            animateRows
            loading={isLoading || (isFetching && accounts.length === 0)}
            overlayLoadingTemplate={loadingTemplate}
            overlayNoRowsTemplate={showEmptyState ? emptyTemplate : undefined}
            localeText={agGridPtBrLocale}
          />
        </div>
      </div>

      {editingAccount && (
        <Dialog open={!!editingAccount} onOpenChange={(open) => !open && setEditingAccount(null)}>
          <DialogContent className="max-w-2xl border-white/10 bg-slate-950 text-slate-100">
            <DialogHeader>
              <DialogTitle>Editar conta</DialogTitle>
            </DialogHeader>
            <AccountForm
              plans={plans}
              initialData={editingAccount}
              onSubmit={(values) => submitAccount(values, editingAccount.id)}
              isSubmitting={updateAccount.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function AccountForm({
  plans,
  initialData,
  onSubmit,
  isSubmitting,
}: {
  plans: Plan[];
  initialData?: Account;
  onSubmit: (values: AccountFormValues) => Promise<void>;
  isSubmitting: boolean;
}) {
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          slug: initialData.slug,
          plan_id: initialData.plan_id ?? "",
          locale: initialData.locale,
          timezone: initialData.timezone,
          settings:
            initialData.settings && Object.keys(initialData.settings).length > 0
              ? JSON.stringify(initialData.settings, null, 2)
              : "",
        }
      : {
          name: "",
          slug: "",
          plan_id: "",
          locale: "pt-BR",
          timezone: "America/Sao_Paulo",
          settings: "",
        },
  });

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Nome *</label>
          <Input placeholder="Acme Corporation" {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="text-xs text-rose-400">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Slug</label>
          <Input placeholder="acme-corp (auto-gerado se vazio)" {...form.register("slug")} />
          <p className="text-xs text-slate-500">Deixe em branco para gerar automaticamente</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Plano</label>
          <select
            className="dark-select h-10 w-full rounded-lg bg-slate-900/60 px-3 pr-9 text-sm text-slate-100"
            {...form.register("plan_id")}
          >
            <option value="">Nenhum</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Locale *</label>
          <Input placeholder="pt-BR" {...form.register("locale")} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Timezone *</label>
          <Input placeholder="America/Sao_Paulo" {...form.register("timezone")} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Configurações (JSON)</label>
        <Textarea rows={4} placeholder='{\n  "feature_beta": true\n}' {...form.register("settings")} />
        <p className="text-xs text-slate-500">Opcional. Deve ser um JSON válido.</p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
        >
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

function PlansTab({
  plans,
  isLoading,
  isFetching,
  isError,
  error,
  onRetry,
  onSuccess,
  onError,
}: {
  plans: Plan[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => Promise<unknown>;
  onSuccess: (message: string) => void;
  onError: (error: unknown, fallback?: string) => void;
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();

  useEffect(() => {
    if (isError && error) {
      onError(error, "Não foi possível carregar os planos");
    }
  }, [error, isError, onError]);

  const handleDelete = useCallback(
    async (planId: string, name: string) => {
      if (!confirm(`Remover o plano "${name}"?`)) return;
      try {
        await deletePlan.mutateAsync(planId);
        onSuccess("Plano removido com sucesso");
      } catch (error) {
        onError(error, "Não foi possível remover o plano");
      }
    },
    [deletePlan, onError, onSuccess]
  );

  const ActionsCellRenderer = useCallback(
    (params: { data: Plan }) => (
      <div className="flex h-full items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400"
          onClick={() => setEditingPlan(params.data)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-slate-300 hover:bg-rose-500/10 hover:text-rose-400"
          onClick={() => handleDelete(params.data.id, params.data.name)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ),
    [handleDelete]
  );

  const StatusCellRenderer = useCallback((params: { data: Plan }) => {
    return params.data.is_active ? (
      <Badge className="rounded-full border-emerald-400/50 bg-emerald-500/15 text-emerald-100">Ativo</Badge>
    ) : (
      <Badge className="rounded-full border-slate-400/50 bg-slate-500/15 text-slate-300">Inativo</Badge>
    );
  }, []);

  const planTextFilterParams = useMemo(() => ({ ...agGridDefaultTextFilterParams }), []);

  const columnDefs: ColDef<Plan>[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Nome / Chave",
        flex: 2,
        sortable: true,
        filter: "agTextColumnFilter",
        filterParams: planTextFilterParams,
        filterValueGetter: (params: { data: Plan }) =>
          `${params.data?.name ?? ""} ${params.data?.key ?? ""}`.trim(),
        cellRenderer: (params: { data: Plan }) => (
          <div className="flex flex-col justify-center h-full">
            <div className="font-semibold text-white">{params.data.name}</div>
            <div className="text-xs text-slate-400">{params.data.key}</div>
          </div>
        ),
      },
      {
        field: "price_cents",
        headerName: "Preço",
        flex: 1,
        sortable: true,
        valueFormatter: (params) => formatCurrency(params.value, params.data?.currency ?? "BRL"),
      },
      {
        field: "billing_period",
        headerName: "Ciclo",
        flex: 1,
        sortable: true,
        valueFormatter: (params) =>
          params.value ? params.value.charAt(0).toUpperCase() + params.value.slice(1) : "",
      },
      {
        field: "is_active",
        headerName: "Status",
        flex: 1,
        cellRenderer: StatusCellRenderer,
      },
      {
        field: "created_at",
        headerName: "Criado em",
        flex: 1.5,
        valueFormatter: (params) => formatDate(params.value),
        sortable: true,
      },
      {
        headerName: "Ações",
        cellRenderer: ActionsCellRenderer,
        width: 120,
        pinned: "right",
        suppressHeaderMenuButton: true,
        sortable: false,
        filter: false,
      },
    ],
    [ActionsCellRenderer, StatusCellRenderer, planTextFilterParams]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: false,
      filter: false,
    }),
    []
  );

  const loadingTemplate = '<div class="ag-pulsehub-loader">Carregando planos...</div>';
  const emptyTemplate =
    '<div class="ag-pulsehub-empty"><strong>Nenhum plano</strong><span>Cadastre planos para oferecer às contas</span></div>';
  const showEmptyState = !isError && !isLoading && !isFetching && plans.length === 0;
  const showErrorState = isError && plans.length === 0;

  if (showErrorState) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60 p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-rose-500/40 bg-rose-500/10 text-rose-200">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">Não foi possível carregar os planos</h3>
            <p className="text-sm text-slate-400">
              Confirme se o backend está disponível em <code className="rounded bg-slate-900/70 px-1 text-xs">{getApiBaseUrl()}</code>.
            </p>
          </div>
          <Button onClick={() => onRetry()} className="bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const submitPlan = async (values: PlanFormValues, planId?: string) => {
    let featuresPayload: Record<string, unknown> = {};
    if (values.features && values.features.trim().length > 0) {
      try {
        featuresPayload = JSON.parse(values.features);
      } catch {
        onError("JSON inválido no campo recursos");
        return;
      }
    }

    const payload = {
      key: values.key,
      name: values.name,
      description: values.description || null,
      price_cents: Math.round(values.price * 100),
      currency: values.currency,
      billing_period: values.billing_period,
      features: featuresPayload,
      is_active: values.is_active,
    };

    try {
      if (planId) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { key, ...updatePayload } = payload;
        await updatePlan.mutateAsync({ planId, payload: updatePayload });
        onSuccess("Plano atualizado com sucesso");
        setEditingPlan(null);
      } else {
        await createPlan.mutateAsync(payload);
        onSuccess("Plano criado com sucesso");
        setIsCreateOpen(false);
      }
    } catch (error) {
      onError(error, planId ? "Não foi possível atualizar o plano" : "Não foi possível criar o plano");
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Catálogo de planos</h2>
          <p className="text-sm text-slate-400">Planos disponíveis para assinatura</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30">
              <Plus className="h-4 w-4" />
              Novo Plano
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl border-white/10 bg-slate-950 text-slate-100">
            <DialogHeader>
              <DialogTitle>Criar novo plano</DialogTitle>
            </DialogHeader>
            <PlanForm onSubmit={(values) => submitPlan(values)} isSubmitting={createPlan.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 min-h-[320px] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 shadow-[0_32px_80px_-48px_rgba(2,6,23,0.9)]">
        <div className="ag-theme-quartz-dark ag-theme-pulsehub h-full w-full">
          <AgGridReact<Plan>
            theme="legacy"
            rowData={plans}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            domLayout="normal"
            rowHeight={60}
            headerHeight={45}
            suppressCellFocus
            animateRows
            loading={isLoading || (isFetching && plans.length === 0)}
            overlayLoadingTemplate={loadingTemplate}
            overlayNoRowsTemplate={showEmptyState ? emptyTemplate : undefined}
            localeText={agGridPtBrLocale}
          />
        </div>
      </div>

      {editingPlan && (
        <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
          <DialogContent className="max-w-2xl border-white/10 bg-slate-950 text-slate-100">
            <DialogHeader>
              <DialogTitle>Editar plano</DialogTitle>
            </DialogHeader>
            <PlanForm
              initialData={editingPlan}
              onSubmit={(values) => submitPlan(values, editingPlan.id)}
              isSubmitting={updatePlan.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function PlanForm({
  initialData,
  onSubmit,
  isSubmitting,
}: {
  initialData?: Plan;
  onSubmit: (values: PlanFormValues) => Promise<void>;
  isSubmitting: boolean;
}) {
  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: initialData
      ? {
          key: initialData.key,
          name: initialData.name,
          description: initialData.description ?? "",
          price: initialData.price_cents / 100,
          currency: initialData.currency,
          billing_period: initialData.billing_period,
          features: JSON.stringify(initialData.features ?? {}, null, 2),
          is_active: initialData.is_active,
        }
      : {
          key: "",
          name: "",
          description: "",
          price: 0,
          currency: "BRL",
          billing_period: "monthly",
          features: "{}",
          is_active: true,
        },
  });

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Chave *</label>
          <Input placeholder="pro-plan" {...form.register("key")} disabled={!!initialData} />
          {form.formState.errors.key && <p className="text-xs text-rose-400">{form.formState.errors.key.message}</p>}
          {initialData && <p className="text-xs text-slate-500">Chave não pode ser alterada</p>}
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Nome *</label>
          <Input placeholder="Plano Pro" {...form.register("name")} />
          {form.formState.errors.name && <p className="text-xs text-rose-400">{form.formState.errors.name.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Preço (R$) *</label>
          <Input type="number" step="0.01" min={0} placeholder="99.90" {...form.register("price")} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Moeda *</label>
          <select
            className="dark-select h-10 w-full rounded-lg bg-slate-900/60 px-3 pr-9 text-sm text-slate-100"
            {...form.register("currency")}
          >
            <option value="BRL">BRL</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Ciclo *</label>
          <select
            className="dark-select h-10 w-full rounded-lg bg-slate-900/60 px-3 pr-9 text-sm text-slate-100"
            {...form.register("billing_period")}
          >
            <option value="monthly">Mensal</option>
            <option value="yearly">Anual</option>
            <option value="quarterly">Trimestral</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Descrição</label>
        <Textarea rows={2} placeholder="Descrição do plano..." {...form.register("description")} />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Recursos (JSON)</label>
        <Textarea
          rows={4}
          placeholder='{\n  "max_users": 10,\n  "max_projects": 5\n}'
          {...form.register("features")}
        />
        <p className="text-xs text-slate-500">Opcional. Deve ser um JSON válido.</p>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-200">
        <input type="checkbox" className="rounded border-white/20" {...form.register("is_active")} />
        Plano ativo
      </label>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
        >
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
