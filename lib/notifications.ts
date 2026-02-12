import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { getAllFutureReminders, snoozeReminder as snoozeReminderInDb } from './reminders';
import type { ReminderAction, SnoozeMode } from './types';
import { getUserPreferences } from './userPreferences';
import { getReminderActions } from './reminderActions';
import {
  createDynamicNotificationCategory,
  getDynamicNotificationCategoryId,
  handleDynamicNotificationAction,
} from './notificationCategories';

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
  defaultSnoozeMinutes?: number;
  testNotification?: boolean;
};

type ReminderScheduleInput = {
  reminderId: string;
  title: string;
  body: string;
  triggerAt: Date;
  originalTime?: string;
  reminderUpdatedAt?: string;
  actions?: ReminderAction[];
  defaultSnoozeMinutes?: number;
  snoozeMode?: SnoozeMode;
  snoozePresetValues?: number[];
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

function hasSupportedCategoryIdentifier(value: string | null | undefined): boolean {
  if (!value) return false;
  // Expo docs advise against ":" and "-" in category identifiers.
  return !value.includes(':') && !value.includes('-');
}

function getDeviceIdentifier(): string {
  return Device.deviceName || Device.modelName || 'unknown-device';
}

export async function registerForPushNotifications(): Promise<{ token: string; tokenType: PushTokenType } | null> {
  if (!Device.isDevice) {
    return null;
  }

  if (Platform.OS === 'android') {
    // On Android 13+, create the channel before requesting notification permissions.
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2F00FF',
      sound: 'default',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync(
      Platform.OS === 'ios'
        ? {
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
            },
          }
        : undefined
    );
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  try {
    if (Platform.OS === 'android') {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      return { token: tokenData.data, tokenType: 'fcm' };
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    if (!projectId) {
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    return { token: tokenData.data, tokenType: 'expo' };
  } catch (error) {
    return null;
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function savePushToken(token: string, tokenType: PushTokenType): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
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
    throw error;
  }
}

export async function removePushToken(token: string): Promise<void> {
  const { error } = await supabase
    .from('push_tokens')
    .delete()
    .eq('token', token);

  if (error) {
    // Error removing push token
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
  const {
    reminderId,
    title,
    body,
    triggerAt,
    originalTime,
    reminderUpdatedAt,
    actions,
    defaultSnoozeMinutes,
    snoozeMode,
    snoozePresetValues,
  } = reminder;

  const snoozeMinutes = Math.max(1, Math.floor(defaultSnoozeMinutes ?? 15));
  const reminderActions = actions ?? await getReminderActions(reminderId).catch(() => []);

  let categoryIdentifier: string | undefined;
  try {
    categoryIdentifier = await createDynamicNotificationCategory(reminderId, reminderActions, {
      defaultSnoozeMinutes: snoozeMinutes,
      snoozeMode,
      snoozePresetValues,
    });
  } catch {
    categoryIdentifier = undefined;
  }

  const content: Notifications.NotificationContentInput = {
    title,
    body,
    sound: 'default',
    ...(categoryIdentifier ? { categoryIdentifier } : {}),
    ...(Platform.OS === 'android' && { channelId: 'reminders' }), // Required for Android
    data: {
      reminderId,
      title,
      body,
      originalTime: originalTime ?? triggerAt.toISOString(),
      reminderUpdatedAt,
      defaultSnoozeMinutes: snoozeMinutes,
    },
  };

  const notificationId = await Notifications.scheduleNotificationAsync({
    content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerAt,
    },
  });

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
  } catch {
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
    return;
  }
}

async function deleteNotificationSchedule(id: string): Promise<void> {
  const { error } = await supabase.from('notification_schedules').delete().eq('id', id);
  if (error) {
    return;
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

export async function syncReminderNotifications(): Promise<void> {
  await syncLocalReminderSchedules();
  await sendResyncPush();
}

async function _doSyncLocalReminderSchedules(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const deviceId = getDeviceIdentifier();
  const now = Date.now();
  const preferences = await getUserPreferences();
  const defaultSnoozeMinutes = Math.max(1, Math.floor(preferences?.default_snooze_minutes ?? 15));
  const allScheduledNow = await Notifications.getAllScheduledNotificationsAsync();
  const scheduledById = new Map(allScheduledNow.map((request) => [request.identifier, request]));

  const reminders = await getAllFutureReminders();
  const existing = await fetchNotificationSchedules(user.id, deviceId);
  const existingByReminder = new Map(existing.map((record) => [record.reminder_id, record]));
  const keepIds = new Set<string>();

  const reminderIds = reminders.map((reminder) => reminder.id);
  const actionsByReminder = new Map<string, ReminderAction[]>();
  if (reminderIds.length > 0) {
    const { data: allActions } = await supabase
      .from('reminder_actions')
      .select('*')
      .in('reminder_id', reminderIds)
      .order('created_at', { ascending: true });

    for (const action of (allActions ?? []) as ReminderAction[]) {
      const current = actionsByReminder.get(action.reminder_id) ?? [];
      current.push(action);
      actionsByReminder.set(action.reminder_id, current);
    }
  }

  for (const reminder of reminders) {
    const scheduledAtMs = new Date(reminder.scheduled_time).getTime();
    if (Number.isNaN(scheduledAtMs)) {
      continue;
    }
    if (scheduledAtMs <= now) {
      continue;
    }

    // If notify-before has already passed (common after snooze), notify at due time.
    const preferredNotifyAtMs = scheduledAtMs - reminder.notify_before_minutes * 60 * 1000;
    const notifyAtMs = preferredNotifyAtMs > now ? preferredNotifyAtMs : scheduledAtMs;
    const notifyAt = new Date(notifyAtMs);

    const existingRecord = existingByReminder.get(reminder.id);
    if (existingRecord) {
      const reminderActions = actionsByReminder.get(reminder.id) ?? [];
      const existingNotification = scheduledById.get(existingRecord.notification_id);
      const hasCategoryIdentifier = hasSupportedCategoryIdentifier(
        existingNotification?.content.categoryIdentifier
      );
      const expectedCategoryIdentifier = getDynamicNotificationCategoryId(
        reminder.id,
        reminderActions,
        preferences?.snooze_mode ?? 'text_input'
      );
      const categoryMatches = existingNotification?.content.categoryIdentifier === expectedCategoryIdentifier;
      const existingTime = new Date(existingRecord.scheduled_for).getTime();
      const snoozedUntil = existingRecord.snoozed_until ? new Date(existingRecord.snoozed_until).getTime() : null;
      const reminderUpdatedAt = reminder.updated_at;
      const recordUpdatedAt = existingRecord.reminder_updated_at;

      if (snoozedUntil && snoozedUntil > now && hasCategoryIdentifier && categoryMatches) {
        keepIds.add(existingRecord.id);
        continue;
      }

      const unchanged = recordUpdatedAt && reminderUpdatedAt === recordUpdatedAt;
      const closeToTarget = Math.abs(existingTime - notifyAtMs) < 60 * 1000;

      if (unchanged && closeToTarget && existingTime > now && hasCategoryIdentifier && categoryMatches) {
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
      actions: actionsByReminder.get(reminder.id) ?? [],
      defaultSnoozeMinutes,
      snoozeMode: preferences?.snooze_mode ?? 'text_input',
      snoozePresetValues: preferences?.snooze_preset_values ?? [5, 10, 15, 30],
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
  } catch {
  }
}

function normalizeSnoozeMinutes(minutes: number | undefined): number {
  if (typeof minutes !== 'number' || Number.isNaN(minutes)) {
    return 15;
  }
  return Math.max(1, Math.floor(minutes));
}

async function applySnooze(
  reminderId: string,
  minutes: number,
  originalData: ReminderData
): Promise<void> {
  const normalizedMinutes = normalizeSnoozeMinutes(minutes);

  try {
    await snoozeReminderInDb(reminderId, normalizedMinutes);
    await syncReminderNotifications();
    return;
  } catch {
    // Fallback: keep user-facing behavior functional even if DB update fails.
  }

  await rescheduleSnooze(reminderId, normalizedMinutes, originalData);
}

async function rescheduleSnooze(
  reminderId: string,
  minutes: number,
  originalData: ReminderData
): Promise<void> {
  const normalizedMinutes = normalizeSnoozeMinutes(minutes);
  const triggerAt = new Date(Date.now() + normalizedMinutes * 60 * 1000);

  const notificationId = await scheduleReminder({
    reminderId,
    title: originalData.title ?? 'Reminder',
    body: originalData.body ?? 'Reminder is due!',
    triggerAt,
    originalTime: originalData.originalTime,
    reminderUpdatedAt: originalData.reminderUpdatedAt,
    defaultSnoozeMinutes: normalizedMinutes,
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return;
  }

  await upsertNotificationSchedule({
    userId: user.id,
    reminderId,
    deviceId: getDeviceIdentifier(),
    notificationId,
    scheduledFor: triggerAt.toISOString(),
    reminderUpdatedAt: originalData.reminderUpdatedAt ?? null,
    snoozedUntil: triggerAt.toISOString(),
  });
}

export async function handleNotificationResponse(
  response: Notifications.NotificationResponse,
  onReminderTap?: (reminderId: string) => void
): Promise<void> {
  const data = response.notification.request.content.data as ReminderData | undefined;

  // Skip test notifications
  if (data && 'testNotification' in data && data.testNotification) {
    return;
  }

  const reminderId = data?.reminderId;

  if (!reminderId || !isUuid(reminderId)) {
    return;
  }

  // Tapping the notification body should always deep-link to Progress and open this reminder.
  if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
    onReminderTap?.(reminderId);
    return;
  }

  const handled = await handleDynamicNotificationAction(
    response,
    () => {
      void syncReminderNotifications().catch(() => {});
    },
    (id, minutes) => {
      void applySnooze(id, minutes, data ?? {}).catch(() => {});
    }
  );

  if (handled) {
    return;
  }

  onReminderTap?.(reminderId);
}
