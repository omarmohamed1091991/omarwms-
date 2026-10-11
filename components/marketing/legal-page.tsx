import type React from "react"
import { SiteHeader } from "@/components/marketing/site-header"
import { SiteFooter } from "@/components/marketing/site-footer"
import { siteConfig } from "@/lib/site-config"

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-emerald-50/40 to-green-50/40">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}

export function LegalPage({
  title,
  titleEn,
  intro,
  showUpdated = true,
  children,
}: {
  title: string
  titleEn: string
  intro?: string
  showUpdated?: boolean
  children: React.ReactNode
}) {
  return (
    <PageShell>
      <div className="container mx-auto px-6 max-w-4xl py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-400 mt-1" dir="ltr">
            {titleEn}
          </p>
          {showUpdated && <p className="text-xs text-gray-500 mt-3">آخر تحديث: {siteConfig.lastUpdated}</p>}
          {intro && <p className="text-base text-gray-600 mt-4 leading-relaxed">{intro}</p>}
        </div>
        <article className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-10 space-y-8 text-gray-700 leading-loose text-sm [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:pr-5 [&_ul]:space-y-1 [&_a]:text-emerald-700 [&_a]:underline">
          {children}
        </article>
      </div>
    </PageShell>
  )
}

export function ContactBlock() {
  return (
    <ul>
      <li>
        البريد الإلكتروني: <a href={`mailto:${siteConfig.email}`} dir="ltr">{siteConfig.email}</a>
      </li>
      {Object.values(siteConfig.phones).map((phone) => (
        <li key={phone.tel}>
          الهاتف ({phone.label}): <a href={`tel:${phone.tel}`} dir="ltr">{phone.display}</a>
        </li>
      ))}
      <li>العنوان: {siteConfig.address.ar} ({siteConfig.address.en})</li>
    </ul>
  )
}
