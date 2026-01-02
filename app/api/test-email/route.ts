import { NextRequest, NextResponse } from "next/server"
import { Effect } from "effect"
import { createClient } from "@/lib/supabase/server"
import { createAuthenticatedRuntime, AdminRuntime } from "@/lib/effect/runtime"
import { LessonGenerator } from "@/lib/effect/lesson-generator"
import { SupabaseDb } from "@/lib/effect/supabase-db"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const userIdOverride = body.userId // For admin use

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user && !userIdOverride) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Get the user's session for authenticated Supabase calls
    const { data: { session } } = await supabase.auth.getSession()
    
    // Log the Supabase URL being used by the server client
    console.log("Server client SUPABASE_URL:", process.env.SUPABASE_URL)
    console.log("Server client NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log("Session access_token exists:", !!session?.access_token)

    const targetUserId = userIdOverride || user!.id

    const testEmailEffect = Effect.gen(function* (_) {
      const supabaseDb = yield* _(SupabaseDb)
      const profile = yield* _(supabaseDb.getProfile(targetUserId))

      if (!profile) {
        console.error("Profile not found for userId:", targetUserId)
        console.error("Auth user from server client:", user?.id, user?.email)
        yield* _(Effect.fail(new Error("Profile not found")))
      }

      if (!profile!.topic) {
        yield* _(Effect.fail(new Error("Please set a topic first")))
      }

      const lessonGenerator = yield* _(LessonGenerator)
      return yield* _(lessonGenerator.generateAndSendLesson(profile!))
    })

    try {
      // Create runtime with user's access token for authenticated Supabase calls
      const runtime = session 
        ? createAuthenticatedRuntime(session.access_token)
        : AdminRuntime // Fallback to admin if no session (shouldn't happen)
      
      const providedEffect = Effect.provide(testEmailEffect, runtime) as Effect.Effect<any, any, never>
      const lesson = await Effect.runPromise(providedEffect)

      return NextResponse.json({
        success: true,
        lesson: {
          id: lesson.id,
          subject: lesson.subject,
          lesson_date: lesson.lesson_date,
        },
      })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Profile not found") {
          return NextResponse.json({ error: error.message }, { status: 404 })
        }
        if (error.message === "Please set a topic first") {
          return NextResponse.json({ error: error.message }, { status: 400 })
        }
      }
      throw error
    }
  } catch (error) {
    console.error("Test email error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

