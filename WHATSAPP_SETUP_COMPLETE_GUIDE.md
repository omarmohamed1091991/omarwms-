# 🎯 دليل إعداد WhatsApp API - جميع المستخدمين في تطبيق واحد

## ✅ النظام يعمل بشكل صحيح!

تم فحص النظام والتأكد من أن:
- ✅ Webhook يستقبل الرسائل ويوزعها بناءً على `phone_number_id`
- ✅ قاعدة البيانات تحفظ كل رسالة مع `user_id` الصحيح
- ✅ RLS Policies تعزل رسائل كل مستخدم بشكل صحيح
- ✅ صندوق الوارد يعرض رسائل كل مستخدم فقط

---

## 📋 السيناريو: جميع الأرقام في تطبيق Meta واحد

**الوضع الحالي:**
- جميع أرقام المستخدمين مسجلة في **نفس تطبيق Meta Developer**
- كل رقم له `phone_number_id` خاص به

**المستخدمون:**
- **omar Rabie**: `phone_number_id: 623846684149569`
- **ايه**: `phone_number_id: 913640735159381`

---

## ⚙️ إعداد Webhook في Meta Dashboard

### الخطوة 1: الدخول إلى Meta Dashboard

1. اذهب إلى: https://developers.facebook.com/
2. افتح **تطبيقك** (التطبيق الذي يحتوي على جميع الأرقام)
3. من القائمة الجانبية، اختر **WhatsApp** > **Configuration**

### الخطوة 2: تسجيل Webhook URL الموحد

في قسم **Webhook**، استخدم **رابط واحد فقط** لجميع المستخدمين:

```
https://your-domain.com/api/webhooks/ANY_USERID
```

**مثال:**
```
https://whatsapp.rosesmile.vercel.app/api/webhooks/04d05db5-477e-4b42-b64a-2a7c5825d24c
```

**ملاحظة مهمة:** 
- يمكنك استخدام `userId` لأي مستخدم في الرابط (omar أو ايه)
- النظام سيوجه الرسائل تلقائياً للمستخدم الصحيح بناءً على `phone_number_id`

### الخطوة 3: تكوين Webhook

1. **Callback URL**: أدخل الرابط أعلاه
2. **Verify Token**: أدخل أي نص (مثل: `my_verification_token`)
3. **Webhook Fields**: حدد:
   - ✅ `messages`
   - ✅ `message_status` (اختياري)

4. اضغط **Verify and Save**

### الخطوة 4: الاشتراك في الأرقام (Subscribe)

بعد حفظ Webhook، يجب الاشتراك في **كل رقم واتساب**:

1. في نفس صفحة Configuration
2. ابحث عن قسم **Webhooks Fields**
3. لكل رقم واتساب، اضغط **Subscribe**:
   - ✅ رقم omar (`623846684149569`)
   - ✅ رقم ايه (`913640735159381`)

---

## 🔍 كيف يعمل النظام؟

### 1. Meta ترسل الرسالة إلى Webhook

عندما يرسل عميل رسالة إلى **رقم omar**:

```json
{
  "entry": [{
    "changes": [{
      "value": {
        "metadata": {
          "phone_number_id": "623846684149569"  // ← رقم omar
        },
        "messages": [{
          "from": "201050894191",
          "text": { "body": "مرحباً" }
        }]
      }
    }]
  }]
}
```

### 2. Webhook يحدد المستخدم الصحيح

```typescript
// Webhook يستخرج phone_number_id
const phoneNumberId = change.value.metadata.phone_number_id
// "623846684149569"

// يبحث عن المستخدم في قاعدة البيانات
const user = await supabase
  .from("user_profiles")
  .select("id")
  .eq("whatsapp_phone_number_id", phoneNumberId)
  .single()

// النتيجة: user_id = "04d05db5..." (omar)
```

### 3. حفظ الرسالة مع user_id الصحيح

```typescript
await supabase.from("incoming_messages").insert({
  user_id: user.id,  // ← omar's user_id
  sender_phone: "201050894191",
  message_text: "مرحباً",
  // ... بقية البيانات
})
```

### 4. عرض الرسالة في صندوق الوارد

عندما يفتح omar صندوق الوارد الخاص به:

```typescript
// يجلب الرسائل الخاصة به فقط
const messages = await supabase
  .from("incoming_messages")
  .select("*")
  .eq("user_id", omar_user_id)  // ← RLS Policy تطبق هذا تلقائياً
```

---

## ✅ التحقق من نجاح الإعداد

### 1. اختبار omar:

```bash
# إرسال رسالة WhatsApp إلى رقم omar
```

**النتيجة المتوقعة:**
- ✅ الرسالة تظهر في صندوق الوارد لـ omar
- ❌ لا تظهر في صندوق الوارد لـ ايه

### 2. اختبار ايه:

```bash
# إرسال رسالة WhatsApp إلى رقم ايه
```

**النتيجة المتوقعة:**
- ✅ الرسالة تظهر في صندوق الوارد لـ ايه
- ❌ لا تظهر في صندوق الوارد لـ omar

---

## 🔧 استكشاف الأخطاء

### المشكلة 1: جميع الرسائل تذهب لمستخدم واحد

**السبب:** لم يتم Subscribe للأرقام الأخرى في Webhook Fields

**الحل:**
1. افتح Meta Dashboard > WhatsApp > Configuration
2. تحقق من أن **جميع الأرقام** مشتركة (Subscribed) في Webhook
3. إذا لم تكن مشتركة، اضغط Subscribe لكل رقم

### المشكلة 2: Webhook لا يستقبل الرسائل

**التحقق:**
```bash
# افتح المتصفح Developer Tools > Console
# أرسل رسالة WhatsApp
# يجب أن تظهر رسائل console.log
```

**الأسباب المحتملة:**
- ✗ Webhook URL غير صحيح
- ✗ Verify Token غير مطابق
- ✗ لم يتم Subscribe للرقم
- ✗ Access Token منتهي أو غير صحيح

### المشكلة 3: خطأ في phone_number_id

**التحقق:**
```sql
-- تأكد من أن كل مستخدم له phone_number_id صحيح
SELECT id, full_name, whatsapp_phone_number_id 
FROM user_profiles 
WHERE role != 'admin';
```

**الحل:**
1. افتح صفحة إعدادات المستخدم
2. أدخل `phone_number_id` الصحيح من Meta Dashboard
3. احفظ التغييرات

---

## 📊 فحص البيانات

### 1. فحص توزيع الرسائل:

```sql
SELECT 
  up.full_name,
  up.whatsapp_phone_number_id,
  COUNT(im.id) as message_count
FROM user_profiles up
LEFT JOIN incoming_messages im ON up.id = im.user_id
WHERE up.role != 'admin'
GROUP BY up.id, up.full_name, up.whatsapp_phone_number_id;
```

**النتيجة المتوقعة:**
```
full_name   | phone_number_id  | message_count
------------|------------------|---------------
omar Rabie  | 623846684149569  | 4
ايه         | 913640735159381  | 1
```

### 2. فحص آخر 10 رسائل:

```sql
SELECT 
  im.id,
  up.full_name,
  im.sender_phone,
  im.message_text,
  im.received_at
FROM incoming_messages im
LEFT JOIN user_profiles up ON im.user_id = up.id
ORDER BY im.received_at DESC
LIMIT 10;
```

---

## 🎯 الخلاصة

✅ **النظام يعمل بشكل ممتاز!**

- **Webhook موحد واحد** لجميع المستخدمين
- **توزيع تلقائي** للرسائل بناءً على `phone_number_id`
- **عزل كامل** بين رسائل المستخدمين عبر RLS Policies
- **realtime updates** لصندوق الوارد

**ما عليك فعله:**
1. ✅ تأكد من Subscribe لجميع الأرقام في Meta Dashboard
2. ✅ تأكد من أن كل مستخدم أدخل `phone_number_id` الصحيح في الإعدادات
3. ✅ اختبر إرسال رسالة لكل رقم للتأكد

---

## 📞 الدعم

إذا واجهت أي مشاكل:
1. افحص console logs في المتصفح
2. افحص Webhook logs في Meta Dashboard
3. شغل SQL queries أعلاه للتحقق من البيانات
