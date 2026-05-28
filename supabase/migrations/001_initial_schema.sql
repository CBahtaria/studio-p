-- Studio P — Initial Schema
-- Run: supabase db push

-- ── Extensions ──────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums ────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role    AS ENUM ('admin', 'editor', 'viewer', 'guest');
  CREATE TYPE member_tier  AS ENUM ('bronze', 'silver', 'gold', 'platinum');
  CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── profiles ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text         NOT NULL CHECK (length(trim(name)) >= 2),
  email         text         NOT NULL,
  avatar        text,
  phone         text         CHECK (phone ~ '^\+?[\d\s\-(). ]{7,20}$'),
  role          user_role    NOT NULL DEFAULT 'viewer',
  provider      text         NOT NULL DEFAULT 'email',
  member_tier   member_tier  NOT NULL DEFAULT 'bronze',
  visit_count   integer      NOT NULL DEFAULT 0 CHECK (visit_count >= 0),
  upload_count  integer      NOT NULL DEFAULT 0 CHECK (upload_count >= 0),
  preferences   jsonb        NOT NULL DEFAULT '{}',
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- ── bookings ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id            text           NOT NULL,   -- BK-XXXXXX
  client_id     uuid           REFERENCES profiles(id) ON DELETE SET NULL,
  client_name   text           NOT NULL,
  service       text           NOT NULL,
  barber        text           NOT NULL DEFAULT 'Any Available',
  scheduled_at  timestamptz    NOT NULL,
  status        booking_status NOT NULL DEFAULT 'pending',
  price_swl     integer        CHECK (price_swl > 0),  -- lilangeni cents
  notes         text           CHECK (length(notes) <= 200),
  created_at    timestamptz    NOT NULL DEFAULT now(),
  updated_at    timestamptz    NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- ── services ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id               text     PRIMARY KEY,
  name             text     NOT NULL,
  description      text,
  price_swl        integer  NOT NULL CHECK (price_swl > 0),
  duration_minutes integer  NOT NULL CHECK (duration_minutes > 0),
  tag              text,
  active           boolean  NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── gallery_items ────────────────────────────────
CREATE TABLE IF NOT EXISTS gallery_items (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id  uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  url          text        NOT NULL,
  caption      text        CHECK (length(caption) <= 120),
  approved     boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── rate_limit_log ───────────────────────────────
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id          bigserial    PRIMARY KEY,
  identifier  text         NOT NULL,
  action      text         NOT NULL,
  created_at  timestamptz  NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_client_id    ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_at ON bookings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status       ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_gallery_approved      ON gallery_items(approved);
CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup     ON rate_limit_log(identifier, action, created_at);

-- ── Seed: default services ────────────────────────
INSERT INTO services (id, name, description, price_swl, duration_minutes, tag) VALUES
  ('01', 'Signature Fade',     'Precision skin fade, tailored to your face shape.',  12000, 45, 'Signature'),
  ('02', 'Taper & Define',     'Timeless taper with surgical edges.',                10000, 40, 'Classic'),
  ('03', 'Beard Architecture', 'Hot towel, sculpt, line-up.',                         8000, 30, 'Grooming'),
  ('04', 'Full Package',       'Cut + Beard + Skin ritual.',                         22000, 90, 'Premium'),
  ('05', 'Youth Cut',          'Clean cuts for the next generation.',                 6000, 30, 'Youth'),
  ('06', 'Edge & Line-Up',     'Surgical precision on hairline and temples.',         6000, 20, 'Quick')
ON CONFLICT (id) DO NOTHING;
