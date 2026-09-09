# دليل إعداد Webhook لكل مستخدم

## كيف يعمل النظام

✅ **النظام الحالي صحيح ويعمل بشكل احترافي:**

- كل مستخدم له webhook URL خاص به
- الرابط: `https://your-domain.com/api/webhooks/{USER_ID}`
- عندما ترسل Meta رسالة لـ webhook معين، تظهر فقط في صندوق وارد ذلك المستخدم

## خطوات الإعداد للمستخدم

### 1. الحصول على webhook URL الخاص

1. اذهب إلى صفحة الإعدادات في لوحة التحكم
2. ستجد بطاقة "عنوان URL للـ Webhook"
3. انسخ webhook URL و Verify Token

مثال:
```
Webhook URL: https://v0-whatsapp-rosesmile.vercel.app/api/webhooks/04d05db5-477e-4b42-b64a-2a7c5825d24c
Verify Token: whatsapp_verify_7adzwu55iuqhcpit9j99er
```

### 2. تكوين Webhook في Meta Developer Console

1. اذهب إلى [Meta for Developers](https://developers.facebook.com)
2. اختر تطبيق WhatsApp الخاص بك
3. من القائمة الجانبية: **WhatsApp** → **Configuration** → **Webhooks**
4. اضغط **Configure Webhooks** أو **Edit**
5. املأ البيانات:
   - **Callback URL**: الصق webhook URL الخاص بك
   - **Verify Token**: الصق verify token الخاص بك
6. اضغط **Verify and Save**
7. اشترك في الأحداث المطلوبة:
   - ✅ **messages** (لاستقبال الرسائل الواردة)
   - ✅ **message_status** (لمعرفة حالة الرسائل المرسلة)

### 3. إصلاح RLS Policies (مهم جداً!)

**المشكلة:** حالياً، جميع المستخدمين يرون جميع الرسائل

**الحل:** يجب تشغيل السكريبت `scripts/fix_incoming_messages_rls.sql` في Supabase SQL Editor

```sql
-- نسخ محتوى scripts/fix_incoming_messages_rls.sql وتشغيله
```

بعد تشغيل هذا السكريبت:
- ✅ كل مستخدم يرى رسائله فقط
- ✅ الأدمن يرى جميع الرسائل
- ✅ لا يمكن لأي مستخدم رؤية رسائل مستخدم آخر

## التحقق من أن النظام يعمل

### اختبار استقبال الرسائل

1. أرسل رسالة WhatsApp لرقمك المسجل في Meta
2. اذهب إلى صندوق الوارد في لوحة التحكم
3. يجب أن تظهر الرسالة في صندوق الوارد الخاص بك فقط

### اختبار العزل بين المستخدمين

1. سجل دخول كمستخدم أول وأرسل رسالة لرقمه
2. سجل دخول كمستخدم ثاني - يجب ألا يرى رسائل المستخدم الأول
3. سجل دخول كأدمن - يجب أن يرى جميع الرسائل

## المميزات

✅ **Webhook فريد لكل مستخدم** - كل مستخدم له رابط webhook خاص
✅ **عزل تام للرسائل** - كل مستخدم يرى رسائله فقط
✅ **دعم multiple WhatsApp accounts** - كل مستخدم يمكنه ربط رقمه الخاص
✅ **Verify Token عشوائي** - يتم إنشاؤه تلقائياً لكل مستخدم
✅ **صلاحيات الأدمن** - الأدمن يرى جميع الرسائل والمستخدمين

## استكشاف الأخطاء

### المشكلة: جميع المستخدمين يرون جميع الرسائل

**السبب:** لم يتم تشغيل سكريبت RLS policies
**الحل:** شغل `scripts/fix_incoming_messages_rls.sql` في Supabase SQL Editor

### المشكلة: لا تصل الرسائل

**السبب المحتمل:**
1. Webhook URL غير صحيح في Meta
2. Verify Token غير متطابق
3. لم يتم الاشتراك في events في Meta

**الحل:**
1. تحقق من webhook URL في Meta Developer Console
2. تحقق من Verify Token
3. تأكد من الاشتراك في events: messages, message_status

### المشكلة: خطأ 403 Forbidden عند Verification

**السبب:** Verify Token غير متطابق
**الحل:** 
1. اذهب إلى صفحة الإعدادات
2. انسخ Verify Token الجديد
3. حدث Verify Token في Meta Developer Console
