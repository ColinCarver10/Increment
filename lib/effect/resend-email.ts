import { Effect, Context, Layer } from "effect"
import { Resend } from "resend"
import { ResendError } from "./errors"
import { AppConfigService } from "./config"

export interface ResendEmail {
  readonly sendLesson: (
    to: string,
    subject: string,
    htmlBody: string,
    textBody: string,
    unsubscribeUrl: string,
    pauseUrl: string
  ) => Effect.Effect<void, ResendError>
}

export const ResendEmail = Context.GenericTag<ResendEmail>("@app/ResendEmail")

export const ResendEmailLive = Layer.effect(
  ResendEmail,
  Effect.gen(function* (_) {
    const config = yield* _(AppConfigService)
    const resend = new Resend(config.resendApiKey)

    const sendLesson = (
      to: string,
      subject: string,
      htmlBody: string,
      textBody: string,
      unsubscribeUrl: string,
      pauseUrl: string
    ) =>
      Effect.tryPromise({
        try: async () => {
          const [fromName, fromEmail] = config.emailFrom.match(/^(.+?)\s*<(.+?)>$/)?.slice(1) || [
            "",
            config.emailFrom,
          ]

          const { error } = await resend.emails.send({
            from: fromEmail.trim() || config.emailFrom,
            to,
            subject,
            html: htmlBody,
            text: textBody,
            headers: {
              "List-Unsubscribe": `<${unsubscribeUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          })

          if (error) throw error
        },
        catch: (error) =>
          new ResendError({
            message: `Failed to send email: ${String(error)}`,
            cause: error,
          }),
      })

    return ResendEmail.of({
      sendLesson,
    })
  })
)

