import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()
  
  const client = createSupabaseClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
  
  // Try to find and set the session from cookies
  // Supabase stores cookies with pattern: sb-<project-ref>-auth-token
  const allCookies = cookieStore.getAll()
  
  // Look for Supabase auth cookie (format: sb-<project-ref>-auth-token)
  const supabaseUrl = process.env.SUPABASE_URL || ""
  const projectRef = supabaseUrl.split("//")[1]?.split(".")[0] || ""
  const authCookieName = `sb-${projectRef}-auth-token`
  let authCookie = cookieStore.get(authCookieName)
  
  // If not found with project ref, try to find any cookie with "auth-token" in the name
  if (!authCookie) {
    authCookie = allCookies.find((cookie) => 
      cookie.name.includes("auth-token") || cookie.name.startsWith("sb-")
    )
  }
  
  if (authCookie) {
    try {
      // The cookie value is URL-encoded JSON containing the session
      const decoded = decodeURIComponent(authCookie.value)
      const sessionData = JSON.parse(decoded)
      
      if (sessionData?.access_token && sessionData?.refresh_token) {
        const { error } = await client.auth.setSession({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
        })
        if (error) {
          console.error("Failed to set session:", error)
        }
      }
    } catch (error) {
      // If parsing fails, the cookie might be in a different format
      // Try to use getUser() which might work if cookies are set properly
      // We'll let getUser() handle it in the server action
    }
  }
  
  return client
}

export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

