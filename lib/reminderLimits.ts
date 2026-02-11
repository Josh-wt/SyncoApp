import { supabase } from './supabase';

const FREE_DAILY_LIMIT = 10;

/**
 * Check if user is Pro via edge function (server-side verification)
 */
async function checkIsProUser(): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('check-subscription', {
      method: 'POST',
    });

    if (error || !data) {
      return false;
    }

    return data.isProUser || false;
  } catch {
    return false;
  }
}

/**
 * Check if user can create a new reminder
 * Free users are limited to 10 reminders per day
 * Pro users have unlimited reminders
 */
export async function canCreateReminder(): Promise<{ allowed: boolean; reason?: string; count?: number }> {
  try {
    // Check if user is Pro via edge function
    const isProUser = await checkIsProUser();

    if (isProUser) {
      return { allowed: true };
    }

    // For free users, check today's reminder count
    const count = await getTodayReminderCount();

    if (count >= FREE_DAILY_LIMIT) {
      return {
        allowed: false,
        reason: `Free plan limit reached (${FREE_DAILY_LIMIT}/day). Upgrade to Pro for unlimited reminders.`,
        count,
      };
    }

    return { allowed: true, count };
  } catch {
    // In case of error, allow creation (fail open)
    return { allowed: true };
  }
}

/**
 * Get the number of reminders created today
 */
export async function getTodayReminderCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return 0;
    }

    // Get start of today in UTC
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const { count, error } = await supabase
      .from('reminders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', todayISO);

    if (error) {
      return 0;
    }

    return count || 0;
  } catch {
    return 0;
  }
}

/**
 * Get remaining reminders for today (for free users)
 */
export async function getRemainingRemindersToday(): Promise<{ remaining: number; limit: number; isPro: boolean }> {
  try {
    const isProUser = await checkIsProUser();

    if (isProUser) {
      return { remaining: Infinity, limit: Infinity, isPro: true };
    }

    const count = await getTodayReminderCount();
    const remaining = Math.max(0, FREE_DAILY_LIMIT - count);

    return { remaining, limit: FREE_DAILY_LIMIT, isPro: false };
  } catch {
    return { remaining: 0, limit: FREE_DAILY_LIMIT, isPro: false };
  }
}
