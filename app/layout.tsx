import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Tajawal } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import "./i18n-ltr.css"
import { IdleSessionTimeout } from "@/components/auth/idle-session-timeout"
import { LanguageProvider } from "@/components/i18n/language-provider"
import { FloatingLanguageSwitcher } from "@/components/i18n/language-switcher"
import { LANG_BOOTSTRAP_SCRIPT } from "@/lib/i18n/config"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700", "800"],
})

export const metadata: Metadata = {
  title: "o-wms | نظام إدارة رسائل واتساب",
  description: "o-wms نظام متكامل لإدارة وإرسال رسائل واتساب الفردية والجماعية",
  generator: "v0.app",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  other: {
    "facebook-domain-verification": "kw9njulccg49xvm4iawwmn1vbfw184",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" className="bg-background" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LANG_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className={`${tajawal.className} antialiased`}>
        <LanguageProvider />
        <IdleSessionTimeout />
        {children}
        <FloatingLanguageSwitcher />
        <Analytics />
      </body>
    </html>
  )
}
