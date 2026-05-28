-- Studio P — Development Seed Data
-- Run AFTER migrations. For local dev only.

-- Demo bookings (client_id NULL = walk-in / pre-registration)
INSERT INTO bookings (id, client_id, client_name, service, barber, scheduled_at, status, price_swl) VALUES
  ('BK-SEED01', NULL, 'Lungelo M.',   'Signature Fade',     'P. Dlamini', now() + interval '2 hours', 'confirmed', 12000),
  ('BK-SEED02', NULL, 'Bongani N.',   'Taper & Define',     'S. Mkhonta', now() + interval '3 hours', 'pending',   10000),
  ('BK-SEED03', NULL, 'Thabo K.',     'Full Package',       'P. Dlamini', now() + interval '5 hours', 'confirmed', 22000),
  ('BK-SEED04', NULL, 'Sipho D.',     'Beard Architecture', 'S. Mkhonta', now() + interval '1 day',  'pending',    8000)
ON CONFLICT (id) DO NOTHING;
