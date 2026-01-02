"use client"

import { useState, useEffect } from "react"
import {
  Container,
  Typography,
  Button,
  Paper,
  Stack,
  Box,
  Alert,
} from "@mui/material"
import { createClient } from "@/lib/supabase/client"
import type { Profile, Subscription, Lesson } from "@/lib/types/database"

export default function BillingPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
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

      const { data: subscriptionData } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .single()

      setSubscription(subscriptionData || null)

      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      setLessons(lessonsData || [])
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckout = async (priceId: string) => {
    setCheckoutLoading(true)
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || "Failed to create checkout session")
      }
    } catch (error) {
      alert("An error occurred")
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleBillingPortal = async () => {
    try {
      const response = await fetch("/api/billing-portal", {
        method: "POST",
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || "Failed to open billing portal")
      }
    } catch (error) {
      alert("An error occurred")
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

  const lessonCount = lessons.length
  const isTrialActive =
    lessonCount < 3 ||
    (profile.created_at &&
      (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24) <= 3)
  const hasActiveSubscription =
    subscription?.status === "active" || subscription?.status === "trialing"

  return (
    <Container maxWidth="md">
      <Stack spacing={4}>
        <Typography variant="h4" component="h1">
          Billing
        </Typography>

        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h6">Trial Status</Typography>
            {isTrialActive ? (
              <Alert severity="info">
                You have used {lessonCount} of 3 free trial lessons
              </Alert>
            ) : (
              <Alert severity="warning">
                Your free trial has ended. Subscribe to continue receiving lessons.
              </Alert>
            )}
          </Stack>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h6">Subscription</Typography>
            {hasActiveSubscription ? (
              <>
                <Alert severity="success">
                  Your subscription is active. Status: {subscription?.status}
                </Alert>
                {subscription?.current_period_end && (
                  <Typography variant="body2" color="text.secondary">
                    Current period ends:{" "}
                    {new Date(subscription.current_period_end).toLocaleDateString()}
                  </Typography>
                )}
                <Button
                  variant="outlined"
                  onClick={handleBillingPortal}
                  fullWidth
                >
                  Manage Billing
                </Button>
              </>
            ) : (
              <>
                <Alert severity="info">
                  No active subscription. Choose a plan to continue learning.
                </Alert>
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    onClick={async () => {
                      const res = await fetch("/api/checkout", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ priceType: "monthly" }),
                      })
                      const data = await res.json()
                      if (data.url) window.location.href = data.url
                    }}
                    disabled={checkoutLoading}
                    fullWidth
                  >
                    Subscribe Monthly
                  </Button>
                  <Button
                    variant="contained"
                    onClick={async () => {
                      const res = await fetch("/api/checkout", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ priceType: "yearly" }),
                      })
                      const data = await res.json()
                      if (data.url) window.location.href = data.url
                    }}
                    disabled={checkoutLoading}
                    fullWidth
                  >
                    Subscribe Yearly
                  </Button>
                </Stack>
              </>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  )
}

