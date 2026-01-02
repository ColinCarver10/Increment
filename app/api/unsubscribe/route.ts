import { NextRequest, NextResponse } from "next/server"
import { Runtime, Effect } from "effect"
import { AdminRuntime } from "@/lib/effect/runtime"
import { SupabaseDb } from "@/lib/effect/supabase-db"
import { AppConfig } from "@/lib/effect/config"
import { verifyUnsubscribeToken } from "@/lib/utils/unsubscribe-token"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    const config = await Runtime.runPromise(Effect.provide(AppConfig, AdminRuntime))
    const payload = await verifyUnsubscribeToken(token, config.unsubscribeSigningSecret)

    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 })
    }

    const unsubscribeEffect = Effect.gen(function* (_) {
      const supabaseDb = yield* _(SupabaseDb)
      yield* _(supabaseDb.unsubscribe(payload.userId))
    })

    await Runtime.runPromise(
      Effect.provide(unsubscribeEffect, AdminRuntime)
    )

    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Unsubscribed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 500px;
    }
    h1 { color: #333; margin-top: 0; }
    p { color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>✓ Successfully Unsubscribed</h1>
    <p>You will no longer receive daily microlearning emails.</p>
    <p>You can resubscribe anytime by logging into your account.</p>
  </div>
</body>
</html>`,
      {
        headers: { "Content-Type": "text/html" },
      }
    )
  } catch (error) {
    console.error("Unsubscribe error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

