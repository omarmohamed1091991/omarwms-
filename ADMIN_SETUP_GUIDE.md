# دليل إعداد حساب الأدمن

## الطريقة الأولى: عبر Supabase Dashboard (الأسهل)

1. افتح Supabase Dashboard: https://supabase.com/dashboard
2. اذهب إلى مشروعك: `rosesmile`
3. من القائمة الجانبية، اختر **Authentication** > **Users**
4. اضغط على **Add user** > **Create new user**
5. أدخل البيانات التالية:
   - Email: `admin@rosesmile.com`
   - Password: `Admin@12345`
   - Auto Confirm User: ✅ (نعم)
6. اضغط على **Create user**
7. بعد إنشاء المستخدم، انسخ الـ UUID الخاص به
8. اذهب إلى **SQL Editor** وشغل الاستعلام التالي:

```sql
UPDATE user_profiles
SET 
  email = 'admin@rosesmile.com',
  role = 'admin',
  full_name = 'مدير النظام'
WHERE id = 'UUID_المستخدم_هنا';
```

## الطريقة الثانية: عبر Script (متقدمة)

1. شغل السكريبت:
```bash
npm run setup-admin
```

## بيانات تسجيل الدخول

- **البريد الإلكتروني:** `admin@rosesmile.com`
- **كلمة المرور:** `Admin@12345`

## التحقق من نجاح العملية

1. اذهب إلى صفحة تسجيل الدخول: `/auth/login`
2. أدخل البريد وكلمة المرور
3. يجب أن يتم توجيهك إلى صفحة إدارة المستخدمين `/users`
