import { NextResponse } from "next/server"
import type Stripe from "stripe"
import { getStripe } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  cancelOtherSubscriptions,
  invoiceSubscriptionId,
  recordInvoicePayment,
  syncStripeSubscription,
} from "@/lib/billing"

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature")
  const body = await request.text()
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new NextResponse("Webhook is not configured", { status: 400 })
  }

  const stripe = getStripe()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return new NextResponse("Invalid signature", { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        if (session.mode === "subscription" && session.subscription) {
          const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id
          const sub = await stripe.subscriptions.retrieve(subId)
          await syncStripeSubscription(sub)
          if (sub.metadata?.userId) await cancelOtherSubscriptions(stripe, sub.metadata.userId, sub.id)
        } else if (session.metadata?.userId && session.payment_status === "paid") {
          await extendLegacyPayment(session.metadata.userId)
        }
        break
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object
        const subId = invoiceSubscriptionId(invoice)
        if (!subId) break
        const sub = await stripe.subscriptions.retrieve(subId)
        const row = await syncStripeSubscription(sub)
        if (event.type === "invoice.paid") await recordInvoicePayment(invoice, row)
        break
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncStripeSubscription(event.data.object)
        break
      }
    }
  } catch (error) {
    console.error("[stripe webhook] handler failed:", event.type, error)
    return new NextResponse("Webhook handler failed", { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// دفعات التجديد اليدوية القديمة (قبل نظام الخطط) — تمدد الاشتراك شهراً واحداً.
async function extendLegacyPayment(userId: string) {
  const admin = createAdminClient()
  const { data: profile } = await admin.from("user_profiles").select("subscription_expires_at").eq("id", userId).single()
  const expiry =
    profile?.subscription_expires_at && new Date(profile.subscription_expires_at) > new Date()
      ? new Date(profile.subscription_expires_at)
      : new Date()
  expiry.setMonth(expiry.getMonth() + 1)
  await admin
    .from("user_profiles")
    .update({ subscription_expires_at: expiry.toISOString(), account_status: "active", is_active: true })
    .eq("id", userId)
}

