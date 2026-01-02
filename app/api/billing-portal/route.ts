import { NextRequest, NextResponse } from "next/server"
import { Effect } from "effect"
import { createClient } from "@/lib/supabase/server"
import { UserRuntime } from "@/lib/effect/runtime"
import { StripeBilling } from "@/lib/effect/stripe-billing"
import { AppConfig } from "@/lib/effect/config"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Get subscription to find customer ID
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single()

    if (!subscription) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 404 }
      )
    }

    const config = await Effect.runPromise(Effect.provide(AppConfig, UserRuntime))
    const returnUrl = `${config.appUrl}/billing`

    const portalEffect = Effect.gen(function* (_) {
      const stripeBilling = yield* _(StripeBilling)
      return yield* _(stripeBilling.createBillingPortalSession(subscription.stripe_customer_id, returnUrl))
    })

    const result = await Effect.runPromise(
      Effect.provide(portalEffect, UserRuntime)
    )

    return NextResponse.json({ url: result.url })
  } catch (error) {
    console.error("Billing portal error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

