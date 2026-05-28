-- Migration 006: client-photos storage bucket, gallery enhancements, cleanup function

-- Add storage_path to gallery_items (tracks exact bucket path for deletion)
ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS storage_path text;

-- Create the client-photos storage bucket (public read, 5 MB max, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-photos',
  'client-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: anyone can view approved client photos
CREATE POLICY "client-photos public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'client-photos');

-- RLS: authenticated users can upload their own photos
CREATE POLICY "client-photos auth upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'client-photos'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = split_part(name, '/', 1)
  );

-- RLS: owner or admin can delete
CREATE POLICY "client-photos owner delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'client-photos'
    AND (
      auth.uid()::text = split_part(name, '/', 1)
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Helper function: delete gallery rows and their storage objects older than N days
-- Called by the cleanup-photos Edge Function
CREATE OR REPLACE FUNCTION get_expired_gallery_items(days_old int DEFAULT 5)
RETURNS TABLE(id text, storage_path text) AS $$
  SELECT id, storage_path
  FROM gallery_items
  WHERE created_at < now() - make_interval(days => days_old)
    AND storage_path IS NOT NULL;
$$ LANGUAGE sql STABLE;
