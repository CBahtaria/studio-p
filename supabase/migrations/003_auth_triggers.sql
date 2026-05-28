-- Studio P — Auth Triggers & Business Logic Functions

-- ── Auto-create profile on sign-up ──────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, name, email, provider, role, member_tier)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Member'),
    NEW.email,
    COALESCE(NEW.app_metadata->>'provider', 'email'),
    'viewer',
    'bronze'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Auto-update updated_at ────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS bookings_updated_at ON bookings;
CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Auto-compute member tier on visit_count change ──
CREATE OR REPLACE FUNCTION compute_member_tier(p_visits integer)
RETURNS member_tier
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_visits >= 50 THEN 'platinum'::member_tier
    WHEN p_visits >= 20 THEN 'gold'::member_tier
    WHEN p_visits >= 5  THEN 'silver'::member_tier
    ELSE                     'bronze'::member_tier
  END;
$$;

CREATE OR REPLACE FUNCTION update_member_tier()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.member_tier = compute_member_tier(NEW.visit_count);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_tier_update ON profiles;
CREATE TRIGGER profiles_tier_update
  BEFORE UPDATE OF visit_count ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_member_tier();

-- ── Increment visit count on booking completion ──
CREATE OR REPLACE FUNCTION handle_booking_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.client_id IS NOT NULL THEN
    UPDATE profiles
    SET visit_count = visit_count + 1
    WHERE id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS booking_completion_trigger ON bookings;
CREATE TRIGGER booking_completion_trigger
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION handle_booking_completed();
