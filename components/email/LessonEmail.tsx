// This component is for reference/development purposes
// The actual email rendering is done in templates.ts

import type { LessonContent } from "@/lib/effect/openai"

interface LessonEmailProps {
  content: LessonContent
  unsubscribeUrl: string
  pauseUrl: string
}

export function LessonEmail({ content, unsubscribeUrl, pauseUrl }: LessonEmailProps) {
  return (
    <div>
      <h1>{content.subject}</h1>
      <section>
        <h2>New Information</h2>
        <ul>
          {content.new_info.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Review</h2>
        <ul>
          {content.review.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Exercise</h2>
        <p>{content.exercise.prompt}</p>
        <details>
          <summary>Show Answer</summary>
          <p>{content.exercise.expected_answer}</p>
        </details>
      </section>
      <footer>
        <a href={pauseUrl}>Pause Emails</a> | <a href={unsubscribeUrl}>Unsubscribe</a>
      </footer>
    </div>
  )
}

