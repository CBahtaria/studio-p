-- Add media_type and expires_at to gallery_items for video support
ALTER TABLE gallery_items
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image'
    CHECK (media_type IN ('image', 'video'));

ALTER TABLE gallery_items
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Trigger: auto-set 7-day expiry for video rows on insert
CREATE OR REPLACE FUNCTION set_video_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.media_type = 'video' AND NEW.expires_at IS NULL THEN
    NEW.expires_at = NOW() + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS gallery_video_expiry ON gallery_items;
CREATE TRIGGER gallery_video_expiry
  BEFORE INSERT ON gallery_items
  FOR EACH ROW EXECUTE FUNCTION set_video_expiry();

-- Fast cleanup query index
CREATE INDEX IF NOT EXISTS gallery_expires_idx ON gallery_items (expires_at)
  WHERE expires_at IS NOT NULL;
