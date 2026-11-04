"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, Trash2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteMyAccount } from "@/app/actions/account"
import { DELETE_CONFIRMATION_TEXT } from "@/lib/account"

export function DeleteAccountCard() {
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setLoading(true)
    setError(null)
    const result = await deleteMyAccount(confirmation)
    if (result.success) {
      window.location.href = "/data-deletion?deleted=1"
      return
    }
    setError(result.error || "تعذر حذف الحساب")
    setLoading(false)
  }

  return (
    <Card className="border-red-200 mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          حذف الحساب والبيانات
        </CardTitle>
        <CardDescription>
          يحذف حسابك وكل بياناتك نهائياً: الملف الشخصي، الرسائل، جهات الاتصال، الحملات، الوسائط، القوالب، الإعدادات،
          ورموز ربط واتساب. لا يمكن التراجع عن هذا الإجراء.{" "}
          <Link href="/data-deletion" className="text-emerald-700 underline">
            تفاصيل سياسة حذف البيانات
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog
          open={open}
          onOpenChange={(v) => {
            if (loading) return
            setOpen(v)
            setConfirmation("")
            setError(null)
          }}
        >
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2">
              <Trash2 className="w-4 h-4" />
              حذف حسابي وبياناتي
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-right">هل أنت متأكد من حذف حسابك نهائياً؟</AlertDialogTitle>
              <AlertDialogDescription className="text-right">
                ستُحذف كل بياناتك فوراً ولن تتمكن من استعادتها، وسيتوقف اشتراكك. تُحفظ سجلات الفواتير فقط لأنها مطلوبة
                قانونياً.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label htmlFor="delete-confirmation">
                للتأكيد اكتب: <span className="font-bold">{DELETE_CONFIRMATION_TEXT}</span>
              </Label>
              <Input
                id="delete-confirmation"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                disabled={loading}
                autoComplete="off"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel disabled={loading}>إلغاء</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={loading || confirmation.trim() !== DELETE_CONFIRMATION_TEXT}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Trash2 className="w-4 h-4 ml-2" />}
                حذف نهائي
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
