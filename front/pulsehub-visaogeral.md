# Pulsehub — Especificação Unificada (Visão + Stack)

## Visão Geral

**Objetivo:** Segundo cérebro para profissionais de produto que organiza informações por **projeto e contexto**, a partir de reuniões, inputs manuais e documentos, gerando **insights acionáveis** e **atualizações automáticas**.

**Público‑alvo:** Times de produto, design, engenharia e stakeholders.

**Base técnica:** Python (FastAPI + workers), PostgreSQL 16+ com pgvector, FTS e pg_trgm, **busca híbrida** (semântica + lexical), extração estruturada via LLMs, **multi‑empresas (multi‑tenant)** desde o início.

**Diferenciais:** Playbooks por tipo de reunião (daily, refinamento, alinhamento), pipeline de RAG com transparência (evidências), “do insight à ação” (comentários/tarefas/atualizações de docs), planejamento de sprint por capacidade, auditoria e governança.

---

## Stack Geral (do Sistema)

### Frontend

* **Next.js (App Router) + TypeScript**
* **UI:** Tailwind CSS + **shadcn/ui** (Radix Primitives)
* **Tabela:** **AG Grid Community** (listas densas, edição inline)
* **Estado & dados:** TanStack **React Query**
* **Formulários:** React Hook Form + **Zod**
* **Colaboração/Editor:** **Tiptap** + **Yjs** (colaboração em tempo real)
* **Drag & Drop:** **dnd-kit**
* **Calendário:** **FullCalendar**
* **Busca local / Cmd Palette:** **cmdk**
* **Gráficos:** **Recharts** (ou **ECharts** quando necessário)

### Backend (Core)

* **API:** **FastAPI** (pydantic v2)
* **DB:** **PostgreSQL 16+** com **pgvector**, **pg_trgm** e **Full‑Text Search**
* **ORM/Migrações:** SQLAlchemy 2 + **Alembic**
* **Jobs/Workers:** **Celery** (ou RQ) + **Redis**
* **Cache:** Redis
* **Armazenamento de arquivos:** S3‑compatible (ex.: **MinIO**)
* **Fila de eventos (opcional):** **Kafka**/Redpanda (ou Redis Streams no MVP)
* **LLM/Embeddings:** serviço interno com providers (OpenAI/Anthropic/Local) + **retry/budget**
* **Auth:** JWT/OAuth2 (Keycloak/Auth0) ou **next‑auth** + OIDC
* **RBAC/Multi‑tenant:** modelo por **org** e **projeto** (policy em DB)
* **Observabilidade:** **OpenTelemetry** (traces/metrics/logs) + SigNoz/Grafana + **Sentry**
* **CI/CD:** GitHub Actions (testes, lint, build, migrações)
* **Infra:** Docker Compose (dev) / **Kubernetes** (prod) com Helm, NGINX/Traefik, Cert‑Manager

---

## Stack por Módulo (com requisitos de produto incorporados)

### 1) Identidade, Tenancy e RBAC

* **Stack:** FastAPI + OAuth2/OIDC (Keycloak/Auth0) + JWT assinado (RS256)
* **DB:** `organization`, `tenant`, `user`, `membership`, `role`, `permission`, `audit_log`
* **Multi‑empresa:** tenants isolados logicamente; RLS por tenant; convites por e‑mail; times internos; controle por projeto.
* **Papéis:** Admin da organização, Gestor de projeto, Colaborador, Convidado (somente leitura).
* **SSO:** Google/Microsoft; SAML (enterprise).
* **Segurança:** Auditoria de sessão, políticas de senha/2FA, bloqueio por IP/domínio.

### 2) Projetos, Tarefas e Comentários

* **Frontend:** AG Grid (grid denso com edição inline), dnd‑kit (Kanban), modais shadcn.
* **Backend:** FastAPI CRUD; serviços de **deduplicação**, **merge** e **dependências**; relacionamentos entre tarefas, decisões, riscos e perguntas em aberto.
* **DB:** `project`, `epic`, `task` (status, priority, estimate_hours, due_date, assignee, labels, dependencies), `task_comment`, `attachment`, `watcher`.
* **Funcional:** CRUD de projetos (status, objetivos, áreas, tags) e tarefas (descrição, prioridade, estimativa, dependências, anexos, watchers). Comentários com referências a evidências (trechos de reunião/documento). Sugestões de melhoria de descrição, deduplicação e agrupamento.
* **Busca rápida:** `tsvector` + `pg_trgm` para títulos/descrições; filtros por status, labels, datas, assignee.
* **Validação:** SLA, due date, dependências (constraints + service rules).

### 3) Planejamento de Backlog e Sprints (Capacidade)

* **Frontend:** FullCalendar (por recurso/pessoa), AG Grid (capacidade e horas), gráficos de burndown/velocity.
* **Backend:** serviço de **alocação** (bin‑packing simples + constraints), simulações “what‑if”.
* **DB:** `sprint`, `sprint_task`, `user_capacity (week_start, hours)`, `holiday_calendar`.
* **Funcional:** Priorização assistida (valor/risco/urgência/dependências), fatiamento de tarefas grandes, agrupamento por épico/tema, previsão de datas para épicos, alertas de sobrealocação.

### 4) Reuniões e Transcrições

* **Entrada:** ingestão de transcrições (upload/integradores). Whisper opcional.
* **Pipeline:** classificação automática do **tipo** (daily, refinamento, alinhamento etc.), segmentação por tópicos, **chunking** (400–800 tokens + overlap) com timestamps e participantes, normalização PT/EN; diarização quando disponível.
* **Privacidade:** redaction opcional de PII antes de indexar.
* **DB:** `meeting`, `meeting_participant`, `doc_chunk` (texto + metadados), `doc_chunk_embedding`.
* **Workers:** Celery para chunk/embedding; logs de processamento.
* **Frontend:** Tiptap (nota rica), painel “trechos citados” (transparência da evidência no RAG).

### 5) Base de Documentos e Conhecimento

* **Ingestão:** PDF/Doc/Markdown/URLs vinculados a projetos; extração de seções/títulos para preservar hierarquia no chunking.
* **Versionamento:** `document`, `document_version`, `doc_patch_proposal` (diff + status); histórico de alterações.
* **Permissões:** flags de confidencialidade e escopos por documento.
* **Frontend:** Tiptap + Yjs; **diff2html**/Monaco Diff para “propostas de alteração” com aprovação humana.

### 6) Indexação e Busca Híbrida

* **Indexação:** embeddings (pgvector HNSW/IVFFlat), `tsvector` + GIN, `pg_trgm` para fuzzy.
* **Consulta:** endpoint `/search/hybrid` combinando semântica (cosine) e lexical (BM25/`ts_rank_cd`).
* **Ranking:** **RRF (Reciprocal Rank Fusion)** ou score ponderado; boosts por recência e relevância por projeto.
* **Filtros:** por projeto, fonte (reunião/doc/email/task), participante, data, idioma.
* **UX:** snippets com destaque e explicação “por que esse resultado”.
* **Métricas:** log de queries, hits, nDCG@k/Recall@k; healthchecks de indexação e latência.

### 7) Agentes & Insights (Router, Backlog, Docs, Sprint, E‑mail)

* **Orquestração:** Agent Manager (FastAPI) com ferramentas tipadas (pydantic) e auditoria.
* **Playbooks por tipo de reunião:**

  * **Daily:** vincular updates às tarefas existentes e gerar comentários objetivos.
  * **Refinamento:** criar tarefas com critérios de aceite, estimativas e dependências.
  * **Alinhamento de ideias:** registrar decisões, riscos e ideias em backlog/roadmap.
  * **Customização por organização:** editar prompts, regras e sensibilidade por tipo.
* **Insights:** extração de tarefas, decisões, riscos, ideias e perguntas com **confiança**, **evidências** (referência a chunks) e **recomendação de ação**.
* **Fluxo de aprovação:** modo “simulação”, aplicação em lote; idempotência; trilha de execução; reversão quando aplicável.
* **Ferramentas:** `create_task`, `update_task`, `comment_task`, `propose_doc_patch`, `apply_doc_patch`, `plan_sprint_proposal`, `send_email_draft`, `schedule_reminder`.
* **DB:** `insight` (kind: decision/risk/task_suggestion/followup; payload JSON), `agent_action_log`.

### 8) Integrações

* **Ferramentas de PM:** Jira/Linear/ClickUp/Trello e **Azure DevOps** (sync 2‑vias: work items, comentários, estados). Mapeamento de campos e resolução de conflitos.
* **E‑mail:** Gmail/IMAP → ingestão de threads relevantes, criação de follow‑ups/lembretes; envio de rascunhos.
* **Calendário:** Google Calendar → disponibilidade, convites de reunião e vínculo a projetos.
* **Chat/colaboração:** Slack/Teams para notificações e aprovações rápidas.
* **Repositórios e Docs:** GitHub/GitLab (links e ações), Confluence/Notion (ingestão/sync).
* **Infra:** conectores isolados (services), filas para retries; **rate‑limit** por integração; **Webhooks** assinados (HMAC) para eventos (insights, ações, status de jobs).

### 9) Project Pulse, Relatórios, Notificações e Automação

* **Project Pulse:** painel diário por projeto com andamento, riscos, bloqueios e próximos passos; logs de decisões e perguntas com responsáveis e prazos.
* **Relatórios:** progresso por sprint, épico e capacidade utilizada; digest por e‑mail/Slack com principais mudanças e itens que exigem ação.
* **Automação:** regras do tipo “insight = high & due < 48h → alertar owner”; lembretes programados.
* **Workers:** Celery (lembretes, reprocessamentos); notificações por e‑mail/webhooks.

### 10) Aprovação, Auditoria, Governança

* **Filas de aprovação:** prioridades, filtros e visão por projeto/time.
* **Trilha de auditoria:** insight → ação → resultado, com evidências e timestamps.
* **Linhagem de dados:** origem (trecho/arquivo) de cada atualização.
* **Políticas de retenção/exportação:** por organização e por projeto.

### 11) Segurança e Privacidade

* **Isolamento:** RLS por tenant; segregação verificada por testes de integração.
* **Criptografia:** em trânsito (TLS) e em repouso; gestão de segredos (Vault/SOPS/Secrets Manager).
* **PII:** redaction em transcrições e docs sensíveis.
* **Acesso:** escopos por papel; consentimento granular para integrações.
* **Conformidade:** registros LGPD/GDPR (direito ao esquecimento, exportação).

### 12) Observabilidade e Qualidade

* **Métricas de extração:** precisão/recall em amostras rotuladas.
* **Métricas de busca:** MRR@k, Recall@k; satisfação do usuário.
* **Saúde do sistema:** healthchecks de indexação, latência de busca, taxa de erros dos workers.
* **Feedback loop:** aceitar/rejeitar sugestões treina heurísticas e configurações.
* **Alertas:** operacionais e dashboards por tenant e por projeto.

### 13) Administração, Planos e Billing

* **Planos:** Free/Pro/Enterprise com limites de projetos, usuários, tokens/processamento.
* **Cobrança:** ciclo mensal, notas fiscais, métodos de pagamento; quotas por tenant (armazenamento, transcrições/mês, integrações, chamadas de IA).
* **Personalização:** domínios custom, marca (logo/cores) e políticas por organização.

### 14) API Pública e Webhooks

* **API:** Endpoints para ingestão de transcrições, documentos, tarefas e insights; busca híbrida com filtros e paginação.
* **Webhooks:** assinados (HMAC) para eventos (insights, ações, status de jobs).
* **Rate limiting:** chaves por tenant e escopos por papel.

### 15) Internacionalização e Acessibilidade

* **Idiomas:** interface PT/EN; detecção de idioma nos conteúdos.
* **Acessibilidade:** padrões (atalhos, contraste, leitor de tela).
* **Regionais:** formatos por organização (datas, moedas, fuso horário).

### 16) Requisitos Não Funcionais

* **Desempenho:** busca < 500 ms p95 para top‑k 50 resultados.
* **Confiabilidade:** 99,9% uptime (planos pagos); recuperação automática de jobs.
* **Escalabilidade:** workers horizontais; índices vetoriais configuráveis (HNSW/IVFFlat).
* **Segurança:** pentests periódicos; política de backups/restores (PITR Postgres + versionamento S3).
* **Portabilidade:** Postgres + pgvector como fonte de verdade; cloud‑agnostic.

### 17) Critérios de MVP

* **Multi‑tenant** funcional com RBAC e **SSO Google**.
* **Ingestão** de transcrições e documentos; **indexação** com pgvector + FTS.
* **Busca híbrida** com filtros de projeto; snippets e evidências.
* **Playbooks de reuniões** (daily, refinamento, alinhamento) com extração estruturada.
* **Fluxo de aprovação** e aplicação de ações em tarefas/comentários.
* **Project Pulse** diário por projeto e integrações básicas com Slack e e‑mail.

---

## Serviços Internos (Micro‑domínios)

* **Gateway/API (FastAPI):** auth, rate‑limit, roteamento.
* **Core Projects/Tasks Service:** CRUD, regras, sync ADO/Jira/Linear.
* **Meetings/Docs Service:** ingestão, classificação, chunking, embeddings.
* **Search Service:** híbrido + rerank + métricas.
* **Agent Service:** router + ferramentas + auditoria.
* **Integrations Service:** ADO, Gmail, Calendar, Notion/Drive, Slack/Teams.
* **Notifications Service:** e‑mail/webhooks/digests.
* **Admin/Config Service:** prompts, feature flags, conectores, billing.

> **Monorepo:** Turborepo (front/libs). **Python:** Poetry/uv com pacotes (core, agents, integrations). **Infra:** IaC com Terraform (opcional), Helm charts, ambientes dev/stage/prod.
