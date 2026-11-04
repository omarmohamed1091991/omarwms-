import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage, ContactBlock } from "@/components/marketing/legal-page"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "حذف البيانات | Data Deletion - o-wms",
  description: "كيفية حذف حسابك وبياناتك من منصة OWMS، بما يتوافق مع سياسات Meta.",
}

export default async function DataDeletionPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; deleted?: string }>
}) {
  const { code, deleted } = await searchParams
  const safeCode = code && /^[A-Z0-9-]{4,40}$/.test(code) ? code : null

  return (
    <LegalPage
      title="تعليمات حذف البيانات"
      titleEn="User Data Deletion Instructions"
      intro="يحق لك في أي وقت حذف حسابك وجميع بياناتك من منصة OWMS (o-wms)، بما في ذلك البيانات التي حصلنا عليها عبر ربط حسابك على Meta (فيسبوك / واتساب للأعمال). توضح هذه الصفحة طريقة الحذف وما يتم حذفه."
    >
      {deleted === "1" && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <p className="font-semibold">تم حذف حسابك وجميع بياناتك بنجاح.</p>
          <p>نأسف لمغادرتك، ويمكنك إنشاء حساب جديد في أي وقت.</p>
        </section>
      )}

      {safeCode && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <h2>حالة طلب الحذف</h2>
          <p>
            رمز التأكيد: <span className="font-mono font-bold" dir="ltr">{safeCode}</span>
          </p>
          <p>
            تم استلام طلب حذف بياناتك المرسل من Meta. تُحذف البيانات المرتبطة بك خلال 30 يوماً كحد أقصى. للاستفسار عن
            الطلب تواصل معنا وأرفق رمز التأكيد.
          </p>
        </section>
      )}

      <section>
        <h2>1. حذف الحساب من داخل المنصة (فوري)</h2>
        <ol className="list-decimal pr-5 space-y-1">
          <li>
            سجّل الدخول إلى حسابك من <Link href="/auth/login">صفحة تسجيل الدخول</Link>.
          </li>
          <li>افتح صفحة «الملف الشخصي» من القائمة.</li>
          <li>في أسفل الصفحة اضغط زر «حذف حسابي وبياناتي».</li>
          <li>اكتب عبارة التأكيد «حذف حسابي» ثم اضغط «حذف نهائي».</li>
        </ol>
        <p className="mt-2">يتم حذف الحساب والبيانات فوراً وتسجيل خروجك تلقائياً.</p>
      </section>

      <section>
        <h2>2. طلب الحذف عبر البريد الإلكتروني</h2>
        <p>
          إذا لم تتمكن من الدخول إلى حسابك، أرسل رسالة إلى{" "}
          <a href={`mailto:${siteConfig.email}?subject=Data%20Deletion%20Request`}>{siteConfig.email}</a> بعنوان «طلب حذف
          البيانات» من البريد المسجل به حسابك. نؤكد هويتك ثم نحذف البيانات خلال 30 يوماً كحد أقصى ونرسل لك تأكيداً.
        </p>
      </section>

      <section>
        <h2>3. إزالة التطبيق من حساب فيسبوك</h2>
        <ol className="list-decimal pr-5 space-y-1">
          <li>افتح إعدادات حساب فيسبوك ثم «الإعدادات والخصوصية» ← «الإعدادات».</li>
          <li>اختر «التطبيقات ومواقع الويب» (Apps and Websites).</li>
          <li>ابحث عن تطبيق o-wms واضغط «إزالة» (Remove).</li>
          <li>
            يمكنك اختيار «إرسال طلب حذف البيانات»؛ سيصلنا الطلب تلقائياً وتحصل على رمز تأكيد لمتابعة حالته على هذه الصفحة.
          </li>
        </ol>
      </section>

      <section>
        <h2>4. البيانات التي يتم حذفها</h2>
        <ul>
          <li>بيانات الحساب: الاسم، البريد الإلكتروني، رقم الهاتف، وكلمة المرور.</li>
          <li>بيانات ربط واتساب للأعمال: معرّفات الحساب والرقم ورموز الوصول (Access Tokens) الخاصة بـ Meta.</li>
          <li>الرسائل الفردية والجماعية والرسائل الواردة وجهات الاتصال والمستلمين.</li>
          <li>الوسائط المرفوعة والقوالب ورسائل المواعيد والإعدادات.</li>
          <li>بيانات الاشتراك وجلسات الدفع.</li>
        </ul>
      </section>

      <section>
        <h2>5. البيانات التي قد نحتفظ بها</h2>
        <p>
          نحتفظ فقط بسجلات الفواتير والمدفوعات (المبلغ والتاريخ والخطة) للمدة التي يفرضها القانون لأغراض محاسبية وضريبية،
          ولا تُستخدم لأي غرض آخر. لا نخزن بيانات البطاقات البنكية مطلقاً. وقد تبقى نسخ احتياطية مشفرة لمدة لا تتجاوز 30
          يوماً قبل حذفها تلقائياً.
        </p>
      </section>

      <section>
        <h2>6. التواصل</h2>
        <ContactBlock />
        <p className="mt-2">
          راجع أيضاً <Link href="/privacy-policy">سياسة الخصوصية</Link>.
        </p>
      </section>
    </LegalPage>
  )
}
