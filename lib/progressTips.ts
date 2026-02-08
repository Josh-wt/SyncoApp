import { UserAnalytics } from './analytics';

/**
 * Generate contextual message from Remmy based on user state
 */
export function generateRemmyMessage(
  analytics: UserAnalytics,
  overdueCount: number
): string {
  if (overdueCount === 0) {
    if (analytics.currentStreak > 7) {
      return `Amazing! You're all caught up AND on a ${analytics.currentStreak}-day streak! 🎉`;
    }
    return "Amazing! You're all caught up. Time to relax or plan ahead!";
  }

  if (overdueCount === 1) {
    return "Just one overdue task left. You've got this!";
  }

  if (overdueCount <= 3) {
    return `${overdueCount} overdue tasks. Let's tackle them together!`;
  }

  if (analytics.completionRate > 70) {
    return `${overdueCount} tasks overdue, but you usually complete ${analytics.completionRate}% - you'll bounce back!`;
  }

  return `${overdueCount} overdue tasks. Try using AI to reschedule them efficiently.`;
}

/**
 * Generate tips based on analytics patterns (rule-based)
 */
export function generateProgressTips(
  analytics: UserAnalytics,
  overdueCount: number
): string[] {
  const tips: string[] = [];

  // Completion rate tips
  if (analytics.totalNotified === 0) {
    tips.push("Start creating reminders to track your progress and build healthy habits");
  } else if (analytics.completionRate < 50 && analytics.totalNotified > 5) {
    tips.push("Try setting reminders closer to when you'll actually do them");
  } else if (analytics.completionRate >= 80) {
    tips.push(`Excellent ${analytics.completionRate}% completion rate! You're crushing it!`);
  }

  // Streak tips
  if (analytics.currentStreak > 7) {
    tips.push(`${analytics.currentStreak}-day streak! Keep the momentum going!`);
  } else if (analytics.longestStreak > analytics.currentStreak && analytics.currentStreak === 0) {
    tips.push(`Your record is ${analytics.longestStreak} days. Ready to beat it?`);
  }

  // Time pattern tips
  if (analytics.preferredCompletionTimes.length > 0) {
    const topHour = analytics.preferredCompletionTimes[0];
    const hourLabel = formatHour(topHour.hour);
    tips.push(`You're most productive around ${hourLabel} - schedule important tasks then`);
  }

  // Response time tips
  if (analytics.averageResponseTimeMinutes > 0 && analytics.averageResponseTimeMinutes < 15) {
    tips.push(`Lightning fast! You complete tasks in ${analytics.averageResponseTimeMinutes} minutes on average`);
  } else if (analytics.averageResponseTimeMinutes > 120) {
    const hours = Math.round(analytics.averageResponseTimeMinutes / 60);
    tips.push(`You take about ${hours} hours to complete tasks. Try scheduling them earlier to reduce delays`);
  }

  // Overdue tips
  if (overdueCount > 5) {
    tips.push("Use AI to batch reschedule overdue tasks quickly and efficiently");
  } else if (overdueCount > 0 && analytics.completionRate > 75) {
    tips.push("You're usually great at completing tasks - these few overdue ones are just a temporary bump!");
  }

  // Week performance tips
  if (analytics.thisWeekCompleted > 20) {
    tips.push(`Wow! ${analytics.thisWeekCompleted} tasks completed this week. You're on fire!`);
  }

  // If no tips generated, provide a default motivational message
  if (tips.length === 0) {
    tips.push("Stay consistent and you'll build great habits!");
    tips.push("Every completed task is a step toward your goals");
  }

  // Return top 3 tips
  return tips.slice(0, 3);
}

/**
 * Format hour (0-23) to readable time string
 */
function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

/**
 * Format minutes to readable duration
 */
export function formatMinutes(minutes: number): string {
  if (minutes === 0) return '0m';
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}
