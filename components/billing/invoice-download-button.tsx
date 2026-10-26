"use client"

import { useEffect, useRef, useState } from "react"
import { Download, Loader2, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * يحوّل عنصر الفاتورة إلى ملف PDF. نلتقط العنصر كصورة (html2canvas-pro) لأن jsPDF لا يدعم
 * تشكيل الحروف العربية دون تضمين خط، ثم نضع الصورة في صفحة A4 واحدة أو أكثر.
 */
export function InvoiceDownloadButton({ targetId, fileName, autoDownload = false }: { targetId: string; fileName: string; autoDownload?: boolean }) {
  const [busy, setBusy] = useState(false)
  const started = useRef(false)

  const download = async () => {
    const el = document.getElementById(targetId)
    if (!el) return
    setBusy(true)
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")])
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true })
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const imgH = (canvas.height * pageW) / canvas.width
      const img = canvas.toDataURL("image/jpeg", 0.95)
      let offset = 0
      pdf.addImage(img, "JPEG", 0, offset, pageW, imgH)
      while (imgH + offset > pageH) {
        offset -= pageH
        pdf.addPage()
        pdf.addImage(img, "JPEG", 0, offset, pageW, imgH)
      }
      pdf.save(`${fileName}.pdf`)
    } catch (error) {
      console.error("[invoice] PDF export failed:", error)
      window.print()
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (autoDownload && !started.current) {
      started.current = true
      download()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDownload])

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button onClick={download} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white">
        {busy ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Download className="w-4 h-4 ml-2" />}
        تحميل الفاتورة PDF
      </Button>
      <Button variant="outline" onClick={() => window.print()}>
        <Printer className="w-4 h-4 ml-2" />
        طباعة
      </Button>
    </div>
  )
}
