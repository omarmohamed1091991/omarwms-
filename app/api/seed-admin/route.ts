import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const SEED_TOKEN = "owms-seed-8f3a1c92e7"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get("token") !== SEED_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const email = "omarmohamed1091991@gmail.com"
  const password = "Omar@92702689"

  try {
    const admin = createAdminClient()

    let userId: string | undefined

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Omar", role: "admin" },
    })

    if (error) {
      const msg = String(error.message).toLowerCase()
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        const { data: list, error: listErr } = await admin.auth.admin.listUsers()
        if (listErr) {
          return NextResponse.json({ step: "list", error: listErr.message }, { status: 500 })
        }
        const existing = list.users.find((u) => u.email === email)
        if (!existing) {
          return NextResponse.json({ step: "find", error: "user not found" }, { status: 500 })
        }
        userId = existing.id
        await admin.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
          user_metadata: { full_name: "Omar", role: "admin" },
        })
      } else {
        return NextResponse.json({ step: "create", error: error.message }, { status: 500 })
      }
    } else {
      userId = data.user.id
    }

    const { error: pErr } = await admin
      .from("user_profiles")
      .upsert({ id: userId, email, full_name: "Omar", role: "admin", is_active: true }, { onConflict: "id" })

    if (pErr) {
      return NextResponse.json({ step: "profile", userId, error: pErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, userId, email })
  } catch (e) {
    return NextResponse.json({ step: "exception", error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
