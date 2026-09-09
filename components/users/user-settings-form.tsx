"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Settings, Phone } from "lucide-react"

export function UserSettingsForm({ userId, profile, settings }: any) {
  return (
    <div className="space-y-6">
      {/* Profile Settings */}
      <Card className="border-2">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            معلومات الحساب
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label>الاسم الكامل</Label>
            <Input defaultValue={profile?.full_name || ""} placeholder="أدخل الاسم الكامل" />
          </div>
          <div className="space-y-2">
            <Label>رقم الجوال</Label>
            <Input defaultValue={profile?.phone_number || ""} className="font-mono" disabled />
          </div>
          <Button className="bg-gradient-to-r from-emerald-500 to-blue-900">حفظ التغييرات</Button>
        </CardContent>
      </Card>

      {/* WhatsApp Settings */}
      <Card className="border-2">
        <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            إعدادات WhatsApp API
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label>WhatsApp Instance ID</Label>
            <Input
              defaultValue={profile?.whatsapp_instance_id || ""}
              placeholder="أدخل Instance ID"
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp API Token</Label>
            <Input
              type="password"
              defaultValue={profile?.whatsapp_token || ""}
              placeholder="أدخل API Token"
              className="font-mono"
            />
          </div>
          <Button className="bg-green-600 hover:bg-green-700">حفظ إعدادات WhatsApp</Button>
        </CardContent>
      </Card>

      {/* Auto Reply Settings */}
      <Card className="border-2">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
          <CardTitle>الرد التلقائي</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <Label>تفعيل الرد التلقائي</Label>
            <Switch defaultChecked={settings?.auto_reply_enabled} />
          </div>
          <div className="space-y-2">
            <Label>رسالة الرد التلقائي</Label>
            <Textarea
              defaultValue={settings?.auto_reply_message || ""}
              placeholder="أدخل رسالة الرد التلقائي..."
              rows={4}
            />
          </div>
          <Button className="bg-purple-600 hover:bg-purple-700">حفظ إعدادات الرد التلقائي</Button>
        </CardContent>
      </Card>
    </div>
  )
}
