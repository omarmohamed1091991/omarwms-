# إعداد حساب الأدمن - الخطوات النهائية

## الخطوة 1: إنشاء المستخدم في Supabase Auth

1. افتح **Supabase Dashboard** → **Authentication** → **Users**
2. اضغط **Add user** → **Create new user**
3. أدخل البيانات التالية:
   - **Email:** `admin@rosesmile.com`
   - **Password:** `Admin@12345`
   - **User UID:** `04d05db5-477e-4b42-b64a-2a7c5825d24c` (مهم جداً!)
   - ✅ فعّل: **Auto Confirm User**
4. اضغط **Create user**

## الخطوة 2: تحديث الملف الشخصي

شغّل السكريبت التالي في **SQL Editor**:

```sql
UPDATE user_profiles 
SET 
  email = 'admin@rosesmile.com',
  role = 'admin'
WHERE id = '04d05db5-477e-4b42-b64a-2a7c5825d24c';
```

## الخطوة 3: تسجيل الدخول

استخدم البيانات التالية:
- **البريد الإلكتروني:** `admin@rosesmile.com`
- **كلمة المرور:** `Admin@12345`

---

## ملاحظات مهمة

- **يجب** استخدام نفس UUID (`04d05db5-477e-4b42-b64a-2a7c5825d24c`) عند إنشاء المستخدم في Auth
- إذا لم يظهر خيار "User UID" في واجهة Supabase، استخدم الطريقة البديلة أدناه

## الطريقة البديلة (باستخدام SQL مباشرة)

إذا لم تتمكن من تحديد UUID مخصص في الواجهة، استخدم هذا السكريبت:

```sql
-- إنشاء المستخدم مباشرة في auth.users
INSERT INTO auth.users 
  (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES 
  (
    '04d05db5-477e-4b42-b64a-2a7c5825d24c',
    'admin@rosesmile.com',
    crypt('Admin@12345', gen_salt('bf')),
    now(),
    now(),
    now()
  )
ON CONFLICT (id) DO UPDATE 
SET 
  email = 'admin@rosesmile.com',
  encrypted_password = crypt('Admin@12345', gen_salt('bf'));

-- تحديث user_profiles
UPDATE user_profiles 
SET 
  email = 'admin@rosesmile.com',
  role = 'admin'
WHERE id = '04d05db5-477e-4b42-b64a-2a7c5825d24c';
