"use client"

import { useState, useEffect } from "react"
import {
  Container,
  Typography,
  Button,
  Paper,
  Stack,
  Box,
  Divider,
  Alert,
} from "@mui/material"
import { createClient } from "@/lib/supabase/client"
import { TopicForm } from "@/components/ui/TopicForm"
import { ScheduleForm } from "@/components/ui/ScheduleForm"
import { PauseToggle } from "@/components/ui/PauseToggle"
import { LessonList } from "@/components/ui/LessonList"
import { getLessons } from "@/app/api/actions/lessons"
import type { Profile, Lesson } from "@/lib/types/database"

export default function AppPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [testEmailLoading, setTestEmailLoading] = useState(false)
  const [testEmailMessage, setTestEmailMessage] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      setProfile(profileData)

      const { lessons: lessonsData } = await getLessons(5)
      setLessons(lessonsData || [])
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleTestEmail = async () => {
    setTestEmailLoading(true)
    setTestEmailMessage(null)

    try {
      const response = await fetch("/api/test-email", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        setTestEmailMessage("Test email sent successfully! Check your inbox.")
        loadData() // Refresh lessons
      } else {
        setTestEmailMessage(data.error || "Failed to send test email")
      }
    } catch (error) {
      setTestEmailMessage("An error occurred while sending the test email")
    } finally {
      setTestEmailLoading(false)
    }
  }

  if (loading) {
    return (
      <Container>
        <Typography>Loading...</Typography>
      </Container>
    )
  }

  if (!profile) {
    return (
      <Container>
        <Typography>Profile not found</Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="md">
      <Stack spacing={4}>
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Learning Topic
          </Typography>
          <TopicForm initialTopic={profile.topic} onUpdate={loadData} />
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Schedule
          </Typography>
          <ScheduleForm
            initialTimezone={profile.timezone}
            initialSendTime={profile.send_time}
            onUpdate={loadData}
          />
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Email Settings
          </Typography>
          <PauseToggle initialPaused={profile.paused} onUpdate={loadData} />
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h6">Test Email</Typography>
            <Typography variant="body2" color="text.secondary">
              Send a test lesson email right now to verify everything is working.
            </Typography>
            {testEmailMessage && (
              <Alert severity={testEmailMessage.includes("success") ? "success" : "error"}>
                {testEmailMessage}
              </Alert>
            )}
            <Button
              variant="outlined"
              onClick={handleTestEmail}
              disabled={testEmailLoading || !profile.topic}
            >
              {testEmailLoading ? "Sending..." : "Send Test Email Now"}
            </Button>
            {!profile.topic && (
              <Typography variant="body2" color="error">
                Please set a topic first
              </Typography>
            )}
          </Stack>
        </Paper>

        <Divider />

        <LessonList lessons={lessons} />
      </Stack>
    </Container>
  )
}

