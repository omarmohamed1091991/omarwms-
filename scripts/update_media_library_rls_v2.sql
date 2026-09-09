-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Users can view their own media" ON public.media_library;
DROP POLICY IF EXISTS "Users can insert their own media" ON public.media_library;
DROP POLICY IF EXISTS "Users can update their own media" ON public.media_library;
DROP POLICY IF EXISTS "Users can delete their own media" ON public.media_library;

-- إنشاء سياسات RLS جديدة تسمح بالوصول الكامل للمستخدمين
-- نظراً لأن النظام يستخدم user_id مخصص وليس Supabase Auth، نسمح بالوصول بناءً على user_id المحفوظ

CREATE POLICY "Enable read access for authenticated users" ON public.media_library
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.media_library
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.media_library
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON public.media_library
  FOR DELETE USING (true);

COMMENT ON TABLE public.media_library IS 'مكتبة الصور والوسائط للمستخدمين - يتم التحكم بالوصول عبر application layer';
