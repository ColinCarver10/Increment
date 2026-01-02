"use client"

import {
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
  Box,
} from "@mui/material"
import type { Lesson } from "@/lib/types/database"

interface LessonListProps {
  lessons: Lesson[]
}

export function LessonList({ lessons }: LessonListProps) {
  if (lessons.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">
          No lessons yet. Your first lesson will appear here after it's sent!
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Recent Lessons
      </Typography>
      <List>
        {lessons.map((lesson) => (
          <ListItem key={lesson.id} divider>
            <ListItemText
              primary={lesson.subject}
              secondary={new Date(lesson.lesson_date).toLocaleDateString()}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  )
}

