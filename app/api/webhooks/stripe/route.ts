import { NextRequest, NextResponse } from "next/server"
import { Effect } from "effect"
import Stripe from "stripe"
import { AdminRuntime } from "@/lib/effect/runtime"
import { SupabaseDb } from "@/lib/effect/supabase-db"
import { StripeBilling } from "@/lib/effect/stripe-billing"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    // Use process.env directly since Effect Config doesn't load properly
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY || ""
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ""
    
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" })

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        stripeWebhookSecret
      )
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      )
    }

    // Handle subscription events
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id

      if (userId && session.subscription) {
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id

        const webhookEffect = Effect.gen(function* (_) {
          const stripeBilling = yield* _(StripeBilling)
          const supabaseDb = yield* _(SupabaseDb)

          const customerId = yield* _(stripeBilling.getCustomerId(subscriptionId))
          const subscription = yield* _(stripeBilling.getSubscription(subscriptionId))

          yield* _(
            supabaseDb.upsertSubscription({
              user_id: userId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              status: subscription.status,
              current_period_end: subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
          )
        })

        const providedEffect = Effect.provide(webhookEffect, AdminRuntime) as Effect.Effect<void, any, never>
        await Effect.runPromise(providedEffect)
      }
    } else if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated"
    ) {
      // Handle subscription updates if needed
      // For MVP, we primarily handle checkout.session.completed
    } else if (event.type === "customer.subscription.deleted") {
      // Handle subscription deletion if needed
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

