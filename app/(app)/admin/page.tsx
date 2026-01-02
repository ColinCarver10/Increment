"use client"

import { useState, useEffect } from "react"
import {
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Stack,
  Box,
  Alert,
  List,
  ListItem,
  ListItemText,
} from "@mui/material"
import { createClient } from "@/lib/supabase/client"
import type { Profile, Subscription, Lesson } from "@/lib/types/database"

export default function AdminPage() {
  const [email, setEmail] = useState("")
  const [user, setUser] = useState<{
    profile: Profile | null
    subscription: Subscription | null
    lessons: Lesson[]
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Check if user is admin
    const checkAdmin = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        setMessage("Not authenticated")
        return
      }

      // In a real app, you'd check ADMIN_EMAILS server-side
      // For MVP, we'll do a simple client-side check
      const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(",") || []
      if (!adminEmails.includes(currentUser.email || "")) {
        setMessage("Access denied. Admin only.")
      }
    }

    checkAdmin()
  }, [supabase])

  const handleLookup = async () => {
    setLoading(true)
    setMessage(null)
    setUser(null)

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email)
        .single()

      if (!profile) {
        setMessage("User not found")
        setLoading(false)
        return
      }

      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", profile.id)
        .single()

      const { data: lessons } = await supabase
        .from("lessons")
        .select("*")
        .eq("user_id", profile.id)
        .order("lesson_date", { ascending: false })
        .limit(10)

      setUser({
        profile,
        subscription: subscription || null,
        lessons: lessons || [],
      })
    } catch (error) {
      setMessage("Error looking up user")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!user?.profile) return

    setResendLoading(true)
    setMessage(null)

    try {
      const response = await fetch("/api/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.profile.id }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage("Lesson resent successfully")
        handleLookup() // Refresh data
      } else {
        setMessage(data.error || "Failed to resend lesson")
      }
    } catch (error) {
      setMessage("An error occurred")
    } finally {
      setResendLoading(false)
    }
  }

  if (message && message.includes("Access denied")) {
    return (
      <Container>
        <Alert severity="error">{message}</Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="md">
      <Stack spacing={4}>
        <Typography variant="h4" component="h1">
          Admin Panel
        </Typography>

        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h6">Lookup User</Typography>
            <Box component="form" onSubmit={(e) => { e.preventDefault(); handleLookup(); }}>
              <Stack direction="row" spacing={2}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  sx={{ minWidth: 120 }}
                >
                  {loading ? "Loading..." : "Lookup"}
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Paper>

        {message && (
          <Alert severity={message.includes("success") ? "success" : "error"}>
            {message}
          </Alert>
        )}

        {user && (
          <>
            <Paper sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h6">User Profile</Typography>
                <Typography>
                  <strong>Email:</strong> {user.profile?.email}
                </Typography>
                <Typography>
                  <strong>Topic:</strong> {user.profile?.topic || "Not set"}
                </Typography>
                <Typography>
                  <strong>Timezone:</strong> {user.profile?.timezone}
                </Typography>
                <Typography>
                  <strong>Send Time:</strong> {user.profile?.send_time}
                </Typography>
                <Typography>
                  <strong>Paused:</strong> {user.profile?.paused ? "Yes" : "No"}
                </Typography>
              </Stack>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h6">Subscription</Typography>
                {user.subscription ? (
                  <>
                    <Typography>
                      <strong>Status:</strong> {user.subscription.status}
                    </Typography>
                    <Typography>
                      <strong>Customer ID:</strong> {user.subscription.stripe_customer_id}
                    </Typography>
                  </>
                ) : (
                  <Typography>No active subscription</Typography>
                )}
              </Stack>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h6">Recent Lessons</Typography>
                {user.lessons.length > 0 ? (
                  <List>
                    {user.lessons.map((lesson) => (
                      <ListItem key={lesson.id} divider>
                        <ListItemText
                          primary={lesson.subject}
                          secondary={new Date(lesson.lesson_date).toLocaleDateString()}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography>No lessons yet</Typography>
                )}
              </Stack>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h6">Actions</Typography>
                <Button
                  variant="contained"
                  onClick={handleResend}
                  disabled={resendLoading}
                >
                  {resendLoading ? "Sending..." : "Resend Today's Lesson"}
                </Button>
              </Stack>
            </Paper>
          </>
        )}
      </Stack>
    </Container>
  )
}

