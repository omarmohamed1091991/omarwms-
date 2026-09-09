# إعداد سياسات RLS لعزل رسائل المستخدمين

## المشكلة
جميع الرسائل تظهر لجميع المستخدمين بدلاً من أن يرى كل مستخدم رسائله فقط.

## الحل
تحديث RLS policies على جدول `incoming_messages` لتقييد الوصول حسب `user_id`.

## الخطوات

### 1. تشغيل السكريبت
في Supabase Dashboard → SQL Editor، قم بتشغيل السكريبت `scripts/fix_incoming_messages_rls.sql`

### 2. التحقق من السياسات
بعد تشغيل السكريبت، تحقق من أن السياسات التالية موجودة:

**سياسات SELECT:**
- `Users can view their own messages` - المستخدمون يرون رسائلهم فقط
- `Admins can view all messages` - الأدمن يرى جميع الرسائل

**سياسات INSERT:**
- `Service role can insert messages` - webhooks تستطيع إضافة رسائل

**سياسات UPDATE:**
- `Users can update their own messages` - المستخدمون يحدثون رسائلهم فقط
- `Admins can update all messages` - الأدمن يحدث جميع الرسائل

**سياسات DELETE:**
- `Users can delete their own messages` - المستخدمون يحذفون رسائلهم فقط
- `Admins can delete all messages` - الأدمن يحذف جميع الرسائل

### 3. اختبار النظام

1. سجل دخول كمستخدم عادي واذهب لصندوق الوارد
2. يجب أن ترى رسائلك فقط
3. سجل دخول كأدمن
4. يجب أن ترى جميع رسائل جميع المستخدمين

## ملاحظات مهمة

- webhook يستخدم `SUPABASE_SERVICE_ROLE_KEY` لذلك يتجاوز RLS ويستطيع إضافة الرسائل
- كل رسالة واردة تحفظ مع `user_id` الصحيح من URL الـ webhook: `/api/webhooks/[userId]`
- الأدمن له صلاحيات كاملة لرؤية وإدارة جميع الرسائل
- المستخدمون العاديون يرون رسائلهم فقط
