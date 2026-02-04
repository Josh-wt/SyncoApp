-- Migration: Add device notification schedules
-- Description: Tracks device-local scheduled notifications for reminders

CREATE TABLE IF NOT EXISTS notification_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reminder_id UUID REFERENCES reminders(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  notification_id TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  reminder_updated_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, reminder_id, device_id)
);

ALTER TABLE notification_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification schedules"
  ON notification_schedules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification schedules"
  ON notification_schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification schedules"
  ON notification_schedules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification schedules"
  ON notification_schedules FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notification_schedules_user_device
  ON notification_schedules (user_id, device_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON notification_schedules TO authenticated;
