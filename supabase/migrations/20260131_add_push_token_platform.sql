-- Migration: Add platform column to push_tokens
-- Description: Store device platform to send platform-specific notifications

ALTER TABLE push_tokens
  ADD COLUMN IF NOT EXISTS platform TEXT;

CREATE INDEX IF NOT EXISTS idx_push_tokens_platform
  ON push_tokens (platform);
