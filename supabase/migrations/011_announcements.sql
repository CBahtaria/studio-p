-- ════════════════════════════════════════════════
-- Migration 011 — announcements table
-- Editor-authored posts/updates visible to all members
-- ════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS announcements (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT        NOT NULL DEFAULT '',
  body        TEXT        NOT NULL,
  tag         TEXT        NOT NULL DEFAULT 'UPDATE',
  likes       INTEGER     NOT NULL DEFAULT 0,
  published   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT body_length  CHECK (char_length(body) BETWEEN 1 AND 1000),
  CONSTRAINT tag_values   CHECK (tag IN ('CULTURE','TIPS','UPDATE','PROMO','EVENT'))
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Anyone can read published posts
CREATE POLICY "anon_read_published" ON announcements
  FOR SELECT USING (published = true);

-- Editors and admins can insert
CREATE POLICY "editor_admin_insert" ON announcements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor','admin'))
  );

-- Authors can update their own posts
CREATE POLICY "author_update" ON announcements
  FOR UPDATE USING (author_id = auth.uid());

-- Authors and admins can delete
CREATE POLICY "author_admin_delete" ON announcements
  FOR DELETE USING (
    author_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Keep updated_at current
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_announcements_updated_at();
