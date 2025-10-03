"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";

import { SideNav } from "@/components/dashboard/side-nav";
import { TopBar } from "@/components/dashboard/top-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

import { useOrganizations, useTenants } from "@/hooks/use-admin";
import { useCreateMeeting, useMeetings } from "@/hooks/use-meetings";
import type { CreateMeetingInput, Meeting } from "@/lib/meetings-types";

const meetingTypes = [
  { value: "daily", label: "Daily" },
  { value: "refinement", label: "Refinamento" },
  { value: "alignment", label: "Alinhamento" },
  { value: "retro", label: "Retrospectiva" },
  { value: "planning", label: "Planejamento" },
  { value: "sync", label: "Sync" },
  { value: "workshop", label: "Workshop" },
  { value: "one_on_one", label: "1:1" },
] as const;

const meetingSchema = z.object({
  organization_id: z.string().uuid({ message: "Selecione a organização" }),
  tenant_id: z.string().uuid({ message: "Selecione o tenant" }),
  project_id: z.string().uuid().optional().or(z.literal("")),
  title: z.string().min(1, "Informe um título"),
  meeting_type: z.enum(meetingTypes.map((m) => m.value) as [string, ...string[]]),
  occurred_at_date: z.string().min(1, "Informe a data"),
  occurred_at_time: z.string().min(1, "Informe o horário"),
  duration_minutes: z.coerce.number().int().min(0).optional(),
  transcript_language: z.string().optional(),
  notes: z.string().optional(),
  participants_csv: z.string().optional(), // nomes separados por vírgula
});

export function MeetingShell() {
  const orgsQuery = useOrganizations();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const tenantsQuery = useTenants(organizationId ?? undefined);

  useEffect(() => {
    if (!organizationId && orgsQuery.data && orgsQuery.data.length > 0) {
      setOrganizationId(orgsQuery.data[0].id);
    }
  }, [organizationId, orgsQuery.data]);

  const tenantId = tenantsQuery.data?.[0]?.id;
  const meetingsQuery = useMeetings(tenantId ?? undefined);
  const createMeeting = useCreateMeeting(tenantId ?? undefined);

  const form = useForm<z.infer<typeof meetingSchema>>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      organization_id: organizationId ?? "",
      tenant_id: tenantId ?? "",
      project_id: "",
      title: "",
      meeting_type: "daily",
      occurred_at_date: new Date().toISOString().slice(0, 10),
      occurred_at_time: new Date().toISOString().slice(11, 16),
      duration_minutes: 0,
      transcript_language: "pt-BR",
      notes: "",
      participants_csv: "",
    },
  });

  useEffect(() => {
    // sincroniza selects com o form
    if (organizationId) form.setValue("organization_id", organizationId);
    if (tenantId) form.setValue("tenant_id", tenantId);
  }, [organizationId, tenantId, form]);

  const isLoading = orgsQuery.isLoading || tenantsQuery.isLoading || (
    Boolean(tenantId) && meetingsQuery.isLoading
  );

  return (
    <section className="flex min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-950/95 to-slate-900 text-slate-100">
      <SideNav />
      <div className="flex flex-1 flex-col overflow-hidden px-8 pb-8 pt-6">
        <TopBar />

        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Reuniões</p>
            <h1 className="text-2xl font-semibold text-white">Registro de reuniões</h1>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="organization" className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Organização
            </label>
            <select
              id="organization"
              value={organizationId ?? ""}
              onChange={(e) => setOrganizationId(e.target.value || null)}
              className="h-10 rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            >
              {(orgsQuery.data ?? []).map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-white">Nova reunião</CardTitle>
              <CardDescription className="text-slate-300">Cadastre as informações básicas e participantes.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-4"
                onSubmit={form.handleSubmit(async (values) => {
                  if (!values.organization_id || !values.tenant_id) return;
                  const occurred_at = new Date(`${values.occurred_at_date}T${values.occurred_at_time}:00`).toISOString();
                  const participants = (values.participants_csv || "")
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((name) => ({ display_name: name }));

                  const payload: CreateMeetingInput = {
                    organization_id: values.organization_id,
                    tenant_id: values.tenant_id,
                    project_id: values.project_id || undefined,
                    title: values.title,
                    meeting_type: values.meeting_type,
                    occurred_at,
                    duration_minutes: values.duration_minutes || undefined,
                    transcript_language: values.transcript_language || undefined,
                    notes: values.notes || undefined,
                    participants,
                  };

                  await createMeeting.mutateAsync(payload);
                  form.reset({
                    organization_id: organizationId ?? "",
                    tenant_id: tenantId ?? "",
                    project_id: "",
                    title: "",
                    meeting_type: "daily",
                    occurred_at_date: new Date().toISOString().slice(0, 10),
                    occurred_at_time: new Date().toISOString().slice(11, 16),
                    duration_minutes: 0,
                    transcript_language: "pt-BR",
                    notes: "",
                    participants_csv: "",
                  });
                })}
              >
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Tenant</label>
                    <select
                      className="h-10 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                      {...form.register("tenant_id")}
                    >
                      {(tenantsQuery.data ?? []).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Título</label>
                    <Input placeholder="Daily do time" {...form.register("title")} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Tipo</label>
                      <select
                        className="h-10 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                        {...form.register("meeting_type")}
                      >
                        {meetingTypes.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Data</label>
                      <Input type="date" {...form.register("occurred_at_date")} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Hora</label>
                      <Input type="time" {...form.register("occurred_at_time")} />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Duração (min)</label>
                      <Input type="number" min={0} step={5} {...form.register("duration_minutes")} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Idioma</label>
                      <Input placeholder="pt-BR" {...form.register("transcript_language")} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Projeto (opcional)</label>
                      <Input placeholder="UUID do projeto" {...form.register("project_id")} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Participantes (nomes, separados por vírgula)</label>
                    <Input placeholder="Ana, Bruno, Carla" {...form.register("participants_csv")} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Notas</label>
                    <Textarea rows={4} placeholder="Resumo ou trechos importantes" {...form.register("notes")} />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={createMeeting.isPending}>
                      {createMeeting.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-white">Reuniões recentes</CardTitle>
              <CardDescription className="text-slate-300">Últimas reuniões cadastradas</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-[320px] w-full" />
                </div>
              ) : !tenantId ? (
                <p className="text-sm text-slate-400">Selecione uma organização e um tenant para listar as reuniões.</p>
              ) : (
                <ScrollArea className="max-h-[620px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead className="text-slate-300">Título</TableHead>
                        <TableHead className="text-slate-300">Tipo</TableHead>
                        <TableHead className="text-slate-300">Quando</TableHead>
                        <TableHead className="text-right text-slate-300">Chunks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(meetingsQuery.data ?? []).map((m: Meeting) => (
                        <TableRow key={m.id} className="border-white/5">
                          <TableCell className="text-slate-200">{m.title}</TableCell>
                          <TableCell className="text-slate-300">{m.meeting_type}</TableCell>
                          <TableCell className="text-slate-300">{format(new Date(m.occurred_at), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell className="text-right text-slate-200">{m.chunk_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
