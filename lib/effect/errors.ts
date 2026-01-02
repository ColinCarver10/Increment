import { Data } from "effect"

export class ConfigError extends Data.TaggedError("ConfigError")<{
  readonly message: string
}> {}

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

export class OpenAIError extends Data.TaggedError("OpenAIError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

export class ResendError extends Data.TaggedError("ResendError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

export class StripeError extends Data.TaggedError("StripeError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

export class LessonGenerationError extends Data.TaggedError("LessonGenerationError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

export type AppError =
  | ConfigError
  | DatabaseError
  | OpenAIError
  | ResendError
  | StripeError
  | LessonGenerationError

