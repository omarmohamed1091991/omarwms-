-- تحديث بيانات الأدمن الحالي وإضافة بريد إلكتروني وكلمة مرور
UPDATE user_profiles
SET 
  email = 'admin@rosesmile.com',
  password_hash = crypt('RoseSmile@2025', gen_salt('bf')),
  full_name = 'Admin RoseSmile',
  updated_at = NOW()
WHERE id = '04d05db5-477e-4b42-b64a-2a7c5825d24c';

-- التحقق من التحديث
SELECT id, full_name, email, phone_number, role, created_at 
FROM user_profiles 
WHERE role = 'admin';
