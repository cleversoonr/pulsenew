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
import { useAccounts } from "@/hooks/use-admin";
import { useAreas, useCreateArea, useDeleteArea, useUpdateArea } from "@/hooks/use-areas";
import type { Area, CreateAreaInput, UpdateAreaInput } from "@/lib/areas-types";
import { agGridPtBrLocale } from "@/lib/ag-grid-locale";
import { Edit, Plus, Trash2 } from "lucide-react";

const areaFormSchema = z.object({
  key: z
    .string({ required_error: "Informe a chave" })
    .trim()
    .min(1, "Informe a chave")
    .regex(/^[a-z0-9_-]+$/, "Use apenas letras minúsculas, números, hífen e underscore"),
  name: z.string().trim().min(1, "Informe o nome"),
  description: z.string().trim().optional(),
  is_active: z.boolean().default(true),
});

type AreaFormValues = z.infer<typeof areaFormSchema>;

function toCreatePayload(values: AreaFormValues): CreateAreaInput {
  return {
    key: values.key.trim(),
    name: values.name.trim(),
    description: values.description?.trim() || null,
    is_active: values.is_active,
  };
}

function toUpdatePayload(values: Partial<AreaFormValues>): UpdateAreaInput {
  const payload: UpdateAreaInput = {};
  if (values.name !== undefined) payload.name = values.name.trim();
  if (values.description !== undefined) payload.description = values.description?.trim() || null;
  if (values.is_active !== undefined) payload.is_active = values.is_active;
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

export function AreasShell() {
  const accountsQuery = useAccounts();
  const accounts = accountsQuery.data ?? [];
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const defaultAccountId = accounts.length > 0 ? accounts[0].id : null;

  useEffect(() => {
    if (!selectedAccountId && defaultAccountId) {
      setSelectedAccountId(defaultAccountId);
    }
  }, [defaultAccountId, selectedAccountId]);

  const areasQuery = useAreas(selectedAccountId ?? undefined);
  const createArea = useCreateArea(selectedAccountId ?? undefined);
  const updateArea = useUpdateArea(selectedAccountId ?? undefined);
  const deleteArea = useDeleteArea(selectedAccountId ?? undefined);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showFeedback = useCallback((message: string, type: "success" | "error") => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  }, []);

  const gridData = areasQuery.data ?? [];

  const handleDelete = useCallback(
    async (area: Area) => {
      if (!confirm(`Remover a área "${area.name}"?`)) return;
      try {
        await deleteArea.mutateAsync(area.id);
        showFeedback("Área removida com sucesso", "success");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível remover a área";
        showFeedback(message, "error");
      }
    },
    [deleteArea, showFeedback]
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

  const handleCreate = async (values: AreaFormValues) => {
    if (!selectedAccountId) {
      showFeedback("Selecione uma conta para cadastrar áreas", "error");
      return;
    }
    try {
      await createArea.mutateAsync(toCreatePayload(values));
      showFeedback("Área criada com sucesso", "success");
      setIsCreateOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível criar a área";
      showFeedback(message, "error");
    }
  };

  const handleUpdate = async (values: Partial<AreaFormValues>) => {
    if (!editingArea) return;
    try {
      await updateArea.mutateAsync({ areaId: editingArea.id, payload: toUpdatePayload(values) });
      showFeedback("Área atualizada com sucesso", "success");
      setEditingArea(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível atualizar a área";
      showFeedback(message, "error");
    }
  };

  const disableActions = !selectedAccountId;
  const loadingTemplate = '<div class="ag-pulsehub-loader">Carregando áreas...</div>';
  const emptyTemplate = '<div class="ag-pulsehub-empty">Nenhuma área cadastrada</div>';

  return (
    <section className="flex min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-950/95 to-slate-900 text-slate-100">
      <SideNav />
      <div className="flex flex-1 flex-col overflow-hidden px-8 pb-8 pt-6">
        <TopBar />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Configurações</p>
            <h1 className="text-2xl font-semibold text-white">Áreas</h1>
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
                  title={disableActions ? "Selecione uma conta para criar áreas" : undefined}
                >
                  <Plus className="h-4 w-4" />
                  Nova área
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl border-white/10 bg-slate-950 text-slate-100">
                <DialogHeader>
                  <DialogTitle>Criar área</DialogTitle>
                </DialogHeader>
                <AreaForm onSubmit={handleCreate} isSubmitting={createArea.isPending} />
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
            <AgGridReact<Area>
              theme="legacy"
              rowData={gridData}
              columnDefs={columns}
              defaultColDef={defaultColDef}
              rowHeight={56}
              headerHeight={46}
              animateRows
              suppressCellFocus
              loading={areasQuery.isLoading || areasQuery.isFetching}
              overlayLoadingTemplate={loadingTemplate}
              overlayNoRowsTemplate={gridData.length === 0 ? emptyTemplate : undefined}
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
                initialData={editingArea}
                onSubmit={handleUpdate}
                isSubmitting={updateArea.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </section>
  );
}

function AreaForm({
  initialData,
  onSubmit,
  isSubmitting,
}: {
  initialData?: Area | null;
  onSubmit: (values: AreaFormValues | Partial<AreaFormValues>) => Promise<void>;
  isSubmitting: boolean;
}) {
  const form = useForm<AreaFormValues>({
    resolver: zodResolver(areaFormSchema),
    defaultValues: {
      key: "",
      name: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (!initialData) {
      form.reset({
        key: "",
        name: "",
        description: "",
        is_active: true,
      });
      return;
    }

    form.reset({
      key: initialData.key,
      name: initialData.name,
      description: initialData.description || "",
      is_active: initialData.is_active,
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
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Chave</label>
          <Input
            placeholder="desenvolvimento"
            {...form.register("key")}
            disabled={!!initialData}
            className={initialData ? "opacity-60" : ""}
          />
          {form.formState.errors.key && (
            <p className="text-xs text-rose-400">{form.formState.errors.key.message}</p>
          )}
          {!initialData && <p className="text-xs text-slate-500">Identificador único (não pode ser alterado)</p>}
        </div>
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
        <Textarea
          placeholder="Descrição opcional da área..."
          rows={3}
          {...form.register("description")}
        />
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
          {isSubmitting ? "Salvando..." : initialData ? "Salvar alterações" : "Criar área"}
        </Button>
      </div>
    </form>
  );
}
