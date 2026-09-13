"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, ImageIcon, Trash2, Check, CheckCircle2, XCircle } from "lucide-react"
import { getMediaLibraryWithUrls, uploadMediaToWhatsApp, deleteMedia } from "@/app/users/[userId]/media/actions"
import { getWhatsAppSettings } from "@/app/users/[userId]/settings/actions"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

interface MediaItem {
  id: string
  media_id: string
  media_url: string | null
  media_type: string
  file_name: string | null
  file_size: number | null
  uploaded_at: string
}

export default function MediaLibraryClient({ userId }: { userId: string }) {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<"uploading" | "success" | "error">("uploading")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadMedia()
  }, [])

  const getProxyImageUrl = (mediaId: string) => {
    return `/api/media-proxy?media_id=${mediaId}&user_id=${userId}`
  }

  const loadMedia = async () => {
    setLoading(true)
    const result = await getMediaLibraryWithUrls(userId)
    if (result.success) {
      setMedia(result.media)
    }
    setLoading(false)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const maxSize = 16 * 1024 * 1024
    if (file.size > maxSize) {
      alert("حجم الملف أكبر من 16 ميجابايت")
      return
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/3gpp"]
    if (!allowedTypes.includes(file.type)) {
      alert("نوع الملف غير مدعوم. الأنواع المدعومة: JPG, PNG, WebP, MP4, 3GP")
      return
    }

    setShowUploadDialog(true)
    setUploadStatus("uploading")
    setUploading(true)

    try {
      const settings = await getWhatsAppSettings(userId)
      if (!settings?.whatsapp_phone_number_id || !settings?.whatsapp_access_token) {
        setUploadStatus("error")
        setTimeout(() => setShowUploadDialog(false), 2000)
        return
      }

      const result = await uploadMediaToWhatsApp(
        userId,
        file,
        settings.whatsapp_phone_number_id,
        settings.whatsapp_access_token,
      )

      if (result.success) {
        setUploadStatus("success")
        setTimeout(() => {
          setShowUploadDialog(false)
          loadMedia()
        }, 2000)
      } else {
        setUploadStatus("error")
        setTimeout(() => setShowUploadDialog(false), 2000)
      }
    } catch (error) {
      console.error("[v0] Upload error:", error)
      setUploadStatus("error")
      setTimeout(() => setShowUploadDialog(false), 2000)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDelete = async (mediaId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الصورة؟")) return

    const result = await deleteMedia(userId, mediaId)
    if (result.success) {
      alert("تم حذف الصورة بنجاح")
      loadMedia()
    } else {
      alert(`فشل حذف الصورة: ${result.error}`)
    }
  }

  const copyMediaId = (mediaId: string) => {
    navigator.clipboard.writeText(mediaId)
    setCopiedId(mediaId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-dashed border-gray-300 hover:border-emerald-400 transition-colors">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/3gpp"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-gradient-to-r from-emerald-500 to-purple-500 hover:from-emerald-600 hover:to-purple-600 text-white"
              size="lg"
            >
              {uploading ? (
                <>
                  <Upload className="w-5 h-5 ml-2 animate-pulse" />
                  جاري الرفع...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 ml-2" />
                  رفع صورة أو فيديو
                </>
              )}
            </Button>
            <p className="text-sm text-gray-500 text-center">
              الصيغ المدعومة: JPG, PNG, WebP, MP4, 3GP
              <br />
              الحد الأقصى: 16 ميجابايت
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              {uploadStatus === "uploading" && "جاري رفع الصورة..."}
              {uploadStatus === "success" && "تم الرفع بنجاح!"}
              {uploadStatus === "error" && "فشل الرفع"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center justify-center">
            {uploadStatus === "uploading" && (
              <>
                <Upload className="w-16 h-16 text-emerald-500 animate-bounce mb-4" />
                <p className="text-sm text-gray-600">يرجى الانتظار...</p>
              </>
            )}
            {uploadStatus === "success" && (
              <>
                <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                <p className="text-sm text-gray-600">تم رفع الصورة بنجاح!</p>
              </>
            )}
            {uploadStatus === "error" && (
              <>
                <XCircle className="w-16 h-16 text-red-500 mb-4" />
                <p className="text-sm text-gray-600">حدث خطأ أثناء الرفع</p>
              </>
            )}
          </div>
          {uploadStatus !== "uploading" && (
            <DialogFooter>
              <Button onClick={() => setShowUploadDialog(false)} className="w-full">
                إغلاق
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {media.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>لا توجد صور محملة</p>
              <p className="text-sm mt-1">قم برفع صورك لاستخدامها في الرسائل</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {media.map((item) => (
            <Card key={item.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                  {item.media_type === "image" ? (
                    <img
                      src={getProxyImageUrl(item.media_id) || "/placeholder.svg"}
                      alt={item.file_name || "صورة"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                      <span className="text-sm text-gray-600">فيديو</span>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(item.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-3 space-y-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.file_name || "بدون اسم"}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{item.file_size ? `${(item.file_size / 1024).toFixed(0)} KB` : "—"}</span>
                    <span>{new Date(item.uploaded_at).toLocaleDateString("ar")}</span>
                  </div>

                  <div className="bg-gradient-to-r from-emerald-50 via-purple-50 to-emerald-50 rounded-lg p-3 border-2 border-emerald-300 shadow-sm">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <div className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">
                        Media ID للقوالب
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-xs font-mono font-bold text-purple-700 truncate flex-1 bg-white/50 px-2 py-1 rounded">
                        {item.media_id}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs font-semibold hover:bg-emerald-200 border border-emerald-300"
                        onClick={() => copyMediaId(item.media_id)}
                      >
                        {copiedId === item.media_id ? (
                          <>
                            <Check className="w-3 h-3 ml-1 text-green-600" />
                            <span className="text-green-600">تم</span>
                          </>
                        ) : (
                          <>
                            <span className="text-emerald-700">نسخ</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
