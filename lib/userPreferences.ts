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
    console.error('Error fetching user preferences:', error);
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
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating default preferences:', error);
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
    console.error('Error updating user preferences:', error);
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
