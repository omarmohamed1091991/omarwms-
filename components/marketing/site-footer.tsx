import Link from "next/link"
import Image from "next/image"
import { Mail, Phone, MapPin } from "lucide-react"
import { siteConfig, mainNav, legalNav } from "@/lib/site-config"

export function SiteFooter() {
  return (
    <footer className="bg-gradient-to-r from-gray-900 to-gray-800 text-white pt-12 pb-6 mt-8">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-8 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Image src="/logo.png" alt="o-wms" width={36} height={36} className="w-9 h-9" />
              <p className="font-semibold">o-wms</p>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              OWMS وكالة رقمية تقدم منصة إدارة رسائل واتساب، وخدمات التسويق الرقمي وتطوير المواقع.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">روابط سريعة</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              {mainNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/auth/login" className="hover:text-white">
                  تسجيل الدخول
                </Link>
              </li>
              <li>
                <Link href="/auth/signup" className="hover:text-white">
                  إنشاء حساب
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">السياسات القانونية</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              {legalNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">تواصل معنا</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 shrink-0" />
                <a href={`mailto:${siteConfig.email}`} className="hover:text-white" dir="ltr">
                  {siteConfig.email}
                </a>
              </li>
              {Object.values(siteConfig.phones).map((phone) => (
                <li key={phone.tel} className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    {phone.label}:{" "}
                    <a href={`tel:${phone.tel}`} className="hover:text-white" dir="ltr">
                      {phone.display}
                    </a>
                  </span>
                </li>
              ))}
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{siteConfig.address.ar}</span>
              </li>
            </ul>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 pt-6">
          © {new Date().getFullYear()} o-wms (OWMS). جميع الحقوق محفوظة.
        </p>
      </div>
    </footer>
  )
}
