-- Create reminder_actions table for quick actions (call, link, email, etc.)
CREATE TABLE IF NOT EXISTS reminder_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('call', 'link', 'location', 'email', 'note', 'assign', 'photo', 'voice', 'subtasks')),
  action_value JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reminder_actions_reminder_id ON reminder_actions(reminder_id);
CREATE INDEX IF NOT EXISTS idx_reminder_actions_type ON reminder_actions(action_type);

-- Enable RLS
ALTER TABLE reminder_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reminder_actions
CREATE POLICY "Users can view their own reminder actions"
  ON reminder_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reminders
      WHERE reminders.id = reminder_actions.reminder_id
      AND reminders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own reminder actions"
  ON reminder_actions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reminders
      WHERE reminders.id = reminder_actions.reminder_id
      AND reminders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own reminder actions"
  ON reminder_actions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM reminders
      WHERE reminders.id = reminder_actions.reminder_id
      AND reminders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own reminder actions"
  ON reminder_actions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM reminders
      WHERE reminders.id = reminder_actions.reminder_id
      AND reminders.user_id = auth.uid()
    )
  );

-- Create reminder_attachments table for files, photos, links
CREATE TABLE IF NOT EXISTS reminder_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  attachment_type TEXT NOT NULL CHECK (attachment_type IN ('file', 'photo', 'link', 'voice')),
  storage_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reminder_attachments_reminder_id ON reminder_attachments(reminder_id);

-- Enable RLS
ALTER TABLE reminder_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reminder_attachments
CREATE POLICY "Users can view their own reminder attachments"
  ON reminder_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reminders
      WHERE reminders.id = reminder_attachments.reminder_id
      AND reminders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own reminder attachments"
  ON reminder_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reminders
      WHERE reminders.id = reminder_attachments.reminder_id
      AND reminders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own reminder attachments"
  ON reminder_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM reminders
      WHERE reminders.id = reminder_attachments.reminder_id
      AND reminders.user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_reminder_actions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reminder_actions_updated_at
  BEFORE UPDATE ON reminder_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_reminder_actions_updated_at();
