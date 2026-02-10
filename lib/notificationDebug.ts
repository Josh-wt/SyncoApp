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
  console.log('\n=== NOTIFICATION CATEGORIES DEBUG ===');

  const categories = await Notifications.getNotificationCategoriesAsync();
  console.log(`\nTotal categories: ${categories.length}`);

  if (categories.length === 0) {
    console.log('❌ NO CATEGORIES FOUND!');
    console.log('Categories must be created before scheduling notifications.');
    return;
  }

  categories.forEach((category, index) => {
    console.log(`\n📋 Category ${index + 1}:`);
    console.log(`  ID: ${category.identifier}`);
    console.log(`  Actions: ${category.actions.length}`);

    category.actions.forEach((action, actionIndex) => {
      console.log(`    ${actionIndex + 1}. ${action.buttonTitle} (${action.identifier})`);
      console.log(`       Opens app: ${action.options?.opensAppToForeground || false}`);
      console.log(`       Destructive: ${action.options?.isDestructive || false}`);
      if (action.textInput) {
        console.log(`       Text input: ${action.textInput.placeholder}`);
      }
    });
  });

  console.log('\n=====================================\n');
}

/**
 * Check all scheduled notifications
 */
export async function debugScheduledNotifications(): Promise<void> {
  console.log('\n=== SCHEDULED NOTIFICATIONS DEBUG ===');

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  console.log(`\nTotal scheduled: ${scheduled.length}`);

  if (scheduled.length === 0) {
    console.log('❌ NO SCHEDULED NOTIFICATIONS!');
    return;
  }

  scheduled.forEach((notification, index) => {
    const { content, trigger } = notification.request;
    const data = content.data as any;

    console.log(`\n📬 Notification ${index + 1}:`);
    console.log(`  ID: ${notification.request.identifier}`);
    console.log(`  Title: ${content.title}`);
    console.log(`  Category ID: ${content.categoryIdentifier || 'NONE ❌'}`);
    console.log(`  Reminder ID: ${data?.reminderId || 'N/A'}`);
    console.log(`  Action Types: ${data?.actionTypes || 'NONE'}`);

    if (trigger && 'date' in trigger) {
      const triggerDate = new Date(trigger.date);
      const now = new Date();
      const diff = triggerDate.getTime() - now.getTime();
      const minutes = Math.floor(diff / 1000 / 60);

      console.log(`  Triggers: ${minutes > 0 ? `in ${minutes} minutes` : 'PAST (should have fired!)'}`);
    }
  });

  console.log('\n=====================================\n');
}

/**
 * Test creating a simple category
 */
export async function testCreateCategory(): Promise<void> {
  console.log('\n=== TESTING CATEGORY CREATION ===');

  const testCategoryId = 'test_category_' + Date.now();

  try {
    const category = await Notifications.setNotificationCategoryAsync(
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

    console.log('✅ Category created successfully!');
    console.log(`   ID: ${category.identifier}`);
    console.log(`   Actions: ${category.actions.length}`);

    // Now schedule a test notification with this category
    const notificationId = await Notifications.scheduleNotificationAsync({
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

    console.log('✅ Test notification scheduled!');
    console.log(`   Will appear in 5 seconds`);
    console.log(`   Notification ID: ${notificationId}`);
    console.log('\n📱 HOW TO VIEW ACTIONS:');
    console.log('   iOS: Long-press the notification');
    console.log('   Android: Swipe down on the notification\n');
  } catch (error) {
    console.error('❌ Failed to create test category:', error);
  }

  console.log('=====================================\n');
}

/**
 * Complete diagnostic check
 */
export async function runFullDiagnostics(): Promise<void> {
  console.log('\n🔍 RUNNING FULL NOTIFICATION DIAGNOSTICS...\n');

  // Check permissions
  const permissions = await Notifications.getPermissionsAsync();
  console.log('📱 Permissions Status:', permissions.status);
  console.log('   Can show banner:', permissions.ios?.allowsBanner ?? permissions.android ?? 'N/A');
  console.log('   Can show alert:', permissions.ios?.allowsAlert ?? 'N/A');
  console.log('   Can play sound:', permissions.ios?.allowsSound ?? 'N/A');

  // Check categories
  await debugCategories();

  // Check scheduled notifications
  await debugScheduledNotifications();

  // Platform-specific notes
  console.log('\n📝 PLATFORM-SPECIFIC NOTES:');
  console.log('   iOS: Long-press notifications to see actions');
  console.log('   Android: Swipe down on notifications to expand');
  console.log('   Expo Go: May have limited notification support');
  console.log('   Use development build for full feature support\n');
}

/**
 * Clear all categories (useful for testing)
 */
export async function clearAllCategories(): Promise<void> {
  console.log('\n=== CLEARING ALL CATEGORIES ===');

  const categories = await Notifications.getNotificationCategoriesAsync();
  console.log(`Found ${categories.length} categories to delete...`);

  for (const category of categories) {
    try {
      await Notifications.deleteNotificationCategoryAsync(category.identifier);
      console.log(`✓ Deleted: ${category.identifier}`);
    } catch (error) {
      console.error(`✗ Failed to delete ${category.identifier}:`, error);
    }
  }

  console.log('\n✅ All categories cleared!');
  console.log('=====================================\n');
}
