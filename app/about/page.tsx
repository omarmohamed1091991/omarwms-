import type { Metadata } from "next"
import Link from "next/link"
import { Megaphone, Code2, MessageSquare, Briefcase } from "lucide-react"
import { LegalPage, ContactBlock } from "@/components/marketing/legal-page"

export const metadata: Metadata = {
  title: "من نحن | About Us - o-wms",
  description: "تعرف على OWMS: وكالة رقمية للتسويق الرقمي وتطوير المواقع وحلول واتساب للأعمال.",
}

const services = [
  {
    icon: MessageSquare,
    title: "منصة o-wms لرسائل واتساب",
    desc: "نظام سحابي (SaaS) لإدارة رسائل واتساب للأعمال: رسائل فردية وجماعية، صندوق وارد مشترك، مكتبة وسائط، وتقارير تفصيلية.",
  },
  {
    icon: Megaphone,
    title: "التسويق الرقمي",
    desc: "إدارة الحملات الإعلانية على منصات التواصل الاجتماعي وجوجل، صناعة المحتوى، إدارة الحسابات، وتحسين محركات البحث (SEO).",
  },
  {
    icon: Code2,
    title: "تطوير المواقع والتطبيقات",
    desc: "تصميم وبرمجة المواقع التعريفية والمتاجر الإلكترونية ولوحات التحكم، مع الاستضافة والدعم الفني بعد التسليم.",
  },
  {
    icon: Briefcase,
    title: "خدمات الوكالة الرقمية",
    desc: "استشارات التحول الرقمي، بناء الهوية البصرية، وربط أنظمة الأعمال بقنوات التواصل مع العملاء.",
  },
]

export default function AboutPage() {
  return (
    <LegalPage
      title="من نحن"
      titleEn="About Us"
      showUpdated={false}
      intro="OWMS وكالة رقمية مقرها مدينة 6 أكتوبر بمحافظة الجيزة في مصر، وتخدم العملاء في مصر والمملكة العربية السعودية. نساعد الشركات على النمو عبر حلول تسويق رقمي وتطوير مواقع ومنصة متخصصة لإدارة التواصل عبر واتساب."
    >
      <section>
        <h2>رسالتنا</h2>
        <p>
          تمكين الشركات الصغيرة والمتوسطة من الوصول إلى عملائها بكفاءة واحترافية، من خلال أدوات رقمية سهلة الاستخدام
          وخدمات يقدمها فريق متخصص في التسويق والبرمجة.
        </p>
      </section>

      <section>
        <h2>خدماتنا</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((s) => (
            <div key={s.title} className="rounded-xl border border-gray-100 p-5 bg-gray-50/50">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-emerald-50">
                  <s.icon className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-gray-900">{s.title}</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>لماذا OWMS؟</h2>
        <ul>
          <li>أسعار واضحة بالجنيه المصري والريال السعودي دون رسوم خفية.</li>
          <li>تسليم رقمي سريع وفق جداول زمنية محددة مسبقاً.</li>
          <li>دعم فني باللغة العربية عبر البريد الإلكتروني والهاتف وواتساب.</li>
          <li>حماية بيانات العملاء وعزل كامل بين الحسابات.</li>
        </ul>
        <p className="mt-3">
          اطلع على <Link href="/#pricing">باقات الأسعار</Link> أو <Link href="/contact">تواصل معنا</Link> للحصول على عرض
          مخصص.
        </p>
      </section>

      <section>
        <h2>بيانات التواصل</h2>
        <ContactBlock />
      </section>
    </LegalPage>
  )
}
