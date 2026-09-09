-- حذف السياسات القديمة التي تسمح بالوصول لجميع الرسائل
DROP POLICY IF EXISTS "Enable read access for all users" ON public.incoming_messages;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.incoming_messages;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.incoming_messages;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.incoming_messages;

DROP POLICY IF EXISTS "Users can view own incoming messages" ON public.incoming_messages;
DROP POLICY IF EXISTS "Users can insert own incoming messages" ON public.incoming_messages;
DROP POLICY IF EXISTS "Users can update own incoming messages" ON public.incoming_messages;
DROP POLICY IF EXISTS "Users can delete own incoming messages" ON public.incoming_messages;
DROP POLICY IF EXISTS "Users can view their own incoming messages" ON public.incoming_messages;
DROP POLICY IF EXISTS "Users can update their own incoming messages" ON public.incoming_messages;

-- إنشاء سياسات جديدة تقيد الوصول لرسائل المستخدم فقط
-- المستخدمون العاديون يرون رسائلهم فقط
CREATE POLICY "Users can view their own messages"
ON public.incoming_messages
FOR SELECT
USING (user_id = auth.uid());

-- الأدمن يرى جميع الرسائل
CREATE POLICY "Admins can view all messages"
ON public.incoming_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- webhooks يمكنها الإدراج (service role يتجاوز RLS)
CREATE POLICY "Service role can insert messages"
ON public.incoming_messages
FOR INSERT
WITH CHECK (true);

-- المستخدمون يحدثون رسائلهم فقط
CREATE POLICY "Users can update their own messages"
ON public.incoming_messages
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- الأدمن يحدث جميع الرسائل
CREATE POLICY "Admins can update all messages"
ON public.incoming_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- المستخدمون يحذفون رسائلهم فقط
CREATE POLICY "Users can delete their own messages"
ON public.incoming_messages
FOR DELETE
USING (user_id = auth.uid());

-- الأدمن يحذف جميع الرسائل
CREATE POLICY "Admins can delete all messages"
ON public.incoming_messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);
