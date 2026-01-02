import { Effect, Context, Layer } from "effect"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { DatabaseError } from "./errors"
import { AppConfigService, type AppConfig } from "./config"
import type {
  Profile,
  Subscription,
  Lesson,
  UserFeedback,
  Unsubscribe,
} from "../types/database"

export interface SupabaseDb {
  readonly getProfile: (userId: string) => Effect.Effect<Profile | null, DatabaseError>
  readonly updateProfile: (
    userId: string,
    updates: Partial<Pick<Profile, "topic" | "timezone" | "send_time" | "paused">>
  ) => Effect.Effect<Profile, DatabaseError>
  readonly getAllActiveUsers: () => Effect.Effect<readonly Profile[], DatabaseError>
  readonly getUsersForScheduling: (
    currentHour: number,
    currentMinute: number
  ) => Effect.Effect<readonly Profile[], DatabaseError>
  readonly getSubscription: (userId: string) => Effect.Effect<Subscription | null, DatabaseError>
  readonly upsertSubscription: (subscription: Subscription) => Effect.Effect<Subscription, DatabaseError>
  readonly getLessons: (
    userId: string,
    limit?: number
  ) => Effect.Effect<readonly Lesson[], DatabaseError>
  readonly getLessonByDate: (
    userId: string,
    lessonDate: string
  ) => Effect.Effect<Lesson | null, DatabaseError>
  readonly createLesson: (lesson: Omit<Lesson, "id" | "created_at">) => Effect.Effect<Lesson, DatabaseError>
  readonly getUserFeedback: (
    userId: string,
    limit?: number
  ) => Effect.Effect<readonly UserFeedback[], DatabaseError>
  readonly createUserFeedback: (
    feedback: Omit<UserFeedback, "id" | "created_at">
  ) => Effect.Effect<UserFeedback, DatabaseError>
  readonly isUnsubscribed: (userId: string) => Effect.Effect<boolean, DatabaseError>
  readonly unsubscribe: (userId: string) => Effect.Effect<void, DatabaseError>
  readonly getUserByEmail: (email: string) => Effect.Effect<Profile | null, DatabaseError>
}

export const SupabaseDb = Context.GenericTag<SupabaseDb>("@app/SupabaseDb")

const createSupabaseClient = (
  config: AppConfig, 
  useServiceRole: boolean = false,
  accessToken?: string
) => {
  // Use process.env as fallback since Effect Config doesn't always load properly
  const supabaseUrl = config.supabaseUrl || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceRoleKey = config.supabaseServiceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  const anonKey = config.supabaseAnonKey || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  
  const key = useServiceRole ? serviceRoleKey : anonKey
  
  const client = createClient(supabaseUrl, key, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  })
  
  return client
}

// Context for passing user's access token to the Effect layer
export interface UserSession {
  readonly accessToken: string
}
export const UserSession = Context.GenericTag<UserSession>("@app/UserSession")

// Factory to create SupabaseDb layer with optional access token
export const SupabaseDbLive = (useServiceRole: boolean = false, accessToken?: string) =>
  Layer.effect(
    SupabaseDb,
    Effect.gen(function* (_) {
      const config = yield* _(AppConfigService)
      
      console.log("SupabaseDbLive: accessToken exists:", !!accessToken, "| useServiceRole:", useServiceRole)
      
      const client = createSupabaseClient(config, useServiceRole, accessToken)

      const getProfile = (userId: string) =>
        Effect.tryPromise({
          try: async () => {
            const { data, error } = await client
              .from("profiles")
              .select("*")
              .eq("id", userId)
              .maybeSingle()

            if (error) {
              console.error("getProfile query error:", error)
              throw error
            }
            if (!data) {
              console.error("getProfile returned null for userId:", userId, "| Using service role:", useServiceRole)
              console.error("Supabase URL:", config.supabaseUrl)
              // Try to get all profiles to see if any exist
              const { data: allProfiles, error: countError } = await client
                .from("profiles")
                .select("id, email")
                .limit(5)
              console.error("Sample profiles in DB:", allProfiles, "Error:", countError)
            }
            return data as Profile | null
          },
          catch: (error) =>
            new DatabaseError({
              message: `Failed to get profile: ${String(error)}`,
              cause: error,
            }),
        })

      const updateProfile = (
        userId: string,
        updates: Partial<Pick<Profile, "topic" | "timezone" | "send_time" | "paused">>
      ) =>
        Effect.tryPromise({
          try: async () => {
            const { data, error } = await client
              .from("profiles")
              .update(updates)
              .eq("id", userId)
              .select()
              .single()

            if (error) throw error
            return data as Profile
          },
          catch: (error) =>
            new DatabaseError({
              message: `Failed to update profile: ${String(error)}`,
              cause: error,
            }),
        })

      const getAllActiveUsers = () =>
        Effect.tryPromise({
          try: async () => {
            // Get all active users (not paused, has topic)
            const { data, error } = await client
              .from("profiles")
              .select("*")
              .eq("paused", false)
              .not("topic", "is", null)

            if (error) throw error
            return (data || []) as Profile[]
          },
          catch: (error) =>
            new DatabaseError({
              message: `Failed to get active users: ${String(error)}`,
              cause: error,
            }),
        })

      const getUsersForScheduling = (currentHour: number, currentMinute: number) =>
        Effect.tryPromise({
          try: async () => {
            // Get all active users (not paused, has topic)
            // Timezone matching will be done in the scheduler
            const { data, error } = await client
              .from("profiles")
              .select("*")
              .eq("paused", false)
              .not("topic", "is", null)

            if (error) throw error
            return (data || []) as Profile[]
          },
          catch: (error) =>
            new DatabaseError({
              message: `Failed to get users for scheduling: ${String(error)}`,
              cause: error,
            }),
        })

      const getSubscription = (userId: string) =>
        Effect.tryPromise({
          try: async () => {
            const { data, error } = await client
              .from("subscriptions")
              .select("*")
              .eq("user_id", userId)
              .single()

            if (error && error.code !== "PGRST116") throw error
            return (data || null) as Subscription | null
          },
          catch: (error) =>
            new DatabaseError({
              message: `Failed to get subscription: ${String(error)}`,
              cause: error,
            }),
        })

      const upsertSubscription = (subscription: Subscription) =>
        Effect.tryPromise({
          try: async () => {
            const { data, error } = await client
              .from("subscriptions")
              .upsert(subscription, { onConflict: "user_id" })
              .select()
              .single()

            if (error) throw error
            return data as Subscription
          },
          catch: (error) =>
            new DatabaseError({
              message: `Failed to upsert subscription: ${String(error)}`,
              cause: error,
            }),
        })

      const getLessons = (userId: string, limit: number = 5) =>
        Effect.tryPromise({
          try: async () => {
            const { data, error } = await client
              .from("lessons")
              .select("*")
              .eq("user_id", userId)
              .order("lesson_date", { ascending: false })
              .limit(limit)

            if (error) throw error
            return (data || []) as Lesson[]
          },
          catch: (error) =>
            new DatabaseError({
              message: `Failed to get lessons: ${String(error)}`,
              cause: error,
            }),
        })

      const getLessonByDate = (userId: string, lessonDate: string) =>
        Effect.tryPromise({
          try: async () => {
            const { data, error } = await client
              .from("lessons")
              .select("*")
              .eq("user_id", userId)
              .eq("lesson_date", lessonDate)
              .single()

            if (error && error.code !== "PGRST116") throw error
            return (data || null) as Lesson | null
          },
          catch: (error) =>
            new DatabaseError({
              message: `Failed to get lesson by date: ${String(error)}`,
              cause: error,
            }),
        })

      const createLesson = (lesson: Omit<Lesson, "id" | "created_at">) =>
        Effect.tryPromise({
          try: async () => {
            const { data, error } = await client
              .from("lessons")
              .insert(lesson)
              .select()
              .single()

            if (error) throw error
            return data as Lesson
          },
          catch: (error) =>
            new DatabaseError({
              message: `Failed to create lesson: ${String(error)}`,
              cause: error,
            }),
        })

      const getUserFeedback = (userId: string, limit: number = 10) =>
        Effect.tryPromise({
          try: async () => {
            const { data, error } = await client
              .from("user_feedback")
              .select("*")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(limit)

            if (error) throw error
            return (data || []) as UserFeedback[]
          },
          catch: (error) =>
            new DatabaseError({
              message: `Failed to get user feedback: ${String(error)}`,
              cause: error,
            }),
        })

      const createUserFeedback = (feedback: Omit<UserFeedback, "id" | "created_at">) =>
        Effect.tryPromise({
          try: async () => {
            const { data, error } = await client
              .from("user_feedback")
              .insert(feedback)
              .select()
              .single()

            if (error) throw error
            return data as UserFeedback
          },
          catch: (error) =>
            new DatabaseError({
              message: `Failed to create user feedback: ${String(error)}`,
              cause: error,
            }),
        })

      const isUnsubscribed = (userId: string) =>
        Effect.tryPromise({
          try: async () => {
            const { data, error } = await client
              .from("unsubscribes")
              .select("user_id")
              .eq("user_id", userId)
              .single()

            if (error && error.code !== "PGRST116") throw error
            return !!data
          },
          catch: (error) =>
            new DatabaseError({
              message: `Failed to check unsubscribe status: ${String(error)}`,
              cause: error,
            }),
        })

      const unsubscribe = (userId: string) =>
        Effect.tryPromise({
          try: async () => {
            const { error } = await client
              .from("unsubscribes")
              .upsert({ user_id: userId, unsubscribed_at: new Date().toISOString() }, { onConflict: "user_id" })

            if (error) throw error
          },
          catch: (error) =>
            new DatabaseError({
              message: `Failed to unsubscribe: ${String(error)}`,
              cause: error,
            }),
        })

      const getUserByEmail = (email: string) =>
        Effect.tryPromise({
          try: async () => {
            const { data, error } = await client
              .from("profiles")
              .select("*")
              .eq("email", email)
              .single()

            if (error && error.code !== "PGRST116") throw error
            return (data || null) as Profile | null
          },
          catch: (error) =>
            new DatabaseError({
              message: `Failed to get user by email: ${String(error)}`,
              cause: error,
            }),
        })

      return SupabaseDb.of({
        getProfile,
        updateProfile,
        getAllActiveUsers,
        getUsersForScheduling,
        getSubscription,
        upsertSubscription,
        getLessons,
        getLessonByDate,
        createLesson,
        getUserFeedback,
        createUserFeedback,
        isUnsubscribed,
        unsubscribe,
        getUserByEmail,
      })
    })
  )

