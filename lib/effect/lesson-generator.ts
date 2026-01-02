import { Effect, Context, Layer } from "effect"
import { LessonGenerationError } from "./errors"
import { SupabaseDb } from "./supabase-db"
import { OpenAI } from "./openai"
import { ResendEmail } from "./resend-email"
import { AppConfigService } from "./config"
import { renderLessonEmail } from "../../components/email/templates"
import { signUnsubscribeToken } from "../../utils/unsubscribe-token"
import type { Profile, Lesson } from "../types/database"

export interface LessonGenerator {
  readonly generateAndSendLesson: (
    profile: Profile
  ) => Effect.Effect<Lesson, LessonGenerationError, SupabaseDb | OpenAI | ResendEmail | typeof AppConfigService>
}

export const LessonGenerator = Context.GenericTag<LessonGenerator>("@app/LessonGenerator")

const getPreviousLessonsSummary = (lessons: readonly Lesson[]): string => {
  if (lessons.length === 0) {
    return "This is the first lesson."
  }

  return lessons
    .slice(0, 5)
    .map((lesson, idx) => {
      const date = new Date(lesson.lesson_date).toLocaleDateString()
      return `Lesson ${idx + 1} (${date}): ${lesson.subject}`
    })
    .join("\n")
}

const getDifficultyTrend = (feedbacks: readonly { difficulty: string }[]): string => {
  if (feedbacks.length === 0) {
    return "No feedback yet"
  }

  const recent = feedbacks.slice(0, 5)
  const easy = recent.filter((f) => f.difficulty === "easy").length
  const hard = recent.filter((f) => f.difficulty === "hard").length

  if (hard > easy) {
    return "Recent lessons have been too difficult"
  } else if (easy > hard) {
    return "Recent lessons have been too easy"
  }
  return "Difficulty level is appropriate"
}

export const LessonGeneratorLive = Layer.effect(
  LessonGenerator,
  Effect.gen(function* (_) {
    const supabaseDb = yield* _(SupabaseDb)
    const openai = yield* _(OpenAI)
    const resendEmail = yield* _(ResendEmail)
    const config = yield* _(AppConfigService)

    const generateAndSendLesson = (profile: Profile) =>
      Effect.gen(function* (_) {
        if (!profile.topic) {
          yield* _(
            Effect.fail(
              new LessonGenerationError({
                message: "User has no topic set",
              })
            )
          )
        }

        // Get previous lessons
        const previousLessons = yield* _(supabaseDb.getLessons(profile.id, 5))
        const previousSummary = getPreviousLessonsSummary(previousLessons)

        // Get feedback for difficulty trend
        const feedbacks = yield* _(supabaseDb.getUserFeedback(profile.id, 5))
        const difficultyTrend = getDifficultyTrend(feedbacks)

        // Generate lesson content
        const lessonContent = yield* _(
          openai.generateLesson(profile.topic!, previousSummary, difficultyTrend)
        )

        // Render email templates
        const unsubscribeToken = yield* _(
          Effect.tryPromise({
            try: async () => {
              const encoder = new TextEncoder()
              const key = encoder.encode(config.unsubscribeSigningSecret)
              const { SignJWT } = await import("jose")
              return await new SignJWT({ userId: profile.id })
                .setProtectedHeader({ alg: "HS256" })
                .setIssuedAt()
                .setExpirationTime("30d")
                .sign(key)
            },
            catch: (error) =>
              new LessonGenerationError({
                message: `Failed to sign unsubscribe token: ${String(error)}`,
                cause: error,
              }),
          })
        )

        const unsubscribeUrl = `${config.appUrl}/api/unsubscribe?token=${unsubscribeToken}`
        const pauseUrl = `${config.appUrl}/app?pause=true`

        const { htmlBody, textBody } = renderLessonEmail(
          lessonContent,
          unsubscribeUrl,
          pauseUrl
        )

        // Send email
        yield* _(
          resendEmail.sendLesson(
            profile.email,
            lessonContent.subject,
            htmlBody,
            textBody,
            unsubscribeUrl,
            pauseUrl
          )
        )

        // Save lesson to database
        const today = new Date().toISOString().split("T")[0]
        const lesson = yield* _(
          supabaseDb.createLesson({
            user_id: profile.id,
            lesson_date: today,
            subject: lessonContent.subject,
            html_body: htmlBody,
            text_body: textBody,
            model: "gpt-4o-mini",
            tokens_in: null,
            tokens_out: null,
          })
        )

        return lesson
      })

    return LessonGenerator.of({
      generateAndSendLesson,
    })
  })
)

