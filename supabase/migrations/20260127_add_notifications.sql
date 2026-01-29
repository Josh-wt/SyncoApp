-- Migration: Add push notifications support
-- Description: Creates push_tokens table and adds notification columns to reminders

-- 1. Create push_tokens table for storing Expo push tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  device_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token)
);

-- 2. Enable Row Level Security on push_tokens
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for push_tokens
CREATE POLICY "Users can view own push tokens"
  ON push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens"
  ON push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens"
  ON push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Add notification columns to reminders table
ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS notify_before_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS priority_notified_at TIMESTAMPTZ;

-- 5. Create index for efficient notification queries
CREATE INDEX IF NOT EXISTS idx_reminders_notification_status
  ON reminders (scheduled_time, notified_at)
  WHERE notified_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reminders_priority_notification
  ON reminders (scheduled_time, priority_notified_at)
  WHERE is_priority = true AND priority_notified_at IS NULL;

-- 6. Create index for push token lookups
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id
  ON push_tokens (user_id);

-- 7. Grant service role access for edge functions
GRANT SELECT ON push_tokens TO service_role;
GRANT SELECT, UPDATE ON reminders TO service_role;

-- 8. Optional: Set up pg_cron job to call the edge function every minute
-- Note: This requires the pg_cron extension to be enabled in your Supabase project
-- Run this separately in the SQL editor after enabling pg_cron:
--
-- SELECT cron.schedule(
--   'send-reminder-notifications',
--   '* * * * *',
--   $$
--   SELECT net.http_post(
--     url := '<YOUR_SUPABASE_URL>/functions/v1/send-reminder-notifications',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>',
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
