-- Adiciona suporte a tipos de reunião configuráveis e novos relacionamentos

-- 1) Tabela temporária para os tipos até removermos o ENUM antigo
CREATE TABLE IF NOT EXISTS meeting_type_catalog (
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

CREATE INDEX IF NOT EXISTS idx_meeting_type_catalog_account ON meeting_type_catalog(account_id);

-- 2) Garante coluna para apontar para o novo tipo e novos metadados
ALTER TABLE meeting
  ADD COLUMN IF NOT EXISTS meeting_type_id uuid,
  ADD COLUMN IF NOT EXISTS transcript_language text,
  ADD COLUMN IF NOT EXISTS sentiment_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'processed',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 3) Insere tipos padrões por conta (se ainda não houver)
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN (
    SELECT DISTINCT account_id, meeting_type::text AS key
    FROM meeting
    WHERE meeting_type_id IS NULL
  ) LOOP
    INSERT INTO meeting_type_catalog (account_id, key, name)
    VALUES (
      rec.account_id,
      rec.key,
      initcap(replace(rec.key, '_', ' '))
    )
    ON CONFLICT (account_id, key) DO NOTHING;
  END LOOP;
END
$$;

-- 4) Relaciona reuniões existentes aos novos tipos
UPDATE meeting m
SET meeting_type_id = mt.id
FROM meeting_type_catalog mt
WHERE mt.account_id = m.account_id
  AND mt.key = m.meeting_type::text
  AND m.meeting_type_id IS NULL;

-- 5) Garante not null após migração
ALTER TABLE meeting
  ALTER COLUMN meeting_type_id SET NOT NULL;

-- 6) Remove coluna antiga baseada em ENUM
ALTER TABLE meeting
  DROP COLUMN IF EXISTS meeting_type;

-- 7) Remove o tipo enumerado se ainda existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meeting_type') THEN
    DROP TYPE meeting_type;
  END IF;
END
$$;

-- 8) Renomeia tabela temporária para o nome definitivo
ALTER TABLE meeting_type_catalog RENAME TO meeting_type;
ALTER INDEX IF EXISTS idx_meeting_type_catalog_account RENAME TO idx_meeting_type_account;
ALTER TABLE meeting
  ADD CONSTRAINT meeting_meeting_type_fk FOREIGN KEY (meeting_type_id) REFERENCES meeting_type(id) ON DELETE RESTRICT;

-- 9) Tabelas auxiliares para participantes e chunks (idempotentes)
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

-- 10) RLS desabilitado temporariamente durante desenvolvimento
ALTER TABLE IF EXISTS meeting       DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS meeting_type  DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS doc_chunk     DISABLE ROW LEVEL SECURITY;
