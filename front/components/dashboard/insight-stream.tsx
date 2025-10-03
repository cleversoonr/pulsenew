import { insights } from "@/lib/pulsehub-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sparkles, ArrowUpRight, Zap, AlertTriangle } from "lucide-react";

const impactStyles: Record<string, string> = {
  high: "border-rose-400/40 bg-rose-500/15 text-rose-100",
  medium: "border-amber-300/40 bg-amber-400/15 text-amber-100",
  low: "border-slate-300/30 bg-slate-100/10 text-slate-100",
};

export function InsightStream() {
  return (
    <section id="insights" className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-950/85 to-slate-900/45 p-6 shadow-[0_35px_120px_-40px_rgba(190,242,100,0.35)]">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Insights com evidências</p>
          <h2 className="text-lg font-semibold text-white">Do insight à ação em minutos</h2>
        </div>
        <Button className="gap-2 rounded-full border border-white/10 bg-emerald-500/20 px-4 py-1 text-sm text-emerald-100 shadow-[0_20px_60px_-25px_rgba(16,185,129,0.8)] hover:bg-emerald-500/30">
          <Sparkles className="h-4 w-4" />
          Nova síntese
        </Button>
      </header>

      <div className="mt-5 space-y-5">
        {insights.map((insight) => (
          <article key={insight.id} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.36em] ${
                  impactStyles[insight.impact]
                }`}>
                  {insight.impact === "high" ? "Impacto Elevado" : insight.impact === "medium" ? "Impacto Médio" : "Impacto"}
                </Badge>
                <h3 className="mt-3 text-xl font-semibold text-white">{insight.title}</h3>
                <p className="mt-2 text-sm text-slate-300/90">{insight.summary}</p>
              </div>
              <div className="flex flex-col items-end gap-2 text-xs text-slate-400/80">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-emerald-200">
                  <Zap className="h-4 w-4 text-emerald-300" />
                  {insight.assignee}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300/80">
                  ETA · {insight.eta}
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-3 rounded-2xl border border-white/5 bg-slate-950/40 p-4 text-sm text-slate-200/90">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500/80">
                <AlertTriangle className="h-3.5 w-3.5 text-emerald-300" />
                Evidência
              </div>
              <p>{insight.evidence}</p>
              <Separator className="border-white/5" />
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500/80">
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-300" />
                Próxima ação
              </div>
              <p>{insight.nextAction}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
