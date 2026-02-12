import { supabase } from './supabase';
import type { UserPreferences, UpdateUserPreferencesInput } from './types';

/**
 * Get user preferences from the database
 * Creates default preferences if none exist
 */
export async function getUserPreferences(): Promise<UserPreferences | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    // If no preferences exist, create default ones
    if (error.code === 'PGRST116') {
      return await createDefaultPreferences();
    }
    return null;
  }

  return data;
}

/**
 * Create default user preferences
 */
export async function createDefaultPreferences(): Promise<UserPreferences | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .insert({
      user_id: user.id,
      snooze_mode: 'text_input',
      default_snooze_minutes: 10,
      snooze_preset_values: [10, 15, 30],
    })
    .select()
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  updates: UpdateUserPreferencesInput
): Promise<UserPreferences | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Get user's snooze mode preference
 */
export async function getSnoozeMode(): Promise<'text_input' | 'presets'> {
  const preferences = await getUserPreferences();
  return preferences?.snooze_mode ?? 'text_input';
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  prefs: Pick<
    UpdateUserPreferencesInput,
    | 'notification_sound'
    | 'notification_vibration'
    | 'priority_notification_sound'
    | 'default_notify_before_minutes'
  >
): Promise<UserPreferences | null> {
  return await updateUserPreferences(prefs);
}

/**
 * Update appearance preferences
 */
export async function updateAppearancePreferences(
  prefs: Pick<UpdateUserPreferencesInput, 'theme' | 'accent_color' | 'font_size'>
): Promise<UserPreferences | null> {
  return await updateUserPreferences(prefs);
}

/**
 * Update reminder preferences
 */
export async function updateReminderPreferences(
  prefs: Pick<
    UpdateUserPreferencesInput,
    'auto_delete_completed' | 'auto_delete_days' | 'default_recurring_enabled'
  >
): Promise<UserPreferences | null> {
  return await updateUserPreferences(prefs);
}

/**
 * Update advanced preferences
 */
export async function updateAdvancedPreferences(
  prefs: Pick<UpdateUserPreferencesInput, 'debug_mode' | 'analytics_enabled'>
): Promise<UserPreferences | null> {
  return await updateUserPreferences(prefs);
}

/**
 * Reset preferences to default values
 */
export async function resetPreferencesToDefault(): Promise<UserPreferences | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const defaultPrefs: UpdateUserPreferencesInput = {
    snooze_mode: 'text_input',
    default_snooze_minutes: 10,
    snooze_preset_values: [10, 15, 30],
    notification_sound: true,
    notification_vibration: true,
    priority_notification_sound: true,
    default_notify_before_minutes: 0,
    theme: 'system',
    accent_color: '#2F00FF',
    font_size: 'medium',
    auto_delete_completed: false,
    auto_delete_days: 7,
    default_recurring_enabled: false,
    debug_mode: false,
    analytics_enabled: true,
  };

  return await updateUserPreferences(defaultPrefs);
}

/**
 * Export user data as JSON string
 */
export async function exportUserData(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  try {
    // Get user preferences
    const preferences = await getUserPreferences();

    // Get all reminders
    const { data: reminders } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Get recurring rules
    const { data: recurringRules } = await supabase
      .from('recurring_rules')
      .select('*')
      .eq('user_id', user.id);

    // Get device sync history
    const { data: syncHistory } = await supabase
      .from('device_sync_history')
      .select('*')
      .eq('user_id', user.id)
      .order('synced_at', { ascending: false });

    const exportData = {
      export_date: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
      preferences,
      reminders: reminders || [],
      recurring_rules: recurringRules || [],
      device_sync_history: syncHistory || [],
    };

    return JSON.stringify(exportData, null, 2);
  } catch {
    return null;
  }
}
