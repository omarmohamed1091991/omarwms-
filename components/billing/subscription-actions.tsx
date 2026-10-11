"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, PauseCircle, PlayCircle, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SubscriptionActions({
  userId,
  cancelAtPeriodEnd,
  canOpenPortal,
}: {
  userId: string
  cancelAtPeriodEnd: boolean
  canOpenPortal: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function call(url: string, body: object, key: string) {
    setBusy(key)
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "حدث خطأ")
      if (data.url) window.location.href = data.url
      else router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : "حدث خطأ")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {cancelAtPeriodEnd ? (
        <Button onClick={() => call("/api/subscription/manage", { action: "resume", userId }, "resume")} disabled={!!busy} className="gap-2">
          {busy === "resume" ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
          استئناف التجديد التلقائي
        </Button>
      ) : (
        <Button
          variant="outline"
          onClick={() => {
            if (confirm("سيظل اشتراكك فعالاً حتى نهاية الفترة المدفوعة ولن يتم تجديده. هل تريد المتابعة؟"))
              call("/api/subscription/manage", { action: "cancel", userId }, "cancel")
          }}
          disabled={!!busy}
          className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
        >
          {busy === "cancel" ? <Loader2 className="w-4 h-4 animate-spin" /> : <PauseCircle className="w-4 h-4" />}
          إيقاف التجديد التلقائي
        </Button>
      )}
      {canOpenPortal && (
        <Button variant="outline" onClick={() => call("/api/subscription/portal", {}, "portal")} disabled={!!busy} className="gap-2">
          {busy === "portal" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
          وسيلة الدفع والفواتير
        </Button>
      )}
    </div>
  )
}
