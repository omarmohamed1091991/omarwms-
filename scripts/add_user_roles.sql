-- إضافة عمود role لجدول user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user'));
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE;

-- تحديث RLS policies لدعم صلاحيات الأدمن
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM user_profiles WHERE role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
CREATE POLICY "Admins can update all profiles" ON user_profiles
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM user_profiles WHERE role = 'admin')
  );

-- إنشاء حساب أدمن افتراضي
-- ملاحظة: سيتم إنشاء هذا الحساب من خلال server action
