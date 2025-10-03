export type ProjectHealth = {
  id: string;
  name: string;
  focus: string;
  health: "on-track" | "at-risk" | "critical";
  progress: number;
  effort: number;
  confidence: number;
  due: string;
  owner: string;
  highlights: string[];
};

export type Insight = {
  id: string;
  title: string;
  summary: string;
  impact: "high" | "medium" | "low";
  evidence: string;
  nextAction: string;
  assignee: string;
  eta: string;
};

export type MeetingSlice = {
  id: string;
  title: string;
  type: string;
  time: string;
  driver: string;
  summary: string;
  actionItems: { owner: string; item: string; status: "todo" | "doing" | "done" }[];
};

export type SprintCapacity = {
  name: string;
  committed: number;
  remaining: number;
  velocity: number;
  focus: number;
};

export type TaskRow = {
  id: string;
  title: string;
  status: "Planned" | "In Progress" | "Review" | "Blocked" | "Done";
  priority: "Critical" | "High" | "Medium" | "Low";
  area: string;
  estimate: number;
  assignee: string;
  due: string;
  dependencies: string[];
  sentiment: "positive" | "neutral" | "negative";
};

export const projectHealth: ProjectHealth[] = [
  {
    id: "proj-aurora",
    name: "Aurora Paywall Rework",
    focus: "Monetização & Experimentos",
    health: "on-track",
    progress: 0.72,
    effort: 0.58,
    confidence: 0.86,
    due: "2024-11-08",
    owner: "Isabelle F.",
    highlights: [
      "Playbook de refinamento aplicado em 100% das reuniões",
      "Taxa de conversão upsell +12% nas últimas 2 semanas",
      "Risco de integração com Billing mitigado",
    ],
  },
  {
    id: "proj-satori",
    name: "Satori Research Hub",
    focus: "Insights & Governance",
    health: "at-risk",
    progress: 0.44,
    effort: 0.68,
    confidence: 0.52,
    due: "2024-12-01",
    owner: "Yuri M.",
    highlights: [
      "Dependência de schema do Data Lake ainda sem owner",
      "Feedback de usabilidade indica fricção no fluxo de insights → ação",
      "Capacidade da squad 20% abaixo do planejado por férias",
    ],
  },
  {
    id: "proj-orion",
    name: "Orion Assist AI",
    focus: "Assistentes operacionais",
    health: "on-track",
    progress: 0.63,
    effort: 0.49,
    confidence: 0.79,
    due: "2025-01-15",
    owner: "Aline R.",
    highlights: [
      "RAG híbrido com rerank atingiu MRR@10 = 0.81",
      "Playbook de alinhamento indicando 3 riscos resolvidos",
      "Integração com Slack liberada para beta privado",
    ],
  },
];

export const insights: Insight[] = [
  {
    id: "ins-2309",
    title: "Daily Orion — Fricção no handoff QA",
    summary:
      "Teste exploratório ficou sem evidência; QA sugeriu automatizar smoke crítico antes das 10h.",
    impact: "high",
    evidence: "Trecho 03:12 — participante: Sarah (QA)",
    nextAction: "Criar gatilho no Workflow para rodar smoke suite assim que houver merge no branch release.",
    assignee: "Diego",
    eta: "Hoje, 17h",
  },
  {
    id: "ins-2310",
    title: "Planejamento Sprint 41 — Sobrecarga em Growth",
    summary:
      "Capacidade de Growth caiu 24h por férias, mas backlog manteve 18 histórias de alto valor.",
    impact: "medium",
    evidence: "Capacity board + calendário férias",
    nextAction: "Redistribuir 8 pts para Squad Core & automatizar retroalimentação no Linear.",
    assignee: "Isabelle",
    eta: "Amanhã, 11h",
  },
  {
    id: "ins-2311",
    title: "Refinamento Satori — Dependência externa sem SLA",
    summary:
      "Dados de NPS ainda bloqueados pela equipe de dados; risco de comprometer pesquisa executiva.",
    impact: "high",
    evidence: "Doc de reunião 12/09 + comentários @Paula",
    nextAction: "Acionar playbook de escalonamento e notificar diretoria de dados.",
    assignee: "Yuri",
    eta: "Hoje, 19h",
  },
];

export const meetingSlices: MeetingSlice[] = [
  {
    id: "meet-1290",
    title: "Daily Aurora",
    type: "Daily",
    time: "09:30",
    driver: "Isabelle",
    summary:
      "Atualização de experimentos, risco mitigado de billing, automação do follow-up via agentes.",
    actionItems: [
      { owner: "Diego", item: "Monitorar crash rate do paywall", status: "doing" },
      { owner: "Sofia", item: "Atualizar copy do teste multivariado", status: "todo" },
    ],
  },
  {
    id: "meet-1291",
    title: "Refinamento Orion",
    type: "Refinamento",
    time: "11:00",
    driver: "Aline",
    summary:
      "Clusterização de tickets, priorização de intents para agente interno, definição de guardrails.",
    actionItems: [
      { owner: "Natan", item: "Atualizar base de intents com feedback nova release", status: "doing" },
      { owner: "Sarah", item: "Documentar guardrails na wiki", status: "todo" },
    ],
  },
  {
    id: "meet-1292",
    title: "Alinhamento Satori",
    type: "Alinhamento",
    time: "15:00",
    driver: "Yuri",
    summary:
      "Riscos de governança, dependências externas e plano de contingência dos insights executivos.",
    actionItems: [
      { owner: "Paula", item: "Definir SLA com equipe de dados", status: "todo" },
      { owner: "Lucas", item: "Revisar prompts de extração estruturada", status: "doing" },
    ],
  },
];

export const sprintCapacity: SprintCapacity[] = [
  { name: "Aurora", committed: 92, remaining: 34, velocity: 86, focus: 0.78 },
  { name: "Orion", committed: 84, remaining: 22, velocity: 74, focus: 0.82 },
  { name: "Satori", committed: 76, remaining: 41, velocity: 61, focus: 0.63 },
];

export const tasks: TaskRow[] = [
  {
    id: "T-9321",
    title: "Experimentar paywall dinâmico por segmentação LTV",
    status: "In Progress",
    priority: "High",
    area: "Growth",
    estimate: 8,
    assignee: "Sofia",
    due: "2024-09-20",
    dependencies: ["T-9270"],
    sentiment: "positive",
  },
  {
    id: "T-9322",
    title: "Implementar smoke automation pipeline",
    status: "Planned",
    priority: "Critical",
    area: "Platform",
    estimate: 5,
    assignee: "Diego",
    due: "2024-09-21",
    dependencies: [],
    sentiment: "neutral",
  },
  {
    id: "T-9323",
    title: "Documentar guardrails de prompts do agente Orion",
    status: "Review",
    priority: "Medium",
    area: "Knowledge",
    estimate: 3,
    assignee: "Sarah",
    due: "2024-09-19",
    dependencies: ["T-9289"],
    sentiment: "positive",
  },
  {
    id: "T-9324",
    title: "Integração de evidências com Notion",
    status: "Blocked",
    priority: "High",
    area: "Integrations",
    estimate: 13,
    assignee: "Lucas",
    due: "2024-09-25",
    dependencies: ["T-9301", "T-9294"],
    sentiment: "negative",
  },
  {
    id: "T-9325",
    title: "Atualizar scoring de riscos no Satori",
    status: "In Progress",
    priority: "Medium",
    area: "Governance",
    estimate: 5,
    assignee: "Yuri",
    due: "2024-09-22",
    dependencies: ["T-9275"],
    sentiment: "neutral",
  },
];

export const trends = [
  { week: "Jul 15", insights: 38, actions: 22, adoption: 48 },
  { week: "Jul 22", insights: 42, actions: 28, adoption: 55 },
  { week: "Jul 29", insights: 54, actions: 41, adoption: 62 },
  { week: "Aug 05", insights: 61, actions: 52, adoption: 71 },
  { week: "Aug 12", insights: 66, actions: 58, adoption: 78 },
];

export const pulseDigest = {
  date: "Quarta, 18 de setembro",
  summary:
    "Insights priorizados. 6 ações atrasadas, risco crítico em Satori e oportunidade de upsell em Aurora.",
  keySignals: [
    {
      label: "Sentimento das reuniões",
      value: "+14%",
      trend: "up",
    },
    {
      label: "Insights → Ação",
      value: "68%",
      trend: "neutral",
    },
    {
      label: "Tempo médio até ação",
      value: "7h",
      trend: "down",
    },
  ],
  alerts: [
    "4 ações críticas aguardam aprovação do comitê Orion",
    "Meeting Satori alinhamento escalonada para diretoria",
    "Backlog Aurora com 12 histórias sem estimativa",
  ],
};
