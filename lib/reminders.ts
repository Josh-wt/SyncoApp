import { supabase } from './supabase';
import { CreateReminderInput, CreateRecurringRuleInput, Reminder, ReminderStatus, RecurringRule, UpdateReminderInput } from './types';

export async function getReminders(): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .order('scheduled_time', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getAllFutureReminders(): Promise<Reminder[]> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .gte('scheduled_time', startOfDay)
    .order('scheduled_time', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getNotifiedReminders(): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .not('notified_at', 'is', null)
    .order('notified_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getTodayReminders(): Promise<Reminder[]> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .gte('scheduled_time', startOfDay)
    .lt('scheduled_time', endOfDay)
    .order('scheduled_time', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getPriorityCount(): Promise<number> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const { count, error } = await supabase
    .from('reminders')
    .select('*', { count: 'exact', head: true })
    .eq('is_priority', true)
    .gte('scheduled_time', startOfDay)
    .lt('scheduled_time', endOfDay);

  if (error) throw error;
  return count ?? 0;
}

export async function getUpcomingCount(): Promise<number> {
  const today = new Date();
  const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7).toISOString();

  const { count, error } = await supabase
    .from('reminders')
    .select('*', { count: 'exact', head: true })
    .gte('scheduled_time', startOfWeek)
    .lt('scheduled_time', endOfWeek);

  if (error) throw error;
  return count ?? 0;
}

export async function createReminder(input: CreateReminderInput): Promise<Reminder> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('reminders')
    .insert({
      ...input,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateReminder(id: string, input: UpdateReminderInput): Promise<Reminder> {
  const { data, error } = await supabase
    .from('reminders')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteReminder(id: string): Promise<void> {
  const { error } = await supabase.from('reminders').delete().eq('id', id);
  if (error) throw error;
}

export async function updateReminderStatus(id: string, status: ReminderStatus): Promise<Reminder> {
  return updateReminder(id, { status });
}

// Helper function to compute status based on time
export function computeReminderStatus(reminder: Reminder): ReminderStatus {
  const now = new Date();
  const scheduledTime = new Date(reminder.scheduled_time);
  const timeDiff = scheduledTime.getTime() - now.getTime();
  const minutesDiff = timeDiff / (1000 * 60);

  // If manually set, respect it
  if (reminder.status === 'placeholder') return 'placeholder';

  // Past reminders
  if (minutesDiff < -30) return 'completed';

  // Current (within 30 minutes before or after)
  if (minutesDiff >= -30 && minutesDiff <= 30) return 'current';

  // Upcoming (within next 2 hours)
  if (minutesDiff > 30 && minutesDiff <= 120) return 'upcoming';

  // Future
  return 'future';
}

// Process reminders to update their computed status
// The next upcoming reminder (first future reminder) is always marked as 'current'
export function processRemindersStatus(reminders: Reminder[]): Reminder[] {
  const now = new Date();

  // Find the index of the first future reminder
  const firstFutureIndex = reminders.findIndex(
    (reminder) => new Date(reminder.scheduled_time) > now
  );

  return reminders.map((reminder, index) => {
    const scheduledTime = new Date(reminder.scheduled_time);
    const timeDiff = scheduledTime.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    // Respect manually set placeholder status
    if (reminder.status === 'placeholder') {
      return { ...reminder, status: 'placeholder' as ReminderStatus };
    }

    // Past reminders
    if (index < firstFutureIndex || firstFutureIndex === -1) {
      return { ...reminder, status: 'completed' as ReminderStatus };
    }

    // The next upcoming reminder is marked as 'current'
    if (index === firstFutureIndex) {
      return { ...reminder, status: 'current' as ReminderStatus };
    }

    // Future reminders: upcoming (within 2 hours) or future (beyond 2 hours)
    if (minutesDiff <= 120) {
      return { ...reminder, status: 'upcoming' as ReminderStatus };
    }

    return { ...reminder, status: 'future' as ReminderStatus };
  });
}

// Recurring Rules Functions
export async function getRecurringRules(): Promise<RecurringRule[]> {
  const { data, error } = await supabase
    .from('recurring_rules')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createRecurringRule(input: CreateRecurringRuleInput): Promise<RecurringRule> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('recurring_rules')
    .insert({
      ...input,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRecurringRule(id: string): Promise<void> {
  const { error } = await supabase.from('recurring_rules').delete().eq('id', id);
  if (error) throw error;
}

// Snooze a reminder by specified minutes
export async function snoozeReminder(id: string, minutes: number): Promise<Reminder> {
  // Get the current reminder
  const { data: reminder, error: fetchError } = await supabase
    .from('reminders')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  // Calculate new scheduled time
  const currentScheduledTime = new Date(reminder.scheduled_time);
  const newScheduledTime = new Date(currentScheduledTime.getTime() + minutes * 60 * 1000);

  // Update the reminder with new scheduled time and reset notification fields
  const { data, error } = await supabase
    .from('reminders')
    .update({
      scheduled_time: newScheduledTime.toISOString(),
      notified_at: null,
      priority_notified_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
