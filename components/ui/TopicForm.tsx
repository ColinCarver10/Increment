"use client"

import { useState } from "react"
import { TextField, Button, Box, Alert } from "@mui/material"
import { updateProfile } from "@/app/api/actions/profile"

interface TopicFormProps {
  initialTopic: string | null
  onUpdate?: () => void
}

export function TopicForm({ initialTopic, onUpdate }: TopicFormProps) {
  const [topic, setTopic] = useState(initialTopic || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const result = await updateProfile({ topic: topic || null })
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        onUpdate?.()
        // Clear success message after 2 seconds
        setTimeout(() => setSuccess(false), 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save topic")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
          Topic saved successfully!
        </Alert>
      )}
      <TextField
        fullWidth
        label="Learning Topic"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="e.g., Python programming, Spanish, Machine Learning"
        helperText="What would you like to learn about?"
        sx={{ mb: 2 }}
      />
      <Button type="submit" variant="contained" disabled={loading}>
        {loading ? "Saving..." : "Save Topic"}
      </Button>
    </Box>
  )
}

