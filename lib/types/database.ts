export interface Profile {
  id: string
  email: string
  timezone: string
  send_time: string
  topic: string | null
  paused: boolean
  created_at: string
}

export interface Subscription {
  user_id: string
  stripe_customer_id: string
  stripe_subscription_id: string
  status: string
  current_period_end: string | null
  created_at: string
  updated_at: string
}

export interface Lesson {
  id: string
  user_id: string
  lesson_date: string
  subject: string
  html_body: string
  text_body: string
  model: string
  tokens_in: number | null
  tokens_out: number | null
  created_at: string
}

export interface UserFeedback {
  id: string
  user_id: string
  lesson_id: string
  difficulty: "easy" | "ok" | "hard"
  created_at: string
}

export interface Unsubscribe {
  user_id: string
  unsubscribed_at: string
}

