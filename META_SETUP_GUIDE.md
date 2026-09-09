# دليل إعداد WhatsApp Business API على Meta - لكل مستخدم

## 📌 مهم جداً: لكل مستخدم تطبيق Meta منفصل

**كل مستخدم في النظام يجب أن يكون له:**
- ✅ تطبيق Meta Developer خاص به
- ✅ رقم WhatsApp Business خاص به
- ✅ Webhook URL فريد خاص به

---

## 🎯 الخطوة 1: إنشاء حساب Meta Developer

### للمستخدم الجديد:

1. **افتح** https://developers.facebook.com
2. **سجل دخول** بحساب Facebook الخاص بك
3. **اذهب إلى** "My Apps" من القائمة العلوية
4. **اضغط** "Create App"

---

## 🎯 الخطوة 2: إنشاء تطبيق WhatsApp Business

### اختيار نوع التطبيق:

1. **اختر** "Business" كنوع التطبيق
2. **أدخل** اسم التطبيق (مثلاً: "WhatsApp Bot - Omar")
3. **أدخل** بريدك الإلكتروني
4. **اضغط** "Create App"

### إضافة منتج WhatsApp:

1. في صفحة التطبيق، **ابحث عن** "WhatsApp" في Products
2. **اضغط** "Set up" بجانب WhatsApp
3. **اتبع** التعليمات لربط رقم WhatsApp Business الخاص بك

---

## 🎯 الخطوة 3: الحصول على البيانات المطلوبة

### 3.1 - Phone Number ID

1. **اذهب إلى** WhatsApp → Getting Started
2. **انسخ** `Phone Number ID` (مثال: `623846684149569`)
3. **احفظه** - ستحتاجه في إعدادات النظام

### 3.2 - WhatsApp Business Account ID

1. في نفس الصفحة، **ابحث عن** `WhatsApp Business Account ID`
2. **انسخ** الرقم (مثال: `387740664428408`)
3. **احفظه** - ستحتاجه في إعدادات النظام

### 3.3 - Access Token

1. **اذهب إلى** WhatsApp → API Setup
2. **انسخ** `Temporary Access Token` (صالح لـ 24 ساعة)
   
   **⚠️ مهم:** للاستخدام الدائم، أنشئ System User Token:
   
   - اذهب إلى Business Settings → System Users
   - أنشئ System User جديد
   - أضف أذونات WhatsApp Management
   - أنشئ Token دائم
   - **احفظه في مكان آمن** - لن تراه مرة أخرى!

---

## 🎯 الخطوة 4: تكوين Webhook في Meta

### ⚠️ تنبيه مهم: استخدم Webhook URL الخاص بك فقط!

**كل مستخدم له webhook URL فريد:**
- **المستخدم الأول (Omar):** `https://yoursite.com/api/webhooks/04d05db5-477e-4b42-b64a-2a7c5825d24c`
- **المستخدم الثاني (Ayah):** `https://yoursite.com/api/webhooks/73a33bc8-bb50-4805-850d-fd033fa5a115`

❌ **لا تستخدم webhook شخص آخر** - وإلا ستظهر رسائلك في صندوقه!

### خطوات التكوين:

1. **اذهب إلى** WhatsApp → Configuration → Webhooks
2. **اضغط** "Configure" أو "Edit"
3. **أدخل البيانات التالية:**

   | الحقل | القيمة | من أين تحصل عليها |
   |------|--------|-----------------|
   | **Callback URL** | `https://yoursite.com/api/webhooks/[USER_ID]` | من صفحة الإعدادات في النظام |
   | **Verify Token** | `whatsapp_verify_xxxxx` | من صفحة الإعدادات في النظام |

4. **اضغط** "Verify and Save"
   - ✅ إذا نجح التحقق: سترى علامة ✓ خضراء
   - ❌ إذا فشل: تحقق من:
     - Webhook URL صحيح؟
     - Verify Token مطابق؟
     - الموقع يعمل؟

5. **اشترك في الأحداث (Subscribe to Events):**
   - ✅ `messages` (لاستقبال الرسائل الواردة)
   - ✅ `message_status` (لمعرفة حالة الرسائل المرسلة)

---

## 🎯 الخطوة 5: إدخال البيانات في النظام

1. **سجل دخول** إلى النظام بحسابك
2. **اذهب إلى** الإعدادات → إعدادات WhatsApp
3. **أدخل البيانات** التي حصلت عليها:
   - Phone Number ID
   - WhatsApp Business Account ID
   - Access Token (الدائم من System User)
4. **احفظ** الإعدادات
5. **انسخ** Webhook URL و Verify Token من الصفحة
6. **سجلهم** في Meta Developer Console (الخطوة 4 أعلاه)

---

## ✅ التحقق من نجاح الإعداد

### اختبار استقبال الرسائل:

1. **أرسل رسالة** من رقم WhatsApp عادي إلى رقم WhatsApp Business الخاص بك
2. **افتح** صفحة صندوق الوارد في النظام
3. **تحقق:** هل ظهرت الرسالة؟
   - ✅ **نعم:** الإعداد ناجح! 🎉
   - ❌ **لا:** راجع قسم "استكشاف الأخطاء"

---

## 🔍 استكشاف الأخطاء

### المشكلة: الرسائل لا تصل إلى صندوق الوارد

#### الحل 1: تحقق من Webhook Status في Meta
1. اذهب إلى WhatsApp → Configuration → Webhooks
2. تحقق من أن Status = "Connected" ✅
3. إذا كان "Disconnected" ❌:
   - اضغط "Edit" وأعد التحقق
   - تأكد أن الموقع يعمل

#### الحل 2: تحقق من Webhook URL الصحيح
```bash
# Webhook URL يجب أن يحتوي على YOUR user ID
✅ الصحيح: https://yoursite.com/api/webhooks/73a33bc8-bb50-4805-850d-fd033fa5a115
❌ الخطأ: https://yoursite.com/api/webhooks/04d05db5-477e-4b42-b64a-2a7c5825d24c (هذا webhook شخص آخر!)
```

#### الحل 3: تحقق من Phone Number ID
1. افتح صفحة الإعدادات في النظام
2. تأكد أن `Phone Number ID` مطابق للرقم في Meta
3. اذهب إلى Meta → WhatsApp → API Setup
4. قارن الرقم - يجب أن يكونا متطابقين تماماً

#### الحل 4: تحقق من Subscribed Events
1. اذهب إلى Meta → WhatsApp → Configuration → Webhooks
2. تحقق من أن `messages` event مفعل ✅
3. إذا لم يكن مفعل، اضغط "Manage" وفعله

---

## 📊 فهم نظام التوجيه

### كيف يعمل النظام؟

```
1. عميل يرسل رسالة إلى رقم WhatsApp
   ↓
2. Meta يرسل الرسالة إلى Webhook URL المسجل لهذا الرقم
   ↓
3. النظام يستقبل الرسالة ويستخرج phone_number_id
   ↓
4. النظام يبحث عن المستخدم صاحب هذا phone_number_id
   ↓
5. النظام يحفظ الرسالة مع user_id الصحيح
   ↓
6. الرسالة تظهر في صندوق الوارد للمستخدم الصحيح
```

### مثال:

- **Omar** رقمه: `623846684149569`
- **Ayah** رقمها: `913640735159381`

عندما يرسل عميل رسالة إلى رقم Omar:
1. Meta يرسل الرسالة إلى webhook Omar
2. النظام يستخرج `phone_number_id: 623846684149569`
3. النظام يجد أن هذا الرقم يخص Omar
4. النظام يحفظ الرسالة في صندوق وارد Omar ✅

عندما يرسل عميل رسالة إلى رقم Ayah:
1. Meta يرسل الرسالة إلى webhook Ayah
2. النظام يستخرج `phone_number_id: 913640735159381`
3. النظام يجد أن هذا الرقم يخص Ayah
4. النظام يحفظ الرسالة في صندوق وارد Ayah ✅

---

## ⚠️ أخطاء شائعة

### ❌ الخطأ 1: استخدام نفس التطبيق لأكثر من مستخدم
**المشكلة:** مستخدمان يستخدمان نفس تطبيق Meta
**النتيجة:** جميع الرسائل تذهب لمستخدم واحد
**الحل:** كل مستخدم يجب أن ينشئ تطبيق Meta خاص به

### ❌ الخطأ 2: استخدام webhook شخص آخر
**المشكلة:** المستخدم يسجل webhook URL لمستخدم آخر في Meta
**النتيجة:** رسائل المستخدم تظهر في صندوق الشخص الآخر
**الحل:** استخدم webhook URL الخاص بك من صفحة الإعدادات

### ❌ الخطأ 3: Phone Number ID خاطئ
**المشكلة:** Phone Number ID المدخل في النظام لا يطابق الرقم الفعلي في Meta
**النتيجة:** النظام لا يستطيع إرسال الرسائل
**الحل:** انسخ Phone Number ID مباشرة من Meta → WhatsApp → API Setup

### ❌ الخطأ 4: Access Token منتهي الصلاحية
**المشكلة:** استخدام Temporary Access Token (صالح 24 ساعة فقط)
**النتيجة:** النظام يتوقف عن العمل بعد 24 ساعة
**الحل:** أنشئ System User Token دائم (لا ينتهي)

---

## 📝 قائمة التحقق النهائية

قبل أن تبدأ في استخدام النظام، تأكد من:

- [ ] أنشأت تطبيق Meta Developer خاص بك
- [ ] أضفت منتج WhatsApp إلى التطبيق
- [ ] ربطت رقم WhatsApp Business الخاص بك
- [ ] حصلت على Phone Number ID وحفظته
- [ ] حصلت على WhatsApp Business Account ID وحفظته
- [ ] أنشأت System User Token دائم وحفظته
- [ ] أدخلت جميع البيانات في صفحة الإعدادات في النظام
- [ ] نسخت Webhook URL الخاص بك (وليس شخص آخر!)
- [ ] نسخت Verify Token من صفحة الإعدادات
- [ ] سجلت Webhook URL في Meta Developer Console
- [ ] فعلت Subscribed Events (messages, message_status)
- [ ] تحققت من أن Webhook Status = Connected ✅
- [ ] أرسلت رسالة تجريبية وظهرت في صندوق الوارد ✅

---

## 🆘 الدعم

إذا واجهت أي مشكلة:
1. راجع قسم "استكشاف الأخطاء" أعلاه
2. تحقق من console logs في المتصفح (F12)
3. تحقق من Webhook logs في Meta Developer Console
4. تواصل مع الدعم الفني

---

**آخر تحديث:** ديسمبر 2024
