import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BrainCircuit, CheckCircle2, Clock3, Workflow } from "lucide-react";

const stages = [
  {
    title: "Captura & Enriquecimento",
    description: "Transcrições Whisper, docs + contexto do projeto com redaction de PII.",
    icon: BrainCircuit,
  },
  {
    title: "RAG Híbrido Transparente",
    description: "Busca semântica + lexical com evidências. Score MRR@10 em 0.81 nas últimas sprints.",
    icon: Workflow,
  },
  {
    title: "Ação Automatizada",
    description: "Aprovação inteligente cria tarefas, comentários e atualiza docs com trilha auditável.",
    icon: CheckCircle2,
  },
];

export function AgentSpotlight() {
  return (
    <Card className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-emerald-500/5 to-slate-900/60 p-6 text-slate-200">
      <Badge className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-emerald-100">
        Pulse Agent
      </Badge>
      <h2 className="mt-4 text-lg font-semibold text-white">Pipeline do agente com auditoria e transparência</h2>
      <p className="mt-2 text-sm text-slate-300/90">
        Cada insight carrega evidências verificáveis, status de aprovação e impacto previsto. Governança completa para squads
        enterprise-ready.
      </p>
      <div className="mt-5 space-y-4">
        {stages.map((stage, index) => (
          <div key={stage.title} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-200">
                <stage.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-white">{stage.title}</h3>
                <p className="text-xs text-slate-300/80">{stage.description}</p>
              </div>
            </div>
            {index < stages.length - 1 && <Separator className="mt-4 border-white/10" />}
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-xs">
        <div>
          <p className="text-slate-400/90">Tempo médio insight → ação</p>
          <p className="text-lg font-semibold text-emerald-200">7h 12m</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-emerald-100">
          <Clock3 className="h-4 w-4" />
          SLA monitorado
        </div>
      </div>
    </Card>
  );
}
