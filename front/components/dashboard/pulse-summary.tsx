import { pulseDigest } from "@/lib/pulsehub-data";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingDown, TrendingUp } from "lucide-react";

const trendIcon = {
  up: <TrendingUp className="h-4 w-4 text-emerald-300" />,
  down: <TrendingDown className="h-4 w-4 text-rose-300" />,
  neutral: <Sparkles className="h-4 w-4 text-cyan-200" />,
} as const;

export function PulseSummary() {
  return (
    <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-950/85 to-slate-900/60 p-6 shadow-[0_40px_120px_-40px_rgba(14,116,144,0.45)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge className="rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-200">
            Pulse Diário
          </Badge>
          <h2 className="mt-4 text-3xl font-semibold text-white">{pulseDigest.date}</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-300/90">{pulseDigest.summary}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-3">
          {pulseDigest.keySignals.map((signal) => (
            <div
              key={signal.label}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15">
                {signal.trend === "up"
                  ? trendIcon.up
                  : signal.trend === "down"
                  ? trendIcon.down
                  : trendIcon.neutral}
              </span>
              <div className="text-right leading-tight">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400/90">{signal.label}</p>
                <p className="text-base font-semibold text-emerald-200">{signal.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 grid gap-2 text-sm text-emerald-100">
        {pulseDigest.alerts.map((alert, index) => (
          <div key={index} className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-4 py-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-200">
              {index + 1}
            </span>
            <p className="text-slate-200/90">{alert}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
