-- إصلاح RLS policies على جدول user_profiles لحل مشكلة infinite recursion
-- حذف جميع الpolicies القديمة
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;

-- إنشاء policies جديدة بدون recursion
CREATE POLICY "Enable read access for authenticated users"
ON user_profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable update for users based on user_id"
ON user_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users"
ON user_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- الآن سننشئ حساب الأدمن في Supabase Auth
-- ملاحظة: هذا السكريبت يحتاج تشغيله من Supabase Dashboard > SQL Editor

-- UUID للمستخدم omar Rabie الموجود
DO $$
DECLARE
  admin_user_id uuid := '04d05db5-477e-4b42-b64a-2a7c5825d24c';
  admin_email text := 'admin@rosesmile.com';
  admin_password text := 'Admin@12345';
BEGIN
  -- تحديث بيانات الملف الشخصي
  UPDATE user_profiles 
  SET 
    email = admin_email,
    role = 'admin'
  WHERE id = admin_user_id;
  
  RAISE NOTICE 'Updated user profile for admin';
  RAISE NOTICE 'Admin Email: %', admin_email;
  RAISE NOTICE 'Admin Password: %', admin_password;
  RAISE NOTICE '';
  RAISE NOTICE 'الخطوات المتبقية:';
  RAISE NOTICE '1. اذهب إلى Authentication > Users في Supabase Dashboard';
  RAISE NOTICE '2. اضغط Add User > Create new user';
  RAISE NOTICE '3. أدخل Email: admin@rosesmile.com';
  RAISE NOTICE '4. أدخل Password: Admin@12345';
  RAISE NOTICE '5. مهم جداً: في حقل User UID، أدخل: 04d05db5-477e-4b42-b64a-2a7c5825d24c';
  RAISE NOTICE '6. فعل Auto Confirm User';
  RAISE NOTICE '7. اضغط Create user';
END $$;
