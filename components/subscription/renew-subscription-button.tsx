"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CreditCard } from "lucide-react"

export function RenewSubscriptionButton() {
  const [loading, setLoading] = useState(false)
  const handleRenew = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/subscription/checkout", { method: "POST" })
      const data = await response.json()
      if (!response.ok || !data.url) throw new Error(data.error || "تعذر إنشاء صفحة الدفع")
      window.location.href = data.url
    } catch (error) {
      alert(error instanceof Error ? error.message : "تعذر إنشاء صفحة الدفع")
      setLoading(false)
    }
  }
  return (
    <Button onClick={handleRenew} disabled={loading} className="gap-2">
      <CreditCard className="h-4 w-4" />
      {loading ? "جاري التحويل..." : "تجديد الاشتراك"}
    </Button>
  )
}
