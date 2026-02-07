-- Migration: Extend user preferences
-- Description: Adds comprehensive configuration options for notifications, appearance, reminders, and advanced settings

-- 1. Add notification preference columns
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS notification_sound BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_vibration BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS priority_notification_sound BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_notify_before_minutes INTEGER DEFAULT 0 CHECK (default_notify_before_minutes >= 0);

-- 2. Add appearance preference columns
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#2F00FF',
  ADD COLUMN IF NOT EXISTS font_size TEXT DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large'));

-- 3. Add reminder preference columns
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS auto_delete_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_delete_days INTEGER DEFAULT 7 CHECK (auto_delete_days >= 1 AND auto_delete_days <= 365),
  ADD COLUMN IF NOT EXISTS default_recurring_enabled BOOLEAN DEFAULT false;

-- 4. Add advanced preference columns
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS debug_mode BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS analytics_enabled BOOLEAN DEFAULT true;

-- 5. Create or replace updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Drop and recreate trigger to ensure it's properly set up
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Create indexes for commonly queried preference fields
CREATE INDEX IF NOT EXISTS idx_user_preferences_theme ON user_preferences(theme);
CREATE INDEX IF NOT EXISTS idx_user_preferences_debug_mode ON user_preferences(debug_mode) WHERE debug_mode = true;

-- 8. Grant service role access for edge functions
GRANT UPDATE ON user_preferences TO service_role;
