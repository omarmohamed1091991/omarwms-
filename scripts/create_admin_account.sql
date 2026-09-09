-- إنشاء حساب أدمن في Supabase Auth
-- يجب تشغيل هذا السكريبت في Supabase SQL Editor

-- أولاً: إنشاء المستخدم في auth.users (إذا لم يكن موجوداً)
-- ملاحظة: لا يمكن إنشاء مستخدمين مباشرة في auth.users عبر SQL
-- يجب استخدام Supabase Dashboard أو API

-- ثانياً: تحديث user_profiles للمستخدم الموجود
UPDATE user_profiles
SET 
  email = 'admin@rosesmile.com',
  role = 'admin',
  full_name = 'مدير النظام',
  phone_number = '+966500000000'
WHERE id = 'e0ece4e8-f6f7-474e-9ea0-b8f7c1c4e8fa';

-- إذا لم يكن المستخدم موجوداً، سيتم إنشاؤه يدوياً
