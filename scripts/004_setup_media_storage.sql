-- إنشاء bucket للصور في Supabase Storage
-- Create storage bucket for media files
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-library', 'media-library', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can upload their own media
CREATE POLICY "Users can upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media-library' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own media
CREATE POLICY "Users can view own media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'media-library' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own media
CREATE POLICY "Users can delete own media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'media-library' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Public read access for media files
CREATE POLICY "Public can view media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media-library');
