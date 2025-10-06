"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
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

import { Plus, Edit, Trash2 } from "lucide-react";

import { SideNav } from "@/components/dashboard/side-nav";
import { TopBar } from "@/components/dashboard/top-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { useAccounts, useProjects, useUsers } from "@/hooks/use-admin";
import {
  useAvailableTasks,
  useCreateSprint,
  useDeleteSprint,
  useSprints,
  useUpdateSprint,
} from "@/hooks/use-sprints";
import type {
  CreateSprintInput,
  Sprint,
  SprintTask,
  TaskSummary,
  UpdateSprintInput,
} from "@/lib/sprints-types";
import { agGridPtBrLocale } from "@/lib/ag-grid-locale";

const sprintStatusOptions = [
  { value: "planning", label: "Planejamento" },
  { value: "active", label: "Em andamento" },
  { value: "closed", label: "Encerrado" },
] as const;

const ALL_PROJECTS_OPTION = "__all__";
const NO_PROJECT_OPTION = "__none__";

const toOptionalNumber = (value: unknown) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const sprintFormSchema = z.object({
  name: z.string().min(1, "Informe o nome do sprint"),
  goal: z.string().optional(),
  sprint_number: z
    .preprocess(toOptionalNumber, z.number().int().nonnegative().optional())
    .optional()
    .or(z.literal(undefined)),
  starts_at: z.string().min(1, "Informe a data de início"),
  ends_at: z.string().min(1, "Informe a data de término"),
  status: z.string().min(1),
  tasks: z
    .array(
      z.object({
        task_id: z.string().uuid({ message: "Selecione uma tarefa" }),
        planned_hours: z.preprocess(toOptionalNumber, z.number().int().nonnegative().optional()),
        planned_points: z.preprocess(toOptionalNumber, z.number().nonnegative().optional()),
        status: z.string().default("committed"),
        notes: z.string().optional(),
        position: z.preprocess(toOptionalNumber, z.number().int().optional()),
      })
    )
    .optional()
    .default([]),
  capacities: z
    .array(
      z.object({
        user_id: z.string().uuid({ message: "Selecione o usuário" }),
        week_start: z.string().min(1, "Informe a semana"),
        hours: z.preprocess(toOptionalNumber, z.number().int().min(0)),
      })
    )
    .optional()
    .default([]),
});

export type SprintFormValues = z.infer<typeof sprintFormSchema>;

function formatDate(value: string | null | undefined, pattern = "dd/MM/yyyy") {
  if (!value) return "—";
  try {
    return format(new Date(value), pattern);
  } catch {
    return value;
  }
}

function calculateTotals(tasks: SprintTask[]) {
  return tasks.reduce(
    (acc, item) => {
      if (item.planned_hours) acc.hours += item.planned_hours;
      if (item.planned_points) acc.points += item.planned_points;
      return acc;
    },
    { hours: 0, points: 0 }
  );
}

export function SprintShell() {
  const accountsQuery = useAccounts();
  const accounts = accountsQuery.data ?? [];
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const activeAccountId =
    selectedAccountId && accounts.some((account) => account.id === selectedAccountId)
      ? selectedAccountId
      : accounts[0]?.id ?? null;

  const projectsQuery = useProjects(activeAccountId ?? undefined);
  const projects = projectsQuery.data ?? [];
  const [projectScope, setProjectScope] = useState<string>(ALL_PROJECTS_OPTION);
  const isAllProjects = projectScope === ALL_PROJECTS_OPTION;
  const isNoProject = projectScope === NO_PROJECT_OPTION;
  const selectedProjectIsValid =
    !isAllProjects && !isNoProject && projects.some((project) => project.id === projectScope);
  const activeProjectId = selectedProjectIsValid ? projectScope : null;
  const projectFilterId = selectedProjectIsValid ? projectScope : undefined;
  const withoutProjectFilter = isNoProject;
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    setProjectScope(ALL_PROJECTS_OPTION);
  }, [activeAccountId]);

  useEffect(() => {
    if (!selectedProjectIsValid && !isAllProjects && !isNoProject) {
      setProjectScope(ALL_PROJECTS_OPTION);
    }
  }, [isAllProjects, isNoProject, selectedProjectIsValid]);

  const appliedStatus = statusFilter !== "all" ? statusFilter : undefined;

  const sprintsQuery = useSprints(
    activeAccountId ?? undefined,
    projectFilterId,
    appliedStatus,
    withoutProjectFilter
  );

  const createSprint = useCreateSprint(
    activeAccountId ?? undefined,
    projectFilterId,
    appliedStatus,
    withoutProjectFilter
  );
  const updateSprint = useUpdateSprint(
    activeAccountId ?? undefined,
    projectFilterId,
    appliedStatus,
    withoutProjectFilter
  );
  const deleteSprint = useDeleteSprint(
    activeAccountId ?? undefined,
    projectFilterId,
    appliedStatus,
    withoutProjectFilter
  );

  const tasksOptionsQuery = useAvailableTasks(activeAccountId ?? undefined, activeProjectId ?? undefined, undefined);
  const usersQuery = useUsers(activeAccountId ?? undefined);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showFeedback = useCallback((message: string, type: "success" | "error") => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  }, []);

  const handleDelete = useCallback(
    async (sprint: Sprint) => {
      if (!confirm(`Remover o sprint "${sprint.name}"?`)) return;
      try {
        await deleteSprint.mutateAsync(sprint.id);
        showFeedback("Sprint removido com sucesso", "success");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível remover o sprint";
        showFeedback(message, "error");
      }
    },
    [deleteSprint, showFeedback]
  );

  const gridData = sprintsQuery.data ?? [];

  const columns = useMemo<ColDef<Sprint>[]>(() => {
    return [
      {
        headerName: "Sprint",
        field: "name",
        flex: 1.6,
        sortable: true,
        cellRenderer: (params: { data: Sprint }) => (
          <div className="flex flex-col">
            <span className="font-semibold text-white">{params.data.name}</span>
            {params.data.goal && <span className="text-xs text-slate-400">{params.data.goal}</span>}
          </div>
        ),
      },
      {
        headerName: "Número",
        field: "sprint_number",
        width: 110,
        valueFormatter: (params) => params.value ?? "—",
      },
      {
        headerName: "Status",
        field: "status",
        width: 140,
        cellRenderer: (params: { value: string }) => {
          const status = sprintStatusOptions.find((option) => option.value === params.value)?.label ?? params.value;
          const tone =
            params.value === "active"
              ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
              : params.value === "planning"
              ? "border-sky-400/50 bg-sky-500/15 text-sky-100"
              : "border-slate-500/40 bg-slate-500/15 text-slate-200";
          return <Badge className={`rounded-full ${tone}`}>{status}</Badge>;
        },
      },
      {
        headerName: "Início",
        field: "starts_at",
        width: 140,
        valueFormatter: (params) => formatDate(params.value),
      },
      {
        headerName: "Fim",
        field: "ends_at",
        width: 140,
        valueFormatter: (params) => formatDate(params.value),
      },
      {
        headerName: "Itens",
        valueGetter: (params) => params.data.tasks.length,
        width: 100,
      },
      {
        headerName: "Horas planejadas",
        valueGetter: (params) => calculateTotals(params.data.tasks).hours,
        width: 170,
      },
      {
        headerName: "Pts planejados",
        valueGetter: (params) => calculateTotals(params.data.tasks).points,
        width: 160,
      },
      {
        headerName: "Capacidade (h)",
        valueGetter: (params) =>
          params.data.capacities.reduce((acc, item) => acc + (item.hours ?? 0), 0),
        width: 160,
      },
      {
        headerName: "Ações",
        cellRenderer: (params: { data: Sprint }) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400"
              onClick={() => setEditingSprint(params.data)}
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
        width: 120,
        pinned: "right",
        filter: false,
        sortable: false,
        suppressHeaderMenuButton: true,
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

  const handleCreate = async (values: SprintFormValues) => {
    if (!activeAccountId) {
      showFeedback("Selecione uma conta antes de criar o sprint", "error");
      return;
    }
    if (!activeProjectId && (values.tasks?.length ?? 0) > 0) {
      showFeedback("Associe um projeto para incluir tarefas neste sprint", "error");
      return;
    }
    const payload: CreateSprintInput = {
      account_id: activeAccountId,
      project_id: activeProjectId ?? null,
      name: values.name.trim(),
      goal: values.goal?.trim() || undefined,
      sprint_number: values.sprint_number ?? undefined,
      starts_at: values.starts_at,
      ends_at: values.ends_at,
      status: values.status,
      tasks: (values.tasks ?? []).map((item) => ({
        task_id: item.task_id,
        planned_hours: item.planned_hours ?? undefined,
        planned_points: item.planned_points ?? undefined,
        status: item.status ?? "committed",
        notes: item.notes?.trim() || undefined,
        position: item.position ?? undefined,
      })),
      capacities: (values.capacities ?? []).map((item) => ({
        user_id: item.user_id,
        week_start: item.week_start,
        hours: item.hours ?? 0,
      })),
    };

    try {
      await createSprint.mutateAsync(payload);
      showFeedback("Sprint criado com sucesso", "success");
      setIsCreateOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível criar o sprint";
      showFeedback(message, "error");
    }
  };

  const handleUpdate = async (values: SprintFormValues) => {
    if (!editingSprint) return;
    const payload: UpdateSprintInput = {
      name: values.name.trim(),
      goal: values.goal?.trim() || undefined,
      sprint_number: values.sprint_number ?? undefined,
      starts_at: values.starts_at,
      ends_at: values.ends_at,
      status: values.status,
      tasks: (values.tasks ?? []).map((item) => ({
        task_id: item.task_id,
        planned_hours: item.planned_hours ?? undefined,
        planned_points: item.planned_points ?? undefined,
        status: item.status ?? "committed",
        notes: item.notes?.trim() || undefined,
        position: item.position ?? undefined,
      })),
      capacities: (values.capacities ?? []).map((item) => ({
        user_id: item.user_id,
        week_start: item.week_start,
        hours: item.hours ?? 0,
      })),
    };

    if (!editingSprint.project_id && (payload.tasks?.length ?? 0) > 0) {
      showFeedback("Associe um projeto ao sprint antes de incluir tarefas", "error");
      return;
    }

    try {
      await updateSprint.mutateAsync({ sprintId: editingSprint.id, payload });
      showFeedback("Sprint atualizado com sucesso", "success");
      setEditingSprint(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível atualizar o sprint";
      showFeedback(message, "error");
    }
  };

  const disableActions = !activeAccountId;
  const tasksOptions = tasksOptionsQuery.data ?? [];
  const usersOptions = usersQuery.data ?? [];

  const loadingTemplate = '<div class="ag-pulsehub-loader">Carregando sprints...</div>';
  const emptyTemplate = '<div class="ag-pulsehub-empty">Nenhum sprint cadastrado</div>';

  return (
    <section className="flex min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-950/95 to-slate-900 text-slate-100">
      <SideNav />
      <div className="flex flex-1 flex-col overflow-hidden px-8 pb-8 pt-6">
        <TopBar />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Sprints</p>
            <h1 className="text-2xl font-semibold text-white">Planejamento de Sprints</h1>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={activeAccountId ?? ""}
              onChange={(event) => {
                setSelectedAccountId(event.target.value || null);
                setProjectScope(ALL_PROJECTS_OPTION);
              }}
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
              value={projectScope}
              onChange={(event) => setProjectScope(event.target.value)}
              disabled={!activeAccountId || projectsQuery.isLoading}
              className="h-10 min-w-[200px] rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            >
              <option value={ALL_PROJECTS_OPTION}>Todos os projetos</option>
              <option value={NO_PROJECT_OPTION}>Sem projeto</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            >
              <option value="all">Todos</option>
              {sprintStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button
                  className="gap-2 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-60"
                  disabled={disableActions}
                  title={disableActions ? "Selecione uma conta para criar um sprint" : undefined}
                >
                  <Plus className="h-4 w-4" />
                  Novo sprint
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl border-white/10 bg-slate-950 text-slate-100">
                <DialogHeader>
                  <DialogTitle>Criar sprint</DialogTitle>
                </DialogHeader>
                <SprintForm
                  tasksOptions={tasksOptions}
                  usersOptions={usersOptions}
                  onSubmit={handleCreate}
                  isSubmitting={createSprint.isPending}
                  defaultStatus={statusFilter !== "all" ? statusFilter : "planning"}
                />
              </DialogContent>
            </Dialog>
          </div>
          {activeAccountId && !projectsQuery.isLoading && projects.length === 0 ? (
            <p className="w-full text-sm text-amber-300">
              Você pode criar sprints sem projeto. Cadastre um projeto se quiser associar tarefas específicas.
            </p>
          ) : (
            !activeProjectId && activeAccountId && (
              <p className="w-full text-sm text-slate-300">
                Tarefas só podem ser adicionadas quando um projeto é selecionado.
              </p>
            )
          )}
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
            <AgGridReact<Sprint>
              theme="legacy"
              rowData={gridData}
              columnDefs={columns}
              defaultColDef={defaultColDef}
              domLayout="normal"
              rowHeight={56}
              headerHeight={46}
              animateRows
              suppressCellFocus
              loading={sprintsQuery.isLoading || sprintsQuery.isFetching}
              overlayLoadingTemplate={loadingTemplate}
              overlayNoRowsTemplate={gridData.length === 0 ? emptyTemplate : undefined}
              localeText={agGridPtBrLocale}
            />
          </div>
        </div>

        {editingSprint && (
          <Dialog open={!!editingSprint} onOpenChange={(open) => !open && setEditingSprint(null)}>
            <DialogContent className="max-w-3xl border-white/10 bg-slate-950 text-slate-100">
              <DialogHeader>
                <DialogTitle>Editar sprint</DialogTitle>
              </DialogHeader>
              <SprintForm
                tasksOptions={tasksOptions}
                usersOptions={usersOptions}
                initialData={editingSprint}
                onSubmit={handleUpdate}
                isSubmitting={updateSprint.isPending}
                defaultStatus={editingSprint.status}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </section>
  );
}

function SprintForm({
  tasksOptions,
  usersOptions,
  onSubmit,
  isSubmitting,
  initialData,
  defaultStatus,
}: {
  tasksOptions: TaskSummary[];
  usersOptions: { id: string; full_name: string; email: string }[];
  onSubmit: (values: SprintFormValues) => Promise<void>;
  isSubmitting: boolean;
  initialData?: Sprint | null;
  defaultStatus?: string;
}) {
  const form = useForm<SprintFormValues>({
    resolver: zodResolver(sprintFormSchema),
    defaultValues: {
      name: "",
      goal: "",
      sprint_number: undefined,
      starts_at: new Date().toISOString().slice(0, 10),
      ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: defaultStatus ?? "planning",
      tasks: [],
      capacities: [],
    },
  });

  const {
    fields: taskFields,
    append: appendTask,
    remove: removeTask,
  } = useFieldArray({ control: form.control, name: "tasks" });

  const {
    fields: capacityFields,
    append: appendCapacity,
    remove: removeCapacity,
  } = useFieldArray({ control: form.control, name: "capacities" });

  useEffect(() => {
    if (!initialData) return;
    form.reset({
      name: initialData.name,
      goal: initialData.goal ?? "",
      sprint_number: initialData.sprint_number ?? undefined,
      starts_at: initialData.starts_at.slice(0, 10),
      ends_at: initialData.ends_at.slice(0, 10),
      status: initialData.status,
      tasks: initialData.tasks.map((item) => ({
        task_id: item.task_id,
        planned_hours: item.planned_hours ?? undefined,
        planned_points: item.planned_points ?? undefined,
        status: item.status ?? "committed",
        notes: item.notes ?? "",
        position: item.position ?? undefined,
      })),
      capacities: initialData.capacities.map((item) => ({
        user_id: item.user_id,
        week_start: item.week_start,
        hours: item.hours ?? 0,
      })),
    });
  }, [initialData, form]);

  const taskOptionsWithCurrent = useMemo(() => {
    if (!initialData) return tasksOptions;
    const map = new Map<string, TaskSummary>();
    tasksOptions.forEach((task) => map.set(task.id, task));
    initialData.tasks.forEach((assignment) => {
      if (!map.has(assignment.task_id)) {
        map.set(assignment.task_id, assignment.task);
      }
    });
    return Array.from(map.values());
  }, [initialData, tasksOptions]);

  const userSelectOptions = useMemo(
    () =>
      usersOptions.map((user) => ({
        value: user.id,
        label: user.full_name || user.email,
      })),
    [usersOptions]
  );

  return (
    <form
      className="grid gap-6"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(values);
      })}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Nome</label>
          <Input placeholder="Sprint 12" {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="text-xs text-rose-400">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Número</label>
          <Input type="number" min={0} {...form.register("sprint_number")} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Objetivo</label>
        <Textarea rows={3} placeholder="Meta principal para o ciclo" {...form.register("goal")} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Início</label>
          <Input type="date" {...form.register("starts_at")} />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Fim</label>
          <Input type="date" {...form.register("ends_at")} />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Status</label>
          <select
            {...form.register("status")}
            className="h-10 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
          >
            {sprintStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Itens planejados</label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/20 text-slate-200"
            onClick={() =>
              appendTask({
                task_id: taskOptionsWithCurrent[0]?.id ?? "",
                planned_hours: undefined,
                planned_points: undefined,
                status: "committed",
                notes: "",
                position: undefined,
              })
            }
            disabled={taskOptionsWithCurrent.length === 0}
          >
            <Plus className="mr-1 h-4 w-4" /> Adicionar
          </Button>
        </div>
        {taskFields.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma tarefa adicionada.</p>
        ) : (
          <div className="space-y-3">
            {taskFields.map((field, index) => (
              <div key={field.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <select
                    {...form.register(`tasks.${index}.task_id`)}
                    className="h-10 flex-1 rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                  >
                    {taskOptionsWithCurrent.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-300 hover:bg-rose-500/10 hover:text-rose-400"
                    onClick={() => removeTask(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <Input
                    type="number"
                    min={0}
                    placeholder="Horas"
                    {...form.register(`tasks.${index}.planned_hours`)}
                  />
                  <Input
                    type="number"
                    step="0.5"
                    min={0}
                    placeholder="Pontos"
                    {...form.register(`tasks.${index}.planned_points`)}
                  />
                  <select
                    {...form.register(`tasks.${index}.status`)}
                    className="h-10 rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                  >
                    <option value="committed">Comprometida</option>
                    <option value="stretch">Stretch</option>
                    <option value="optional">Opcional</option>
                  </select>
                </div>
                <div className="mt-3 space-y-2">
                  <Textarea
                    rows={2}
                    placeholder="Notas adicionais"
                    {...form.register(`tasks.${index}.notes`)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Capacidade da equipe</label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/20 text-slate-200"
            onClick={() =>
              appendCapacity({
                user_id: userSelectOptions[0]?.value ?? "",
                week_start: new Date().toISOString().slice(0, 10),
                hours: 0,
              })
            }
            disabled={userSelectOptions.length === 0}
          >
            <Plus className="mr-1 h-4 w-4" /> Registrar
          </Button>
        </div>
        {capacityFields.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum registro de capacidade.</p>
        ) : (
          <div className="space-y-3">
            {capacityFields.map((field, index) => (
              <div key={field.id} className="grid gap-3 rounded-xl border border-white/10 bg-slate-900/60 p-4 md:grid-cols-4">
                <select
                  {...form.register(`capacities.${index}.user_id`)}
                  className="h-10 rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                >
                  {userSelectOptions.map((user) => (
                    <option key={user.value} value={user.value}>
                      {user.label}
                    </option>
                  ))}
                </select>
                <Input type="date" {...form.register(`capacities.${index}.week_start`)} />
                <Input type="number" min={0} step={1} {...form.register(`capacities.${index}.hours`)} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 justify-self-end text-slate-300 hover:bg-rose-500/10 hover:text-rose-400"
                  onClick={() => removeCapacity(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-60"
        >
          {isSubmitting ? "Salvando..." : initialData ? "Salvar alterações" : "Criar sprint"}
        </Button>
      </div>
    </form>
  );
}
