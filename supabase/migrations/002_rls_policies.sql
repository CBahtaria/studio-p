-- Studio P — Row Level Security Policies

-- ── Enable RLS ──────────────────────────────────
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE services      ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;

-- ── Helper: get caller role ──────────────────────
-- SECURITY DEFINER so it can read profiles without triggering RLS recursion
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- ══════════════════════════════════════════════════
-- profiles
-- ══════════════════════════════════════════════════

-- Own profile (read)
CREATE POLICY "profiles_read_own" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Admin reads all
CREATE POLICY "profiles_read_admin" ON profiles
  FOR SELECT USING (get_user_role() = 'admin');

-- Own profile (update)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin updates all
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (get_user_role() = 'admin');

-- Insert via trigger (service_role bypasses RLS)
-- No INSERT policy for authenticated users — DB trigger handles it on auth.users insert

-- ══════════════════════════════════════════════════
-- bookings
-- ══════════════════════════════════════════════════

-- Staff (admin/editor) read all
CREATE POLICY "bookings_read_staff" ON bookings
  FOR SELECT USING (get_user_role() IN ('admin', 'editor'));

-- Client reads own
CREATE POLICY "bookings_read_own" ON bookings
  FOR SELECT USING (client_id = auth.uid());

-- Authenticated creates booking (max 5/day enforced in edge function)
CREATE POLICY "bookings_insert_auth" ON bookings
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND client_id = auth.uid()
  );

-- Client cancels own pending booking
CREATE POLICY "bookings_cancel_own" ON bookings
  FOR UPDATE USING (
    client_id = auth.uid()
    AND status = 'pending'
  )
  WITH CHECK (status = 'cancelled');

-- Staff full update
CREATE POLICY "bookings_update_staff" ON bookings
  FOR UPDATE USING (get_user_role() IN ('admin', 'editor'));

-- Admin delete
CREATE POLICY "bookings_delete_admin" ON bookings
  FOR DELETE USING (get_user_role() = 'admin');

-- ══════════════════════════════════════════════════
-- services
-- ══════════════════════════════════════════════════

-- Public read (active services only for anon)
CREATE POLICY "services_read_public" ON services
  FOR SELECT USING (
    active = true
    OR get_user_role() IN ('admin', 'editor')
  );

-- Admin CUD
CREATE POLICY "services_insert_admin" ON services
  FOR INSERT WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "services_update_admin" ON services
  FOR UPDATE USING (get_user_role() = 'admin');

CREATE POLICY "services_delete_admin" ON services
  FOR DELETE USING (get_user_role() = 'admin');

-- ══════════════════════════════════════════════════
-- gallery_items
-- ══════════════════════════════════════════════════

-- Public reads approved items
CREATE POLICY "gallery_read_approved" ON gallery_items
  FOR SELECT USING (approved = true);

-- Uploader reads own (including unapproved)
CREATE POLICY "gallery_read_own" ON gallery_items
  FOR SELECT USING (uploader_id = auth.uid());

-- Admin reads all
CREATE POLICY "gallery_read_admin" ON gallery_items
  FOR SELECT USING (get_user_role() = 'admin');

-- Any authenticated user can upload (pending approval)
CREATE POLICY "gallery_insert_auth" ON gallery_items
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND uploader_id = auth.uid()
    AND approved = false
  );

-- Admin approves
CREATE POLICY "gallery_approve_admin" ON gallery_items
  FOR UPDATE USING (get_user_role() = 'admin');

-- Uploader updates own caption
CREATE POLICY "gallery_update_own" ON gallery_items
  FOR UPDATE USING (uploader_id = auth.uid())
  WITH CHECK (uploader_id = auth.uid() AND approved = false);

-- Admin or uploader deletes
CREATE POLICY "gallery_delete_own" ON gallery_items
  FOR DELETE USING (
    uploader_id = auth.uid()
    OR get_user_role() = 'admin'
  );

-- ══════════════════════════════════════════════════
-- rate_limit_log (service_role only)
-- ══════════════════════════════════════════════════

-- No authenticated access — only edge functions via service_role bypass RLS
