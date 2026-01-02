import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export function createClient() {
  const client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Sync session to cookies for server actions
  if (typeof window !== "undefined") {
    // Listen for auth state changes and sync to cookies
    client.auth.onAuthStateChange((event, session) => {
      if (session) {
        // Set cookie with session data for server actions
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
        const projectRef = supabaseUrl.split("//")[1]?.split(".")[0] || ""
        const cookieName = `sb-${projectRef}-auth-token`
        const cookieValue = encodeURIComponent(
          JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at,
          })
        )
        // Set cookie with 7 day expiration
        document.cookie = `${cookieName}=${cookieValue}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`
      } else {
        // Clear cookie on sign out
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
        const projectRef = supabaseUrl.split("//")[1]?.split(".")[0] || ""
        const cookieName = `sb-${projectRef}-auth-token`
        document.cookie = `${cookieName}=; path=/; max-age=0`
      }
    })

    // Also sync current session if it exists
    client.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
        const projectRef = supabaseUrl.split("//")[1]?.split(".")[0] || ""
        const cookieName = `sb-${projectRef}-auth-token`
        const cookieValue = encodeURIComponent(
          JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at,
          })
        )
        document.cookie = `${cookieName}=${cookieValue}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`
      }
    })
  }

  return client
}

