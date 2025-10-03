"use client";

import { sprintCapacity, trends } from "@/lib/pulsehub-data";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

export function SprintCapacity() {
  return (
    <section id="sprints" className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Backlog & capacidade</p>
          <h2 className="text-lg font-semibold text-white">Capacidade das squads nesta sprint</h2>
        </div>
        <Badge className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
          Planejamento assistido
        </Badge>
      </header>
      <div className="grid gap-4 xl:grid-cols-3">
        {sprintCapacity.map((lane) => (
          <Card
            key={lane.name}
            className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-950/85 to-slate-900/45 p-5 text-slate-200"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Squad {lane.name}</h3>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-emerald-200/80">
                Focus {Math.round(lane.focus * 100)}%
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
              <Metric label="Committed" value={`${lane.committed}h`} />
              <Metric label="Remaining" value={`${lane.remaining}h`} />
              <Metric label="Velocity" value={`${lane.velocity}h`} />
            </div>
            <div className="mt-5 h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="colorInsights" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis dataKey="week" stroke="rgba(148,163,184,0.45)" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis hide domain={[0, 80]} />
                  <Area
                    type="monotone"
                    dataKey="adoption"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorInsights)"
                  >
                    <LabelList
                      dataKey="adoption"
                      position="top"
                      fill="#a5f3fc"
                      fontSize={11}
                      formatter={(value) =>
                        typeof value === "number" ? `${value}%` : value ?? ""
                      }
                    />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-emerald-200">{value}</p>
    </div>
  );
}
