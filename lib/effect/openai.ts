import { Effect, Context, Layer } from "effect"
import OpenAIClient from "openai"
import { OpenAIError } from "./errors"
import { AppConfigService } from "./config"
import { z } from "zod"

const LessonContentSchema = z.object({
  subject: z.string(),
  new_info: z.array(z.string()),
  review: z.array(z.string()),
  exercise: z.object({
    prompt: z.string(),
    expected_answer: z.string(),
  }),
})

export type LessonContent = z.infer<typeof LessonContentSchema>

export interface OpenAI {
  readonly generateLesson: (
    topic: string,
    previousLessonsSummary: string,
    difficultyTrend: string
  ) => Effect.Effect<LessonContent, OpenAIError>
}

export const OpenAI = Context.GenericTag<OpenAI>("@app/OpenAI")

export const OpenAILive = Layer.effect(
  OpenAI,
  Effect.gen(function* (_) {
    const config = yield* _(AppConfigService)
    const client = new OpenAIClient({ apiKey: config.openaiApiKey })

    const generateLesson = (
      topic: string,
      previousLessonsSummary: string,
      difficultyTrend: string
    ) =>
      Effect.gen(function* (_) {
        const systemPrompt = `You are an expert educator creating daily microlearning lessons. Generate lessons in JSON format with this exact structure:
{
  "subject": "Brief lesson title",
  "new_info": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
  "review": ["Review point 1 from previous lessons", "Review point 2"],
  "exercise": {
    "prompt": "A practical exercise question or task",
    "expected_answer": "Brief answer or rubric for evaluation"
  }
}

Requirements:
- Keep new_info to 3-5 concise bullet points
- Review should reference concepts from previous lessons
- Exercise should be practical and actionable
- All content should be appropriate for daily microlearning (5-10 minutes)`

        const userPrompt = `Topic: ${topic}

Previous Lessons Summary:
${previousLessonsSummary || "This is the first lesson."}

Difficulty Feedback Trend: ${difficultyTrend}

Generate today's lesson in the exact JSON format specified.`

        const attemptGeneration = (isRetry: boolean = false) =>
          Effect.tryPromise({
            try: async () => {
              const completion = await client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                  { role: "system", content: systemPrompt },
                  {
                    role: "user",
                    content: isRetry
                      ? `${userPrompt}\n\nIMPORTANT: You must respond with valid JSON only. Fix any JSON syntax errors.`
                      : userPrompt,
                  },
                ],
                response_format: { type: "json_object" },
                temperature: 0.7,
              })

              const content = completion.choices[0]?.message?.content
              if (!content) {
                throw new Error("No content in OpenAI response")
              }

              const parsed = JSON.parse(content)
              const validated = LessonContentSchema.parse(parsed)

              return {
                content: validated,
                tokensIn: completion.usage?.prompt_tokens || 0,
                tokensOut: completion.usage?.completion_tokens || 0,
                model: completion.model,
              }
            },
            catch: (error) =>
              new OpenAIError({
                message: `Failed to generate lesson: ${String(error)}`,
                cause: error,
              }),
          })

        const result = yield* _(attemptGeneration(false))

        // If validation fails, retry once
        try {
          return result.content
        } catch (error) {
          const retryResult = yield* _(attemptGeneration(true))
          return retryResult.content
        }
      })

    return OpenAI.of({
      generateLesson,
    })
  })
)

