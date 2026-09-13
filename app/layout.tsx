import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Tajawal } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const tajawal = Tajawal({
  subsets: ["arabic"],
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
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" className="bg-background">
      <body className={`${tajawal.className} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
