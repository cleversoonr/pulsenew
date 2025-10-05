"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { useAccounts } from "@/hooks/use-admin";
import {
  useCreateMeeting,
  useDeleteMeeting,
  useMeetings,
  useUpdateMeeting,
} from "@/hooks/use-meetings";
import { useMeetingTypes } from "@/hooks/use-meeting-types";
import type {
  CreateMeetingInput,
  Meeting,
  MeetingParticipant,
  MeetingType,
  UpdateMeetingInput,
} from "@/lib/meetings-types";
import { agGridDefaultTextFilterParams, agGridPtBrLocale } from "@/lib/ag-grid-locale";

const meetingFormSchema = z.object({
  meeting_type_id: z.string().uuid({ message: "Selecione o tipo de reunião" }),
  project_id: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : "")),
  title: z.string().trim().min(1, "Informe um título"),
  occurred_at_date: z.string().min(1, "Informe a data"),
  occurred_at_time: z.string().min(1, "Informe o horário"),
  duration_minutes: z
    .preprocess((value) => (value === "" || value === undefined ? undefined : Number(value)), z
      .number({ invalid_type_error: "Informe um número" })
      .int({ message: "Use apenas números inteiros" })
      .min(0, "A duração deve ser positiva")
      .optional())
    .optional(),
  transcript_language: z.string().optional(),
  notes: z.string().optional(),
  participants_csv: z.string().optional(),
});

type MeetingFormValues = z.infer<typeof meetingFormSchema>;

type FeedbackState = { type: "success" | "error"; message: string } | null;

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return format(new Date(value), "dd/MM/yyyy HH:mm");
  } catch {
    return value;
  }
}

function parseParticipantsCsv(csv?: string): Array<Pick<MeetingParticipant, "display_name">> {
  if (!csv) return [];
  return csv
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((display_name) => ({ display_name }));
}

function buildMeetingPayload(values: MeetingFormValues, accountId: string): Omit<CreateMeetingInput, "metadata"> {
  const occurred_at = new Date(`${values.occurred_at_date}T${values.occurred_at_time}:00`).toISOString();
  const participants = parseParticipantsCsv(values.participants_csv);

  return {
    account_id: accountId,
    meeting_type_id: values.meeting_type_id,
    project_id: values.project_id ? values.project_id : undefined,
    title: values.title.trim(),
    occurred_at,
    duration_minutes: values.duration_minutes ?? undefined,
    transcript_language: values.transcript_language?.trim() || undefined,
    notes: values.notes?.trim() ?? "",
    participants,
    source: "manual",
    status: "processed",
  };
}

export function MeetingShell() {
  const accountsQuery = useAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [meetingTypeFilter, setMeetingTypeFilter] = useState<string | "all">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    if (!selectedAccountId && accountsQuery.data && accountsQuery.data.length > 0) {
      setSelectedAccountId(accountsQuery.data[0].id);
    }
  }, [accountsQuery.data, selectedAccountId]);

  const meetingTypesQuery = useMeetingTypes(selectedAccountId ?? undefined, true);

  useEffect(() => {
    if (meetingTypeFilter !== "all") {
      const stillExists = (meetingTypesQuery.data ?? []).some((type) => type.id === meetingTypeFilter);
      if (!stillExists) setMeetingTypeFilter("all");
    }
  }, [meetingTypeFilter, meetingTypesQuery.data]);

  const filters = useMemo(
    () => ({
      meeting_type_id: meetingTypeFilter !== "all" ? meetingTypeFilter : undefined,
    }),
    [meetingTypeFilter]
  );

  const meetingsQuery = useMeetings(selectedAccountId ?? undefined, filters);
  const createMeeting = useCreateMeeting(selectedAccountId ?? undefined, filters);
  const updateMeeting = useUpdateMeeting(selectedAccountId ?? undefined, filters);
  const deleteMeeting = useDeleteMeeting(selectedAccountId ?? undefined, filters);

  const activeMeetingTypes = useMemo(
    () => (meetingTypesQuery.data ?? []).filter((type) => type.is_active),
    [meetingTypesQuery.data]
  );

  const availableTypeOptionsForEdit = useMemo(() => {
    const map = new Map<string, MeetingType>();
    (meetingTypesQuery.data ?? []).forEach((type) => map.set(type.id, type));
    if (editingMeeting && !map.has(editingMeeting.meeting_type.id)) {
      map.set(editingMeeting.meeting_type.id, editingMeeting.meeting_type);
    }
    return Array.from(map.values());
  }, [meetingTypesQuery.data, editingMeeting]);

  const isLoading =
    accountsQuery.isLoading ||
    meetingTypesQuery.isLoading ||
    (Boolean(selectedAccountId) && meetingsQuery.isLoading);

  const showEmptyList =
    !isLoading && !meetingsQuery.isError && (meetingsQuery.data ?? []).length === 0;

  const showFeedback = (message: string, type: "success" | "error") => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleDeleteMeeting = useCallback(
    async (meeting: Meeting) => {
      if (!selectedAccountId) return;
      const confirmed = window.confirm(`Remover a reunião "${meeting.title}"?`);
      if (!confirmed) return;
      try {
        await deleteMeeting.mutateAsync(meeting.id);
        showFeedback("Reunião removida com sucesso", "success");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Não foi possível remover a reunião";
        showFeedback(message, "error");
      }
    },
    [deleteMeeting, selectedAccountId]
  );

  const ActionsCellRenderer = useCallback(
    (params: { data: Meeting }) => (
      <div className="flex items-center justify-end gap-2">
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 border-white/20 text-slate-200"
          onClick={() => setEditingMeeting(params.data)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 border-white/20 text-rose-300 hover:border-rose-400 hover:text-rose-200"
          onClick={() => handleDeleteMeeting(params.data)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ),
    [handleDeleteMeeting]
  );

  const textFilterParams = useMemo(
    () => ({ ...agGridDefaultTextFilterParams }),
    []
  );

  const columnDefs: ColDef<Meeting>[] = useMemo(
    () => [
      {
        field: "title",
        headerName: "Título",
        flex: 2,
        sortable: true,
        filter: "agTextColumnFilter",
        filterParams: textFilterParams,
      },
      {
        headerName: "Tipo",
        valueGetter: (params) => params.data?.meeting_type.name,
        flex: 1.4,
        sortable: true,
        filter: "agTextColumnFilter",
        filterParams: textFilterParams,
        filterValueGetter: (params) => params.data?.meeting_type.name ?? "",
      },
      {
        headerName: "Data",
        field: "occurred_at",
        flex: 1.4,
        valueFormatter: (params) => formatDate(params.value),
        sortable: true,
      },
      {
        headerName: "Duração (min)",
        field: "duration_minutes",
        flex: 1,
        valueFormatter: (params) => (params.value ? `${params.value}` : "—"),
      },
      {
        headerName: "Participantes",
        valueGetter: (params) => params.data?.participants?.length ?? 0,
        flex: 0.9,
      },
      {
        headerName: "Notas",
        valueGetter: (params) => params.data?.notes ?? "",
        flex: 2,
        filter: "agTextColumnFilter",
        filterParams: textFilterParams,
        cellRenderer: (params: { value: string }) => (
          <span className="truncate" title={params.value}>
            {params.value && params.value.length > 60
              ? `${params.value.slice(0, 60)}...`
              : params.value || "—"}
          </span>
        ),
      },
      {
        headerName: "Ações",
        cellRenderer: ActionsCellRenderer,
        width: 130,
        pinned: "right",
        suppressHeaderMenuButton: true,
        sortable: false,
        filter: false,
      },
    ],
    [ActionsCellRenderer, textFilterParams]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: false,
      filter: false,
    }),
    []
  );

  const loadingTemplate = '<div class="ag-pulsehub-loader">Carregando reuniões...</div>';
  const emptyTemplate = '<div class="ag-pulsehub-empty">Nenhuma reunião encontrada</div>';

  const handleCreateSubmit = async (values: MeetingFormValues) => {
    if (!selectedAccountId) return;
    const payload = buildMeetingPayload(values, selectedAccountId);

    try {
      await createMeeting.mutateAsync(payload as CreateMeetingInput);
      showFeedback("Reunião criada com sucesso", "success");
      setIsCreateOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível criar a reunião";
      showFeedback(message, "error");
    }
  };

  const handleEditSubmit = async (values: MeetingFormValues) => {
    if (!selectedAccountId || !editingMeeting) return;
    const payload = buildMeetingPayload(values, selectedAccountId) as UpdateMeetingInput;

    try {
      await updateMeeting.mutateAsync({ meetingId: editingMeeting.id, payload });
      showFeedback("Reunião atualizada com sucesso", "success");
      setEditingMeeting(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível atualizar a reunião";
      showFeedback(message, "error");
    }
  };

  const gridData = meetingsQuery.data ?? [];

  const disableCreateButton = !selectedAccountId || activeMeetingTypes.length === 0;

  return (
    <section className="flex min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-950/95 to-slate-900 text-slate-100">
      <SideNav />
      <div className="flex flex-1 flex-col overflow-hidden px-8 pb-8 pt-6">
        <TopBar />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Reuniões</p>
            <h1 className="text-2xl font-semibold text-white">Gestão de reuniões</h1>
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
                  className="gap-2 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-50"
                  disabled={disableCreateButton}
                >
                  <Plus className="h-4 w-4" />
                  Nova reunião
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl border-white/10 bg-slate-950 text-slate-100">
                <DialogHeader>
                  <DialogTitle>Registrar reunião</DialogTitle>
                </DialogHeader>
              <MeetingForm
                meetingTypes={activeMeetingTypes}
                isSubmitting={createMeeting.isPending}
                onSubmit={handleCreateSubmit}
              />
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Filtrar por tipo</span>
              <select
                value={meetingTypeFilter}
                onChange={(event) => setMeetingTypeFilter(event.target.value as typeof meetingTypeFilter)}
                disabled={meetingTypesQuery.isLoading}
                className="h-9 rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
              >
                <option value="all">Todos</option>
                {(meetingTypesQuery.data ?? []).map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                    {!type.is_active ? " (inativo)" : ""}
                  </option>
                ))}
              </select>
            </div>
            {disableCreateButton && selectedAccountId && (
              <p className="text-xs text-amber-200">
                Cadastre ao menos um tipo de reunião ativo em Configurações para criar novas reuniões.
              </p>
            )}
          </div>

          <div className="ag-theme-quartz-dark ag-theme-pulsehub h-full min-h-[400px] w-full overflow-hidden rounded-2xl border border-white/5 bg-slate-950/60">
            <AgGridReact<Meeting>
              theme="legacy"
              rowData={gridData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              domLayout="normal"
              rowHeight={52}
              headerHeight={46}
              animateRows
              suppressCellFocus
              loading={isLoading || meetingsQuery.isFetching}
              overlayLoadingTemplate={loadingTemplate}
              overlayNoRowsTemplate={showEmptyList ? emptyTemplate : undefined}
              localeText={agGridPtBrLocale}
            />
          </div>
        </div>

        {editingMeeting && selectedAccountId && (
          <Dialog open={!!editingMeeting} onOpenChange={(open) => !open && setEditingMeeting(null)}>
            <DialogContent className="max-w-2xl border-white/10 bg-slate-950 text-slate-100">
              <DialogHeader>
                <DialogTitle>Editar reunião</DialogTitle>
              </DialogHeader>
              <MeetingForm
                meetingTypes={availableTypeOptionsForEdit}
                initialData={editingMeeting}
                onSubmit={handleEditSubmit}
                isSubmitting={updateMeeting.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </section>
  );
}

function MeetingForm({
  meetingTypes,
  onSubmit,
  isSubmitting,
  initialData,
}: {
  meetingTypes: MeetingType[];
  onSubmit: (values: MeetingFormValues) => Promise<void>;
  isSubmitting: boolean;
  initialData?: Meeting | null;
}) {
  const form = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      meeting_type_id: meetingTypes[0]?.id ?? "",
      project_id: "",
      title: "",
      occurred_at_date: new Date().toISOString().slice(0, 10),
      occurred_at_time: new Date().toISOString().slice(11, 16),
      duration_minutes: undefined,
      transcript_language: "pt-BR",
      notes: "",
      participants_csv: "",
    },
  });

  useEffect(() => {
    if (!initialData) return;
    const occurred = new Date(initialData.occurred_at);
    form.reset({
      meeting_type_id: initialData.meeting_type.id,
      project_id: initialData.project_id ?? "",
      title: initialData.title,
      occurred_at_date: occurred.toISOString().slice(0, 10),
      occurred_at_time: occurred.toISOString().slice(11, 16),
      duration_minutes: initialData.duration_minutes ?? undefined,
      transcript_language: initialData.transcript_language ?? "",
      notes: initialData.notes ?? "",
      participants_csv: (initialData.participants ?? []).map((p) => p.display_name).join(", "),
    });
  }, [initialData, form]);

  useEffect(() => {
    if (!initialData && meetingTypes.length > 0) {
      form.setValue("meeting_type_id", meetingTypes[0].id);
    }
  }, [meetingTypes, initialData, form]);

  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(values);
      })}
    >
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Tipo de reunião</label>
        <select
          className="h-10 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
          {...form.register("meeting_type_id")}
        >
          <option value="" disabled>
            Selecione o tipo
          </option>
          {meetingTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
              {!type.is_active ? " (inativo)" : ""}
            </option>
          ))}
        </select>
        {form.formState.errors.meeting_type_id && (
          <p className="text-xs text-rose-400">{form.formState.errors.meeting_type_id.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Título</label>
        <Input placeholder="Daily do time" {...form.register("title")} />
        {form.formState.errors.title && (
          <p className="text-xs text-rose-400">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Data</label>
          <Input type="date" {...form.register("occurred_at_date")} />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Hora</label>
          <Input type="time" {...form.register("occurred_at_time")} />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Duração (min)</label>
          <Input type="number" min={0} step={5} {...form.register("duration_minutes")} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Idioma</label>
          <Input placeholder="pt-BR" {...form.register("transcript_language")} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Projeto (opcional)</label>
          <Input placeholder="UUID do projeto" {...form.register("project_id")} />
          {form.formState.errors.project_id && (
            <p className="text-xs text-rose-400">{form.formState.errors.project_id.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.3em] text-slate-400">
          Participantes (nomes separados por vírgula)
        </label>
        <Input placeholder="Ana, Bruno, Carla" {...form.register("participants_csv")} />
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Notas</label>
        <Textarea rows={4} placeholder="Resumo ou pontos importantes" {...form.register("notes")} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting || meetingTypes.length === 0}
          className="bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-60"
        >
          {isSubmitting ? "Salvando..." : initialData ? "Salvar alterações" : "Criar reunião"}
        </Button>
      </div>
    </form>
  );
}
