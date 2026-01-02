import { Effect, Context, Layer } from "effect"
import { DatabaseError, LessonGenerationError, OpenAIError, ResendError } from "./errors"
import { SupabaseDb } from "./supabase-db"
import { LessonGenerator } from "./lesson-generator"
import { formatInTimeZone } from "date-fns-tz"
import type { Profile } from "../types/database"

export interface Scheduler {
  readonly processScheduledUsers: () => Effect.Effect<
    readonly { userId: string; status: "sent" | "skipped"; reason?: string }[],
    DatabaseError | LessonGenerationError | OpenAIError | ResendError
  >
}

export const Scheduler = Context.GenericTag<Scheduler>("@app/Scheduler")

const isTrialActive = (profile: Profile, lessonCount: number): boolean => {
  const profileCreated = new Date(profile.created_at)
  const daysSinceCreation = (Date.now() - profileCreated.getTime()) / (1000 * 60 * 60 * 24)

  if (daysSinceCreation <= 3) {
    return lessonCount < 3
  }

  return false
}

export const SchedulerLive = Layer.effect(
  Scheduler,
  Effect.gen(function* (_) {
    const supabaseDb = yield* _(SupabaseDb)
    const lessonGenerator = yield* _(LessonGenerator)

    const processScheduledUsers = () =>
      Effect.gen(function* (_) {
        const now = new Date()

        // Get all active users (not paused, has topic)
        const users = yield* _(supabaseDb.getAllActiveUsers())

        const results: { userId: string; status: "sent" | "skipped"; reason?: string }[] = []

        for (const user of users) {
          // Check if unsubscribed
          const unsubscribed = yield* _(supabaseDb.isUnsubscribed(user.id))
          if (unsubscribed) {
            results.push({ userId: user.id, status: "skipped", reason: "unsubscribed" })
            continue
          }

          // Check if already sent today
          const today = formatInTimeZone(now, user.timezone, "yyyy-MM-dd")
          const existingLesson = yield* _(supabaseDb.getLessonByDate(user.id, today))
          if (existingLesson) {
            results.push({ userId: user.id, status: "skipped", reason: "already_sent_today" })
            continue
          }

          // Check subscription or trial
          const subscription = yield* _(supabaseDb.getSubscription(user.id))
          const lessons = yield* _(supabaseDb.getLessons(user.id, 100))
          const lessonCount = lessons.length

          const hasActiveSubscription =
            subscription?.status === "active" || subscription?.status === "trialing"

          if (!hasActiveSubscription && !isTrialActive(user, lessonCount)) {
            results.push({
              userId: user.id,
              status: "skipped",
              reason: "trial_exceeded_no_subscription",
            })
            continue
          }

          // Generate and send lesson
          try {
            yield* _(lessonGenerator.generateAndSendLesson(user))
            results.push({ userId: user.id, status: "sent" })
          } catch (error) {
            results.push({
              userId: user.id,
              status: "skipped",
              reason: `generation_error: ${error instanceof Error ? error.message : String(error)}`,
            })
          }
        }

        return results
      })

    return Scheduler.of({
      processScheduledUsers,
    })
  })
)

