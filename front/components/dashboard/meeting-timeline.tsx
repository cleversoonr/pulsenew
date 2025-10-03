import { meetingSlices } from "@/lib/pulsehub-data";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarClock, CircleCheck, CircleDashed, CircleDot } from "lucide-react";

const statusStyles = {
  todo: "text-slate-400",
  doing: "text-emerald-300",
  done: "text-emerald-200",
} as const;

const statusIcon = {
  todo: CircleDashed,
  doing: CircleDot,
  done: CircleCheck,
} as const;

export function MeetingTimeline() {
  return (
    <section id="meetings" className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-950/85 to-slate-900/45 p-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Reuniões & transcrições</p>
          <h2 className="text-lg font-semibold text-white">Playbooks em ação hoje</h2>
        </div>
        <Badge className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
          Whisper + LLMs sincronizados
        </Badge>
      </header>
      <div className="mt-6 space-y-6">
        {meetingSlices.map((meeting, index) => (
          <article key={meeting.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="rounded-full border border-emerald-400/50 bg-emerald-500/20 px-3 py-1 text-xs text-emerald-100">
                {meeting.time}
              </span>
              {index < meetingSlices.length - 1 && (
                <span className="mt-2 h-full w-px bg-gradient-to-b from-emerald-400/60 via-emerald-400/20 to-transparent" />
              )}
            </div>
            <div className="flex-1 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs text-emerald-200/80">
                    <CalendarClock className="h-3.5 w-3.5" />
                    <span>{meeting.type}</span>
                  </div>
                  <h3 className="mt-1 text-lg font-semibold text-white">{meeting.title}</h3>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400/80">Driver · {meeting.driver}</p>
                </div>
                <Badge className="rounded-full border border-white/10 bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200">
                  Resumo estruturado
                </Badge>
              </div>
              <p className="mt-4 text-sm text-slate-300/90">{meeting.summary}</p>
              <Separator className="my-4 border-white/5" />
              <div className="space-y-3 text-xs">
                {meeting.actionItems.map((action) => {
                  const Icon = statusIcon[action.status];
                  return (
                    <div key={action.item} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-slate-950/40 px-3 py-2">
                      <Icon className={`h-4 w-4 ${statusStyles[action.status]}`} />
                      <span className="flex-1 text-slate-200/90">{action.item}</span>
                      <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-emerald-200/70">
                        {action.owner}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
