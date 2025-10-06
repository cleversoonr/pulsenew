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
import { Textarea } from "@/components/ui/textarea";
import { useAccounts, useProjects, useUsers } from "@/hooks/use-admin";
import { useTaskTypes } from "@/hooks/use-task-types";
import {
  useCreateTask,
  useDeleteTask,
  useTasks,
  useUpdateTask,
} from "@/hooks/use-tasks";
import type { Task } from "@/lib/tasks";
import type { TaskType } from "@/lib/task-types";
import { agGridPtBrLocale } from "@/lib/ag-grid-locale";
import { Edit, Plus, Trash2 } from "lucide-react";

const statusOptions = [
  { value: "backlog", label: "Backlog" },
  { value: "planned", label: "Planejado" },
  { value: "in_progress", label: "Em progresso" },
  { value: "review", label: "Em revisão" },
  { value: "blocked", label: "Bloqueado" },
  { value: "done", label: "Concluído" },
] as const;

const priorityOptions = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "critical", label: "Crítica" },
] as const;

const toOptionalNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const taskFormSchema = z.object({
  title: z.string().min(1, "Informe o título"),
  project_id: z.string().uuid({ message: "Selecione o projeto" }),
  task_type_id: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(statusOptions.map((option) => option.value) as [string, ...string[]]),
  priority: z.enum(priorityOptions.map((option) => option.value) as [string, ...string[]]),
  estimate_hours: z.preprocess(toOptionalNumber, z.number().int().min(0).optional()),
  actual_hours: z.preprocess(toOptionalNumber, z.number().int().min(0).optional()),
  story_points: z.preprocess(toOptionalNumber, z.number().min(0).optional()),
  due_date: z.string().optional(),
  assignee_id: z.string().uuid().optional().or(z.literal("")),
  description: z.string().optional(),
  external_ref: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

function formatDate(value: string | null | undefined, pattern = "dd/MM/yyyy") {
  if (!value) return "—";
  try {
    return format(new Date(value), pattern);
  } catch {
    return value;
  }
}

export function TaskShell() {
  const accountsQuery = useAccounts();
  const accounts = accountsQuery.data ?? [];
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const defaultAccountId = accounts.length > 0 ? accounts[0].id : null;

  useEffect(() => {
    if (!selectedAccountId && defaultAccountId) {
      setSelectedAccountId(defaultAccountId);
    }
  }, [defaultAccountId, selectedAccountId]);

  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      project_id: projectFilter,
      status: statusFilter,
      priority: priorityFilter,
    }),
    [projectFilter, statusFilter, priorityFilter]
  );

  const tasksQuery = useTasks(selectedAccountId ?? undefined, filters);
  const createTask = useCreateTask(selectedAccountId ?? undefined, filters);
  const updateTask = useUpdateTask(selectedAccountId ?? undefined, filters);
  const deleteTask = useDeleteTask(selectedAccountId ?? undefined, filters);

  const projectsQuery = useProjects(selectedAccountId ?? undefined);
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const taskTypesQuery = useTaskTypes(selectedAccountId ?? undefined);
  const taskTypes = useMemo(() => taskTypesQuery.data ?? [], [taskTypesQuery.data]);
  const usersQuery = useUsers(selectedAccountId ?? undefined);
  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);

  const projectMap = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((project) => map.set(project.id, project.name));
    return map;
  }, [projects]);

  const taskTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    taskTypes.forEach((type) => map.set(type.id, type.name));
    return map;
  }, [taskTypes]);

  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((user) => map.set(user.id, user.full_name));
    return map;
  }, [users]);

  const gridData = tasksQuery.data ?? [];

  const handleDelete = useCallback(
    async (task: Task) => {
      if (!confirm(`Remover a tarefa "${task.title}"?`)) return;
      try {
        await deleteTask.mutateAsync(task.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível remover a tarefa";
        alert(message);
      }
    },
    [deleteTask]
  );

  const columns = useMemo<ColDef<Task>[]>(() => {
    return [
      {
        headerName: "Título",
        field: "title",
        flex: 1.8,
        sortable: true,
        cellRenderer: (params: { data: Task }) => (
          <div className="flex flex-col">
            <span className="font-semibold text-white">{params.data.title}</span>
            {params.data.description && <span className="text-xs text-slate-400">{params.data.description}</span>}
          </div>
        ),
      },
      {
        headerName: "Projeto",
        field: "project_id",
        width: 180,
        valueFormatter: (params) => projectMap.get(params.value as string) ?? "—",
      },
      {
        headerName: "Tipo",
        field: "task_type_id",
        width: 160,
        valueFormatter: (params) => {
          const value = params.value as string | null | undefined;
          if (!value) return "—";
          return taskTypeMap.get(value) ?? "—";
        },
      },
      {
        headerName: "Status",
        field: "status",
        width: 140,
        cellRenderer: (params: { value: string }) => {
          const option = statusOptions.find((item) => item.value === params.value);
          const tone =
            params.value === "done"
              ? "bg-emerald-500/20 text-emerald-100"
              : params.value === "blocked"
              ? "bg-rose-500/20 text-rose-100"
              : "bg-slate-500/20 text-slate-100";
          return <Badge className={`rounded-full ${tone}`}>{option?.label ?? params.value}</Badge>;
        },
      },
      {
        headerName: "Prioridade",
        field: "priority",
        width: 140,
        cellRenderer: (params: { value: string }) => {
          const option = priorityOptions.find((item) => item.value === params.value);
          const tone =
            params.value === "critical"
              ? "bg-rose-500/20 text-rose-100"
              : params.value === "high"
              ? "bg-amber-500/20 text-amber-100"
              : "bg-slate-500/20 text-slate-100";
          return <Badge className={`rounded-full ${tone}`}>{option?.label ?? params.value}</Badge>;
        },
      },
      {
        headerName: "Responsável",
        field: "assignee_id",
        width: 180,
        valueFormatter: (params) => {
          const value = params.value as string | null | undefined;
          if (!value) return "—";
          return userMap.get(value) ?? "—";
        },
      },
      {
        headerName: "Entrega",
        field: "due_date",
        width: 140,
        valueFormatter: (params) => formatDate(params.value as string | null | undefined),
      },
      {
        headerName: "Pontos",
        field: "story_points",
        width: 120,
        valueFormatter: (params) => (params.value != null ? `${params.value}` : "—"),
      },
      {
        headerName: "Atualizado em",
        field: "updated_at",
        width: 180,
        valueFormatter: (params) => formatDate(params.value as string | null | undefined, "dd/MM/yyyy HH:mm"),
      },
      {
        headerName: "Ações",
        width: 140,
        pinned: "right",
        filter: false,
        sortable: false,
        cellRenderer: (params: { data: Task }) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400"
              onClick={() => setEditingTask(params.data)}
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
  }, [handleDelete, projectMap, taskTypeMap, userMap]);

  const defaultColDef = useMemo<ColDef>(() => ({ resizable: true, sortable: false, filter: false }), []);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const handleCreate = async (values: TaskFormValues) => {
    if (!selectedAccountId) {
      alert("Selecione uma conta para criar tarefas");
      return;
    }
    try {
      await createTask.mutateAsync({
        account_id: selectedAccountId,
        project_id: values.project_id,
        title: values.title.trim(),
        status: values.status,
        priority: values.priority,
        task_type_id: values.task_type_id ? values.task_type_id : undefined,
        description: values.description?.trim() || undefined,
        estimate_hours: values.estimate_hours,
        actual_hours: values.actual_hours,
        story_points: values.story_points,
        due_date: values.due_date || undefined,
        assignee_id: values.assignee_id ? values.assignee_id : undefined,
        external_ref: values.external_ref?.trim() || undefined,
      });
      setIsCreateOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível criar a tarefa";
      alert(message);
    }
  };

  const handleUpdate = async (values: TaskFormValues) => {
    if (!editingTask || !selectedAccountId) return;
    try {
      await updateTask.mutateAsync({
        taskId: editingTask.id,
        payload: {
          title: values.title.trim(),
          project_id: values.project_id,
          status: values.status,
          priority: values.priority,
          task_type_id: values.task_type_id ? values.task_type_id : undefined,
          description: values.description?.trim() || undefined,
          estimate_hours: values.estimate_hours,
          actual_hours: values.actual_hours,
          story_points: values.story_points,
          due_date: values.due_date || undefined,
          assignee_id: values.assignee_id ? values.assignee_id : undefined,
          external_ref: values.external_ref?.trim() || undefined,
        },
      });
      setEditingTask(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível atualizar a tarefa";
      alert(message);
    }
  };

  const disabled = !selectedAccountId;
  const loadingTemplate = '<div class="ag-pulsehub-loader">Carregando tarefas...</div>';
  const emptyTemplate = '<div class="ag-pulsehub-empty">Nenhuma tarefa cadastrada</div>';

  return (
    <section className="flex min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-950/95 to-slate-900 text-slate-100">
      <SideNav />
      <div className="flex flex-1 flex-col overflow-hidden px-8 pb-8 pt-6">
        <TopBar />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Tarefas</p>
            <h1 className="text-2xl font-semibold text-white">Planejamento e Execução</h1>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedAccountId ?? ""}
              onChange={(event) => setSelectedAccountId(event.target.value || null)}
              disabled={accountsQuery.isLoading || accounts.length === 0}
              className="h-10 min-w-[200px] rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
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
            <select
              value={projectFilter ?? ""}
              onChange={(event) => setProjectFilter(event.target.value || null)}
              disabled={!selectedAccountId || projectsQuery.isLoading}
              className="h-10 min-w-[180px] rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            >
              <option value="">Todos os projetos</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter ?? ""}
              onChange={(event) => setStatusFilter(event.target.value || null)}
              className="h-10 rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            >
              <option value="">Todos os status</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={priorityFilter ?? ""}
              onChange={(event) => setPriorityFilter(event.target.value || null)}
              className="h-10 rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            >
              <option value="">Todas as prioridades</option>
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button
                  className="gap-2 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-60"
                  disabled={disabled}
                  title={disabled ? "Selecione uma conta para criar tarefas" : undefined}
                >
                  <Plus className="h-4 w-4" />
                  Nova tarefa
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl border-white/10 bg-slate-950 text-slate-100">
                <DialogHeader>
                  <DialogTitle>Criar tarefa</DialogTitle>
                </DialogHeader>
                <TaskForm
                  projects={projects}
                  taskTypes={taskTypes}
                  users={users}
                  onSubmit={handleCreate}
                  isSubmitting={createTask.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="mt-6 flex-1 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="ag-theme-quartz-dark ag-theme-pulsehub h-full min-h-[420px] w-full overflow-hidden rounded-2xl border border-white/5 bg-slate-950/60">
            <AgGridReact<Task>
              theme="legacy"
              rowData={gridData}
              columnDefs={columns}
              defaultColDef={defaultColDef}
              rowHeight={56}
              headerHeight={46}
              animateRows
              suppressCellFocus
              loading={tasksQuery.isLoading || tasksQuery.isFetching}
              overlayLoadingTemplate={loadingTemplate}
              overlayNoRowsTemplate={gridData.length === 0 ? emptyTemplate : undefined}
              localeText={agGridPtBrLocale}
            />
          </div>
        </div>

        {editingTask && (
          <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
            <DialogContent className="max-w-3xl border-white/10 bg-slate-950 text-slate-100">
              <DialogHeader>
                <DialogTitle>Editar tarefa</DialogTitle>
              </DialogHeader>
              <TaskForm
                initialData={editingTask}
                projects={projects}
                taskTypes={taskTypes}
                users={users}
                onSubmit={handleUpdate}
                isSubmitting={updateTask.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </section>
  );
}

type TaskFormProps = {
  initialData?: Task | null;
  projects: Array<{ id: string; name: string }>;
  taskTypes: TaskType[];
  users: Array<{ id: string; full_name: string }>;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  isSubmitting: boolean;
};

function TaskForm({ initialData, projects, taskTypes, users, onSubmit, isSubmitting }: TaskFormProps) {
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      project_id: "",
      task_type_id: "",
      status: "backlog",
      priority: "medium",
      estimate_hours: undefined,
      actual_hours: undefined,
      story_points: undefined,
      due_date: undefined,
      assignee_id: "",
      description: "",
      external_ref: "",
    },
  });

  useEffect(() => {
    if (!initialData) {
      form.reset({
        title: "",
        project_id: projects[0]?.id ?? "",
        task_type_id: "",
        status: "backlog",
        priority: "medium",
        estimate_hours: undefined,
        actual_hours: undefined,
        story_points: undefined,
        due_date: undefined,
        assignee_id: "",
        description: "",
        external_ref: "",
      });
      return;
    }

    form.reset({
      title: initialData.title,
      project_id: initialData.project_id,
      task_type_id: initialData.task_type_id ?? "",
      status: initialData.status,
      priority: initialData.priority,
      estimate_hours: initialData.estimate_hours ?? undefined,
      actual_hours: initialData.actual_hours ?? undefined,
      story_points: initialData.story_points ?? undefined,
      due_date: initialData.due_date ? initialData.due_date.slice(0, 10) : undefined,
      assignee_id: initialData.assignee_id ?? "",
      description: initialData.description ?? "",
      external_ref: initialData.external_ref ?? "",
    });
  }, [initialData, form, projects]);

  return (
    <form
      className="grid gap-5"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(values);
      })}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Título</label>
          <Input placeholder="Implementar fluxo X" {...form.register("title")} />
          {form.formState.errors.title && (
            <p className="text-xs text-rose-400">{form.formState.errors.title.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Projeto</label>
          <select
            {...form.register("project_id")}
            className="h-10 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {form.formState.errors.project_id && (
            <p className="text-xs text-rose-400">{form.formState.errors.project_id.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Status</label>
          <select
            {...form.register("status")}
            className="h-10 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Prioridade</label>
          <select
            {...form.register("priority")}
            className="h-10 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
          >
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Tipo</label>
          <select
            {...form.register("task_type_id")}
            className="h-10 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
          >
            <option value="">Sem tipo</option>
            {taskTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Estimativa (h)</label>
          <Input type="number" min={0} step={1} {...form.register("estimate_hours")} />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Horas reais</label>
          <Input type="number" min={0} step={1} {...form.register("actual_hours")} />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Story points</label>
          <Input type="number" min={0} step={0.5} {...form.register("story_points")} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Entrega</label>
          <Input type="date" {...form.register("due_date")} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Responsável</label>
          <select
            {...form.register("assignee_id")}
            className="h-10 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
          >
            <option value="">Sem responsável</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Referência externa</label>
        <Input placeholder="ID no Jira/Azure DevOps" {...form.register("external_ref")} />
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Descrição</label>
        <Textarea rows={4} placeholder="Detalhes da tarefa" {...form.register("description")} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-60"
        >
          {isSubmitting ? "Salvando..." : initialData ? "Salvar alterações" : "Criar tarefa"}
        </Button>
      </div>
    </form>
  );
}
