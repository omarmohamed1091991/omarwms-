"use client"

import type React from "react"
import { useState } from "react"

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus("sending")
    const form = e.currentTarget
    try {
      const res = await fetch("/__forms.html", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(new FormData(form) as unknown as Record<string, string>).toString(),
      })
      if (!res.ok) throw new Error()
      form.reset()
      setStatus("sent")
    } catch {
      setStatus("error")
    }
  }

  const input = "w-full h-11 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"

  return (
    <form
      name="contact"
      method="POST"
      data-netlify="true"
      netlify-honeypot="bot-field"
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4"
    >
      <input type="hidden" name="form-name" value="contact" />
      <p className="hidden">
        <label>
          لا تملأ هذا الحقل: <input name="bot-field" />
        </label>
      </p>
      <h2 className="text-lg font-bold text-gray-900">أرسل لنا رسالة</h2>
      <input name="name" required placeholder="الاسم الكامل" className={input} />
      <input name="email" type="email" required placeholder="البريد الإلكتروني" className={input} dir="ltr" />
      <input name="phone" type="tel" placeholder="رقم الهاتف (اختياري)" className={input} dir="ltr" />
      <input name="subject" required placeholder="الموضوع" className={input} />
      <textarea name="message" required rows={5} placeholder="رسالتك" className={`${input} h-auto py-2`} />
      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full h-11 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 text-white text-sm font-medium disabled:opacity-60"
      >
        {status === "sending" ? "جاري الإرسال..." : "إرسال"}
      </button>
      {status === "sent" && <p className="text-sm text-emerald-700">تم إرسال رسالتك بنجاح، سنتواصل معك قريباً.</p>}
      {status === "error" && <p className="text-sm text-red-600">تعذر الإرسال، حاول مرة أخرى أو راسلنا عبر البريد.</p>}
    </form>
  )
}
