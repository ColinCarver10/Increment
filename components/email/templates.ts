import type { LessonContent } from "@/lib/effect/openai"

export function renderLessonEmail(
  content: LessonContent,
  unsubscribeUrl: string,
  pauseUrl: string
): { htmlBody: string; textBody: string } {
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${content.subject}</h1>
  </div>

  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #667eea; margin-top: 0; font-size: 20px;">📚 New Information</h2>
    <ul style="margin: 0; padding-left: 20px;">
      ${content.new_info.map((item) => `<li style="margin-bottom: 8px;">${escapeHtml(item)}</li>`).join("")}
    </ul>
  </div>

  <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #856404; margin-top: 0; font-size: 20px;">🔄 Review</h2>
    <ul style="margin: 0; padding-left: 20px;">
      ${content.review.map((item) => `<li style="margin-bottom: 8px;">${escapeHtml(item)}</li>`).join("")}
    </ul>
  </div>

  <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #0c5460; margin-top: 0; font-size: 20px;">✏️ Exercise</h2>
    <p style="margin-bottom: 12px; font-weight: 500;">${escapeHtml(content.exercise.prompt)}</p>
    <details style="margin-top: 12px;">
      <summary style="cursor: pointer; color: #0c5460; font-weight: 500;">Show Answer</summary>
      <p style="margin-top: 8px; padding: 12px; background: white; border-radius: 4px;">${escapeHtml(content.exercise.expected_answer)}</p>
    </details>
  </div>

  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; text-align: center; font-size: 12px; color: #6c757d;">
    <p style="margin: 8px 0;">
      <a href="${pauseUrl}" style="color: #667eea; text-decoration: none;">Pause Emails</a>
      &nbsp;|&nbsp;
      <a href="${unsubscribeUrl}" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
    </p>
    <p style="margin: 8px 0;">You're receiving this because you signed up for daily microlearning.</p>
  </div>
</body>
</html>
  `.trim()

  const textBody = `
${content.subject}
${"=".repeat(content.subject.length)}

NEW INFORMATION
${content.new_info.map((item, i) => `${i + 1}. ${item}`).join("\n")}

REVIEW
${content.review.map((item, i) => `${i + 1}. ${item}`).join("\n")}

EXERCISE
${content.exercise.prompt}

Expected Answer:
${content.exercise.expected_answer}

---
Pause Emails: ${pauseUrl}
Unsubscribe: ${unsubscribeUrl}

You're receiving this because you signed up for daily microlearning.
  `.trim()

  return { htmlBody, textBody }
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

