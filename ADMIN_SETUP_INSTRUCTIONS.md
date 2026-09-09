# خطوات إنشاء حساب الأدمن

## المشكلة الحالية
نظام تسجيل الدخول لا يعمل لأن حساب الأدمن غير موجود في Supabase Auth، كما أن هناك مشكلة في RLS policies تسبب infinite recursion.

## الحل

### الخطوة 1: تشغيل SQL Script
1. افتح Supabase Dashboard
2. اذهب إلى **SQL Editor**
3. شغل السكريبت `scripts/fix_auth_and_create_admin.sql`
4. هذا سيصلح RLS policies ويحدث بيانات الملف الشخصي

### الخطوة 2: إنشاء مستخدم في Supabase Auth
1. في Supabase Dashboard، اذهب إلى **Authentication** > **Users**
2. اضغط **Add user** > **Create new user**
3. املأ البيانات التالية:
   - **Email**: `admin@rosesmile.com`
   - **Password**: `Admin@12345`
   - **User UID**: `04d05db5-477e-4b42-b64a-2a7c5825d24c` ⚠️ **مهم جداً!**
   - ✅ فعّل **Auto Confirm User**
4. اضغط **Create user**

### الخطوة 3: اختبار تسجيل الدخول
1. اذهب إلى صفحة Login: `/auth/login`
2. أدخل:
   - البريد: `admin@rosesmile.com`
   - الرقم السري: `Admin@12345`
3. اضغط تسجيل الدخول

## بيانات تسجيل الدخول النهائية
- **البريد الإلكتروني**: `admin@rosesmile.com`
- **كلمة المرور**: `Admin@12345`
- **الدور**: Admin (لديه كامل الصلاحيات)

## ملاحظات مهمة
- يجب أن يكون UUID المستخدم في Auth مطابق لـ UUID في جدول user_profiles
- UUID الصحيح هو: `04d05db5-477e-4b42-b64a-2a7c5825d24c`
- إذا لم تدخل UUID بشكل صحيح، سيتم إنشاء UUID جديد ولن يعمل النظام
