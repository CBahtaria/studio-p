-- Studio P — Fix handle_new_user trigger for Google/Apple OAuth
--
-- Problems fixed:
--   1. Empty-string names from OAuth providers bypass COALESCE but fail the
--      CHECK (length(trim(name)) >= 2) constraint → rolls back auth.users INSERT
--   2. Google sets raw_user_meta_data.full_name, not just .name
--   3. Google/Apple users have avatar_url that should be stored
--   4. Any trigger failure must not block user creation (EXCEPTION handler added)

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name   text;
  v_email  text;
  v_avatar text;
BEGIN
  -- Resolve display name: prefer full_name (Google), then name, then email prefix
  v_name := NULLIF(trim(
    COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
      NULLIF(split_part(COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', ''), '@', 1), '')
    )
  ), '');

  -- Ensure minimum length required by profiles CHECK constraint
  IF v_name IS NULL OR length(v_name) < 2 THEN
    v_name := 'Member';
  END IF;

  v_email  := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', '');
  v_avatar := NEW.raw_user_meta_data->>'avatar_url';

  INSERT INTO profiles (id, name, email, avatar, provider, role, member_tier)
  VALUES (
    NEW.id,
    v_name,
    v_email,
    v_avatar,
    COALESCE(NEW.app_metadata->>'provider', 'email'),
    'viewer',
    'bronze'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Never let profile-creation failure block the auth.users INSERT
  RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;
