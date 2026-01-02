"use client"

import { useState } from "react"
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Box,
  Stack,
} from "@mui/material"
import { updateProfile } from "@/app/api/actions/profile"
import { COMMON_TIMEZONES } from "@/lib/utils/timezone"

interface ScheduleFormProps {
  initialTimezone: string
  initialSendTime: string
  onUpdate?: () => void
}

export function ScheduleForm({
  initialTimezone,
  initialSendTime,
  onUpdate,
}: ScheduleFormProps) {
  const [timezone, setTimezone] = useState(initialTimezone)
  const [sendTime, setSendTime] = useState(initialSendTime)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await updateProfile({ timezone, send_time: sendTime })
      onUpdate?.()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <FormControl fullWidth>
          <InputLabel>Timezone</InputLabel>
          <Select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            label="Timezone"
          >
            {COMMON_TIMEZONES.map((tz) => (
              <MenuItem key={tz.value} value={tz.value}>
                {tz.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Send Time"
          type="time"
          value={sendTime}
          onChange={(e) => setSendTime(e.target.value)}
          InputLabelProps={{ shrink: true }}
          helperText="What time should we send your daily lesson? (in your timezone)"
        />

        <Button type="submit" variant="contained" disabled={loading}>
          {loading ? "Saving..." : "Save Schedule"}
        </Button>
      </Stack>
    </Box>
  )
}

