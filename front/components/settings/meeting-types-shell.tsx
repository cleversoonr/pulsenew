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
import { useAreas, useCreateArea, useDeleteArea, useUpdateArea } from "@/hooks/use-areas";
import {
  useCreateMeetingType,
  useDeleteMeetingType,
  useMeetingTypes,
  useUpdateMeetingType,
} from "@/hooks/use-meeting-types";
import {
  useCreateTaskType,
  useDeleteTaskType,
  useTaskTypes,
  useUpdateTaskType,
} from "@/hooks/use-task-types";
import type { Area } from "@/lib/areas-types";
import type { MeetingType } from "@/lib/meetings-types";
import type { TaskType } from "@/lib/task-types";
import { agGridPtBrLocale } from "@/lib/ag-grid-locale";
import { toKey } from "@/lib/utils";

type FeedbackState = { type: "success" | "error"; message: string } | null;

const meetingTypeSchema = z.object({
  name: z.string().min(1, "Informe o nome do tipo"),
  description: z.string().optional(),
  prompt: z.string().optional(),
  is_active: z.boolean().default(true),
});

type MeetingTypeFormValues = z.infer<typeof meetingTypeSchema>;

const areaSchema = z.object({
  name: z.string().min(1, "Informe o nome"),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

type AreaFormValues = z.infer<typeof areaSchema>;

const taskTypeSchema = z.object({
  name: z.string().min(1, "Informe o nome"),
  description: z.string().optional(),
  workflow_json: z.string().optional(),
});

type TaskTypeFormValues = z.infer<typeof taskTypeSchema>;
type TaskTypeFormOutput = {
  key: string;
  name: string;
  description?: string | null;
  workflow: Record<string, unknown>;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return format(new Date(value), "dd/MM/yyyy HH:mm");
  } catch {
    return value;
  }
}

function parseWorkflow(text: string | undefined) {
  if (!text) return {};
  const trimmed = text.trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error();
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error("JSON inválido");
  }
}

export function SettingsShell() {
  const [activeTab, setActiveTab] = useState("meeting-types");
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const handleFeedback = useCallback((message: string, type: "success" | "error") => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  }, []);

  const handleError = useCallback((error: unknown, fallback = "Operação não concluída") => {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
        ? error
        : fallback;
    handleFeedback(message, "error");
  }, [handleFeedback]);

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
              <TabsTrigger value="task-types">Tipos de tarefa</TabsTrigger>
              <TabsTrigger value="areas">Áreas</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="mt-6 flex-1">
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/20 bg-slate-950/50 p-12 text-center text-sm text-slate-400">
                Configurações gerais em breve. Utilize as abas &quot;Tipos de reunião&quot; e &quot;Áreas&quot; para gerenciar o sistema.
              </div>
            </TabsContent>
            <TabsContent value="meeting-types" className="mt-6 flex-1">
              <MeetingTypesTab onSuccess={(message) => handleFeedback(message, "success")} onError={handleError} />
            </TabsContent>
            <TabsContent value="task-types" className="mt-6 flex-1">
              <TaskTypesTab onSuccess={(message) => handleFeedback(message, "success")} onError={handleError} />
            </TabsContent>
            <TabsContent value="areas" className="mt-6 flex-1">
              <AreasTab onSuccess={(message) => handleFeedback(message, "success")} onError={handleError} />
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
      description: "",
      prompt: "",
      is_active: true,
    },
  });

  useEffect(() => {
    createForm.reset({ name: "", description: "", prompt: "", is_active: true });
  }, [createForm, selectedAccountId]);

  const editForm = useForm<MeetingTypeFormValues>({
    resolver: zodResolver(meetingTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      prompt: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (editingType) {
      editForm.reset({
        name: editingType.name,
        description: editingType.description ?? "",
        prompt: editingType.prompt ?? "",
        is_active: editingType.is_active,
      });
    } else {
      editForm.reset({ name: "", description: "", prompt: "", is_active: true });
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
        flex: 1.4,
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
      { field: "key", headerName: "Chave", flex: 1, sortable: true },
      {
        headerName: "Prompt IA",
        field: "prompt",
        flex: 1.2,
        cellRenderer: (params: { data: MeetingType }) =>
          params.data.prompt ? (
            <span className="text-xs text-slate-300 line-clamp-2">{params.data.prompt}</span>
          ) : (
            <span className="text-xs text-slate-500 italic">Nenhum prompt</span>
          ),
      },
      {
        headerName: "Status",
        field: "is_active",
        flex: 0.8,
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
        flex: 1,
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
    const key = toKey(values.name);
    const payload = {
      account_id: selectedAccountId,
      name: values.name.trim(),
      key,
      description: values.description?.trim() || undefined,
      prompt: values.prompt?.trim() || undefined,
      is_active: values.is_active,
    };

    try {
      await createMeetingType.mutateAsync(payload);
      onSuccess("Tipo criado com sucesso");
      setIsCreateOpen(false);
      createForm.reset({ name: "", description: "", prompt: "", is_active: true });
    } catch (error) {
      onError(error, "Não foi possível criar o tipo de reunião");
    }
  };

  const handleEditSubmit = async (values: MeetingTypeFormValues) => {
    if (!editingType) return;
    const payload = {
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      prompt: values.prompt?.trim() || undefined,
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

function TaskTypesTab({
  onSuccess,
  onError,
}: {
  onSuccess: (message: string) => void;
  onError: (error: unknown, fallback?: string) => void;
}) {
  const accountsQuery = useAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTaskType, setEditingTaskType] = useState<TaskType | null>(null);

  useEffect(() => {
    if (!selectedAccountId && accountsQuery.data && accountsQuery.data.length > 0) {
      setSelectedAccountId(accountsQuery.data[0].id);
    }
  }, [accountsQuery.data, selectedAccountId]);

  const taskTypesQuery = useTaskTypes(selectedAccountId ?? undefined);
  const createTaskType = useCreateTaskType(selectedAccountId ?? undefined);
  const updateTaskType = useUpdateTaskType(selectedAccountId ?? undefined);
  const deleteTaskType = useDeleteTaskType(selectedAccountId ?? undefined);

  useEffect(() => {
    if (taskTypesQuery.isError && taskTypesQuery.error) {
      onError(taskTypesQuery.error, "Não foi possível carregar os tipos de tarefa");
    }
  }, [taskTypesQuery.error, taskTypesQuery.isError, onError]);

  const taskTypes = taskTypesQuery.data ?? [];

  const handleDeleteTaskType = useCallback(
    async (taskType: TaskType) => {
      if (!confirm(`Remover o tipo "${taskType.name}"?`)) return;
      try {
        await deleteTaskType.mutateAsync(taskType.id);
        onSuccess("Tipo de tarefa removido com sucesso");
      } catch (error) {
        onError(error, "Não foi possível remover o tipo de tarefa");
      }
    },
    [deleteTaskType, onError, onSuccess]
  );

  const columns = useMemo<ColDef<TaskType>[]>(() => {
    return [
      {
        headerName: "Chave",
        field: "key",
        width: 160,
        sortable: true,
      },
      {
        headerName: "Nome",
        field: "name",
        flex: 1.4,
        sortable: true,
        cellRenderer: (params: { data: TaskType }) => (
          <div className="flex flex-col">
            <span className="font-semibold text-white">{params.data.name}</span>
            {params.data.description && <span className="text-xs text-slate-400">{params.data.description}</span>}
          </div>
        ),
      },
      {
        headerName: "Workflow",
        field: "workflow",
        width: 160,
        valueFormatter: (params) => {
          const value = params.value as Record<string, unknown> | null | undefined;
          if (!value) return "—";
          const keys = Object.keys(value);
          return keys.length ? `${keys.length} chave(s)` : "—";
        },
      },
      {
        headerName: "Atualizado em",
        field: "updated_at",
        width: 180,
        valueFormatter: (params) => formatDate(params.value),
      },
      {
        headerName: "Ações",
        width: 140,
        pinned: "right",
        filter: false,
        sortable: false,
        cellRenderer: (params: { data: TaskType }) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400"
              onClick={() => setEditingTaskType(params.data)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-slate-300 hover:bg-rose-500/10 hover:text-rose-400"
              onClick={() => handleDeleteTaskType(params.data)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ];
  }, [handleDeleteTaskType]);

  const defaultColDef = useMemo<ColDef>(() => ({ resizable: true, sortable: false, filter: false }), []);

  const disabled = !selectedAccountId;
  const loadingTemplate = '<div class="ag-pulsehub-loader">Carregando tipos de tarefa...</div>';
  const emptyTemplate = '<div class="ag-pulsehub-empty">Nenhum tipo de tarefa cadastrado</div>';

  const handleCreate = async (values: TaskTypeFormOutput) => {
    if (!selectedAccountId) {
      onError("Selecione uma conta", "Selecione uma conta para cadastrar tipos de tarefa");
      return;
    }
    try {
      await createTaskType.mutateAsync({
        account_id: selectedAccountId,
        key: values.key,
        name: values.name,
        description: values.description,
        workflow: values.workflow,
      });
      onSuccess("Tipo de tarefa criado com sucesso");
      setIsCreateOpen(false);
    } catch (error) {
      onError(error, "Não foi possível criar o tipo de tarefa");
    }
  };

  const handleUpdate = async (values: TaskTypeFormOutput) => {
    if (!editingTaskType || !selectedAccountId) return;
    try {
      await updateTaskType.mutateAsync({
        taskTypeId: editingTaskType.id,
        payload: {
          name: values.name,
          description: values.description,
          workflow: values.workflow,
        },
      });
      onSuccess("Tipo de tarefa atualizado com sucesso");
      setEditingTaskType(null);
    } catch (error) {
      onError(error, "Não foi possível atualizar o tipo de tarefa");
    }
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Tipos de tarefa</p>
          <h2 className="text-xl font-semibold text-white">Catálogo de tipos de tarefa</h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedAccountId ?? ""}
            onChange={(event) => setSelectedAccountId(event.target.value || null)}
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
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button
                className="gap-2 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-60"
                disabled={disabled}
                title={disabled ? "Selecione uma conta para criar tipos" : undefined}
              >
                <Plus className="h-4 w-4" />
                Novo tipo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl border-white/10 bg-slate-950 text-slate-100">
              <DialogHeader>
                <DialogTitle>Criar tipo de tarefa</DialogTitle>
              </DialogHeader>
              <TaskTypeForm onSubmit={handleCreate} isSubmitting={createTaskType.isPending} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="ag-theme-quartz-dark ag-theme-pulsehub h-full min-h-[420px] w-full overflow-hidden rounded-2xl border border-white/5 bg-slate-950/60">
          <AgGridReact<TaskType>
            theme="legacy"
            rowData={taskTypes}
            columnDefs={columns}
            defaultColDef={defaultColDef}
            rowHeight={56}
            headerHeight={46}
            animateRows
            suppressCellFocus
            loading={taskTypesQuery.isLoading || taskTypesQuery.isFetching}
            overlayLoadingTemplate={loadingTemplate}
            overlayNoRowsTemplate={taskTypes.length === 0 ? emptyTemplate : undefined}
            localeText={agGridPtBrLocale}
          />
        </div>
      </div>

      {editingTaskType && (
        <Dialog open={!!editingTaskType} onOpenChange={(open) => !open && setEditingTaskType(null)}>
          <DialogContent className="max-w-3xl border-white/10 bg-slate-950 text-slate-100">
            <DialogHeader>
              <DialogTitle>Editar tipo de tarefa</DialogTitle>
            </DialogHeader>
            <TaskTypeForm
              initialData={editingTaskType}
              onSubmit={handleUpdate}
              isSubmitting={updateTaskType.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function TaskTypeForm({
  initialData,
  onSubmit,
  isSubmitting,
}: {
  initialData?: TaskType | null;
  onSubmit: (values: TaskTypeFormOutput) => Promise<void>;
  isSubmitting: boolean;
}) {
  const form = useForm<TaskTypeFormValues>({
    resolver: zodResolver(taskTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      workflow_json: "",
    },
  });

  useEffect(() => {
    if (!initialData) {
      form.reset({ name: "", description: "", workflow_json: "" });
      return;
    }

    form.reset({
      name: initialData.name,
      description: initialData.description ?? "",
      workflow_json:
        initialData.workflow && Object.keys(initialData.workflow).length
          ? JSON.stringify(initialData.workflow, null, 2)
          : "",
    });
  }, [initialData, form]);

  return (
    <form
      className="grid gap-5"
      onSubmit={form.handleSubmit(async (values) => {
        try {
          const workflow = parseWorkflow(values.workflow_json);
          const key = initialData?.key ?? toKey(values.name);
          await onSubmit({
            key,
            name: values.name.trim(),
            description: values.description?.trim() ? values.description.trim() : undefined,
            workflow,
          });
        } catch (error) {
          if (error instanceof Error) {
            form.setError("workflow_json", { message: error.message });
          } else {
            form.setError("workflow_json", { message: "JSON inválido" });
          }
        }
      })}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Nome</label>
          <Input placeholder="Correção de bug" {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="text-xs text-rose-400">{form.formState.errors.name.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Descrição</label>
        <Textarea rows={3} placeholder="Resumo do tipo" {...form.register("description")} />
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Workflow (JSON)</label>
        <Textarea
          rows={6}
          placeholder='{ "stages": ["ideation", "delivery"] }'
          {...form.register("workflow_json")}
        />
        {form.formState.errors.workflow_json && (
          <p className="text-xs text-rose-400">{form.formState.errors.workflow_json.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-60"
        >
          {isSubmitting ? "Salvando..." : initialData ? "Salvar alterações" : "Criar tipo"}
        </Button>
      </div>
    </form>
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
        <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Descrição</label>
        <Textarea rows={3} placeholder="Quando utilizar este tipo" {...form.register("description")} />
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Prompt para IA</label>
        <Textarea rows={4} placeholder="Instruções para a IA processar reuniões deste tipo..." {...form.register("prompt")} />
        <p className="text-[11px] text-slate-500">
          Opcional. Defina como a IA deve interpretar e extrair insights de reuniões deste tipo.
        </p>
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

// ===== Areas Tab =====
function AreasTab({
  onSuccess,
  onError,
}: {
  onSuccess: (message: string) => void;
  onError: (error: unknown, fallback?: string) => void;
}) {
  const accountsQuery = useAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);

  useEffect(() => {
    if (!selectedAccountId && accountsQuery.data && accountsQuery.data.length > 0) {
      setSelectedAccountId(accountsQuery.data[0].id);
    }
  }, [accountsQuery.data, selectedAccountId]);

  const areasQuery = useAreas(selectedAccountId ?? undefined);
  const createArea = useCreateArea(selectedAccountId ?? undefined);
  const updateArea = useUpdateArea(selectedAccountId ?? undefined);
  const deleteArea = useDeleteArea(selectedAccountId ?? undefined);

  const areas = areasQuery.data ?? [];
  const isLoading = accountsQuery.isLoading || areasQuery.isLoading;
  const showEmptyState = !isLoading && !areasQuery.isError && areas.length === 0 && selectedAccountId;

  useEffect(() => {
    if (areasQuery.isError && areasQuery.error) {
      onError(areasQuery.error, "Não foi possível carregar as áreas");
    }
  }, [areasQuery.error, areasQuery.isError, onError]);

  const createForm = useForm<AreaFormValues>({
    resolver: zodResolver(areaSchema),
    defaultValues: {
      name: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    createForm.reset({ name: "", description: "", is_active: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  const editForm = useForm<AreaFormValues>({
    resolver: zodResolver(areaSchema),
    defaultValues: {
      name: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (editingArea) {
      editForm.reset({
        name: editingArea.name,
        description: editingArea.description ?? "",
        is_active: editingArea.is_active,
      });
    } else {
      editForm.reset({ name: "", description: "", is_active: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingArea]);

  const handleDelete = useCallback(
    async (area: Area) => {
      const confirmed = window.confirm(`Remover a área "${area.name}"?`);
      if (!confirmed) return;
      try {
        await deleteArea.mutateAsync(area.id);
        onSuccess("Área removida com sucesso");
      } catch (error) {
        onError(error, "Não foi possível remover a área");
      }
    },
    [deleteArea, onError, onSuccess]
  );

  const handleToggleStatus = useCallback(
    async (area: Area) => {
      try {
        await updateArea.mutateAsync({
          areaId: area.id,
          payload: { is_active: !area.is_active },
        });
        onSuccess(area.is_active ? "Área desativada com sucesso" : "Área ativada com sucesso");
      } catch (error) {
        onError(error, "Não foi possível alterar o status da área");
      }
    },
    [onError, onSuccess, updateArea]
  );

  const columns = useMemo<ColDef<Area>[]>(() => {
    return [
      {
        headerName: "Nome",
        field: "name",
        flex: 1.4,
        sortable: true,
        cellRenderer: (params: { data: Area }) => (
          <div className="flex flex-col">
            <span className="font-semibold text-white">{params.data.name}</span>
            <span className="text-xs text-slate-400">{params.data.key}</span>
          </div>
        ),
      },
      {
        headerName: "Descrição",
        field: "description",
        flex: 1.6,
        valueFormatter: (params) => params.value || "—",
      },
      {
        headerName: "Ativa",
        field: "is_active",
        width: 110,
        cellRenderer: (params: { value: boolean }) => (
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
        headerName: "Ações",
        width: 130,
        pinned: "right",
        filter: false,
        sortable: false,
        cellRenderer: (params: { data: Area }) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400"
              onClick={() => setEditingArea(params.data)}
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
  }, [handleDelete]);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: false,
      filter: false,
    }),
    []
  );

  const handleCreateSubmit = async (values: AreaFormValues) => {
    if (!selectedAccountId) {
      onError("Selecione uma conta para cadastrar áreas");
      return;
    }
    try {
      await createArea.mutateAsync({
        key: toKey(values.name),
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        is_active: values.is_active,
      });
      onSuccess("Área criada com sucesso");
      setIsCreateOpen(false);
      createForm.reset();
    } catch (error) {
      onError(error, "Não foi possível criar a área");
    }
  };

  const handleEditSubmit = async (values: AreaFormValues) => {
    if (!editingArea) return;
    try {
      await updateArea.mutateAsync({
        areaId: editingArea.id,
        payload: {
          name: values.name.trim(),
          description: values.description?.trim() || undefined,
          is_active: values.is_active,
        },
      });
      onSuccess("Área atualizada com sucesso");
      setEditingArea(null);
      editForm.reset();
    } catch (error) {
      onError(error, "Não foi possível atualizar a área");
    }
  };

  const loadingTemplate = '<div class="ag-pulsehub-loader">Carregando áreas...</div>';
  const emptyTemplate = '<div class="ag-pulsehub-empty">Nenhuma área cadastrada</div>';

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <select
            value={selectedAccountId ?? ""}
            onChange={(e) => setSelectedAccountId(e.target.value || null)}
            disabled={accountsQuery.isLoading || !accountsQuery.data || accountsQuery.data.length === 0}
            className="h-10 min-w-[220px] rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
          >
            <option value="" disabled>
              Selecione uma conta
            </option>
            {accountsQuery.data?.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button
              className="gap-2 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
              disabled={!selectedAccountId}
            >
              <Plus className="h-4 w-4" />
              Nova área
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl border-white/10 bg-slate-950 text-slate-100">
            <DialogHeader>
              <DialogTitle>Criar área</DialogTitle>
            </DialogHeader>
            <AreaForm
              form={createForm}
              onSubmit={handleCreateSubmit}
              isSubmitting={createArea.isPending}
              submitLabel="Criar área"
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-hidden rounded-2xl border border-white/5 bg-slate-950/60">
        <div className="ag-theme-quartz-dark ag-theme-pulsehub h-full w-full">
          <AgGridReact<Area>
            theme="legacy"
            rowData={areas}
            columnDefs={columns}
            defaultColDef={defaultColDef}
            rowHeight={56}
            headerHeight={46}
            animateRows
            suppressCellFocus
            loading={isLoading}
            overlayLoadingTemplate={loadingTemplate}
            overlayNoRowsTemplate={showEmptyState ? emptyTemplate : undefined}
            localeText={agGridPtBrLocale}
          />
        </div>
      </div>

      {editingArea && (
        <Dialog open={!!editingArea} onOpenChange={(open) => !open && setEditingArea(null)}>
          <DialogContent className="max-w-2xl border-white/10 bg-slate-950 text-slate-100">
            <DialogHeader>
              <DialogTitle>Editar área</DialogTitle>
            </DialogHeader>
            <AreaForm
              form={editForm}
              onSubmit={handleEditSubmit}
              isSubmitting={updateArea.isPending}
              submitLabel="Salvar alterações"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function AreaForm({
  form,
  onSubmit,
  isSubmitting,
  submitLabel,
}: {
  form: UseFormReturn<AreaFormValues>;
  onSubmit: (values: AreaFormValues) => Promise<void>;
  isSubmitting: boolean;
  submitLabel: string;
}) {
  return (
    <form className="grid gap-6" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Nome</label>
          <Input placeholder="Desenvolvimento" {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="text-xs text-rose-400">{form.formState.errors.name.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Descrição</label>
        <Textarea placeholder="Descrição opcional da área..." rows={3} {...form.register("description")} />
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_active" {...form.register("is_active")} className="h-4 w-4" />
        <label htmlFor="is_active" className="text-sm text-slate-300">
          Área ativa
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-60"
        >
          {isSubmitting ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
