export type ReminderStatus = 'completed' | 'current' | 'upcoming' | 'future' | 'placeholder';

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  scheduled_time: string;
  status: ReminderStatus;
  is_priority: boolean;
  notify_before_minutes: number;
  notified_at: string | null;
  priority_notified_at: string | null;
  recurring_rule_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateReminderInput {
  title: string;
  description?: string;
  scheduled_time: string;
  status?: ReminderStatus;
  is_priority?: boolean;
  notify_before_minutes?: number;
  recurring_rule_id?: string;
}

export interface UpdateReminderInput {
  title?: string;
  description?: string;
  scheduled_time?: string;
  status?: ReminderStatus;
  is_priority?: boolean;
  notify_before_minutes?: number;
}

export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  device_id: string | null;
  platform: string | null;
  created_at: string;
  updated_at: string;
}

export const NOTIFICATION_TIMING_OPTIONS = [
  { label: 'At scheduled time', value: 0 },
  { label: '5 minutes before', value: 5 },
  { label: '15 minutes before', value: 15 },
  { label: '30 minutes before', value: 30 },
  { label: '1 hour before', value: 60 },
] as const;

export type FrequencyUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';

export type DayOfWeek = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

// Database schema for recurring rules
export interface RecurringRule {
  id: string;
  user_id?: string;
  name: string;
  frequency: number;
  frequency_unit: FrequencyUnit;
  selected_days: DayOfWeek[];
  created_at?: string;
  updated_at?: string;
}

// Input for creating a recurring rule
export interface CreateRecurringRuleInput {
  name: string;
  frequency: number;
  frequency_unit: FrequencyUnit;
  selected_days: DayOfWeek[];
}

export type RecurringOption = 'none' | 'daily' | 'saved' | 'custom';

// App notification types (in-app notifications, not push)
export type NotificationCategory =
  | 'reminder'
  | 'project'
  | 'sync'
  | 'security'
  | 'subscription'
  | 'meeting'
  | 'system';

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  timestamp: Date;
  isRead: boolean;
  metadata?: {
    reminderId?: string;
    location?: string;
    device?: string;
  };
}

export const DAYS_OF_WEEK: { label: string; short: string; value: DayOfWeek }[] = [
  { label: 'Sunday', short: 'S', value: 'sun' },
  { label: 'Monday', short: 'M', value: 'mon' },
  { label: 'Tuesday', short: 'T', value: 'tue' },
  { label: 'Wednesday', short: 'W', value: 'wed' },
  { label: 'Thursday', short: 'T', value: 'thu' },
  { label: 'Friday', short: 'F', value: 'fri' },
  { label: 'Saturday', short: 'S', value: 'sat' },
];

// User preferences types
export type SnoozeMode = 'text_input' | 'presets';
export type ThemeMode = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large';

export interface UserPreferences {
  id: string;
  user_id: string;
  snooze_mode: SnoozeMode;
  // Notification preferences
  notification_sound: boolean;
  notification_vibration: boolean;
  priority_notification_sound: boolean;
  default_notify_before_minutes: number;
  // Appearance preferences
  theme: ThemeMode;
  accent_color: string;
  font_size: FontSize;
  // Reminder preferences
  auto_delete_completed: boolean;
  auto_delete_days: number;
  default_recurring_enabled: boolean;
  // Advanced preferences
  debug_mode: boolean;
  analytics_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateUserPreferencesInput {
  snooze_mode?: SnoozeMode;
  // Notification preferences
  notification_sound?: boolean;
  notification_vibration?: boolean;
  priority_notification_sound?: boolean;
  default_notify_before_minutes?: number;
  // Appearance preferences
  theme?: ThemeMode;
  accent_color?: string;
  font_size?: FontSize;
  // Reminder preferences
  auto_delete_completed?: boolean;
  auto_delete_days?: number;
  default_recurring_enabled?: boolean;
  // Advanced preferences
  debug_mode?: boolean;
  analytics_enabled?: boolean;
}

// Account codes and device sync types
export interface AccountCode {
  id: string;
  user_id: string;
  code: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface DeviceSyncRecord {
  id: string;
  user_id: string;
  account_code_id: string | null;
  device_id: string;
  device_name: string | null;
  platform: string | null;
  synced_at: string;
}

export interface DeviceInfo {
  device_id: string;
  device_name?: string;
  platform?: string;
}
