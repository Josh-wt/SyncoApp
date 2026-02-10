# Debugging Notification Action Buttons

If action buttons aren't appearing in notifications, follow this debugging guide.

## Quick Diagnostic Check

Add this to your App.tsx temporarily:

```typescript
import { runFullDiagnostics, testCreateCategory } from './lib/notificationDebug';

// In a useEffect or button press
useEffect(() => {
  // Wait a bit for app to initialize
  setTimeout(() => {
    runFullDiagnostics();
  }, 3000);
}, []);

// Or add a test button
<Button title="Test Notification Actions" onPress={testCreateCategory} />
```

## Common Issues

### 1. ❌ Testing on Expo Go
**Problem**: Expo Go has limited notification support
**Solution**: Use a development build
```bash
npx expo run:ios
# or
npx expo run:android
```

### 2. ❌ Not Expanding Notification
**Problem**: Actions are hidden by default
**Solution**:
- **iOS**: Long-press (3D Touch) the notification
- **Android**: Swipe down on the notification to expand it

### 3. ❌ Categories Not Created
**Problem**: Categories must be created BEFORE scheduling notifications
**Solution**: Check that categories are created at app startup

```typescript
// In App.tsx, after user is authenticated
await setupNotificationCategory(); // This creates default category
```

### 4. ❌ Wrong Category Identifier
**Problem**: Notification's categoryIdentifier doesn't match created category
**Solution**: Verify with debug script

```typescript
import { debugCategories, debugScheduledNotifications } from './lib/notificationDebug';

// Check categories
await debugCategories();

// Check scheduled notifications
await debugScheduledNotifications();
```

### 5. ❌ Invalid Category ID Characters
**Problem**: Category IDs contain `:` or `-` characters
**Solution**: Use only letters, numbers, and underscores

```typescript
// ✅ Good
'actions_call_link'

// ❌ Bad
'actions:call-link'
```

### 6. ❌ Platform-Specific Issues

**iOS**:
- Requires physical device or simulator with iOS 10+
- Actions only appear on long-press
- May require notification permissions

**Android**:
- Requires API level 23+ for some features
- Actions appear when notification is expanded
- Notification channel must be created

## Manual Test

### Step 1: Create Test Category

```typescript
import * as Notifications from 'expo-notifications';

await Notifications.setNotificationCategoryAsync('test_cat', [
  {
    identifier: 'action_1',
    buttonTitle: '✓ Action 1',
    options: { opensAppToForeground: false },
  },
  {
    identifier: 'action_2',
    buttonTitle: '🔗 Action 2',
    options: { opensAppToForeground: false },
  },
]);
```

### Step 2: Schedule Test Notification

```typescript
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Test Actions',
    body: 'Long-press or expand to see actions',
    categoryIdentifier: 'test_cat', // MUST match category ID
  },
  trigger: { seconds: 5 },
});
```

### Step 3: Check Notification

Wait 5 seconds, then:
- **iOS**: Long-press the notification
- **Android**: Swipe down on the notification

You should see 2 buttons: "✓ Action 1" and "🔗 Action 2"

## Verify Implementation

### Check 1: Category Creation

```typescript
const categories = await Notifications.getNotificationCategoriesAsync();
console.log('Categories:', categories.length);
categories.forEach(cat => {
  console.log(`- ${cat.identifier}: ${cat.actions.length} actions`);
});
```

Expected output:
```
Categories: 3
- reminder_actions: 2 actions
- actions_call: 4 actions
- actions_link_location: 4 actions
```

### Check 2: Notification Content

```typescript
const scheduled = await Notifications.getAllScheduledNotificationsAsync();
scheduled.forEach(n => {
  console.log('Notification:');
  console.log('  Title:', n.request.content.title);
  console.log('  Category:', n.request.content.categoryIdentifier);
});
```

Expected output:
```
Notification:
  Title: Call John Doe
  Category: actions_call
```

### Check 3: Action Response

Add logging to response handler:

```typescript
Notifications.addNotificationResponseReceivedListener(response => {
  console.log('Action pressed:', response.actionIdentifier);
  console.log('Notification data:', response.notification.request.content.data);
});
```

## Troubleshooting Steps

### Reset Everything

```typescript
import { clearAllCategories } from './lib/notificationDebug';

// 1. Clear all categories
await clearAllCategories();

// 2. Cancel all scheduled notifications
await Notifications.cancelAllScheduledNotificationsAsync();

// 3. Recreate categories
await setupNotificationCategory();

// 4. Sync schedules
await syncLocalReminderSchedules();

// 5. Check results
await debugCategories();
await debugScheduledNotifications();
```

### Check Permissions

```typescript
const { status } = await Notifications.getPermissionsAsync();
console.log('Permission status:', status);

if (status !== 'granted') {
  const { status: newStatus } = await Notifications.requestPermissionsAsync();
  console.log('New status:', newStatus);
}
```

### Platform-Specific Checks

**iOS Simulator**:
```typescript
import * as Device from 'expo-device';

if (!Device.isDevice) {
  console.log('⚠️  Testing on simulator - some features may be limited');
}
```

**Android Channel**:
```typescript
if (Platform.OS === 'android') {
  const channel = await Notifications.getNotificationChannelAsync('reminders');
  console.log('Reminder channel:', channel);
}
```

## Expected Behavior

When a reminder with actions is created:

1. **Category Created**: A category is created with action buttons
2. **Notification Scheduled**: Notification is scheduled with categoryIdentifier
3. **Notification Received**: User receives notification at scheduled time
4. **Actions Visible**: User expands notification to see action buttons
5. **Action Executed**: Tapping action button executes the action

## Still Not Working?

Check these:

1. ✅ Using development build (not Expo Go)
2. ✅ Testing on physical device (not just simulator)
3. ✅ Notification permissions granted
4. ✅ Properly expanding the notification to see actions
5. ✅ Categories created before scheduling notifications
6. ✅ Category ID matches in both creation and notification
7. ✅ Using valid category identifier (no `:` or `-`)
8. ✅ Actions array is not empty
9. ✅ Platform is iOS 10+ or Android API 23+

## Debug Output Example

When running `runFullDiagnostics()`, you should see:

```
🔍 RUNNING FULL NOTIFICATION DIAGNOSTICS...

📱 Permissions Status: granted
   Can show banner: true
   Can show alert: true
   Can play sound: true

=== NOTIFICATION CATEGORIES DEBUG ===

Total categories: 3

📋 Category 1:
  ID: reminder_actions
  Actions: 2
    1. Snooze 10m (SNOOZE_10M)
       Opens app: false
       Destructive: false
    2. Mark done (MARK_DONE)
       Opens app: false
       Destructive: true

📋 Category 2:
  ID: actions_call_link
  Actions: 4
    1. 📞 Call (call_abc123)
       Opens app: false
       Destructive: false
    2. 🔗 Open (link_def456)
       Opens app: false
       Destructive: false
    3. ⏰ Snooze 15m (snooze_reminder789)
       Opens app: false
       Destructive: false
    4. ✓ Complete (complete_reminder789)
       Opens app: false
       Destructive: true

=====================================

=== SCHEDULED NOTIFICATIONS DEBUG ===

Total scheduled: 2

📬 Notification 1:
  ID: 550e8400-e29b-41d4-a716-446655440000
  Title: Call John Doe
  Category ID: actions_call_link ✓
  Reminder ID: abc-123-def
  Action Types: call,link
  Triggers: in 15 minutes

=====================================
```

If you see:
- ❌ `Total categories: 0` - Categories aren't being created
- ❌ `Category ID: NONE` - categoryIdentifier not set on notification
- ❌ `Category ID: undefined` - Category creation failed
- ❌ `Total scheduled: 0` - No notifications scheduled

Then you've found the problem!
