import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { messageId } = body

    // الحصول على معلومات الرسالة
    const { data: message, error: messageError } = await supabase
      .from("individual_messages")
      .select("*")
      .eq("id", messageId)
      .single()

    if (messageError || !message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    // التحقق من ملكية المستخدم للرسالة
    if (message.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // جلب بيانات المستخدم بشكل منفصل إذا كانت مطلوبة
    const { data: userProfile } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()

    // هنا يتم الاتصال بـ WhatsApp API لإرسال الرسالة
    // في هذا المثال نقوم بتحديث الحالة فقط

    const { error: updateError } = await supabase
      .from("individual_messages")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", messageId)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending message:", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}
