-- إنشاء جدول مكتبة الصور
CREATE TABLE IF NOT EXISTS public.media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL, -- Media ID من WhatsApp
  media_url TEXT, -- رابط الصورة
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'document')),
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, media_id)
);

-- إنشاء index لتسريع الاستعلامات
CREATE INDEX IF NOT EXISTS idx_media_library_user_id ON public.media_library(user_id);
CREATE INDEX IF NOT EXISTS idx_media_library_uploaded_at ON public.media_library(uploaded_at DESC);

-- تفعيل RLS
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
CREATE POLICY "Users can view their own media" ON public.media_library
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own media" ON public.media_library
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own media" ON public.media_library
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media" ON public.media_library
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.media_library IS 'مكتبة الصور والوسائط للمستخدمين';
COMMENT ON COLUMN public.media_library.media_id IS 'Media ID من WhatsApp API';
COMMENT ON COLUMN public.media_library.media_url IS 'رابط URL للصورة';
