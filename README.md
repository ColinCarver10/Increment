# Daily Microlearning Email MVP

A complete Next.js application for sending personalized daily microlearning lessons via email. Users choose a topic and receive daily lessons with new information, review content, and exercises.

## Tech Stack

- **Next.js 14+** (App Router)
- **TypeScript**
- **Material UI (MUI)** for UI components
- **Supabase** for database and authentication
- **Effect TS** for service layer architecture
- **Resend** for email delivery
- **OpenAI API** for lesson generation
- **Stripe** for subscription management
- **Vercel** for deployment

## Features

- User authentication via Supabase magic links
- Custom topic selection
- Configurable send time and timezone
- Free trial: 3 lessons, then subscription required
- Daily lesson generation with OpenAI
- Email delivery via Resend
- Stripe subscription management
- Admin panel for user management
- Pause/unsubscribe functionality

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- Supabase account
- Resend account
- OpenAI API key
- Stripe account
- Vercel account (for deployment)

### 2. Clone and Install

```bash
npm install
```

### 3. Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor and run the migration file:
   ```bash
   # Copy contents of migrations/001_initial_schema.sql
   # Paste into Supabase SQL Editor and run
   ```
3. Get your project credentials:
   - Go to Project Settings > API
   - Copy `Project URL` (SUPABASE_URL)
   - Copy `anon public` key (SUPABASE_ANON_KEY)
   - Copy `service_role` key (SUPABASE_SERVICE_ROLE_KEY) - keep this secret!

### 4. Resend Setup

1. Sign up at https://resend.com
2. Verify your domain (or use Resend's test domain)
3. Get your API key from the dashboard
4. Set up your `EMAIL_FROM` address (e.g., `Learn Bot <learn@yourdomain.com>`)

### 5. Stripe Setup

1. Create a Stripe account at https://stripe.com
2. Create a product with two prices:
   - Monthly subscription price
   - Yearly subscription price
3. Copy the Price IDs (start with `price_...`)
4. Set up a webhook endpoint:
   - URL: `https://your-vercel-domain.vercel.app/api/webhooks/stripe`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
5. Copy the webhook signing secret (starts with `whsec_...`)

### 6. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Public Supabase (for client-side)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Resend
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=Learn Bot <learn@yourdomain.com>

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_PRICE_ID_MONTHLY=price_your_monthly_price_id
STRIPE_PRICE_ID_YEARLY=price_your_yearly_price_id
STRIPE_BILLING_PORTAL_CONFIGURATION_ID=your_billing_portal_configuration_id

# App
APP_URL=http://localhost:3000

# Security
CRON_SECRET=your_random_cron_secret_here
UNSUBSCRIBE_SIGNING_SECRET=your_random_unsubscribe_secret_here

# Admin
ADMIN_EMAILS=admin@example.com
```

**Important**: Generate secure random strings for `CRON_SECRET` and `UNSUBSCRIBE_SIGNING_SECRET`. You can use:
```bash
openssl rand -hex 32
```

### 7. Local Development

```bash
npm run dev
```

Visit http://localhost:3000

### 8. Vercel Deployment

1. Push your code to GitHub
2. Import project in Vercel
3. Add all environment variables in Vercel dashboard
4. Update `APP_URL` to your Vercel domain
5. Deploy

### 9. Vercel Cron Setup

Create a `vercel.json` file in the root:

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

This runs the cron job every 5 minutes. Vercel will automatically call `/api/cron` with an `Authorization: Bearer <CRON_SECRET>` header.

**Note**: For Vercel Cron to work, you need to:
1. Deploy to Vercel
2. Go to your project settings > Cron Jobs
3. Add the cron job manually if it doesn't appear automatically
4. Set the schedule to `*/5 * * * *` (every 5 minutes)
5. Set the endpoint to `/api/cron`
6. Add the Authorization header: `Bearer <your-cron-secret>`

## Project Structure

```
/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth routes
│   ├── (app)/             # Protected app routes
│   ├── api/               # API routes
│   └── page.tsx           # Landing page
├── lib/
│   ├── effect/            # Effect TS services
│   ├── supabase/         # Supabase clients
│   ├── utils/             # Utility functions
│   └── types/             # TypeScript types
├── components/            # React components
│   ├── ui/               # UI components
│   └── email/            # Email templates
├── migrations/           # Database migrations
└── public/              # Static assets
```

## Key Features Implementation

### Effect TS Service Layer

All backend logic is organized into Effect services:
- `Config`: Environment variable management
- `SupabaseDb`: Database operations
- `OpenAI`: Lesson generation
- `ResendEmail`: Email sending
- `StripeBilling`: Subscription management
- `LessonGenerator`: Orchestrates lesson creation
- `Scheduler`: Cron job logic

### Database Schema

- `profiles`: User profiles with topic, timezone, send time
- `subscriptions`: Stripe subscription data
- `lessons`: Generated lessons
- `user_feedback`: User feedback on lesson difficulty
- `unsubscribes`: Unsubscribe tracking

RLS (Row Level Security) is enabled:
- Users can only access their own data
- Service role key bypasses RLS for cron/admin operations

### Email Sending

- Uses Resend API
- HTML and plain text versions
- Includes List-Unsubscribe headers
- Unsubscribe links with signed tokens

### Lesson Generation

- Uses OpenAI GPT-4o-mini
- Generates JSON with structured lesson content
- Validates response with Zod
- Retries on invalid JSON
- Includes review based on previous lessons

### Scheduling

- Vercel Cron runs every 5 minutes
- Checks users whose local time matches send time
- Ensures idempotency (one lesson per user per day)
- Respects trial limits and subscription status

## Testing

### Manual Testing Checklist

1. **Authentication**
   - [ ] Sign up with email
   - [ ] Receive magic link
   - [ ] Sign in successfully

2. **Profile Setup**
   - [ ] Set learning topic
   - [ ] Configure timezone
   - [ ] Set send time
   - [ ] Toggle pause

3. **Test Email**
   - [ ] Send test email
   - [ ] Verify email received
   - [ ] Check email formatting

4. **Billing**
   - [ ] View trial status
   - [ ] Create checkout session
   - [ ] Complete subscription
   - [ ] Access billing portal

5. **Cron Job**
   - [ ] Verify cron endpoint accessible
   - [ ] Check user matching logic
   - [ ] Verify lesson generation
   - [ ] Confirm email delivery

6. **Admin**
   - [ ] Access admin panel (admin email only)
   - [ ] Lookup user by email
   - [ ] Resend lesson

7. **Unsubscribe**
   - [ ] Click unsubscribe link
   - [ ] Verify unsubscribe confirmation
   - [ ] Confirm no more emails sent

## Troubleshooting

### Emails not sending
- Check Resend API key
- Verify domain is verified in Resend
- Check email logs in Resend dashboard

### Cron not running
- Verify CRON_SECRET matches in Vercel
- Check Vercel cron job configuration
- Review API route logs

### Lessons not generating
- Verify OpenAI API key
- Check API usage/quota
- Review error logs

### Database errors
- Verify Supabase credentials
- Check RLS policies
- Review migration was applied correctly

## Security Notes

- Never commit `.env.local` or `.env` files
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret
- Use strong secrets for `CRON_SECRET` and `UNSUBSCRIBE_SIGNING_SECRET`
- Admin access is controlled via `ADMIN_EMAILS` env var
- RLS policies protect user data

## License

MIT

