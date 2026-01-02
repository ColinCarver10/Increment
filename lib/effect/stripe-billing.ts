import { Effect, Context, Layer } from "effect"
import Stripe from "stripe"
import { StripeError } from "./errors"
import { AppConfigService } from "./config"

export interface StripeBilling {
  readonly createCheckoutSession: (
    userId: string,
    userEmail: string,
    priceId: string
  ) => Effect.Effect<{ url: string }, StripeError>
  readonly createBillingPortalSession: (
    customerId: string,
    returnUrl: string
  ) => Effect.Effect<{ url: string }, StripeError>
  readonly getCustomerId: (subscriptionId: string) => Effect.Effect<string, StripeError>
  readonly getSubscription: (subscriptionId: string) => Effect.Effect<Stripe.Subscription, StripeError>
}

export const StripeBilling = Context.GenericTag<StripeBilling>("@app/StripeBilling")

export const StripeBillingLive = Layer.effect(
  StripeBilling,
  Effect.gen(function* (_) {
    const config = yield* _(AppConfigService)
    const stripe = new Stripe(config.stripeSecretKey, { apiVersion: "2024-06-20" })

    const createCheckoutSession = (userId: string, userEmail: string, priceId: string) =>
      Effect.tryPromise({
        try: async () => {
          const session = await stripe.checkout.sessions.create({
            customer_email: userEmail,
            mode: "subscription",
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${config.appUrl}/billing?success=true`,
            cancel_url: `${config.appUrl}/billing?canceled=true`,
            metadata: {
              user_id: userId,
            },
          })

          if (!session.url) {
            throw new Error("No URL returned from Stripe checkout session")
          }

          return { url: session.url }
        },
        catch: (error) =>
          new StripeError({
            message: `Failed to create checkout session: ${String(error)}`,
            cause: error,
          }),
      })

    const createBillingPortalSession = (customerId: string, returnUrl: string) =>
      Effect.tryPromise({
        try: async () => {
          const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
            ...(config.stripeBillingPortalConfigurationId && {
              configuration: config.stripeBillingPortalConfigurationId,
            }),
          })

          return { url: session.url }
        },
        catch: (error) =>
          new StripeError({
            message: `Failed to create billing portal session: ${String(error)}`,
            cause: error,
          }),
      })

    const getCustomerId = (subscriptionId: string) =>
      Effect.tryPromise({
        try: async () => {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          return typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id
        },
        catch: (error) =>
          new StripeError({
            message: `Failed to get customer ID: ${String(error)}`,
            cause: error,
          }),
      })

    const getSubscription = (subscriptionId: string) =>
      Effect.tryPromise({
        try: async () => {
          return await stripe.subscriptions.retrieve(subscriptionId)
        },
        catch: (error) =>
          new StripeError({
            message: `Failed to get subscription: ${String(error)}`,
            cause: error,
          }),
      })

    return StripeBilling.of({
      createCheckoutSession,
      createBillingPortalSession,
      getCustomerId,
      getSubscription,
    })
  })
)

