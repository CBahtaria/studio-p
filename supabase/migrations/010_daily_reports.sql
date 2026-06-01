-- ════════════════════════════════════════════════
-- Migration 010: Daily Reports table
-- Stores generated daily briefings for Mfanomuhle
-- ════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS daily_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date     date NOT NULL UNIQUE,
  total_bookings  integer NOT NULL DEFAULT 0,
  confirmed       integer NOT NULL DEFAULT 0,
  pending_count   integer NOT NULL DEFAULT 0,
  cancelled       integer NOT NULL DEFAULT 0,
  completed       integer NOT NULL DEFAULT 0,
  total_revenue_swl integer NOT NULL DEFAULT 0,
  appointments    jsonb NOT NULL DEFAULT '[]'::jsonb,
  whatsapp_message text,
  generated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- Only admin can read/write daily reports
CREATE POLICY "admin_full_access_daily_reports"
  ON daily_reports FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
