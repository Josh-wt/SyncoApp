# Dynamic Notification Actions System

This document explains how the dynamic notification action buttons work in Synco.

## Overview

Synco now supports **dynamic notification action buttons** that appear when you receive a reminder notification. The action buttons are generated based on the quick actions you've added to each reminder.

## Features

✅ **Dynamic Action Buttons** - Each reminder gets unique action buttons based on its configured actions
✅ **Direct Execution** - Actions execute immediately without opening the app
✅ **Platform Native** - Uses iOS/Android native notification UI
✅ **Works Offline** - Actions execute even when app is backgrounded or terminated
✅ **Smart Categorization** - Categories are reused for reminders with same action combinations

## Supported Action Types

### 1. **Call** 📞
- Directly opens phone dialer with the number
- Executes without opening app
- Button: "📞 Call"

### 2. **Link** 🔗
- Opens URL in default browser
- Executes without opening app
- Button: "🔗 Open"

### 3. **Location** 📍
- Opens address in Maps app (Apple Maps on iOS, Google Maps on Android)
- Supports both coordinates and addresses
- Executes without opening app
- Button: "📍 Navigate"

### 4. **Email** 📧
- Opens email client with pre-filled recipient, subject, and body
- Executes without opening app
- Button: "📧 Email"

### 5. **Note** 📝
- Opens app to view the note
- Button: "📝 Note"

### 6. **Subtasks** ✓
- Opens app to view subtasks
- Button: "✓ Tasks"

## How It Works

### 1. Creating Reminders with Actions

When you create a reminder and add quick actions:

```typescript
// Example: Create a reminder with call and location actions
const reminder = await createReminder({
  title: "Meeting with John",
  scheduled_time: new Date(),
  // ... other fields
});

// Add quick actions
await createReminderActions(reminder.id, [
  {
    action_type: 'call',
    action_value: { phone: '+1234567890' }
  },
  {
    action_type: 'location',
    action_value: { address: '123 Main St, City' }
  }
]);
```

### 2. Notification Scheduling

When the notification is scheduled (in `lib/notifications.ts`):

1. Fetches all actions for the reminder
2. Creates a unique notification category with appropriate action buttons
3. Schedules the notification with the category identifier

### 3. Action Button Layout

Notifications display up to **4 action buttons**:

1. **Quick Actions** (up to 2): Call, Link, Location, or Email
2. **Snooze Button**: Snoozes the reminder (default 15 minutes)
3. **Complete Button**: Marks the reminder as completed

Example notification with call + location:
```
┌─────────────────────────────────┐
│ Meeting with John               │
│ Scheduled for 3:00 PM           │
├─────────────────────────────────┤
│ 📞 Call    📍 Navigate          │
│ ⏰ Snooze 15m    ✓ Complete     │
└─────────────────────────────────┘
```

### 4. Handling Action Taps

When user taps an action button:

1. **Parse Action** - Extract action type and ID from identifier
2. **Fetch Action Data** - Get full action details from database
3. **Execute** - Perform the action (open URL, make call, etc.)
4. **Dismiss** - Remove notification from tray

## Implementation Files

### Core Files

1. **`lib/notificationCategories.ts`** - NEW
   - Dynamic category generation
   - Action button creation
   - Action response handling

2. **`lib/notifications.ts`** - UPDATED
   - Integrated dynamic category system
   - Enhanced `scheduleReminder()` function
   - Updated response handler

3. **`lib/reminderActions.ts`** - EXISTING
   - Action CRUD operations
   - Action execution logic

### Key Functions

#### `createDynamicNotificationCategory()`
Creates a notification category with action buttons based on reminder's actions.

```typescript
const categoryId = await createDynamicNotificationCategory(
  reminderId,
  actions,
  snoozeMinutes
);
```

#### `handleDynamicNotificationAction()`
Handles when user taps an action button.

```typescript
const handled = await handleDynamicNotificationAction(
  response,
  onComplete,
  onSnooze
);
```

#### `prepareNotificationActionData()`
Prepares action data to embed in notification payload for faster access.

```typescript
const actionData = prepareNotificationActionData(actions);
```

## Testing

### Test Scenario 1: Call Action

1. Create a reminder with a call action
2. Wait for notification to arrive
3. Long-press (iOS) or swipe down (Android) the notification
4. Tap "📞 Call" button
5. **Expected**: Phone dialer opens with the number pre-filled

### Test Scenario 2: Link Action

1. Create a reminder with a link action
2. Wait for notification
3. Tap "🔗 Open" button
4. **Expected**: URL opens in default browser

### Test Scenario 3: Location Action

1. Create a reminder with a location action
2. Wait for notification
3. Tap "📍 Navigate" button
4. **Expected**: Maps app opens with the location

### Test Scenario 4: Multiple Actions

1. Create a reminder with call + email actions
2. Wait for notification
3. **Expected**: Both "📞 Call" and "📧 Email" buttons appear
4. Tap each button
5. **Expected**: Respective apps open

### Test Scenario 5: Complete Action

1. Receive any reminder notification
2. Tap "✓ Complete" button
3. **Expected**: Reminder is marked as completed in database
4. **Expected**: Notification disappears from tray

### Test Scenario 6: Snooze Action

1. Receive any reminder notification
2. Tap "⏰ Snooze 15m" button
3. **Expected**: Notification is rescheduled for 15 minutes later
4. **Expected**: Current notification disappears

## Platform Differences

### iOS
- Supports up to 4 action buttons
- Requires long-press on notification to see actions
- Actions appear as buttons in notification detail view
- Better support for opening apps with custom URL schemes

### Android
- Can show more than 4 actions but recommend limiting to 4
- Actions appear when notification is expanded (swipe down)
- Actions are shown as text buttons below notification
- May have different behavior for opening external apps

## Limitations

1. **Max 4 Actions**: Only 4 action buttons can be shown at once
2. **Actionable Types Only**: Only call, link, location, and email can execute directly
3. **No Custom UI**: Action buttons use platform-native styling
4. **No Inline Input**: Text input actions (like reply) require special handling

## Future Enhancements

- [ ] Text input for custom snooze duration
- [ ] Preview images in notification
- [ ] Voice note playback from notification
- [ ] Subtask quick completion
- [ ] Custom action icons
- [ ] Priority-based action ordering
- [ ] Action usage analytics

## Debugging

Enable notification debugging:

```typescript
// In lib/notifications.ts or App.tsx
console.log('Notification scheduled with category:', categoryId);
console.log('Action buttons:', actions.map(a => a.action_type));

// When action is pressed
console.log('Action pressed:', actionIdentifier);
console.log('Action data:', actionData);
```

Check scheduled notifications:

```typescript
const scheduled = await Notifications.getAllScheduledNotificationsAsync();
console.log('Scheduled notifications:', scheduled.length);
scheduled.forEach(n => {
  console.log('Category:', n.content.categoryIdentifier);
  console.log('Data:', n.content.data);
});
```

Check categories:

```typescript
const categories = await Notifications.getNotificationCategoriesAsync();
console.log('Categories:', categories.length);
categories.forEach(c => {
  console.log('Category ID:', c.identifier);
  console.log('Actions:', c.actions.map(a => a.buttonTitle));
});
```

## Troubleshooting

### Actions not appearing
- Check that notification category was created successfully
- Verify actions are being fetched from database
- Ensure categoryIdentifier is set in notification content
- Try deleting and reinstalling the app to clear old categories

### Actions not working
- Check that `handleDynamicNotificationAction` is being called
- Verify action IDs are correct in the identifier
- Ensure Linking.canOpenURL returns true for the URL
- Check platform-specific URL schemes

### Wrong actions showing
- Verify that the correct actions are associated with the reminder
- Check that category generation is using the right actions
- Clear old categories: `await Notifications.setNotificationCategoryAsync(id, [])`

## Resources

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [iOS Notification Categories](https://developer.apple.com/documentation/usernotifications/unnotificationcategory)
- [Android Notification Actions](https://developer.android.com/develop/ui/views/notifications)
