-- Cria tabelas auxiliares para o módulo de sprints

-- 1) sprint_task: vincula tarefas a um sprint com informações de compromisso
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

-- 2) user_capacity: capacidade semanal por usuário (opcionalmente vinculada a um sprint)
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

-- 3) holiday_calendar: feriados/ausências por conta (opcionalmente por projeto)
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
