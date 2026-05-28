-- Studio P — Allow authenticated users to insert their own profile row
-- Safety net: when handle_new_user trigger fails, the client-side fallback
-- upsert in fetchProfile can create the profile row instead.
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());
