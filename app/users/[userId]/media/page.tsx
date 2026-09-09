import MediaLibraryClient from "@/components/users/media-library-client"

export default async function MediaPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">مكتبة الصور</h2>
        <p className="text-gray-600">إدارة الصور والملفات الوسائطية لاستخدامها في الرسائل</p>
      </div>

      <MediaLibraryClient userId={userId} />
    </div>
  )
}
