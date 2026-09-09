-- حذف السياسات القديمة (التي تستخدم auth.uid)
DROP POLICY IF EXISTS "Users can view their own media" ON public.media_library;
DROP POLICY IF EXISTS "Users can insert their own media" ON public.media_library;
DROP POLICY IF EXISTS "Users can update their own media" ON public.media_library;
DROP POLICY IF EXISTS "Users can delete their own media" ON public.media_library;

-- حذف السياسات الجديدة إذا كانت موجودة
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.media_library;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.media_library;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.media_library;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.media_library;

-- إنشاء سياسات RLS جديدة تسمح بالوصول الكامل
-- الحظر user_id نفسه يتم بالتطبيق بشكل صحيح في Server Actions

CREATE POLICY "Enable read access for authenticated users" ON public.media_library
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.media_library
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.media_library
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON public.media_library
  FOR DELETE USING (true);
