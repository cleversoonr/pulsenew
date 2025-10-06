"use client";

import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ColDef, ModuleRegistry } from "ag-grid-community";
import { Badge } from "@/components/ui/badge";
import { tasks } from "@/lib/pulsehub-data";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

ModuleRegistry.registerModules([AllCommunityModule]);

const statusColors: Record<string, string> = {
  Planned: "bg-slate-500/20 text-slate-100",
  "In Progress": "bg-emerald-500/20 text-emerald-100",
  Review: "bg-sky-500/20 text-sky-100",
  Blocked: "bg-rose-500/20 text-rose-100",
  Done: "bg-emerald-500/30 text-emerald-100",
};

const priorityColors: Record<string, string> = {
  Critical: "bg-rose-500/20 text-rose-100",
  High: "bg-amber-500/20 text-amber-100",
  Medium: "bg-sky-500/20 text-sky-100",
  Low: "bg-emerald-500/20 text-emerald-100",
};

export function TaskGrid() {
  const columnDefs = useMemo<ColDef[]>(
    () => [
      { field: "id", headerName: "ID", width: 120, pinned: "left" },
      {
        field: "title",
        headerName: "Tarefa",
        flex: 2,
        cellClass: "text-slate-100 font-medium",
      },
      {
        field: "status",
        headerName: "Status",
        cellRenderer: ({ value }: { value: keyof typeof statusColors }) => (
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusColors[value]}`}>
            <span className="h-2 w-2 rounded-full bg-current/80" />
            {value}
          </span>
        ),
        width: 160,
      },
      {
        field: "priority",
        headerName: "Prioridade",
        width: 140,
        cellRenderer: ({ value }: { value: keyof typeof priorityColors }) => (
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${priorityColors[value]}`}>
            {value}
          </span>
        ),
      },
      { field: "area", headerName: "Área", width: 150 },
      {
        field: "estimate",
        headerName: "Estimate (h)",
        width: 130,
        valueFormatter: (params) => `${params.value}h`,
      },
      { field: "assignee", headerName: "Responsável", width: 160 },
      {
        field: "due",
        headerName: "Due",
        width: 140,
        valueFormatter: (params) =>
          new Date(params.value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      },
      {
        field: "dependencies",
        headerName: "Dependências",
        flex: 1,
        valueFormatter: ({ value }: { value: string[] }) => (value.length ? value.join(", ") : "—"),
      },
    ],
    []
  );

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6" id="tasks">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Tarefas & ação</p>
          <h2 className="text-lg font-semibold text-white">Backlog inteligente</h2>
        </div>
        <Badge className="rounded-full border border-white/10 bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200">
          IA sugere próximos passos
        </Badge>
      </header>
      <div className="ag-theme-quartz-dark mt-6 h-[320px] overflow-hidden rounded-2xl border border-white/10">
        <AgGridReact
          theme="legacy"
          rowData={tasks}
          columnDefs={columnDefs}
          rowHeight={60}
          headerHeight={48}
          suppressCellFocus
          animateRows
          defaultColDef={{ resizable: true, sortable: true, filter: false }}
        />
      </div>
    </section>
  );
}
