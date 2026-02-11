/**
 * Notification Categories Debugging Helper
 *
 * Use these functions to diagnose why notification action buttons aren't appearing
 */

import * as Notifications from 'expo-notifications';

/**
 * Check all created notification categories
 */
export async function debugCategories(): Promise<void> {
  await Notifications.getNotificationCategoriesAsync();
}

/**
 * Check all scheduled notifications
 */
export async function debugScheduledNotifications(): Promise<void> {
  await Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Test creating a simple category
 */
export async function testCreateCategory(): Promise<void> {
  const testCategoryId = 'test_category_' + Date.now();

  try {
    await Notifications.setNotificationCategoryAsync(
      testCategoryId,
      [
        {
          identifier: 'test_action_1',
          buttonTitle: '✓ Test Action 1',
          options: { opensAppToForeground: false },
        },
        {
          identifier: 'test_action_2',
          buttonTitle: '🔗 Test Action 2',
          options: { opensAppToForeground: false },
        },
      ]
    );

    // Now schedule a test notification with this category
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: 'Tap and hold (iOS) or swipe down (Android) to see action buttons',
        categoryIdentifier: testCategoryId,
        data: {
          testNotification: true,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(Date.now() + 5000), // Trigger in 5 seconds
      },
    });
  } catch {
  }
}

/**
 * Complete diagnostic check
 */
export async function runFullDiagnostics(): Promise<void> {
  // Check permissions
  await Notifications.getPermissionsAsync();

  // Check categories
  await debugCategories();

  // Check scheduled notifications
  await debugScheduledNotifications();
}

/**
 * Clear all categories (useful for testing)
 */
export async function clearAllCategories(): Promise<void> {
  const categories = await Notifications.getNotificationCategoriesAsync();

  for (const category of categories) {
    try {
      await Notifications.deleteNotificationCategoryAsync(category.identifier);
    } catch {
    }
  }
}
