-- Migration: Add account codes for cross-device syncing
-- Description: Creates tables for account code generation and device sync tracking

-- 1. Create account_codes table
CREATE TABLE IF NOT EXISTS account_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_account_codes_code
  ON account_codes(code);

CREATE INDEX IF NOT EXISTS idx_account_codes_user_id
  ON account_codes(user_id);

CREATE INDEX IF NOT EXISTS idx_account_codes_expires_at
  ON account_codes(expires_at);

-- 3. Enable Row Level Security
ALTER TABLE account_codes ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for account_codes
DROP POLICY IF EXISTS "Users can view their own codes" ON account_codes;
CREATE POLICY "Users can view their own codes"
  ON account_codes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own codes" ON account_codes;
CREATE POLICY "Users can create their own codes"
  ON account_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own codes" ON account_codes;
CREATE POLICY "Users can update their own codes"
  ON account_codes FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own codes" ON account_codes;
CREATE POLICY "Users can delete their own codes"
  ON account_codes FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can cleanup expired codes" ON account_codes;
CREATE POLICY "Service role can cleanup expired codes"
  ON account_codes FOR DELETE
  USING (auth.role() = 'service_role');

-- 5. Create device_sync_history table
CREATE TABLE IF NOT EXISTS device_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_code_id UUID REFERENCES account_codes(id) ON DELETE SET NULL,
  device_id TEXT NOT NULL,
  device_name TEXT,
  platform TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create indexes for device sync history
CREATE INDEX IF NOT EXISTS idx_device_sync_user_id
  ON device_sync_history(user_id);

CREATE INDEX IF NOT EXISTS idx_device_sync_device_id
  ON device_sync_history(device_id);

CREATE INDEX IF NOT EXISTS idx_device_sync_synced_at
  ON device_sync_history(synced_at DESC);

-- 7. Enable Row Level Security for device_sync_history
ALTER TABLE device_sync_history ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for device_sync_history
DROP POLICY IF EXISTS "Users can view their own sync history" ON device_sync_history;
CREATE POLICY "Users can view their own sync history"
  ON device_sync_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own sync history" ON device_sync_history;
CREATE POLICY "Users can insert their own sync history"
  ON device_sync_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own sync history" ON device_sync_history;
CREATE POLICY "Users can delete their own sync history"
  ON device_sync_history FOR DELETE
  USING (auth.uid() = user_id);

-- 9. Create function to auto-delete expired account codes
CREATE OR REPLACE FUNCTION delete_expired_account_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM account_codes WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create updated_at trigger for account_codes
DROP TRIGGER IF EXISTS update_account_codes_updated_at ON account_codes;
CREATE TRIGGER update_account_codes_updated_at
  BEFORE UPDATE ON account_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 11. Grant service role access for edge functions
GRANT SELECT, INSERT, UPDATE, DELETE ON account_codes TO service_role;
GRANT SELECT, INSERT ON device_sync_history TO service_role;

-- Note: To enable automatic cleanup, you would need to set up pg_cron extension
-- and schedule: SELECT cron.schedule('delete-expired-codes', '0 2 * * *', 'SELECT delete_expired_account_codes()');
-- This requires database admin access and is typically done separately
