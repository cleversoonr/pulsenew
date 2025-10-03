
-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS citext;

-- Tipos enumerados
CREATE TYPE plan_tier AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE project_status AS ENUM ('draft', 'active', 'on_hold', 'completed', 'archived');
CREATE TYPE task_status AS ENUM ('backlog', 'planned', 'in_progress', 'review', 'blocked', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE insight_impact AS ENUM ('low', 'medium', 'high');
CREATE TYPE insight_state AS ENUM ('open', 'in_review', 'approved', 'rejected', 'applied');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
CREATE TYPE meeting_type AS ENUM ('daily', 'refinement', 'alignment', 'retro', 'planning', 'sync', 'workshop', 'one_on_one');
CREATE TYPE notification_channel AS ENUM ('email', 'slack', 'teams', 'webhook');
CREATE TYPE integration_provider AS ENUM ('linear', 'jira', 'ado', 'notion', 'drive', 'gmail', 'slack', 'teams', 'custom');
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled');
CREATE TYPE invoice_status AS ENUM ('draft', 'open', 'paid', 'void', 'uncollectible');

-- Organizações, tenants e identidade
CREATE TABLE plan_catalog (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key                 text NOT NULL UNIQUE,
  name                text NOT NULL,
  description         text,
  price_cents         integer NOT NULL DEFAULT 0,
  currency            text NOT NULL DEFAULT 'BRL',
  billing_period      text NOT NULL DEFAULT 'monthly',
  features            jsonb NOT NULL DEFAULT '{}'::jsonb,
  limits              jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organization (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  slug                citext NOT NULL UNIQUE,
  plan                plan_tier NOT NULL DEFAULT 'free',
  locale              text NOT NULL DEFAULT 'pt-BR',
  timezone            text NOT NULL DEFAULT 'America/Sao_Paulo',
  max_users           integer,
  max_projects        integer,
  max_storage_mb      integer,
  settings            jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tenant (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  name                text NOT NULL,
  slug                citext NOT NULL,
  region              text,
  settings            jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE TABLE role (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key                 text NOT NULL UNIQUE,
  name                text NOT NULL,
  description         text,
  scope               text NOT NULL DEFAULT 'tenant'
);

CREATE TABLE permission (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key                 text NOT NULL UNIQUE,
  description         text
);

CREATE TABLE role_permission (
  role_id             uuid NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  permission_id       uuid NOT NULL REFERENCES permission(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_account (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email               citext NOT NULL UNIQUE,
  full_name           text NOT NULL,
  picture_url         text,
  locale              text NOT NULL DEFAULT 'pt-BR',
  timezone            text,
  phone               text,
  auth_provider       text NOT NULL DEFAULT 'password',
  external_id         text,
  password_hash       text,
  agreed_terms_at     timestamptz,
  last_login_at       timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE membership (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  tenant_id           uuid REFERENCES tenant(id) ON DELETE SET NULL,
  user_id             uuid NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
  role_id             uuid NOT NULL REFERENCES role(id) ON DELETE RESTRICT,
  status              text NOT NULL DEFAULT 'active',
  is_primary          boolean NOT NULL DEFAULT false,
  invited_by          uuid REFERENCES user_account(id),
  invited_at          timestamptz,
  accepted_at         timestamptz,
  revoked_at          timestamptz,
  UNIQUE (tenant_id, user_id)
);

CREATE TABLE audit_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  tenant_id           uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  actor_id            uuid REFERENCES user_account(id),
  actor_type          text NOT NULL DEFAULT 'user',
  action              text NOT NULL,
  entity_type         text NOT NULL,
  entity_id           text NOT NULL,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Projetos, épicos e tarefas
CREATE TABLE project (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  tenant_id           uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  key                 text NOT NULL,
  name                text NOT NULL,
  description         text,
  status              project_status NOT NULL DEFAULT 'active',
  area                text,
  objective           text,
  goal_metrics        jsonb NOT NULL DEFAULT '{}',
  start_date          date,
  end_date            date,
  health_score        numeric(5,2),
  risk_level          text,
  created_by          uuid REFERENCES user_account(id),
  updated_by          uuid REFERENCES user_account(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  archived_at         timestamptz,
  UNIQUE (tenant_id, key)
);

CREATE TABLE epic (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  name                text NOT NULL,
  description         text,
  status              project_status NOT NULL DEFAULT 'active',
  start_date          date,
  end_date            date,
  owner_id            uuid REFERENCES user_account(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE label (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  name                text NOT NULL,
  color               text,
  description         text,
  UNIQUE (tenant_id, name)
);

CREATE TABLE task (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  epic_id             uuid REFERENCES epic(id) ON DELETE SET NULL,
  parent_id           uuid REFERENCES task(id) ON DELETE SET NULL,
  external_ref        text,
  title               text NOT NULL,
  description         text,
  status              task_status NOT NULL DEFAULT 'backlog',
  priority            task_priority NOT NULL DEFAULT 'medium',
  estimate_hours      integer,
  actual_hours        integer,
  story_points        numeric(6,2),
  due_date            date,
  started_at          timestamptz,
  completed_at        timestamptz,
  assignee_id         uuid REFERENCES user_account(id),
  created_by          uuid REFERENCES user_account(id),
  updated_by          uuid REFERENCES user_account(id),
  labels              text[] DEFAULT '{}',
  custom_fields       jsonb NOT NULL DEFAULT '{}',
  search_vector       tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(description, '')), 'B')
  ) STORED,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_search_vector ON task USING gin (search_vector);
CREATE INDEX idx_task_status ON task (status);
CREATE INDEX idx_task_due ON task (due_date);

CREATE TABLE task_label (
  task_id             uuid NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  label_id            uuid NOT NULL REFERENCES label(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

CREATE TABLE task_dependency (
  task_id             uuid NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  depends_on_id       uuid NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  dependency_type     text NOT NULL DEFAULT 'blocks',
  PRIMARY KEY (task_id, depends_on_id)
);

CREATE TABLE task_comment (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id             uuid NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  author_id           uuid NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
  body                text NOT NULL,
  evidence_ref        text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE billing_subscription (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  plan_id             uuid NOT NULL REFERENCES plan_catalog(id) ON DELETE RESTRICT,
  status              subscription_status NOT NULL DEFAULT 'trialing',
  current_period_start timestamptz NOT NULL,
  current_period_end  timestamptz NOT NULL,
  trial_ends_at       timestamptz,
  cancel_at           timestamptz,
  canceled_at         timestamptz,
  payment_method      jsonb NOT NULL DEFAULT '{}'::jsonb,
  external_reference  text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX billing_subscription_active_idx ON billing_subscription (organization_id) WHERE status IN ('trialing','active','past_due');

CREATE TABLE attachment (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  tenant_id           uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  owner_id            uuid REFERENCES user_account(id),
  file_name           text NOT NULL,
  file_path           text NOT NULL,
  mime_type           text,
  size_bytes          bigint,
  checksum            text,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE task_attachment (
  task_id             uuid NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  attachment_id       uuid NOT NULL REFERENCES attachment(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, attachment_id)
);

CREATE TABLE task_watcher (
  task_id             uuid NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

-- Planejamento de sprints e capacidade
CREATE TABLE sprint (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  name                text NOT NULL,
  goal                text,
  sprint_number       integer,
  starts_at           date NOT NULL,
  ends_at             date NOT NULL,
  velocity_target     integer,
  capacity_hours      integer,
  focus_factor        numeric(5,2),
  status              text NOT NULL DEFAULT 'planning',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sprint_task (
  sprint_id           uuid NOT NULL REFERENCES sprint(id) ON DELETE CASCADE,
  task_id             uuid NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  planned_points      numeric(6,2),
  committed_hours     integer,
  position            integer,
  PRIMARY KEY (sprint_id, task_id)
);

CREATE TABLE user_capacity (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
  week_start          date NOT NULL,
  total_hours         integer NOT NULL,
  focus_factor        numeric(5,2) NOT NULL DEFAULT 1.0,
  notes               text,
  UNIQUE (tenant_id, user_id, week_start)
);

CREATE TABLE holiday_calendar (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  date                date NOT NULL,
  description         text,
  region              text,
  UNIQUE (tenant_id, date, region)
);

-- Reuniões, documentos e embeddings
CREATE TABLE meeting (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  tenant_id           uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  project_id          uuid REFERENCES project(id) ON DELETE SET NULL,
  title               text NOT NULL,
  meeting_type        meeting_type NOT NULL,
  occurred_at         timestamptz NOT NULL,
  duration_minutes    integer,
  transcript_language text,
  sentiment_score     numeric(5,2),
  source              text NOT NULL,
  status              text NOT NULL DEFAULT 'processed',
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE meeting_participant (
  meeting_id          uuid NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
  user_id             uuid REFERENCES user_account(id) ON DELETE SET NULL,
  display_name        text NOT NULL,
  email               citext,
  role                text,
  joined_at           timestamptz,
  left_at             timestamptz,
  PRIMARY KEY (meeting_id, display_name)
);

CREATE TABLE doc_chunk (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id          uuid REFERENCES meeting(id) ON DELETE CASCADE,
  project_id          uuid REFERENCES project(id) ON DELETE SET NULL,
  tenant_id           uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  source_type         text NOT NULL,
  source_id           text,
  chunk_index         integer NOT NULL,
  content             text NOT NULL,
  token_count         integer,
  language            text,
  start_time          numeric(10,2),
  end_time            numeric(10,2),
  participants        text[] DEFAULT '{}',
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE doc_chunk_embedding (
  doc_chunk_id        uuid PRIMARY KEY REFERENCES doc_chunk(id) ON DELETE CASCADE,
  model               text NOT NULL,
  embedding           vector(1536) NOT NULL,
  quality_score       numeric(5,2),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_doc_chunk_embedding ON doc_chunk_embedding USING ivfflat (embedding vector_cosine_ops) WITH (lists = 200);
CREATE INDEX idx_doc_chunk_content_trgm ON doc_chunk USING gin (content gin_trgm_ops);

-- Insights e ações
CREATE TABLE insight (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  project_id          uuid REFERENCES project(id) ON DELETE SET NULL,
  meeting_id          uuid REFERENCES meeting(id) ON DELETE SET NULL,
  title               text NOT NULL,
  summary             text NOT NULL,
  impact              insight_impact NOT NULL DEFAULT 'medium',
  confidence          numeric(5,2),
  state               insight_state NOT NULL DEFAULT 'open',
  evidence_refs       text[] DEFAULT '{}',
  created_by          uuid REFERENCES user_account(id),
  approved_by         uuid REFERENCES user_account(id),
  approved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE insight_action (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id          uuid NOT NULL REFERENCES insight(id) ON DELETE CASCADE,
  task_id             uuid REFERENCES task(id) ON DELETE SET NULL,
  title               text NOT NULL,
  description         text,
  status              text NOT NULL DEFAULT 'pending',
  due_at              timestamptz,
  assignee_id         uuid REFERENCES user_account(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz
);

CREATE TABLE approval_queue (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_action_id   uuid REFERENCES insight_action(id) ON DELETE CASCADE,
  task_id             uuid REFERENCES task(id) ON DELETE CASCADE,
  project_id          uuid REFERENCES project(id) ON DELETE SET NULL,
  requested_by        uuid REFERENCES user_account(id),
  approver_id         uuid REFERENCES user_account(id),
  status              approval_status NOT NULL DEFAULT 'pending',
  risk_level          text,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_at        timestamptz NOT NULL DEFAULT now(),
  decided_at          timestamptz
);

CREATE TABLE approval_history (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id         uuid NOT NULL REFERENCES approval_queue(id) ON DELETE CASCADE,
  actor_id            uuid REFERENCES user_account(id),
  status              approval_status NOT NULL,
  note                text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Notificações & integrações
CREATE TABLE invoice (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id     uuid NOT NULL REFERENCES billing_subscription(id) ON DELETE CASCADE,
  organization_id     uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  issued_at           timestamptz NOT NULL DEFAULT now(),
  due_at              timestamptz,
  status              invoice_status NOT NULL DEFAULT 'draft',
  amount_cents        integer NOT NULL DEFAULT 0,
  currency            text NOT NULL DEFAULT 'BRL',
  line_items          jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  external_reference  text
);

CREATE INDEX invoice_org_idx ON invoice (organization_id, issued_at DESC);

CREATE TABLE notification_preference (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
  tenant_id           uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  channel             notification_channel NOT NULL,
  enabled             boolean NOT NULL DEFAULT true,
  settings            jsonb NOT NULL DEFAULT '{}',
  UNIQUE (user_id, tenant_id, channel)
);

CREATE TABLE integration (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  provider            integration_provider NOT NULL,
  name                text NOT NULL,
  external_id         text,
  credentials         jsonb NOT NULL,
  status              text NOT NULL DEFAULT 'active',
  connected_at        timestamptz NOT NULL DEFAULT now(),
  last_synced_at      timestamptz,
  UNIQUE (tenant_id, provider, external_id)
);

CREATE TABLE branding_profile (
  organization_id     uuid PRIMARY KEY REFERENCES organization(id) ON DELETE CASCADE,
  primary_color       text,
  secondary_color     text,
  accent_color        text,
  logo_url            text,
  favicon_url         text,
  custom_domain       text,
  login_message       text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tenant_quota_usage (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  metric              text NOT NULL,
  period_start        date NOT NULL,
  period_end          date NOT NULL,
  limit_value         numeric,
  used_value          numeric NOT NULL DEFAULT 0,
  last_reset_at       timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, metric, period_start)
);

CREATE INDEX tenant_quota_usage_idx ON tenant_quota_usage (tenant_id, metric);

CREATE TABLE webhook_subscription (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  url                 text NOT NULL,
  secret              text NOT NULL,
  events              text[] NOT NULL,
  status              text NOT NULL DEFAULT 'active',
  created_at          timestamptz NOT NULL DEFAULT now(),
  last_called_at      timestamptz
);

-- Observabilidade e métricas
CREATE TABLE ingestion_job (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  source_type         text NOT NULL,
  source_ref          text,
  status              text NOT NULL,
  error_message       text,
  attempts            integer NOT NULL DEFAULT 0,
  payload             jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz
);

CREATE TABLE extraction_metric (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  project_id          uuid REFERENCES project(id),
  insight_id          uuid REFERENCES insight(id),
  metric_key          text NOT NULL,
  metric_value        numeric,
  sample_size         integer,
  captured_at         timestamptz NOT NULL DEFAULT now()
);

-- Índices auxiliares
CREATE INDEX idx_project_org_tenant ON project (organization_id, tenant_id);
CREATE INDEX idx_task_project ON task (project_id);
CREATE INDEX idx_meeting_project ON meeting (project_id);
CREATE INDEX idx_doc_chunk_project ON doc_chunk (project_id);
CREATE INDEX idx_insight_project_state ON insight (project_id, state);
CREATE INDEX idx_approval_status ON approval_queue (status, requested_at DESC);
CREATE INDEX idx_ingestion_status ON ingestion_job (status);

-- Recomenda-se habilitar RLS por tabela multi-tenant
ALTER TABLE organization ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE project ENABLE ROW LEVEL SECURITY;
ALTER TABLE task ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_chunk ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_chunk_embedding ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_queue ENABLE ROW LEVEL SECURITY;

