"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"
import { Calendar } from "lucide-react"

interface Message {
  created_at?: string
  sent_at?: string
  received_at?: string
  status?: string
}

interface Props {
  individualMessages: Message[]
  incomingMessages: Message[]
}

export default function DashboardCharts({ individualMessages, incomingMessages }: Props) {
  const [dateRange, setDateRange] = useState<"today" | "yesterday" | "week" | "month" | "all">("week")

  const filteredData = useMemo(() => {
    const now = new Date()
    let startDate = new Date()

    switch (dateRange) {
      case "today":
        startDate.setHours(0, 0, 0, 0)
        break
      case "yesterday":
        startDate.setDate(startDate.getDate() - 1)
        startDate.setHours(0, 0, 0, 0)
        break
      case "week":
        startDate.setDate(startDate.getDate() - 7)
        startDate.setHours(0, 0, 0, 0)
        break
      case "month":
        startDate.setDate(startDate.getDate() - 30)
        startDate.setHours(0, 0, 0, 0)
        break
      case "all":
        startDate = new Date(0)
        break
    }

    // تجميع البيانات حسب اليوم
    const dataMap = new Map<string, { sent: number; received: number; failed: number }>()

    individualMessages.forEach((msg) => {
      const date = new Date(msg.sent_at || msg.created_at || "")
      if (date >= startDate) {
        const dateKey = date.toLocaleDateString("ar-EG", { month: "short", day: "numeric" })
        const current = dataMap.get(dateKey) || { sent: 0, received: 0, failed: 0 }
        if (msg.status === "sent") {
          current.sent++
        } else if (msg.status === "failed") {
          current.failed++
        }
        dataMap.set(dateKey, current)
      }
    })

    incomingMessages.forEach((msg) => {
      const date = new Date(msg.received_at || "")
      if (date >= startDate) {
        const dateKey = date.toLocaleDateString("ar-EG", { month: "short", day: "numeric" })
        const current = dataMap.get(dateKey) || { sent: 0, received: 0, failed: 0 }
        current.received++
        dataMap.set(dateKey, current)
      }
    })

    return Array.from(dataMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => {
        const dateA = new Date(a.date)
        const dateB = new Date(b.date)
        return dateA.getTime() - dateB.getTime()
      })
  }, [individualMessages, incomingMessages, dateRange])

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              تقارير النشاط
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "today", label: "اليوم" },
                { value: "yesterday", label: "أمس" },
                { value: "week", label: "الأسبوع" },
                { value: "month", label: "الشهر" },
                { value: "all", label: "الكل" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDateRange(option.value as any)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    dateRange === option.value
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sent" fill="#10b981" name="مرسلة" />
                <Bar dataKey="received" fill="#3b82f6" name="واردة" />
                <Bar dataKey="failed" fill="#ef4444" name="فاشلة" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              لا توجد بيانات للفترة المحددة
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">اتجاه الرسائل</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sent" stroke="#10b981" strokeWidth={2} name="مرسلة" />
                <Line type="monotone" dataKey="received" stroke="#3b82f6" strokeWidth={2} name="واردة" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500">
              لا توجد بيانات للفترة المحددة
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
