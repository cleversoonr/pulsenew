-- Remove temporariamente as políticas de Row-Level Security em tabelas multi-conta
-- enquanto o desenvolvimento está em andamento. Reative-as antes do deploy produtivo.
DO $$
DECLARE
  target_tables text[] := ARRAY[
    'account',
    'project',
    'task',
    'meeting',
    'meeting_type',
    'doc_chunk'
  ];
  tab text;
  pol record;
BEGIN
  FOREACH tab IN ARRAY target_tables LOOP
    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tab
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, tab);
    END LOOP;

    IF EXISTS (
      SELECT 1
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename = tab
    ) THEN
      EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', tab);
    END IF;
  END LOOP;
END
$$;
