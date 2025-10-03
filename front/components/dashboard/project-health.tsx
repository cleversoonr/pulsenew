import { projectHealth } from "@/lib/pulsehub-data";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertOctagon, AlertTriangle, ShieldCheck } from "lucide-react";
import { type ReactNode } from "react";

const healthMap: Record<string, { label: string; color: string; icon: ReactNode }> = {
  "on-track": {
    label: "On track",
    color: "text-emerald-300",
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  "at-risk": {
    label: "Atenção",
    color: "text-amber-300",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  critical: {
    label: "Crítico",
    color: "text-rose-300",
    icon: <AlertOctagon className="h-4 w-4" />,
  },
};

export function ProjectHealthCards() {
  return (
    <section id="projects" className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Projects Pulse</p>
          <h2 className="text-lg font-semibold text-white">Saúde das iniciativas prioritárias</h2>
        </div>
        <Badge className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-200">
          Atualizado há 4 min
        </Badge>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {projectHealth.map((project) => {
          const health = healthMap[project.health];
          return (
            <article
              key={project.id}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-950/80 to-slate-900/50 p-5 shadow-[0_25px_80px_-30px_rgba(12,74,110,0.5)]"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{project.focus}</p>
                  <h3 className="mt-1 text-xl font-semibold text-white">{project.name}</h3>
                </div>
                <Badge
                  className={cn(
                    "flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase",
                    health.color
                  )}
                >
                  {health.icon}
                  {health.label}
                </Badge>
              </div>

              <div className="mt-6 space-y-3">
                <Metric label="Progresso" value={project.progress} accent="bg-gradient-to-r from-emerald-400/90 to-emerald-300/70" />
                <Metric label="Esforço" value={project.effort} accent="bg-gradient-to-r from-cyan-400/90 to-blue-300/70" />
                <Metric label="Confiança" value={project.confidence} accent="bg-gradient-to-r from-blue-400/90 to-emerald-300/70" />
              </div>

              <div className="mt-6 space-y-3 text-xs text-slate-300/90">
                {project.highlights.map((highlight) => (
                  <p key={highlight} className="flex gap-2">
                    <span className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-300/80" />
                    <span>{highlight}</span>
                  </p>
                ))}
              </div>

              <footer className="mt-6 flex items-center justify-between text-xs text-slate-300/70">
                <span>Due · {new Date(project.due).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                <span>Owner · {project.owner}</span>
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Metric({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className="text-sm font-semibold text-emerald-200">{Math.round(value * 100)}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={cn("h-full rounded-full", accent)}
          style={{ width: `${Math.min(Math.round(value * 100), 100)}%` }}
        />
      </div>
    </div>
  );
}
