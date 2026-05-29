-- Open service write access to editors (was admin-only)
DROP POLICY IF EXISTS "services_insert_admin" ON services;
DROP POLICY IF EXISTS "services_update_admin" ON services;
DROP POLICY IF EXISTS "services_delete_admin" ON services;

CREATE POLICY "services_write_staff" ON services
  FOR ALL TO authenticated
  USING    (get_user_role() IN ('admin', 'editor'))
  WITH CHECK (get_user_role() IN ('admin', 'editor'));
