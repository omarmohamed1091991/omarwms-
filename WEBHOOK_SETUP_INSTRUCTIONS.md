# إعداد Webhook لـ WhatsApp

## رابط Webhook الجديد الموحد

استخدم هذا الرابط في إعدادات Meta WhatsApp API:

```
https://your-domain.com/api/webhooks/whatsapp
```

## كيف يعمل النظام الجديد

1. **Meta ترسل جميع الرسائل** إلى webhook واحد موحد
2. **النظام يحدد المستخدم** بناءً على `phone_number_id` من payload
3. **النظام يربط phone_number_id** بـ `whatsapp_phone_number_id` في جدول `user_profiles`
4. **الرسائل تُحفظ** مع `user_id` الصحيح
5. **كل مستخدم يرى رسائله فقط** بفضل RLS policies

## الخطوات المطلوبة

### 1. تأكد من حفظ phone_number_id لكل مستخدم

في صفحة إعدادات WhatsApp لكل مستخدم، تأكد من حفظ:
- `whatsapp_phone_number_id` (Phone Number ID من Meta)
- `whatsapp_webhook_verify_token` (للتحقق)

### 2. تحديث Webhook في Meta Dashboard

1. اذهب إلى Meta Developer Console
2. اختر WhatsApp Business App
3. في Configuration > Webhooks:
   - Callback URL: `https://your-domain.com/api/webhooks/whatsapp`
   - Verify Token: (أي verify token محفوظ في أي user profile)
4. اشترك في events: `messages`

### 3. تشغيل سكريبت RLS

```sql
-- شغل هذا السكريبت في Supabase SQL Editor
-- لتطبيق سياسات الأمان
```

## الفرق بين النظام القديم والجديد

### النظام القديم ❌
- Webhook منفصل لكل مستخدم: `/api/webhooks/[userId]`
- جميع الرسائل كانت تذهب لنفس المستخدم
- صعوبة في التوجيه الصحيح

### النظام الجديد ✅
- Webhook موحد: `/api/webhooks/whatsapp`
- توجيه تلقائي بناءً على phone_number_id
- كل مستخدم يرى رسائله فقط
