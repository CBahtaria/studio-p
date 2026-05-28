-- Studio P — Server-side Rate Limiting

-- Function called by Edge Functions (service_role) to check + record an action
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier     text,
  p_action         text,
  p_limit          integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Count recent requests in window
  SELECT COUNT(*) INTO v_count
  FROM rate_limit_log
  WHERE identifier = p_identifier
    AND action     = p_action
    AND created_at > now() - (p_window_seconds || ' seconds')::interval;

  IF v_count >= p_limit THEN
    RETURN false;  -- blocked
  END IF;

  -- Record this request
  INSERT INTO rate_limit_log (identifier, action) VALUES (p_identifier, p_action);

  -- Clean up entries older than 24h to prevent unbounded growth
  DELETE FROM rate_limit_log
  WHERE action = p_action
    AND created_at < now() - interval '24 hours';

  RETURN true;  -- allowed
END;
$$;

-- Convenience wrappers for common limits
CREATE OR REPLACE FUNCTION check_auth_rate_limit(p_ip text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT check_rate_limit(p_ip, 'auth.signin', 5, 900);  -- 5 per 15 min
$$;

CREATE OR REPLACE FUNCTION check_booking_rate_limit(p_user_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT check_rate_limit(p_user_id, 'booking.create', 5, 86400);  -- 5 per day
$$;

CREATE OR REPLACE FUNCTION check_signup_rate_limit(p_ip text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT check_rate_limit(p_ip, 'auth.signup', 3, 3600);  -- 3 per hour
$$;
