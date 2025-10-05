"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import type { ColDef } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import "@/styles/ag-grid-theme.css";

ModuleRegistry.registerModules([AllCommunityModule]);

import { Edit, Plus, Trash2 } from "lucide-react";

import { SideNav } from "@/components/dashboard/side-nav";
import { TopBar } from "@/components/dashboard/top-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { useAccounts } from "@/hooks/use-admin";
import {
  useCreateMeetingType,
  useDeleteMeetingType,
  useMeetingTypes,
  useUpdateMeetingType,
} from "@/hooks/use-meeting-types";
import type { MeetingType } from "@/lib/meetings-types";
import { agGridPtBrLocale } from "@/lib/ag-grid-locale";

type FeedbackState = { type: "success" | "error"; message: string } | null;

const meetingTypeSchema = z.object({
  name: z.string().min(1, "Informe o nome do tipo"),
  key: z
    .string()
    .max(60, "Use no máximo 60 caracteres")
    .regex(/^[a-z0-9_-]+$/, {
      message: "Use apenas letras minúsculas, números, hífen ou underline",
    })
    .optional()
    .or(z.literal("")),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

type MeetingTypeFormValues = z.infer<typeof meetingTypeSchema>;

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return format(new Date(value), "dd/MM/yyyy HH:mm");
  } catch {
    return value;
  }
}

export function SettingsShell() {
  const [activeTab, setActiveTab] = useState("meeting-types");
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const handleFeedback = (message: string, type: "success" | "error") => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleError = (error: unknown, fallback = "Operação não concluída") => {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
        ? error
        : fallback;
    handleFeedback(message, "error");
  };

  return (
    <section className="flex min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-950/95 to-slate-900 text-slate-100">
      <SideNav />
      <div className="flex flex-1 flex-col overflow-hidden px-8 pb-8 pt-6">
        <TopBar />

        <div className="mt-6 flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Configurações</p>
          <h1 className="text-2xl font-semibold text-white">Central de configurações</h1>
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
            <TabsList>
              <TabsTrigger value="general">Geral</TabsTrigger>
              <TabsTrigger value="meeting-types">Tipos de reunião</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="mt-6 flex-1">
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/20 bg-slate-950/50 p-12 text-center text-sm text-slate-400">
                Configurações gerais em breve. Utilize a aba &quot;Tipos de reunião&quot; para gerenciar o catálogo de reuniões.
              </div>
            </TabsContent>
            <TabsContent value="meeting-types" className="mt-6 flex-1">
              <MeetingTypesTab onSuccess={(message) => handleFeedback(message, "success")} onError={handleError} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
}

function MeetingTypesTab({
  onSuccess,
  onError,
}: {
  onSuccess: (message: string) => void;
  onError: (error: unknown, fallback?: string) => void;
}) {
  const accountsQuery = useAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingType, setEditingType] = useState<MeetingType | null>(null);

  useEffect(() => {
    if (!selectedAccountId && accountsQuery.data && accountsQuery.data.length > 0) {
      setSelectedAccountId(accountsQuery.data[0].id);
    }
  }, [accountsQuery.data, selectedAccountId]);

  const meetingTypesQuery = useMeetingTypes(selectedAccountId ?? undefined, true);
  const createMeetingType = useCreateMeetingType(selectedAccountId ?? undefined, true);
  const updateMeetingType = useUpdateMeetingType(selectedAccountId ?? undefined, true);
  const deleteMeetingType = useDeleteMeetingType(selectedAccountId ?? undefined, true);

  const meetingTypes = meetingTypesQuery.data ?? [];
  const isLoading = accountsQuery.isLoading || meetingTypesQuery.isLoading;
  const showEmptyState =
    !isLoading && !meetingTypesQuery.isError && meetingTypes.length === 0 && selectedAccountId;

  useEffect(() => {
    if (meetingTypesQuery.isError && meetingTypesQuery.error) {
      onError(meetingTypesQuery.error, "Não foi possível carregar os tipos de reunião");
    }
  }, [meetingTypesQuery.error, meetingTypesQuery.isError, onError]);

  const createForm = useForm<MeetingTypeFormValues>({
    resolver: zodResolver(meetingTypeSchema),
    defaultValues: {
      name: "",
      key: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    createForm.reset({ name: "", key: "", description: "", is_active: true });
  }, [createForm, selectedAccountId]);

  const editForm = useForm<MeetingTypeFormValues>({
    resolver: zodResolver(meetingTypeSchema),
    defaultValues: {
      name: "",
      key: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (editingType) {
      editForm.reset({
        name: editingType.name,
        key: editingType.key,
        description: editingType.description ?? "",
        is_active: editingType.is_active,
      });
    } else {
      editForm.reset({ name: "", key: "", description: "", is_active: true });
    }
  }, [editForm, editingType]);

  const handleDelete = useCallback(
    async (type: MeetingType) => {
      const confirmed = window.confirm(`Remover o tipo "${type.name}"?`);
      if (!confirmed) return;
      try {
        await deleteMeetingType.mutateAsync(type.id);
        onSuccess("Tipo removido com sucesso");
      } catch (error) {
        onError(error, "Não foi possível remover o tipo de reunião");
      }
    },
    [deleteMeetingType, onError, onSuccess]
  );

  const handleToggleStatus = useCallback(
    async (type: MeetingType) => {
      try {
        await updateMeetingType.mutateAsync({
          meetingTypeId: type.id,
          payload: { is_active: !type.is_active },
        });
        onSuccess(
          type.is_active ? "Tipo desativado com sucesso" : "Tipo ativado com sucesso"
        );
      } catch (error) {
        onError(
          error,
          type.is_active
            ? "Não foi possível desativar o tipo de reunião"
            : "Não foi possível ativar o tipo de reunião"
        );
      }
    },
    [onError, onSuccess, updateMeetingType]
  );

  const columnDefs: ColDef<MeetingType>[] = useMemo(
    () => [
      {
        headerName: "Nome",
        field: "name",
        flex: 1.6,
        sortable: true,
        cellRenderer: (params: { data: MeetingType }) => (
          <div className="flex flex-col">
            <span className="font-medium text-slate-100">{params.data.name}</span>
            {params.data.description && (
              <span className="text-xs text-slate-400">{params.data.description}</span>
            )}
          </div>
        ),
      },
      { field: "key", headerName: "Chave", flex: 1.2, sortable: true },
      {
        headerName: "Status",
        field: "is_active",
        flex: 1,
        cellRenderer: (params: { data: MeetingType }) =>
          params.data.is_active ? (
            <Badge className="bg-emerald-500/20 text-emerald-200">Ativo</Badge>
          ) : (
            <Badge variant="outline" className="text-amber-200">Inativo</Badge>
          ),
      },
      {
        headerName: "Atualizado em",
        field: "updated_at",
        flex: 1.2,
        valueFormatter: (params) => formatDate(params.value),
      },
      {
        headerName: "Ações",
        width: 220,
        pinned: "right",
        cellRenderer: (params: { data: MeetingType }) => (
          <div className="flex h-full items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400"
              onClick={() => setEditingType(params.data)}
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
    ],
    [handleDelete, handleToggleStatus]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: false,
      filter: false,
    }),
    []
  );

  const loadingTemplate = '<div class="ag-pulsehub-loader">Carregando tipos...</div>';
  const emptyTemplate = '<div class="ag-pulsehub-empty">Nenhum tipo cadastrado</div>';

  const handleCreateSubmit = async (values: MeetingTypeFormValues) => {
    if (!selectedAccountId) return;
    const payload = {
      account_id: selectedAccountId,
      name: values.name.trim(),
      key: values.key?.trim() || undefined,
      description: values.description?.trim() || undefined,
      is_active: values.is_active,
    };

    try {
      await createMeetingType.mutateAsync(payload);
      onSuccess("Tipo criado com sucesso");
      setIsCreateOpen(false);
      createForm.reset({ name: "", key: "", description: "", is_active: true });
    } catch (error) {
      onError(error, "Não foi possível criar o tipo de reunião");
    }
  };

  const handleEditSubmit = async (values: MeetingTypeFormValues) => {
    if (!editingType) return;
    const payload = {
      name: values.name.trim(),
      key: values.key?.trim() || undefined,
      description: values.description?.trim() || undefined,
      is_active: values.is_active,
    };

    try {
      await updateMeetingType.mutateAsync({ meetingTypeId: editingType.id, payload });
      onSuccess("Tipo atualizado com sucesso");
      setEditingType(null);
    } catch (error) {
      onError(error, "Não foi possível atualizar o tipo de reunião");
    }
  };

  const disableCreateButton = !selectedAccountId;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Conta</span>
          <select
            value={selectedAccountId ?? ""}
            onChange={(event) => {
              setSelectedAccountId(event.target.value || null);
              setEditingType(null);
            }}
            disabled={accountsQuery.isLoading || (accountsQuery.data?.length ?? 0) === 0}
            className="h-10 min-w-[220px] rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
          >
            <option value="" disabled>
              Selecione uma conta
            </option>
            {(accountsQuery.data ?? []).map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button
              className="gap-2 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-50"
              disabled={disableCreateButton}
            >
              <Plus className="h-4 w-4" />
              Novo tipo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl border-white/10 bg-slate-950 text-slate-100">
            <DialogHeader>
              <DialogTitle>Cadastrar tipo de reunião</DialogTitle>
            </DialogHeader>
            <MeetingTypeForm
              form={createForm}
              isSubmitting={createMeetingType.isPending}
              onSubmit={handleCreateSubmit}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="ag-theme-quartz-dark ag-theme-pulsehub flex-1 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
        <AgGridReact<MeetingType>
          theme="legacy"
          rowData={meetingTypes}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          domLayout="normal"
          rowHeight={52}
          headerHeight={46}
          suppressCellFocus
          animateRows
          loading={isLoading || meetingTypesQuery.isFetching}
          overlayLoadingTemplate={loadingTemplate}
          overlayNoRowsTemplate={showEmptyState ? emptyTemplate : undefined}
          localeText={agGridPtBrLocale}
        />
      </div>

      {editingType && (
        <Dialog open={!!editingType} onOpenChange={(open) => !open && setEditingType(null)}>
          <DialogContent className="max-w-xl border-white/10 bg-slate-950 text-slate-100">
            <DialogHeader>
              <DialogTitle>Editar tipo de reunião</DialogTitle>
            </DialogHeader>
            <MeetingTypeForm
              form={editForm}
              isSubmitting={updateMeetingType.isPending}
              onSubmit={handleEditSubmit}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function MeetingTypeForm({
  form,
  onSubmit,
  isSubmitting,
}: {
  form: UseFormReturn<MeetingTypeFormValues>;
  onSubmit: (values: MeetingTypeFormValues) => Promise<void>;
  isSubmitting: boolean;
}) {
  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(values);
      })}
    >
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Nome</label>
        <Input placeholder="Daily" {...form.register("name")} />
        {form.formState.errors.name && (
          <p className="text-xs text-rose-400">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Chave</label>
        <Input placeholder="daily" {...form.register("key")} />
        <p className="text-[11px] text-slate-500">
          Opcional. Use letras minúsculas, números, hífen ou underline. Deixe vazio para gerar automaticamente.
        </p>
        {form.formState.errors.key && (
          <p className="text-xs text-rose-400">{form.formState.errors.key.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Descrição</label>
        <Textarea rows={3} placeholder="Quando utilizar este tipo" {...form.register("description")} />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/40 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-slate-100">Ativo</p>
          <p className="text-xs text-slate-400">Tipos inativos não aparecem no cadastro de reuniões.</p>
        </div>
        <input
          type="checkbox"
          checked={form.watch("is_active")}
          onChange={(event) => form.setValue("is_active", event.target.checked)}
          className="h-5 w-5 rounded border border-white/20 bg-slate-800 text-emerald-400 focus:ring-emerald-400"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-60"
        >
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
