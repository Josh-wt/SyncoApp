-- Migration: Add user preferences support
-- Description: Creates user_preferences table for app settings

-- 1. Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  snooze_mode TEXT DEFAULT 'text_input' CHECK (snooze_mode IN ('text_input', 'presets')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- 4. Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id
  ON user_preferences (user_id);

-- 5. Grant service role access for edge functions
GRANT SELECT ON user_preferences TO service_role;
