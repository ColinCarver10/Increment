import { NextRequest, NextResponse } from "next/server"
import { Effect } from "effect"
import { createClient } from "@/lib/supabase/server"
import { UserRuntime } from "@/lib/effect/runtime"
import { StripeBilling } from "@/lib/effect/stripe-billing"

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

    const body = await request.json()
    const { priceId, priceType } = body

    // Use process.env directly since Effect's Config doesn't read env vars properly in this context
    const stripePriceIdMonthly = process.env.STRIPE_PRICE_ID_MONTHLY
    const stripePriceIdYearly = process.env.STRIPE_PRICE_ID_YEARLY
    
    const finalPriceId = priceId || (priceType === "yearly" ? stripePriceIdYearly : stripePriceIdMonthly)

    if (!finalPriceId) {
      return NextResponse.json({ error: "priceId or priceType is required" }, { status: 400 })
    }

    // Get user email from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const checkoutEffect = Effect.gen(function* (_) {
      const stripeBilling = yield* _(StripeBilling)
      return yield* _(stripeBilling.createCheckoutSession(user.id, profile.email, finalPriceId))
    })

    const providedEffect = Effect.provide(checkoutEffect, UserRuntime) as Effect.Effect<{ url: string }, any, never>
    const result = await Effect.runPromise(providedEffect)

    return NextResponse.json({ url: result.url })
  } catch (error) {
    console.error("Checkout error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

