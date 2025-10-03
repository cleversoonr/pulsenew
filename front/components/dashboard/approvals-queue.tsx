import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ShieldAlert, Timer } from "lucide-react";

type RiskLevel = keyof typeof riskBadge;

type Approval = {
  id: string;
  title: string;
  type: string;
  requester: string;
  due: string;
  risk: RiskLevel;
};

const approvals: Approval[] = [
  {
    id: "APP-102",
    title: "Atualizar scoring de riscos Satori",
    type: "Governança",
    requester: "Yuri",
    due: "Em 2h",
    risk: "Crítico",
  },
  {
    id: "APP-097",
    title: "Automatizar smoke pipeline paywall",
    type: "Plataforma",
    requester: "Diego",
    due: "Hoje",
    risk: "Alto",
  },
  {
    id: "APP-094",
    title: "Integração de evidências com Notion",
    type: "Integrations",
    requester: "Lucas",
    due: "Hoje",
    risk: "Alto",
  },
  {
    id: "APP-091",
    title: "Playbook alinhamento — Processo execução",
    type: "Playbook",
    requester: "Aline",
    due: "Amanhã",
    risk: "Médio",
  },
];

const riskBadge = {
  Crítico: "border-rose-400/40 bg-rose-500/15 text-rose-100",
  Alto: "border-amber-400/40 bg-amber-500/15 text-amber-100",
  Médio: "border-cyan-400/40 bg-cyan-500/15 text-cyan-100",
} as const;

export function ApprovalsQueue() {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Fluxo de aprovação</p>
          <h2 className="text-lg font-semibold text-white">Ações aguardando decisão</h2>
        </div>
        <Badge className="rounded-full border border-white/10 bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200">
          Auditoria ativada
        </Badge>
      </header>
      <ScrollArea className="mt-5 h-[280px] pr-3">
        <div className="space-y-4">
          {approvals.map((approval) => (
            <article key={approval.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{approval.id}</p>
                  <h3 className="text-sm font-semibold text-white">{approval.title}</h3>
                </div>
                <Badge className={`rounded-full border px-3 py-1 text-xs ${riskBadge[approval.risk]}`}>
                  <ShieldAlert className="mr-2 h-3.5 w-3.5" />
                  {approval.risk}
                </Badge>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-200" />
                  {approval.type}
                </span>
                <span className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-emerald-200" />
                  {approval.due}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] uppercase tracking-[0.3em] text-emerald-200/80">
                  {approval.requester}
                </span>
              </div>
            </article>
          ))}
        </div>
      </ScrollArea>
    </section>
  );
}
