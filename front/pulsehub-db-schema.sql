-- PULSEHUB • Esquema mínimo e simplificado (PostgreSQL)
-- Mantém apenas os módulos solicitados:
--  Projetos, projetos_comentarios
--  Sprints
--  Tarefas, tarefas_comentarios
--  Tipo de tarefa
--  Contas
--  Usuários
--  Planos
--  Reuniões
--  Perfil de acesso
--
-- Observações:
-- 1) Mantivemos apenas o essencial para multi-conta (tenant) via "account".
-- 2) Reaproveitamos alguns ENUMs do schema original (project_status, task_status, task_priority). Tipos de reunião agora ficam em tabela própria.
-- 3) Convenções: colunas created_at/updated_at (timestamptz), chaves UUID com gen_random_uuid().
-- 4) Índices focados em busca básica, status e chaves estrangeiras.
-- 5) RLS: exemplo habilitado só nas tabelas multi-conta centrais; ajuste conforme a política.

-- Extensões úteis
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- emails case-insensitive
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- buscas por similaridade (opcional)

-- ===== Tipos (reaproveitados do schema anterior ou simplificados) =====
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
    CREATE TYPE project_status AS ENUM ('draft','active','on_hold','completed','archived');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM ('backlog','planned','in_progress','review','blocked','done');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
    CREATE TYPE task_priority AS ENUM ('low','medium','high','critical');
  END IF;
END
$$;

-- ===== Planos =====
CREATE TABLE IF NOT EXISTS plan (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key             text NOT NULL UNIQUE,
  name            text NOT NULL,
  description     text,
  price_cents     integer NOT NULL DEFAULT 0,
  currency        text NOT NULL DEFAULT 'BRL',
  billing_period  text NOT NULL DEFAULT 'monthly', -- monthly | yearly
  features        jsonb NOT NULL DEFAULT '{}',
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ===== Contas (tenants) =====
CREATE TABLE IF NOT EXISTS account (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            citext NOT NULL UNIQUE,
  plan_id         uuid REFERENCES plan(id) ON DELETE SET NULL,
  locale          text NOT NULL DEFAULT 'pt-BR',
  timezone        text NOT NULL DEFAULT 'America/Sao_Paulo',
  settings        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ===== Usuários =====
CREATE TABLE IF NOT EXISTS user_app (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  email           citext NOT NULL UNIQUE,
  full_name       text NOT NULL,
  picture_url     text,
  locale          text NOT NULL DEFAULT 'pt-BR',
  timezone        text,
  phone           text,
  password_hash   text, -- ajuste conforme auth provider
  last_login_at   timestamptz,
  is_root	      bool,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ===== Perfil de acesso (papéis simples por conta) =====
CREATE TABLE IF NOT EXISTS profile (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  key             text NOT NULL,   -- ex: owner, admin, member, viewer
  name            text NOT NULL,
  permissions     jsonb NOT NULL DEFAULT '[]'::jsonb, -- lista de chaves de permissão
  UNIQUE (account_id, key)
);

-- ===== Associação usuário-conta com perfil =====
CREATE TABLE IF NOT EXISTS profile_user (
  account_id      uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES user_app(id) ON DELETE CASCADE,
  profile_id      uuid NOT NULL REFERENCES profile(id) ON DELETE RESTRICT,
  status          text NOT NULL DEFAULT 'active', -- active | invited | revoked
  invited_at      timestamptz,
  accepted_at     timestamptz,
  revoked_at      timestamptz,
  is_primary      boolean NOT NULL DEFAULT false,
  PRIMARY KEY (account_id, user_id)
);


-- ===== Projetos =====
CREATE TABLE IF NOT EXISTS project (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  key             text NOT NULL,
  name            text NOT NULL,
  description     text,
  status          project_status NOT NULL DEFAULT 'active',
  start_date      date,
  end_date        date,
  created_by      uuid REFERENCES user_app(id),
  updated_by      uuid REFERENCES user_app(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, key)
);

-- Comentários de projeto
CREATE TABLE IF NOT EXISTS project_comment (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  author_id       uuid NOT NULL REFERENCES user_app(id) ON DELETE CASCADE,
  body            text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_status ON project(status);
CREATE INDEX IF NOT EXISTS idx_project_created_at ON project(created_at);

-- ===== Sprints =====
CREATE TABLE IF NOT EXISTS sprint (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  account_id      uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  name            text NOT NULL,
  goal            text,
  sprint_number   integer,
  starts_at       date NOT NULL,
  ends_at         date NOT NULL,
  status          text NOT NULL DEFAULT 'planning', -- planning | active | closed
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sprint_project ON sprint(project_id);
CREATE INDEX IF NOT EXISTS idx_sprint_dates ON sprint(starts_at, ends_at);

CREATE TABLE IF NOT EXISTS sprint_task (
  sprint_id       uuid NOT NULL REFERENCES sprint(id) ON DELETE CASCADE,
  task_id         uuid NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  account_id      uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  planned_hours   integer,
  planned_points  numeric(6,2),
  status          text NOT NULL DEFAULT 'committed',
  notes           text,
  position        integer,
  PRIMARY KEY (sprint_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_sprint_task_task ON sprint_task(task_id);

CREATE TABLE IF NOT EXISTS user_capacity (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id     uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES user_app(id) ON DELETE CASCADE,
  sprint_id      uuid REFERENCES sprint(id) ON DELETE SET NULL,
  week_start     date NOT NULL,
  hours          integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_user_capacity_sprint ON user_capacity(sprint_id);

CREATE TABLE IF NOT EXISTS holiday_calendar (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id     uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  project_id     uuid REFERENCES project(id) ON DELETE CASCADE,
  date           date NOT NULL,
  name           text NOT NULL,
  scope          text NOT NULL DEFAULT 'global', -- global | project
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_holiday_calendar_unique ON holiday_calendar(account_id, date, project_id);

CREATE TABLE IF NOT EXISTS task_type (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  key             text NOT NULL,    -- ex: bug, feature, chore, research
  name            text NOT NULL,
  workflow        jsonb NOT NULL DEFAULT '{}', -- opcional: estados permitidos, regras
  UNIQUE (account_id, key)
);

-- ===== Tarefas =====
CREATE TABLE IF NOT EXISTS task (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  parent_id       uuid REFERENCES task(id) ON DELETE SET NULL,
  task_type_id    uuid REFERENCES task_type(id) ON DELETE SET NULL,
  external_ref    text, -- id do ADO/Jira/etc
  title           text NOT NULL,
  description     text,
  status          task_status NOT NULL DEFAULT 'backlog',
  priority        task_priority NOT NULL DEFAULT 'medium',
  estimate_hours  integer,
  actual_hours    integer,
  story_points    numeric(6,2),
  due_date        date,
  started_at      timestamptz,
  completed_at    timestamptz,
  assignee_id     uuid REFERENCES user_app(id) ON DELETE SET NULL,
  created_by      uuid REFERENCES user_app(id),
  updated_by      uuid REFERENCES user_app(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_project ON task(project_id);
CREATE INDEX IF NOT EXISTS idx_task_status ON task(status);
CREATE INDEX IF NOT EXISTS idx_task_priority ON task(priority);
CREATE INDEX IF NOT EXISTS idx_task_due ON task(due_date);

-- Comentários de tarefa
CREATE TABLE IF NOT EXISTS task_comment (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         uuid NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  author_id       uuid NOT NULL REFERENCES user_app(id) ON DELETE CASCADE,
  body            text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meeting_type (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  key             text NOT NULL,
  name            text NOT NULL,
  description     text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, key)
);

CREATE INDEX IF NOT EXISTS idx_meeting_type_account ON meeting_type(account_id);

CREATE TABLE IF NOT EXISTS meeting (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  meeting_type_id     uuid NOT NULL REFERENCES meeting_type(id) ON DELETE RESTRICT,
  project_id          uuid REFERENCES project(id) ON DELETE SET NULL,
  title               text NOT NULL,
  occurred_at         timestamptz NOT NULL,
  duration_minutes    integer,
  transcript_language text,
  sentiment_score     numeric(5,2),
  source              text NOT NULL DEFAULT 'manual',
  status              text NOT NULL DEFAULT 'processed',
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_account ON meeting(account_id);
CREATE INDEX IF NOT EXISTS idx_meeting_project ON meeting(project_id);
CREATE INDEX IF NOT EXISTS idx_meeting_occurred_at ON meeting(occurred_at);

CREATE TABLE IF NOT EXISTS meeting_participant (
  meeting_id       uuid NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
  display_name     text NOT NULL,
  user_id          uuid REFERENCES user_app(id) ON DELETE SET NULL,
  email            text,
  role             text,
  joined_at        timestamptz,
  left_at          timestamptz,
  PRIMARY KEY (meeting_id, display_name)
);

CREATE TABLE IF NOT EXISTS doc_chunk (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id      uuid REFERENCES meeting(id) ON DELETE CASCADE,
  project_id      uuid REFERENCES project(id) ON DELETE SET NULL,
  account_id      uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  source_type     text NOT NULL,
  source_id       text,
  chunk_index     integer NOT NULL,
  content         text NOT NULL,
  token_count     integer,
  language        text,
  start_time      numeric(10,2),
  end_time        numeric(10,2),
  participants    text[],
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_chunk_meeting ON doc_chunk(meeting_id);
CREATE INDEX IF NOT EXISTS idx_doc_chunk_account ON doc_chunk(account_id);

-- RLS desabilitado durante o desenvolvimento. Reative conforme necessário ao preparar o ambiente produtivo.

-- ===== Views úteis (opcionais) =====
-- Tarefas por sprint (relacionamento simples via convenção: você pode ter uma tabela sprint_task caso queira comitar tarefas explicitamente a sprints)
-- CREATE TABLE sprint_task (
--   sprint_id   uuid NOT NULL REFERENCES sprint(id) ON DELETE CASCADE,
--   task_id     uuid NOT NULL REFERENCES task(id) ON DELETE CASCADE,
--   position    integer,
--   PRIMARY KEY (sprint_id, task_id)
--);

-- ===== Seeds mínimos (opcionais) =====
-- INSERT INTO plan(key,name,price_cents) VALUES ('free','Free',0)
--   ON CONFLICT (key) DO NOTHING;
-- Para cada "account" criar perfis padrão:
--   owner/admin/member/viewer
--   e garantir um profile_user apontando para o criador.
