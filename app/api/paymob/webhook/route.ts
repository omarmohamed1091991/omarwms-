import { NextResponse } from "next/server"
import { processPaymobTransaction, transactionFromQuery, transactionFromWebhook } from "@/lib/paymob"

// Transaction processed callback من Paymob. يتم التحقق من HMAC قبل أي تعديل.
export async function POST(request: Request) {
  const url = new URL(request.url)
  const body = await request.json().catch(() => null)
  if (!body || (body.type && body.type !== "TRANSACTION") || !body.obj) {
    return NextResponse.json({ received: true })
  }
  const hmac = url.searchParams.get("hmac") || body.hmac
  try {
    const result = await processPaymobTransaction(transactionFromWebhook(body.obj), hmac)
    if (!result.ok) {
      console.error("[paymob webhook] rejected:", result.reason)
      return new NextResponse("Invalid callback", { status: result.reason === "unknown_session" ? 404 : 401 })
    }
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[paymob webhook] handler failed:", error)
    return new NextResponse("Webhook handler failed", { status: 500 })
  }
}

// بعض إعدادات Paymob ترسل Transaction response callback كـ GET.
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams)
  const result = await processPaymobTransaction(transactionFromQuery(params), params.hmac).catch(() => null)
  return result?.ok ? NextResponse.json({ received: true }) : new NextResponse("Invalid callback", { status: 401 })
}
