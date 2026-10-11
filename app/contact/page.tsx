import type { Metadata } from "next"
import { Mail, Phone, MapPin, Clock } from "lucide-react"
import { PageShell } from "@/components/marketing/legal-page"
import { ContactForm } from "@/components/marketing/contact-form"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "اتصل بنا | Contact Us - o-wms",
  description: "تواصل مع فريق OWMS عبر البريد الإلكتروني أو الهاتف في مصر والسعودية.",
}

export default function ContactPage() {
  return (
    <PageShell>
      <div className="container mx-auto px-6 max-w-6xl py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">اتصل بنا</h1>
          <p className="text-sm text-gray-400 mt-1" dir="ltr">
            Contact Us
          </p>
          <p className="text-base text-gray-600 mt-4">
            يسعدنا الرد على استفساراتك حول الباقات، الفواتير، الاسترجاع، أو خدمات التسويق وتطوير المواقع.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 text-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-50">
                  <Mail className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">البريد الإلكتروني</p>
                  <a href={`mailto:${siteConfig.email}`} className="text-emerald-700" dir="ltr">
                    {siteConfig.email}
                  </a>
                </div>
              </div>
              {Object.values(siteConfig.phones).map((phone) => (
                <div key={phone.tel} className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50">
                    <Phone className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      هاتف {phone.label} ({phone.labelEn})
                    </p>
                    <a href={`tel:${phone.tel}`} className="text-emerald-700" dir="ltr">
                      {phone.display}
                    </a>
                  </div>
                </div>
              ))}
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-50">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">العنوان</p>
                  <p className="text-gray-600">{siteConfig.address.ar}</p>
                  <p className="text-gray-400 text-xs" dir="ltr">
                    {siteConfig.address.en}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-50">
                  <Clock className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">ساعات العمل</p>
                  <p className="text-gray-600">من الأحد إلى الخميس، 10 صباحاً – 6 مساءً (بتوقيت القاهرة)</p>
                  <p className="text-gray-600">نرد على الرسائل خلال يوم عمل واحد.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <ContactForm />
          </div>
        </div>
      </div>
    </PageShell>
  )
}
