"use client"

import { useState } from "react"
import { Switch, FormControlLabel, Box } from "@mui/material"
import { updateProfile } from "@/app/api/actions/profile"

interface PauseToggleProps {
  initialPaused: boolean
  onUpdate?: () => void
}

export function PauseToggle({ initialPaused, onUpdate }: PauseToggleProps) {
  const [paused, setPaused] = useState(initialPaused)
  const [loading, setLoading] = useState(false)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked
    setPaused(newValue)
    setLoading(true)
    try {
      await updateProfile({ paused: newValue })
      onUpdate?.()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <FormControlLabel
        control={
          <Switch checked={paused} onChange={handleChange} disabled={loading} />
        }
        label={paused ? "Emails Paused" : "Emails Active"}
      />
    </Box>
  )
}

