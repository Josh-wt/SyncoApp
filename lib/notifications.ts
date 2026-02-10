import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { getAllFutureReminders } from './reminders';

// Concurrency guard for sync
let syncInProgress = false;

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

type PushTokenType = 'expo' | 'fcm';

type ReminderData = {
  reminderId?: string;
  title?: string;
  body?: string;
  originalTime?: string;
  reminderUpdatedAt?: string;
};

type ReminderScheduleInput = {
  reminderId: string;
  title: string;
  body: string;
  triggerAt: Date;
  originalTime?: string;
  reminderUpdatedAt?: string;
};

type NotificationScheduleRecord = {
  id: string;
  user_id: string;
  reminder_id: string;
  device_id: string;
  notification_id: string;
  scheduled_for: string;
  reminder_updated_at: string | null;
  snoozed_until: string | null;
};

function getDeviceIdentifier(): string {
  return Device.deviceName || Device.modelName || 'unknown-device';
}

export async function registerForPushNotifications(): Promise<{ token: string; tokenType: PushTokenType } | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permissions not granted');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2F00FF',
      sound: 'default',
    });
  }

  try {
    if (Platform.OS === 'android') {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      return { token: tokenData.data, tokenType: 'fcm' };
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    if (!projectId) {
      console.log('No project ID found for push notifications');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    return { token: tokenData.data, tokenType: 'expo' };
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function savePushToken(token: string, tokenType: PushTokenType): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.log('User not authenticated, cannot save push token');
    return;
  }

  const deviceId = Device.deviceName || Device.modelName || 'unknown';
  const platform = Platform.OS;

  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      {
        user_id: user.id,
        token,
        device_id: deviceId,
        platform,
        token_type: tokenType,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,token',
      }
    );

  if (error) {
    console.error('Error saving push token:', error);
    throw error;
  }
}

export async function removePushToken(token: string): Promise<void> {
  const { error } = await supabase
    .from('push_tokens')
    .delete()
    .eq('token', token);

  if (error) {
    console.error('Error removing push token:', error);
  }
}

export function setupNotificationReceivedHandler(
  onNotificationReceived: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(onNotificationReceived);
}

export function setupNotificationResponseHandler(
  onReminderTap?: (reminderId: string) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    void handleNotificationResponse(response, onReminderTap);
  });
}

// Initialize notifications for the app
export async function initializeNotifications(): Promise<string | null> {
  const tokenResult = await registerForPushNotifications();

  if (tokenResult) {
    await savePushToken(tokenResult.token, tokenResult.tokenType);
  }

  return tokenResult?.token ?? null;
}

// Get the current notification permissions status
export async function getNotificationPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function scheduleReminder(reminder: ReminderScheduleInput): Promise<string> {
  const { reminderId, title, body, triggerAt, originalTime, reminderUpdatedAt } = reminder;

  const content: Notifications.NotificationContentInput = {
    title,
    body,
    sound: 'default',
    ...(Platform.OS === 'android' && { channelId: 'reminders' }), // Required for Android
    data: {
      reminderId,
      title,
      body,
      originalTime: originalTime ?? triggerAt.toISOString(),
      reminderUpdatedAt,
    },
  };

  // Verify permissions before scheduling
  const { status: permissionStatus } = await Notifications.getPermissionsAsync();
  console.log('📱 [NOTIF] Notification permission status:', permissionStatus);

  if (permissionStatus !== 'granted') {
    console.warn('⚠️ [NOTIF] Notification permissions not granted! Status:', permissionStatus);
  }

  const now = new Date();
  const timeUntilNotification = triggerAt.getTime() - now.getTime();
  const minutesUntil = Math.round(timeUntilNotification / 1000 / 60);

  console.log('📱 [NOTIF] Scheduling notification');
  console.log('📱 [NOTIF] Trigger date:', triggerAt.toISOString());
  console.log('📱 [NOTIF] Current time:', now.toISOString());
  console.log('📱 [NOTIF] Time until notification:', minutesUntil, 'minutes');
  console.log('📱 [NOTIF] Notification content:', JSON.stringify({
    title: content.title,
    channelId: Platform.OS === 'android' ? 'reminders' : undefined,
    hasData: !!content.data,
  }, null, 2));

  const notificationId = await Notifications.scheduleNotificationAsync({
    content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerAt,
    },
  });

  console.log('✅ [NOTIF] Notification scheduled with ID:', notificationId);
  console.log('📱 [NOTIF] Will arrive in', minutesUntil, 'minutes');
  return notificationId;
}

// Cancel a scheduled notification
export async function cancelScheduledNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

// Cancel all scheduled notifications
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// TEST FUNCTION: Send a test notification
export async function sendTestNotification(): Promise<void> {
  console.log('🧪 [TEST] Creating test notification...');

  try {
    // Schedule test notification in 5 seconds
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: 'Tap to open your reminder.',
        sound: 'default',
        ...(Platform.OS === 'android' && { channelId: 'reminders' }), // Required for Android
        data: { testNotification: true },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
      },
    });

    console.log('✅ [TEST] Test notification scheduled! Check in 5 seconds.');
    console.log('📱 [TEST] Platform:', Platform.OS);
    console.log('📱 [TEST] Channel ID:', Platform.OS === 'android' ? 'reminders' : 'not needed (iOS)');
  } catch (error) {
    console.error('❌ [TEST] Error creating test notification:', error);
  }
}

// Get all scheduled notifications
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return Notifications.getAllScheduledNotificationsAsync();
}

// Get and reset badge count
export async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

async function fetchNotificationSchedules(userId: string, deviceId: string): Promise<NotificationScheduleRecord[]> {
  const { data, error } = await supabase
    .from('notification_schedules')
    .select('id, user_id, reminder_id, device_id, notification_id, scheduled_for, reminder_updated_at, snoozed_until')
    .eq('user_id', userId)
    .eq('device_id', deviceId);

  if (error) {
    console.error('Failed to fetch notification schedules:', error);
    return [];
  }

  return (data ?? []) as NotificationScheduleRecord[];
}

async function upsertNotificationSchedule(params: {
  userId: string;
  reminderId: string;
  deviceId: string;
  notificationId: string;
  scheduledFor: string;
  reminderUpdatedAt?: string | null;
  snoozedUntil?: string | null;
}): Promise<void> {
  const { userId, reminderId, deviceId, notificationId, scheduledFor, reminderUpdatedAt, snoozedUntil } = params;
  const { error } = await supabase
    .from('notification_schedules')
    .upsert(
      {
        user_id: userId,
        reminder_id: reminderId,
        device_id: deviceId,
        notification_id: notificationId,
        scheduled_for: scheduledFor,
        reminder_updated_at: reminderUpdatedAt ?? null,
        snoozed_until: snoozedUntil ?? null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,reminder_id,device_id',
      }
    );

  if (error) {
    console.error('Failed to upsert notification schedule:', error);
  }
}

async function deleteNotificationSchedule(id: string): Promise<void> {
  const { error } = await supabase.from('notification_schedules').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete notification schedule:', error);
  }
}

export async function syncLocalReminderSchedules(): Promise<void> {
  if (syncInProgress) return;
  syncInProgress = true;
  try {
    await _doSyncLocalReminderSchedules();
  } finally {
    syncInProgress = false;
  }
}

async function _doSyncLocalReminderSchedules(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const deviceId = getDeviceIdentifier();
  const now = Date.now();

  const reminders = await getAllFutureReminders();
  const existing = await fetchNotificationSchedules(user.id, deviceId);
  const existingByReminder = new Map(existing.map((record) => [record.reminder_id, record]));
  const keepIds = new Set<string>();

  for (const reminder of reminders) {
    const notifyAt = new Date(new Date(reminder.scheduled_time).getTime() - reminder.notify_before_minutes * 60 * 1000);
    if (Number.isNaN(notifyAt.getTime())) {
      continue;
    }
    if (notifyAt.getTime() <= now) {
      continue;
    }

    const existingRecord = existingByReminder.get(reminder.id);
    if (existingRecord) {
      const existingTime = new Date(existingRecord.scheduled_for).getTime();
      const snoozedUntil = existingRecord.snoozed_until ? new Date(existingRecord.snoozed_until).getTime() : null;
      const reminderUpdatedAt = reminder.updated_at;
      const recordUpdatedAt = existingRecord.reminder_updated_at;

      if (snoozedUntil && snoozedUntil > now) {
        keepIds.add(existingRecord.id);
        continue;
      }

      const unchanged = recordUpdatedAt && reminderUpdatedAt === recordUpdatedAt;
      const closeToTarget = Math.abs(existingTime - notifyAt.getTime()) < 60 * 1000;

      if (unchanged && closeToTarget && existingTime > now) {
        keepIds.add(existingRecord.id);
        continue;
      }

      await Notifications.cancelScheduledNotificationAsync(existingRecord.notification_id);
      await deleteNotificationSchedule(existingRecord.id);
    }

    const notificationId = await scheduleReminder({
      reminderId: reminder.id,
      title: reminder.title,
      body: reminder.description ?? 'Reminder is due!',
      triggerAt: notifyAt,
      originalTime: reminder.scheduled_time,
      reminderUpdatedAt: reminder.updated_at,
    });

    await upsertNotificationSchedule({
      userId: user.id,
      reminderId: reminder.id,
      deviceId,
      notificationId,
      scheduledFor: notifyAt.toISOString(),
      reminderUpdatedAt: reminder.updated_at,
    });
  }

  // Cleanup: cancel notifications for reminders that no longer need scheduling
  const currentReminderIds = new Set(reminders.map(r => r.id));
  for (const record of existing) {
    if (keepIds.has(record.id)) continue;
    // Skip records whose reminder was already processed in the main loop above
    if (currentReminderIds.has(record.reminder_id)) continue;
    await Notifications.cancelScheduledNotificationAsync(record.notification_id);
    await deleteNotificationSchedule(record.id);
  }

  // Dedup: ensure at most 1 scheduled notification per reminder
  const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
  const notifsByReminder = new Map<string, Notifications.NotificationRequest[]>();
  for (const n of allScheduled) {
    const rid = (n.content.data as any)?.reminderId;
    if (!rid) continue;
    const list = notifsByReminder.get(rid) ?? [];
    list.push(n);
    notifsByReminder.set(rid, list);
  }
  for (const [, notifications] of notifsByReminder) {
    if (notifications.length <= 1) continue;
    // Cancel all but the last one (most recently scheduled)
    for (let i = 0; i < notifications.length - 1; i++) {
      await Notifications.cancelScheduledNotificationAsync(notifications[i].identifier);
    }
  }
}

export async function sendResyncPush(): Promise<void> {
  try {
    await supabase.functions.invoke('send-resync-push', {
      body: {
        deviceId: getDeviceIdentifier(),
      },
    });
  } catch (error) {
    console.error('Failed to send resync push:', error);
  }
}

export async function handleNotificationResponse(
  response: Notifications.NotificationResponse,
  onReminderTap?: (reminderId: string) => void
): Promise<void> {
  console.log('Notification response:', {
    actionIdentifier: response.actionIdentifier,
    userText: response.userText,
    data: response.notification.request.content.data,
  });

  const data = response.notification.request.content.data as ReminderData | undefined;

  // Skip test notifications
  if (data && 'testNotification' in data && data.testNotification) {
    console.log('✅ Test notification action button worked!');
    return;
  }

  const reminderId = data?.reminderId;

  if (!reminderId || !isUuid(reminderId)) {
    console.log('Invalid reminderId in notification data:', reminderId);
    return;
  }

  onReminderTap?.(reminderId);
}
