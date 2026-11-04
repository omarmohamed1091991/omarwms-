import { NextResponse, type NextRequest } from "next/server"
import { createHmac, randomBytes, timingSafeEqual } from "crypto"
import { getMetaConfig } from "@/lib/meta"
import { siteConfig } from "@/lib/site-config"

// Data Deletion Request Callback الخاص بـ Meta.
// يستقبل signed_request من Meta عندما يزيل المستخدم التطبيق ويطلب حذف بياناته،
// ويعيد رابط متابعة الطلب ورمز التأكيد كما تشترط Meta.
function base64UrlDecode(input: string) {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64")
}

function parseSignedRequest(signedRequest: string, appSecret: string) {
  const [encodedSig, payload] = signedRequest.split(".", 2)
  if (!encodedSig || !payload) return null

  const sig = base64UrlDecode(encodedSig)
  const expected = createHmac("sha256", appSecret).update(payload).digest()
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null

  try {
    const data = JSON.parse(base64UrlDecode(payload).toString("utf8"))
    if (data?.algorithm?.toUpperCase() !== "HMAC-SHA256") return null
    return data as { user_id?: string; algorithm: string; issued_at?: number }
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const { appSecret } = getMetaConfig()
  if (!appSecret) {
    return NextResponse.json({ error: "Meta app is not configured" }, { status: 500 })
  }

  let signedRequest: string | null = null
  const contentType = request.headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}))
    signedRequest = body?.signed_request ?? null
  } else {
    const form = await request.formData().catch(() => null)
    signedRequest = (form?.get("signed_request") as string | null) ?? null
  }

  if (!signedRequest) {
    return NextResponse.json({ error: "Missing signed_request" }, { status: 400 })
  }

  const data = parseSignedRequest(signedRequest, appSecret)
  if (!data) {
    return NextResponse.json({ error: "Invalid signed_request" }, { status: 400 })
  }

  const confirmationCode = `DEL-${randomBytes(6).toString("hex").toUpperCase()}`
  // المنصة لا تخزن معرّفات مستخدمي فيسبوك؛ نسجّل الطلب لمراجعته من فريق الدعم.
  console.log("[meta-data-deletion] request received", { metaUserId: data.user_id, confirmationCode })

  const baseUrl = process.env.URL || siteConfig.url
  return NextResponse.json({
    url: `${baseUrl}/data-deletion?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  })
}
