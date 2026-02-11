import { supabase } from './supabase';
import { Reminder } from './types';

export interface UserAnalytics {
  totalNotified: number;
  totalCompleted: number;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  averageResponseTimeMinutes: number;
  overdueCount: number;
  todayCompleted: number;
  thisWeekCompleted: number;
  preferredCompletionTimes: { hour: number; count: number }[];
}

/**
 * Calculate comprehensive user analytics from reminders
 */
export async function calculateUserAnalytics(): Promise<UserAnalytics> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return getDefaultAnalytics();
    }

    // Fetch all reminders for the user
    const { data: allReminders, error: fetchError } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('scheduled_time', { ascending: true });

    if (fetchError || !allReminders) {
      return getDefaultAnalytics();
    }

    // Calculate notified and completed counts
    const notifiedReminders = allReminders.filter(r => r.notified_at !== null);
    const completedReminders = allReminders.filter(r => r.status === 'completed');
    const completedNotifiedReminders = notifiedReminders.filter(r => r.status === 'completed');

    const totalNotified = notifiedReminders.length;
    const totalCompleted = completedNotifiedReminders.length;
    const completionRate = totalNotified > 0 ? Math.round((totalCompleted / totalNotified) * 100) : 0;

    // Calculate overdue count
    const overdueCount = notifiedReminders.filter(r => r.status !== 'completed').length;

    // Calculate streaks
    const { current, longest } = calculateStreaks(completedReminders);

    // Calculate average response time
    const avgResponseTime = calculateAverageResponseTime(completedNotifiedReminders);

    // Calculate today and this week completed
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const todayCompleted = completedReminders.filter(r => {
      const completedDate = new Date(r.updated_at);
      return completedDate >= startOfToday;
    }).length;

    const thisWeekCompleted = completedReminders.filter(r => {
      const completedDate = new Date(r.updated_at);
      return completedDate >= startOfWeek;
    }).length;

    // Calculate preferred completion times
    const preferredCompletionTimes = calculateCompletionTimePatterns(completedReminders);

    return {
      totalNotified,
      totalCompleted,
      completionRate,
      currentStreak: current,
      longestStreak: longest,
      averageResponseTimeMinutes: avgResponseTime,
      overdueCount,
      todayCompleted,
      thisWeekCompleted,
      preferredCompletionTimes,
    };
  } catch {
    return getDefaultAnalytics();
  }
}

/**
 * Calculate completion streak (consecutive days with completed reminders)
 */
function calculateStreaks(completedReminders: Reminder[]): { current: number; longest: number } {
  if (completedReminders.length === 0) {
    return { current: 0, longest: 0 };
  }

  // Group reminders by date
  const dateMap = new Map<string, number>();
  completedReminders.forEach(reminder => {
    const date = new Date(reminder.updated_at);
    const dateKey = date.toISOString().split('T')[0];
    dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
  });

  // Sort dates
  const sortedDates = Array.from(dateMap.keys()).sort();

  // Calculate current streak
  let currentStreak = 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Check if there's activity today or yesterday to start counting
  if (sortedDates.includes(today) || sortedDates.includes(yesterday)) {
    let checkDate = new Date();
    if (!sortedDates.includes(today)) {
      checkDate = new Date(Date.now() - 86400000); // Start from yesterday
    }

    while (true) {
      const dateKey = checkDate.toISOString().split('T')[0];
      if (dateMap.has(dateKey)) {
        currentStreak++;
        checkDate = new Date(checkDate.getTime() - 86400000); // Go back one day
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currDate = new Date(sortedDates[i]);
    const dayDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / 86400000);

    if (dayDiff === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return { current: currentStreak, longest: longestStreak };
}

/**
 * Get average time between notification and completion (in minutes)
 */
function calculateAverageResponseTime(completedNotifiedReminders: Reminder[]): number {
  if (completedNotifiedReminders.length === 0) {
    return 0;
  }

  let totalMinutes = 0;
  let count = 0;

  completedNotifiedReminders.forEach(reminder => {
    if (reminder.notified_at && reminder.updated_at) {
      const notifiedTime = new Date(reminder.notified_at).getTime();
      const completedTime = new Date(reminder.updated_at).getTime();
      const minutesDiff = Math.floor((completedTime - notifiedTime) / 60000);

      // Only count reasonable response times (0 to 24 hours)
      if (minutesDiff >= 0 && minutesDiff <= 1440) {
        totalMinutes += minutesDiff;
        count++;
      }
    }
  });

  return count > 0 ? Math.round(totalMinutes / count) : 0;
}

/**
 * Get hourly patterns for when user completes reminders
 */
function calculateCompletionTimePatterns(completedReminders: Reminder[]): { hour: number; count: number }[] {
  const hourMap = new Map<number, number>();

  completedReminders.forEach(reminder => {
    const hour = new Date(reminder.updated_at).getHours();
    hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
  });

  // Convert to array and sort by count descending
  const patterns = Array.from(hourMap.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => b.count - a.count);

  return patterns.slice(0, 3); // Top 3 hours
}

/**
 * Get default analytics when no data is available
 */
function getDefaultAnalytics(): UserAnalytics {
  return {
    totalNotified: 0,
    totalCompleted: 0,
    completionRate: 0,
    currentStreak: 0,
    longestStreak: 0,
    averageResponseTimeMinutes: 0,
    overdueCount: 0,
    todayCompleted: 0,
    thisWeekCompleted: 0,
    preferredCompletionTimes: [],
  };
}
