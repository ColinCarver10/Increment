import { Effect, Config, Context, Layer } from "effect"
import { ConfigError } from "./errors"

export interface AppConfig {
  readonly supabaseUrl: string
  readonly supabaseAnonKey: string
  readonly supabaseServiceRoleKey: string
  readonly resendApiKey: string
  readonly emailFrom: string
  readonly openaiApiKey: string
  readonly stripeSecretKey: string
  readonly stripeWebhookSecret: string
  readonly stripePriceIdMonthly: string
  readonly stripePriceIdYearly: string
  readonly stripeBillingPortalConfigurationId: string | undefined
  readonly appUrl: string
  readonly cronSecret: string
  readonly unsubscribeSigningSecret: string
  readonly adminEmails: readonly string[]
}

export const AppConfigService = Context.GenericTag<AppConfig>("@app/AppConfig")

const supabaseUrl = Config.string("SUPABASE_URL").pipe(
  Config.orElse(() => Config.string("NEXT_PUBLIC_SUPABASE_URL")),
  Config.withDefault("")
)

const supabaseAnonKey = Config.string("SUPABASE_ANON_KEY").pipe(
  Config.orElse(() => Config.string("NEXT_PUBLIC_SUPABASE_ANON_KEY")),
  Config.withDefault("")
)

const supabaseServiceRoleKey = Config.string("SUPABASE_SERVICE_ROLE_KEY").pipe(
  Config.withDefault("")
)

const resendApiKey = Config.string("RESEND_API_KEY").pipe(
  Config.withDefault("")
)

const emailFrom = Config.string("EMAIL_FROM").pipe(
  Config.withDefault("")
)

const openaiApiKey = Config.string("OPENAI_API_KEY").pipe(
  Config.withDefault("")
)

const stripeSecretKey = Config.string("STRIPE_SECRET_KEY").pipe(
  Config.withDefault("")
)

const stripeWebhookSecret = Config.string("STRIPE_WEBHOOK_SECRET").pipe(
  Config.withDefault("")
)

const stripePriceIdMonthly = Config.string("STRIPE_PRICE_ID_MONTHLY").pipe(
  Config.withDefault("")
)

const stripePriceIdYearly = Config.string("STRIPE_PRICE_ID_YEARLY").pipe(
  Config.withDefault("")
)

const stripeBillingPortalConfigurationId = Config.string(
  "STRIPE_BILLING_PORTAL_CONFIGURATION_ID"
).pipe(Config.withDefault(""))

const appUrl = Config.string("APP_URL").pipe(
  Config.withDefault("")
)

const cronSecret = Config.string("CRON_SECRET").pipe(
  Config.withDefault("")
)

const unsubscribeSigningSecret = Config.string("UNSUBSCRIBE_SIGNING_SECRET").pipe(
  Config.withDefault("")
)

const adminEmails = Config.string("ADMIN_EMAILS").pipe(
  Config.withDefault(""),
  Config.map((s) => s.split(",").map((e) => e.trim()).filter(Boolean))
)

const appConfigEffect = Config.all({
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  resendApiKey,
  emailFrom,
  openaiApiKey,
  stripeSecretKey,
  stripeWebhookSecret,
  stripePriceIdMonthly,
  stripePriceIdYearly,
  stripeBillingPortalConfigurationId,
  appUrl,
  cronSecret,
  unsubscribeSigningSecret,
  adminEmails,
}).pipe(
  Effect.mapError(
    (error) =>
      new ConfigError({
        message: `Failed to load configuration: ${error.message}`,
      })
  )
)

// Export as AppConfig - this is both an Effect and can be used as a service
export const AppConfig = appConfigEffect

// Export as Layer for use in runtime - wrap the Effect as a Layer providing AppConfigService
// Layer.effect will run the AppConfig Effect (which reads from env vars with defaults)
// and provide the result as AppConfigService
export const AppConfigLayer = Layer.effect(AppConfigService, appConfigEffect)

