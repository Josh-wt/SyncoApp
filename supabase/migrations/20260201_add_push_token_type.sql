-- Migration: Add token_type column to push_tokens
-- Description: Store whether a push token is from Expo or FCM

ALTER TABLE push_tokens
  ADD COLUMN IF NOT EXISTS token_type TEXT;

CREATE INDEX IF NOT EXISTS idx_push_tokens_token_type
  ON push_tokens (token_type);
