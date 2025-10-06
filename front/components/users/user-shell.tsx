"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ColDef, ModuleRegistry } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import "@/styles/ag-grid-theme.css";

ModuleRegistry.registerModules([AllCommunityModule]);

import { SideNav } from "@/components/dashboard/side-nav";
import { TopBar } from "@/components/dashboard/top-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAccounts, useCreateUser, useDeleteUser, useUpdateUser, useUsers } from "@/hooks/use-admin";
import { useAreas } from "@/hooks/use-areas";
import type { CreateUserInput, UpdateUserInput, User } from "@/lib/admin-types";
import { agGridPtBrLocale } from "@/lib/ag-grid-locale";
import { Edit, Plus, Trash2 } from "lucide-react";

const cleanseOptional = (schema: z.ZodTypeAny) =>
  z.preprocess((value) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    }
    return value;
  }, schema);

const userFormSchema = z.object({
  email: z
    .string({ required_error: "Informe o e-mail" })
    .trim()
    .min(1, "Informe o e-mail")
    .email("Informe um e-mail válido"),
  full_name: z.string().trim().min(1, "Informe o nome completo"),
  area_id: cleanseOptional(z.string().trim().optional()),
  locale: z.string().trim().min(2, "Informe o locale"),
  timezone: cleanseOptional(z.string().trim().optional()),
  phone: cleanseOptional(z.string().trim().optional()),
  picture_url: cleanseOptional(z.string().url("Informe uma URL válida").optional()),
  password: cleanseOptional(z.string().min(6, "Mínimo de 6 caracteres").optional()),
});

type UserFormValues = z.infer<typeof userFormSchema>;

function toCreatePayload(values: UserFormValues): CreateUserInput {
  return {
    email: values.email.trim(),
    full_name: values.full_name.trim(),
    area_id: (values.area_id as string | undefined) || undefined,
    locale: values.locale.trim(),
    timezone: values.timezone,
    phone: values.phone,
    picture_url: values.picture_url,
    password: values.password,
  };
}

function toUpdatePayload(values: UserFormValues): UpdateUserInput {
  const payload: UpdateUserInput = {
    email: values.email.trim(),
    full_name: values.full_name.trim(),
    area_id: (values.area_id as string | undefined) || undefined,
    locale: values.locale.trim(),
    timezone: values.timezone,
    phone: values.phone,
    picture_url: values.picture_url,
  };
  if (values.password) {
    payload.password = values.password;
  }
  return payload;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return format(new Date(value), "dd/MM/yyyy HH:mm");
  } catch {
    return value;
  }
}

export function UserShell() {
  const accountsQuery = useAccounts();
  const accounts = accountsQuery.data ?? [];
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const defaultAccountId = accounts.length > 0 ? accounts[0].id : null;

  useEffect(() => {
    if (!selectedAccountId && defaultAccountId) {
      setSelectedAccountId(defaultAccountId);
    }
  }, [defaultAccountId, selectedAccountId]);

  const usersQuery = useUsers(selectedAccountId ?? undefined);
  const areasQuery = useAreas(selectedAccountId ?? undefined);
  const createUser = useCreateUser(selectedAccountId ?? undefined);
  const updateUser = useUpdateUser(selectedAccountId ?? undefined);
  const deleteUser = useDeleteUser(selectedAccountId ?? undefined);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const areas = areasQuery.data ?? [];

  const showFeedback = useCallback((message: string, type: "success" | "error") => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  }, []);

  const gridData = usersQuery.data ?? [];

  const handleDelete = useCallback(
    async (user: User) => {
      if (!confirm(`Remover o usuário "${user.full_name}"?`)) return;
      try {
        await deleteUser.mutateAsync(user.id);
        showFeedback("Usuário removido com sucesso", "success");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível remover o usuário";
        showFeedback(message, "error");
      }
    },
    [deleteUser, showFeedback]
  );

  const columns = useMemo<ColDef<User>[]>(() => {
    return [
      {
        headerName: "Nome",
        field: "full_name",
        flex: 1.6,
        sortable: true,
        cellRenderer: (params: { data: User }) => (
          <div className="flex flex-col">
            <span className="font-semibold text-white">{params.data.full_name}</span>
            <span className="text-xs text-slate-400">{params.data.email}</span>
          </div>
        ),
      },
      {
        headerName: "Área",
        field: "area_id",
        width: 160,
        valueFormatter: (params) => {
          if (!params.value) return "—";
          const area = areas.find((a) => a.id === params.value);
          return area?.name ?? "—";
        },
      },
      {
        headerName: "Telefone",
        field: "phone",
        width: 160,
        valueFormatter: (params) => params.value ?? "—",
      },
      {
        headerName: "Locale",
        field: "locale",
        width: 120,
      },
      {
        headerName: "Fuso horário",
        field: "timezone",
        width: 160,
        valueFormatter: (params) => params.value ?? "—",
      },
      {
        headerName: "Root",
        field: "is_root",
        width: 110,
        cellRenderer: (params: { value: boolean | null | undefined }) => (
          <Badge className={params.value ? "bg-emerald-500/20 text-emerald-100" : "bg-slate-500/20 text-slate-100"}>
            {params.value ? "Sim" : "Não"}
          </Badge>
        ),
      },
      {
        headerName: "Criado em",
        field: "created_at",
        width: 180,
        valueFormatter: (params) => formatDate(params.value),
      },
      {
        headerName: "Atualizado em",
        field: "updated_at",
        width: 180,
        valueFormatter: (params) => formatDate(params.value),
      },
      {
        headerName: "Ações",
        width: 130,
        pinned: "right",
        filter: false,
        sortable: false,
        cellRenderer: (params: { data: User }) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400"
              onClick={() => setEditingUser(params.data)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-slate-300 hover:bg-rose-500/10 hover:text-rose-400"
              onClick={() => handleDelete(params.data)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ];
  }, [areas, handleDelete]);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: false,
      filter: false,
    }),
    []
  );

  const handleCreate = async (values: UserFormValues) => {
    if (!selectedAccountId) {
      showFeedback("Selecione uma conta para cadastrar usuários", "error");
      return;
    }
    try {
      await createUser.mutateAsync(toCreatePayload(values));
      showFeedback("Usuário criado com sucesso", "success");
      setIsCreateOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível criar o usuário";
      showFeedback(message, "error");
    }
  };

  const handleUpdate = async (values: UserFormValues) => {
    if (!editingUser) return;
    try {
      await updateUser.mutateAsync({ userId: editingUser.id, payload: toUpdatePayload(values) });
      showFeedback("Usuário atualizado com sucesso", "success");
      setEditingUser(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível atualizar o usuário";
      showFeedback(message, "error");
    }
  };

  const disableActions = !selectedAccountId;
  const loadingTemplate = '<div class="ag-pulsehub-loader">Carregando usuários...</div>';
  const emptyTemplate = '<div class="ag-pulsehub-empty">Nenhum usuário cadastrado</div>';

  return (
    <section className="flex min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-950/95 to-slate-900 text-slate-100">
      <SideNav />
      <div className="flex flex-1 flex-col overflow-hidden px-8 pb-8 pt-6">
        <TopBar />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Usuários</p>
            <h1 className="text-2xl font-semibold text-white">Gestão de Usuários da Conta</h1>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedAccountId ?? ""}
              onChange={(event) => setSelectedAccountId(event.target.value || null)}
              disabled={accountsQuery.isLoading || accounts.length === 0}
              className="h-10 min-w-[220px] rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            >
              <option value="" disabled>
                Selecione uma conta
              </option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button
                  className="gap-2 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-60"
                  disabled={disableActions}
                  title={disableActions ? "Selecione uma conta para criar usuários" : undefined}
                >
                  <Plus className="h-4 w-4" />
                  Novo usuário
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl border-white/10 bg-slate-950 text-slate-100">
                <DialogHeader>
                  <DialogTitle>Criar usuário</DialogTitle>
                </DialogHeader>
                <UserForm areas={areas} onSubmit={handleCreate} isSubmitting={createUser.isPending} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {feedback && (
          <div
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              feedback.type === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                : "border-rose-500/40 bg-rose-500/10 text-rose-100"
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div className="mt-6 flex-1 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="ag-theme-quartz-dark ag-theme-pulsehub h-full min-h-[420px] w-full overflow-hidden rounded-2xl border border-white/5 bg-slate-950/60">
            <AgGridReact<User>
              theme="legacy"
              rowData={gridData}
              columnDefs={columns}
              defaultColDef={defaultColDef}
              rowHeight={56}
              headerHeight={46}
              animateRows
              suppressCellFocus
              loading={usersQuery.isLoading || usersQuery.isFetching}
              overlayLoadingTemplate={loadingTemplate}
              overlayNoRowsTemplate={gridData.length === 0 ? emptyTemplate : undefined}
              localeText={agGridPtBrLocale}
            />
          </div>
        </div>

        {editingUser && (
          <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
            <DialogContent className="max-w-3xl border-white/10 bg-slate-950 text-slate-100">
              <DialogHeader>
                <DialogTitle>Editar usuário</DialogTitle>
              </DialogHeader>
              <UserForm
                areas={areas}
                initialData={editingUser}
                onSubmit={handleUpdate}
                isSubmitting={updateUser.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </section>
  );
}

function UserForm({
  areas,
  initialData,
  onSubmit,
  isSubmitting,
}: {
  areas: Array<{ id: string; name: string }>;
  initialData?: User | null;
  onSubmit: (values: UserFormValues) => Promise<void>;
  isSubmitting: boolean;
}) {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: "",
      full_name: "",
      area_id: undefined,
      locale: "pt-BR",
      timezone: undefined,
      phone: undefined,
      picture_url: undefined,
      password: undefined,
    },
  });

  useEffect(() => {
    if (!initialData) {
      form.reset({
        email: "",
        full_name: "",
        area_id: undefined,
        locale: "pt-BR",
        timezone: undefined,
        phone: undefined,
        picture_url: undefined,
        password: undefined,
      });
      return;
    }

    form.reset({
      email: initialData.email,
      full_name: initialData.full_name,
      area_id: initialData.area_id ?? undefined,
      locale: initialData.locale,
      timezone: initialData.timezone ?? undefined,
      phone: initialData.phone ?? undefined,
      picture_url: initialData.picture_url ?? undefined,
      password: undefined,
    });
  }, [initialData, form]);

  return (
    <form
      className="grid gap-6"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(values);
      })}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Nome completo</label>
          <Input placeholder="Maria Silva" {...form.register("full_name")} />
          {form.formState.errors.full_name && (
            <p className="text-xs text-rose-400">{form.formState.errors.full_name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">E-mail</label>
          <Input type="email" placeholder="maria@empresa.com" {...form.register("email")} />
          {form.formState.errors.email && (
            <p className="text-xs text-rose-400">{form.formState.errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Área</label>
        <select
          {...form.register("area_id")}
          className="h-10 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
        >
          <option value="">Selecione uma área (opcional)</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Locale</label>
          <Input placeholder="pt-BR" {...form.register("locale")} />
          {form.formState.errors.locale && (
            <p className="text-xs text-rose-400">{form.formState.errors.locale.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Fuso horário</label>
          <Input placeholder="America/Sao_Paulo" {...form.register("timezone")} />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Telefone</label>
          <Input placeholder="+55 11 99999-9999" {...form.register("phone")} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">URL da foto</label>
          <Input placeholder="https://..." {...form.register("picture_url")} />
          {form.formState.errors.picture_url && (
            <p className="text-xs text-rose-400">{form.formState.errors.picture_url.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Senha</label>
          <Input type="password" placeholder="••••••" autoComplete="new-password" {...form.register("password")} />
          {form.formState.errors.password && (
            <p className="text-xs text-rose-400">{form.formState.errors.password.message}</p>
          )}
          {!initialData && (
            <p className="text-xs text-slate-500">Opcional. Defina para cadastrar uma senha inicial.</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-60"
        >
          {isSubmitting ? "Salvando..." : initialData ? "Salvar alterações" : "Criar usuário"}
        </Button>
      </div>
    </form>
  );
}
