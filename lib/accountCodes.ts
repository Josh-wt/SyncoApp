import { supabase } from './supabase';
import type { AccountCode, DeviceSyncRecord, DeviceInfo } from './types';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

const ACCOUNT_CODE_LENGTH = 6;
const ACCOUNT_CODE_EXPIRY_HOURS = 24;

/**
 * Generate a random alphanumeric code
 */
function generateRandomCode(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Get current device information
 */
async function getDeviceInfo(): Promise<DeviceInfo> {
  const deviceId = Constants.sessionId || Constants.installationId || 'unknown';
  const deviceName = Device.deviceName || Device.modelName || 'Unknown Device';
  const platform = Device.osName || 'unknown';

  return {
    device_id: deviceId,
    device_name: deviceName,
    platform,
  };
}

/**
 * Generate a new account code for the current user
 * @returns The generated code string
 */
export async function generateAccountCode(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('No user logged in');
    return null;
  }

  try {
    // Delete any existing codes for this user
    await supabase
      .from('account_codes')
      .delete()
      .eq('user_id', user.id);

    // Generate a unique code
    let code = '';
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      code = generateRandomCode(ACCOUNT_CODE_LENGTH);

      // Check if code already exists
      const { data: existing } = await supabase
        .from('account_codes')
        .select('id')
        .eq('code', code)
        .single();

      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      console.error('Failed to generate unique code after maximum attempts');
      return null;
    }

    // Calculate expiry time (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ACCOUNT_CODE_EXPIRY_HOURS);

    // Insert the new code
    const { error } = await supabase
      .from('account_codes')
      .insert({
        user_id: user.id,
        code,
        expires_at: expiresAt.toISOString(),
      });

    if (error) {
      console.error('Error inserting account code:', error);
      return null;
    }

    return code;
  } catch (error) {
    console.error('Error generating account code:', error);
    return null;
  }
}

/**
 * Get the current active account code for the user
 * @returns The active account code or null if none exists or expired
 */
export async function getActiveAccountCode(): Promise<AccountCode | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('account_codes')
      .select('*')
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No code found
        return null;
      }
      console.error('Error fetching active account code:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting active account code:', error);
    return null;
  }
}

/**
 * Validate an account code and sync the current device with that account
 * @param code The account code to validate
 * @returns True if successful, false otherwise
 */
export async function validateAndSyncFromCode(code: string): Promise<boolean> {
  try {
    const deviceInfo = await getDeviceInfo();

    // Call the edge function to validate the code
    const { data, error } = await supabase.functions.invoke('validate-account-code', {
      body: {
        code: code.toUpperCase(),
        deviceId: deviceInfo.device_id,
        deviceName: deviceInfo.device_name,
        platform: deviceInfo.platform,
      },
    });

    if (error) {
      console.error('Error validating account code:', error);
      return false;
    }

    if (data?.error) {
      console.error('Code validation failed:', data.error);
      return false;
    }

    if (data?.userId) {
      // Code is valid, sign in the user if not already signed in
      // Note: In practice, you might want to handle authentication differently
      // For now, we just return success
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error in validateAndSyncFromCode:', error);
    return false;
  }
}

/**
 * Get device sync history for the current user
 * @returns Array of device sync records
 */
export async function getDeviceSyncHistory(): Promise<DeviceSyncRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('device_sync_history')
      .select('*')
      .eq('user_id', user.id)
      .order('synced_at', { ascending: false });

    if (error) {
      console.error('Error fetching device sync history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting device sync history:', error);
    return [];
  }
}

/**
 * Remove a device from sync history
 * @param deviceId The device ID to remove
 * @returns True if successful, false otherwise
 */
export async function removeDevice(deviceId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('device_sync_history')
      .delete()
      .eq('user_id', user.id)
      .eq('device_id', deviceId);

    if (error) {
      console.error('Error removing device:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in removeDevice:', error);
    return false;
  }
}

/**
 * Get a list of unique devices from sync history
 * @returns Array of unique device info
 */
export async function getUniqueDevices(): Promise<DeviceInfo[]> {
  const history = await getDeviceSyncHistory();

  // Group by device_id and get the most recent entry for each device
  const deviceMap = new Map<string, DeviceSyncRecord>();

  for (const record of history) {
    const existing = deviceMap.get(record.device_id);
    if (!existing || new Date(record.synced_at) > new Date(existing.synced_at)) {
      deviceMap.set(record.device_id, record);
    }
  }

  return Array.from(deviceMap.values()).map((record) => ({
    device_id: record.device_id,
    device_name: record.device_name || undefined,
    platform: record.platform || undefined,
  }));
}
