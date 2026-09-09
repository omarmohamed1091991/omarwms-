# حل مشكلة توزيع الرسائل بين المستخدمين

## المشكلة

جميع الرسائل تصل في صندوق الوارد لمستخدم واحد (omar) بالرغم من أن الرسائل موجهة لمستخدمين مختلفين (omar وايه).

## السبب

**كل مستخدم يجب أن يسجل webhook URL الخاص به في حساب Meta Developer الخاص به.**

حالياً، يبدو أن جميع الرسائل تأتي إلى webhook واحد فقط:
```
https://yoursite.com/api/webhooks/04d05db5-477e-4b42-b64a-2a7c5825d24c (omar)
```

## الحل

### 1. كل مستخدم له webhook URL خاص به

- **omar**: `https://yoursite.com/api/webhooks/04d05db5-477e-4b42-b64a-2a7c5825d24c`
- **ايه**: `https://yoursite.com/api/webhooks/73a33bc8-bb50-4805-850d-fd033fa5a115`

### 2. خطوات التسجيل في Meta

#### لمستخدم "omar":
1. اذهب إلى **حساب Meta Developer الخاص بـ omar**
2. افتح التطبيق المرتبط برقم WhatsApp الخاص بـ omar (`623846684149569`)
3. في قسم Webhooks، سجل:
   - **Callback URL**: `https://yoursite.com/api/webhooks/04d05db5-477e-4b42-b64a-2a7c5825d24c`
   - **Verify Token**: (الرمز الخاص بـ omar من إعدادات النظام)

#### لمستخدمة "ايه":
1. اذهب إلى **حساب Meta Developer الخاص بـ ايه** (ليس نفس حساب omar!)
2. افتح التطبيق المرتبط برقم WhatsApp الخاص بـ ايه (`913640735159381`)
3. في قسم Webhooks، سجل:
   - **Callback URL**: `https://yoursite.com/api/webhooks/73a33bc8-bb50-4805-850d-fd033fa5a115`
   - **Verify Token**: (الرمز الخاص بـ ايه من إعدادات النظام)

### 3. كيف يعمل النظام

1. Meta ترسل الرسالة إلى webhook URL المسجل في حساب المستخدم
2. Webhook يستخرج `phone_number_id` من payload
3. Webhook يبحث عن المستخدم في قاعدة البيانات بناءً على `phone_number_id`
4. Webhook يحفظ الرسالة مع `user_id` الصحيح
5. RLS policies تضمن أن كل مستخدم يرى رسائله فقط

## التحقق من الإعداد الصحيح

قم بفحص البيانات في قاعدة البيانات:

```sql
-- تحقق من إعدادات المستخدمين
SELECT 
  full_name,
  whatsapp_phone_number_id,
  id as user_id
FROM user_profiles
WHERE role != 'admin';

-- نتيجة متوقعة:
-- omar Rabie | 623846684149569 | 04d05db5...
-- ايه | 913640735159381 | 73a33bc8...

-- تحقق من توزيع الرسائل
SELECT 
  up.full_name,
  COUNT(im.id) as message_count
FROM user_profiles up
LEFT JOIN incoming_messages im ON up.id = im.user_id
WHERE up.role != 'admin'
GROUP BY up.id, up.full_name;

-- النتيجة الصحيحة يجب أن تظهر رسائل لكلا المستخدمين
```

## الخلاصة

**النظام يعمل بشكل صحيح!** المشكلة الوحيدة هي أن المستخدمة "ايه" لم تسجل webhook URL الخاص بها في حساب Meta الخاص بها، لذلك جميع الرسائل تذهب لـ omar.
