"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

interface Message {
  id: string
  sender_phone: string
  sender_name: string | null
  message_text: string
  message_type: string
  received_at: string
  is_read: boolean
  direction?: "incoming" | "outgoing"
}

interface ExportData {
  conversations: Array<{
    sender_phone: string
    sender_name: string | null
    messages: Message[]
  }>
}

export default function ExportPage() {
  const [exportData, setExportData] = useState<ExportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // جلب البيانات من localStorage
    const data = localStorage.getItem("exportData")
    if (data) {
      setExportData(JSON.parse(data))
    }
    setLoading(false)
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ar-EG", { year: "numeric", month: "2-digit", day: "2-digit" })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", hour12: true })
  }

  const formatPhoneNumber = (phone: string) => {
    return phone.replace(/^\+/, "")
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    )
  }

  if (!exportData || !exportData.conversations || exportData.conversations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-600 text-lg">لا توجد بيانات للتصدير</p>
        </div>
      </div>
    )
  }

  const totalMessages = exportData.conversations.reduce((sum, conv) => sum + conv.messages.length, 0)
  const totalPages = Math.ceil(totalMessages / 20)

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-emerald-500 text-white p-6 rounded-lg mb-6 text-center print:rounded-none">
          <h1 className="text-3xl font-bold mb-4">تقرير الرسائل الواردة من العملاء</h1>
          <div className="flex justify-center gap-8 text-sm flex-wrap">
            <div>
              <span>تاريخ التصدير: </span>
              <span>
                {new Date().toLocaleDateString("ar-EG")} - {new Date().toLocaleTimeString("ar-EG")}
              </span>
            </div>
            <div>
              <span>عدد الرسائل: </span>
              <span>{totalMessages}</span>
            </div>
            <div>
              <span>عدد الصفحات: </span>
              <span>{totalPages}</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="p-3 text-right border border-slate-700 text-sm">الاسم</th>
                <th className="p-3 text-right border border-slate-700 text-sm">رقم الجوال</th>
                <th className="p-3 text-right border border-slate-700 text-sm">نص الرسالة الواردة</th>
                <th className="p-3 text-right border border-slate-700 text-sm">التاريخ</th>
                <th className="p-3 text-right border border-slate-700 text-sm">الوقت</th>
                <th className="p-3 text-center border border-slate-700 text-sm">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {exportData.conversations.map((conversation) =>
                conversation.messages.map((message, idx) => {
                  const displayName = conversation.sender_name || formatPhoneNumber(conversation.sender_phone)
                  const isRead = message.is_read

                  return (
                    <tr key={`${conversation.sender_phone}-${idx}`} className="border-b hover:bg-gray-50">
                      <td className="p-3 border border-gray-200 text-sm">{displayName}</td>
                      <td className="p-3 border border-gray-200 text-sm text-left" dir="ltr">
                        {formatPhoneNumber(conversation.sender_phone)}
                      </td>
                      <td className="p-3 border border-gray-200 text-sm">
                        {message.message_text || `رسالة ${message.message_type || "وسائط"}`}
                      </td>
                      <td className="p-3 border border-gray-200 text-sm">{formatDate(message.received_at)}</td>
                      <td className="p-3 border border-gray-200 text-sm">{formatTime(message.received_at)}</td>
                      <td className="p-3 border border-gray-200 text-center">
                        <span
                          className={`inline-block text-xs px-3 py-1 rounded-full font-bold ${
                            isRead ? "bg-emerald-100 text-emerald-800" : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {isRead ? "مقروء" : "غير مقروء"}
                        </span>
                      </td>
                    </tr>
                  )
                }),
              )}
            </tbody>
          </table>
        </div>

        {/* Print Button */}
        <div className="mt-6 text-center no-print">
          <Button
            onClick={handlePrint}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-lg font-bold text-base"
          >
            طباعة / حفظ كـ PDF
          </Button>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            margin: 0;
            padding: 10px;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
        }
        
        @page {
          size: A4 landscape;
          margin: 1cm;
        }
      `}</style>
    </div>
  )
}
