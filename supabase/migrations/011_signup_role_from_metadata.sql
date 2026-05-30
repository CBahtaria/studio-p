-- Migration 011: honour role from user_metadata on sign-up
-- Replaces the trigger function so newly created users get the role they chose
-- (viewer or editor). Admin role is never granted via self-signup for security.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name   TEXT;
  v_email  TEXT;
  v_avatar TEXT;
  v_role   TEXT;
BEGIN
  v_email  := COALESCE(NEW.email, '');
  v_name   := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(v_email, '@', 1)
  );
  v_avatar := NEW.raw_user_meta_data->>'avatar_url';

  -- Only allow viewer or editor from metadata; admin must be set via admin panel
  v_role := CASE
    WHEN NEW.raw_user_meta_data->>'role' = 'editor' THEN 'editor'
    ELSE 'viewer'
  END;

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
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;
