import { NextRequest, NextResponse } from "next/server"
import { Effect } from "effect"
import { AdminRuntime } from "@/lib/effect/runtime"
import { Scheduler } from "@/lib/effect/scheduler"
import { AppConfig } from "@/lib/effect/config"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    
    const config = await Effect.runPromise(
      Effect.provide(AppConfig, AdminRuntime)
    )
    const expectedSecret = config.cronSecret

    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Run scheduler
    const schedulerEffect = Effect.gen(function* (_) {
      const scheduler = yield* _(Scheduler)
      return yield* _(scheduler.processScheduledUsers())
    })

    const results = await Effect.runPromise(
      Effect.provide(schedulerEffect, AdminRuntime)
    )

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Cron error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

