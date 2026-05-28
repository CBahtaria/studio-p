-- Studio P — Admin seed + role-aware new-user trigger
--
-- 1. Replaces handle_new_user to assign 'admin' role for the designated
--    admin email at signup time (server-side, cannot be spoofed by client).
-- 2. Back-fills / upserts the admin profile for the case where the admin
--    already signed in via Google before this migration ran.

-- ── Designated admin emails ───────────────────────
-- Add more emails here as a comma-separated list if needed.
CREATE OR REPLACE FUNCTION is_admin_email(p_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_email = ANY(ARRAY['charleskris9@gmail.com']);
$$;

-- ── Updated new-user trigger ──────────────────────
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
  v_role   user_role;
BEGIN
  v_name := NULLIF(trim(
    COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
      NULLIF(split_part(COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', ''), '@', 1), '')
    )
  ), '');

  IF v_name IS NULL OR length(v_name) < 2 THEN
    v_name := 'Member';
  END IF;

  v_email  := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', '');
  v_avatar := NEW.raw_user_meta_data->>'avatar_url';
  v_role   := CASE WHEN is_admin_email(v_email) THEN 'admin'::user_role ELSE 'viewer'::user_role END;

  INSERT INTO profiles (id, name, email, avatar, provider, role, member_tier)
  VALUES (
    NEW.id,
    v_name,
    v_email,
    v_avatar,
    COALESCE(NEW.app_metadata->>'provider', 'email'),
    v_role,
    'bronze'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- ── Back-fill admin role for existing sign-ups ────
-- If the admin already signed in before this migration, their profile
-- exists with role='viewer'. Promote it to 'admin' now.
UPDATE profiles
SET role = 'admin'
WHERE email = 'charleskris9@gmail.com'
  AND role != 'admin';

-- If the admin signed in via Google but the trigger failed entirely
-- (no profile row at all), create one from auth.users.
INSERT INTO profiles (id, name, email, avatar, provider, role, member_tier)
SELECT
  u.id,
  COALESCE(
    NULLIF(trim(u.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(u.raw_user_meta_data->>'name'), ''),
    split_part(u.email, '@', 1),
    'Admin'
  ),
  u.email,
  u.raw_user_meta_data->>'avatar_url',
  COALESCE(u.app_metadata->>'provider', 'email'),
  'admin',
  'bronze'
FROM auth.users u
WHERE u.email = 'charleskris9@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
