# دليل استكشاف أخطاء Webhook واتساب

## المشكلة: جميع الرسائل تظهر في صندوق وارد مستخدم واحد

### السبب الرئيسي
كل مستخدم **يجب** أن يسجل webhook URL **الخاص به** في Meta Developer Dashboard الخاص به.

### كيف يعمل النظام بشكل صحيح

#### 1. كل مستخدم له webhook URL فريد
- المستخدم omar: `https://yoursite.com/api/webhooks/04d05db5-477e-4b42-b64a-2a7c5825d24c`
- المستخدمة ايه: `https://yoursite.com/api/webhooks/73a33bc8-bb50-4805-850d-fd033fa5a115`

#### 2. تسجيل webhook في Meta Dashboard
**لكل** حساب WhatsApp Business API منفصل:

1. المستخدم omar يفتح Meta Developer Dashboard الخاص به
2. يذهب لتطبيق WhatsApp الخاص به
3. يسجل webhook URL الخاص به: `/webhooks/04d05db5...`
4. يستخدم verify token الخاص به

**بنفس الطريقة** للمستخدمة ايه:
1. تفتح Meta Developer Dashboard الخاص بها
2. تذهب لتطبيق WhatsApp الخاص بها  
3. تسجل webhook URL الخاص بها: `/webhooks/73a33bc8...`
4. تستخدم verify token الخاص بها

### التحقق من المشكلة

#### فحص قاعدة البيانات:
```sql
SELECT 
  im.user_id,
  up.full_name,
  COUNT(*) as message_count
FROM incoming_messages im
LEFT JOIN user_profiles up ON im.user_id = up.id
GROUP BY im.user_id, up.full_name;
```

إذا كانت النتيجة:
- omar: 50 رسالة
- ايه: 0 رسائل

**المشكلة:** المستخدمة ايه لم تسجل webhook URL الخاص بها في Meta Dashboard!

### الحل

#### الخطوة 1: التأكد من webhook URL
كل مستخدم يحصل على webhook URL من صفحة الإعدادات:
- يجب أن يحتوي على user ID الخاص به
- يجب أن يكون مختلف عن webhook المستخدمين الآخرين

#### الخطوة 2: تسجيل webhook في Meta
كل مستخدم **بشكل منفصل**:
1. يفتح Meta Dashboard الخاص به
2. يسجل webhook URL الخاص به
3. يستخدم verify token الخاص به
4. يحفظ الإعدادات

#### الخطوة 3: اختبار استلام الرسائل
1. أرسل رسالة اختبار لرقم WhatsApp الخاص بالمستخدم omar
2. تحقق أن الرسالة ظهرت في صندوق وارد omar
3. أرسل رسالة اختبار لرقم WhatsApp الخاص بالمستخدمة ايه
4. تحقق أن الرسالة ظهرت في صندوق وارد ايه

### إصلاح RLS Policies

إذا كانت الرسائل تُحفظ بشكل صحيح لكن المستخدمين يرون رسائل بعضهم:

```sql
-- قم بتشغيل هذا في Supabase SQL Editor
-- هذا السكريبت في: scripts/fix_incoming_messages_rls.sql
```

### الخلاصة

✅ **صحيح:** كل مستخدم يسجل webhook URL الخاص به في Meta Dashboard الخاص به
❌ **خطأ:** استخدام نفس webhook URL لجميع المستخدمين

✅ **صحيح:** الرسائل تُحفظ مع user_id الصحيح تلقائياً
❌ **خطأ:** محاولة تغيير user_id يدوياً في webhook

✅ **صحيح:** كل مستخدم يرى رسائله فقط (بعد إصلاح RLS)
❌ **خطأ:** جميع المستخدمين يرون جميع الرسائل
