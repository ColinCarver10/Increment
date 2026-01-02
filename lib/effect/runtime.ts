import { Layer, Runtime } from "effect"
import { AppConfigLayer, AppConfigService } from "./config"
import { SupabaseDb, SupabaseDbLive } from "./supabase-db"
import { OpenAI, OpenAILive } from "./openai"
import { ResendEmail, ResendEmailLive } from "./resend-email"
import { StripeBilling, StripeBillingLive } from "./stripe-billing"
import { LessonGenerator, LessonGeneratorLive } from "./lesson-generator"
import { Scheduler, SchedulerLive } from "./scheduler"

// Create layers with optional access token for authenticated requests
const createLayers = (useServiceRole: boolean, accessToken?: string) => {
  // Layers that depend on AppConfigService - provide AppConfigLayer to each
  const supabaseLayer = SupabaseDbLive(useServiceRole, accessToken).pipe(Layer.provide(AppConfigLayer))
  const openaiLayer = OpenAILive.pipe(Layer.provide(AppConfigLayer))
  const resendLayer = ResendEmailLive.pipe(Layer.provide(AppConfigLayer))
  const stripeLayer = StripeBillingLive.pipe(Layer.provide(AppConfigLayer))
  
  // Merge the base services
  const baseServices = Layer.mergeAll(
    AppConfigLayer,
    supabaseLayer,
    openaiLayer,
    resendLayer,
    stripeLayer
  )
  
  // LessonGenerator depends on SupabaseDb, OpenAI, ResendEmail, and AppConfig
  const lessonGeneratorLayer = LessonGeneratorLive.pipe(Layer.provide(baseServices))
  
  // Scheduler depends on SupabaseDb and LessonGenerator
  const schedulerLayer = SchedulerLive.pipe(
    Layer.provide(Layer.merge(baseServices, lessonGeneratorLayer))
  )
  
  return Layer.mergeAll(baseServices, lessonGeneratorLayer, schedulerLayer)
}

// Factory to create runtime with authenticated user's access token
export const createAuthenticatedRuntime = (accessToken: string) => createLayers(false, accessToken)

// Layer for user-facing routes (uses anon key, RLS enabled, no auth)
export const UserRuntime = createLayers(false)

// Layer for cron/admin routes (uses service role key, bypasses RLS)
export const AdminRuntime = createLayers(true)

export type UserRuntimeType = Runtime.Runtime<
  typeof AppConfigService | typeof SupabaseDb | typeof OpenAI | typeof ResendEmail | typeof StripeBilling | typeof LessonGenerator | typeof Scheduler
>

export type AdminRuntimeType = Runtime.Runtime<
  typeof AppConfigService | typeof SupabaseDb | typeof OpenAI | typeof ResendEmail | typeof StripeBilling | typeof LessonGenerator | typeof Scheduler
>

