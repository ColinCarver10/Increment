"use client"

import { useState } from "react"
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Paper,
  Stack,
} from "@mui/material"
import { useRouter } from "next/navigation"

export default function LandingPage() {
  const [email, setEmail] = useState("")
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      router.push(`/login?email=${encodeURIComponent(email)}`)
    }
  }

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          py: 8,
        }}
      >
        <Paper elevation={3} sx={{ p: 6, width: "100%", maxWidth: 600 }}>
          <Stack spacing={4}>
            <Box textAlign="center">
              <Typography variant="h3" component="h1" gutterBottom>
                Daily Microlearning
              </Typography>
              <Typography variant="h6" color="text.secondary" paragraph>
                Learn something new every day
              </Typography>
            </Box>

            <Typography variant="body1" color="text.secondary">
              Choose your topic and receive a personalized daily lesson with new
              information, review of previous concepts, and practical exercises.
              Start your learning journey today!
            </Typography>

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  sx={{ py: 1.5 }}
                >
                  Get Started
                </Button>
              </Stack>
            </Box>

            <Typography variant="body2" color="text.secondary" textAlign="center">
              Free trial: First 3 lessons are free, then subscription required
            </Typography>
          </Stack>
        </Paper>
      </Box>
    </Container>
  )
}

