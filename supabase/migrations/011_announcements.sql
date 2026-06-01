-- Migration 011: announcements table

CREATE TABLE IF NOT EXISTS announcements (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT        NOT NULL DEFAULT '',
  body        TEXT        NOT NULL,
  tag         TEXT        NOT NULL DEFAULT 'UPDATE',
  likes       INTEGER     NOT NULL DEFAULT 0,
  published   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_published" ON announcements
  FOR SELECT USING (published = true);

CREATE POLICY "editor_admin_insert" ON announcements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor','admin'))
  );

CREATE POLICY "author_update" ON announcements
  FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "author_admin_delete" ON announcements
  FOR DELETE USING (
    author_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_announcements_updated_at();
