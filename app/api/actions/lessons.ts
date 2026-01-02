"use server"

import { createClient } from "@/lib/supabase/server"

export async function getLessons(limit: number = 5) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated", lessons: [] }
  }

  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("user_id", user.id)
    .order("lesson_date", { ascending: false })
    .limit(limit)

  if (error) {
    return { error: error.message, lessons: [] }
  }

  return { lessons: data || [] }
}

