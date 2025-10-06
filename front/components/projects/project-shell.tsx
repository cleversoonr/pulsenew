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
import {
  useAccounts,
  useCreateProject,
  useDeleteProject,
  useProjects,
  useUpdateProject,
} from "@/hooks/use-admin";
import type { CreateProjectInput, Project, UpdateProjectInput } from "@/lib/admin-types";
import { agGridPtBrLocale } from "@/lib/ag-grid-locale";
import { toKey } from "@/lib/utils";
import { Edit, Plus, Trash2 } from "lucide-react";

const projectStatusValues = ["draft", "active", "on_hold", "completed", "archived"] as const;

const statusOptions = [
  { value: "draft", label: "Rascunho" },
  { value: "active", label: "Ativo" },
  { value: "on_hold", label: "Em espera" },
  { value: "completed", label: "Concluído" },
  { value: "archived", label: "Arquivado" },
] as const;

const cleanseOptional = (schema: z.ZodTypeAny) =>
  z.preprocess((value) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    }
    return value;
  }, schema);

const projectFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  status: z.enum(projectStatusValues),
  description: cleanseOptional(z.string().trim().optional()),
  start_date: cleanseOptional(z.string().trim().optional()),
  end_date: cleanseOptional(z.string().trim().optional()),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

function toCreatePayload(values: ProjectFormValues): CreateProjectInput {
  return {
    name: values.name.trim(),
    status: values.status,
    description: values.description,
    start_date: values.start_date,
    end_date: values.end_date,
  };
}

function toUpdatePayload(values: ProjectFormValues): UpdateProjectInput {
  return {
    name: values.name.trim(),
    status: values.status,
    description: values.description,
    start_date: values.start_date,
    end_date: values.end_date,
  };
}

function formatDate(value: string | null | undefined, pattern = "dd/MM/yyyy") {
  if (!value) return "—";
  try {
    return format(new Date(value), pattern);
  } catch {
    return value;
  }
}

export function ProjectShell() {
  const accountsQuery = useAccounts();
  const accounts = accountsQuery.data ?? [];
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const defaultAccountId = accounts.length > 0 ? accounts[0].id : null;

  useEffect(() => {
    if (!selectedAccountId && defaultAccountId) {
      setSelectedAccountId(defaultAccountId);
    }
  }, [defaultAccountId, selectedAccountId]);

  const projectsQuery = useProjects(selectedAccountId ?? undefined);
  const createProject = useCreateProject(selectedAccountId ?? undefined);
  const updateProject = useUpdateProject(selectedAccountId ?? undefined);
  const deleteProject = useDeleteProject(selectedAccountId ?? undefined);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showFeedback = useCallback((message: string, type: "success" | "error") => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  }, []);

  const gridData = projectsQuery.data ?? [];

  const handleDelete = useCallback(
    async (project: Project) => {
      if (!confirm(`Remover o projeto "${project.name}"?`)) return;
      try {
        await deleteProject.mutateAsync(project.id);
        showFeedback("Projeto removido com sucesso", "success");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível remover o projeto";
        showFeedback(message, "error");
      }
    },
    [deleteProject, showFeedback]
  );

  const columns = useMemo<ColDef<Project>[]>(() => {
    return [
      {
        headerName: "Chave",
        field: "key",
        width: 140,
        sortable: true,
      },
      {
        headerName: "Nome",
        field: "name",
        flex: 1.6,
        sortable: true,
        cellRenderer: (params: { data: Project }) => (
          <div className="flex flex-col">
            <span className="font-semibold text-white">{params.data.name}</span>
            {params.data.description && <span className="text-xs text-slate-400">{params.data.description}</span>}
          </div>
        ),
      },
      {
        headerName: "Status",
        field: "status",
        width: 140,
        cellRenderer: (params: { value: string }) => {
          const status = statusOptions.find((option) => option.value === params.value)?.label ?? params.value;
          const tone =
            params.value === "active"
              ? "bg-emerald-500/20 text-emerald-100"
              : params.value === "paused"
              ? "bg-amber-500/20 text-amber-100"
              : "bg-slate-500/20 text-slate-100";
          return <Badge className={`rounded-full ${tone}`}>{status}</Badge>;
        },
      },
      {
        headerName: "Início",
        field: "start_date",
        width: 140,
        valueFormatter: (params) => formatDate(params.value),
      },
      {
        headerName: "Fim",
        field: "end_date",
        width: 140,
        valueFormatter: (params) => formatDate(params.value),
      },
      {
        headerName: "Atualizado em",
        field: "updated_at",
        width: 180,
        valueFormatter: (params) => formatDate(params.value, "dd/MM/yyyy HH:mm"),
      },
      {
        headerName: "Ações",
        width: 130,
        pinned: "right",
        filter: false,
        sortable: false,
        cellRenderer: (params: { data: Project }) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400"
              onClick={() => setEditingProject(params.data)}
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

  const handleCreate = async (values: ProjectFormValues) => {
    if (!selectedAccountId) {
      showFeedback("Selecione uma conta para cadastrar projetos", "error");
      return;
    }
    try {
      const payload = toCreatePayload(values);
      await createProject.mutateAsync({ ...payload, key: toKey(values.name) });
      showFeedback("Projeto criado com sucesso", "success");
      setIsCreateOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível criar o projeto";
      showFeedback(message, "error");
    }
  };

  const handleUpdate = async (values: ProjectFormValues) => {
    if (!editingProject) return;
    try {
      await updateProject.mutateAsync({ projectId: editingProject.id, payload: toUpdatePayload(values) });
      showFeedback("Projeto atualizado com sucesso", "success");
      setEditingProject(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível atualizar o projeto";
      showFeedback(message, "error");
    }
  };

  const disableActions = !selectedAccountId;
  const loadingTemplate = '<div class="ag-pulsehub-loader">Carregando projetos...</div>';
  const emptyTemplate = '<div class="ag-pulsehub-empty">Nenhum projeto cadastrado</div>';

  return (
    <section className="flex min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-950/95 to-slate-900 text-slate-100">
      <SideNav />
      <div className="flex flex-1 flex-col overflow-hidden px-8 pb-8 pt-6">
        <TopBar />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Projetos</p>
            <h1 className="text-2xl font-semibold text-white">Gestão de Projetos</h1>
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
                  title={disableActions ? "Selecione uma conta para criar projetos" : undefined}
                >
                  <Plus className="h-4 w-4" />
                  Novo projeto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl border-white/10 bg-slate-950 text-slate-100">
                <DialogHeader>
                  <DialogTitle>Criar projeto</DialogTitle>
                </DialogHeader>
                <ProjectForm onSubmit={handleCreate} isSubmitting={createProject.isPending} />
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
            <AgGridReact<Project>
              theme="legacy"
              rowData={gridData}
              columnDefs={columns}
              defaultColDef={defaultColDef}
              rowHeight={56}
              headerHeight={46}
              animateRows
              suppressCellFocus
              loading={projectsQuery.isLoading || projectsQuery.isFetching}
              overlayLoadingTemplate={loadingTemplate}
              overlayNoRowsTemplate={gridData.length === 0 ? emptyTemplate : undefined}
              localeText={agGridPtBrLocale}
            />
          </div>
        </div>

        {editingProject && (
          <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
            <DialogContent className="max-w-3xl border-white/10 bg-slate-950 text-slate-100">
              <DialogHeader>
                <DialogTitle>Editar projeto</DialogTitle>
              </DialogHeader>
              <ProjectForm
                initialData={editingProject}
                onSubmit={handleUpdate}
                isSubmitting={updateProject.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </section>
  );
}

function ProjectForm({
  initialData,
  onSubmit,
  isSubmitting,
}: {
  initialData?: Project | null;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
  isSubmitting: boolean;
}) {
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      status: "active",
      description: undefined,
      start_date: undefined,
      end_date: undefined,
    },
  });

  useEffect(() => {
    if (!initialData) {
      form.reset({
        name: "",
        status: "active",
        description: undefined,
        start_date: undefined,
        end_date: undefined,
      });
      return;
    }

    form.reset({
      name: initialData.name,
      status: initialData.status,
      description: initialData.description ?? undefined,
      start_date: initialData.start_date ?? undefined,
      end_date: initialData.end_date ?? undefined,
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
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Nome</label>
          <Input placeholder="Projeto X" {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="text-xs text-rose-400">{form.formState.errors.name.message}</p>
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
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Início</label>
          <Input type="date" {...form.register("start_date")} />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Fim</label>
          <Input type="date" {...form.register("end_date")} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Descrição</label>
        <Textarea rows={4} placeholder="Contexto do projeto" {...form.register("description")} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-60"
        >
          {isSubmitting ? "Salvando..." : initialData ? "Salvar alterações" : "Criar projeto"}
        </Button>
      </div>
    </form>
  );
}
