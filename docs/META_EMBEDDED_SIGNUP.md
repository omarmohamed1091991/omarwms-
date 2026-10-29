# تفعيل الربط التلقائي لواتساب (Meta Embedded Signup)

هذه الخطوات يقوم بها مدير المنصة مرة واحدة فقط، ثم يستطيع كل مستخدم ربط رقمه بضغطة زر من صفحة الإعدادات.

1. في developers.facebook.com أنشئ تطبيقاً من نوع **Business** (أو استخدم تطبيق المنصة الحالي)، وأضف إليه منتجَي **WhatsApp** و**Facebook Login for Business**.
2. Facebook Login for Business ← Settings:
   - فعّل Client OAuth login وWeb OAuth login و**Login with the JavaScript SDK**.
   - أضف `owms.site` إلى **Allowed domains for the JavaScript SDK**، وأضف `https://owms.site/` إلى Valid OAuth Redirect URIs.
3. Facebook Login for Business ← **Configurations ← Create configuration**: اختر قالب **WhatsApp Embedded Signup**، ونوع الرمز **System-user access token**، والصلاحيات `whatsapp_business_management` و`whatsapp_business_messaging`. انسخ **Configuration ID**.
4. WhatsApp ← Configuration: سجّل Webhook افتراضياً للتطبيق (مثل `https://owms.site/api/webhooks/whatsapp`) واشترك في حقل `messages`. المنصة تخصص لكل مستخدم رابطه الخاص تلقائياً عند الربط.
5. يجب أن يكون التطبيق في وضع **Live**، مع توثيق النشاط التجاري (Business Verification) والحصول على **Advanced Access** للصلاحيتين أعلاه (App Review)، حتى يتمكن مستخدمون خارج فريق التطبيق من الربط.
6. أضف متغيرات البيئة التالية في Netlify (Project configuration ← Environment variables) ثم أعد النشر:
   - `META_APP_ID`: معرّف التطبيق (App ID)
   - `META_APP_SECRET`: مفتاح التطبيق السري (App Secret) من App settings ← Basic
   - `META_EMBEDDED_SIGNUP_CONFIG_ID`: معرّف الإعداد من الخطوة 3

إذا لم تُضبط هذه المتغيرات يظهر للمستخدم تنبيه بأن الربط التلقائي غير مفعّل، ويبقى الربط اليدوي متاحاً.
