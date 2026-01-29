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

export type FrequencyUnit = 'days' | 'weeks' | 'months' | 'years';

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

export const DAYS_OF_WEEK: { label: string; short: string; value: DayOfWeek }[] = [
  { label: 'Sunday', short: 'S', value: 'sun' },
  { label: 'Monday', short: 'M', value: 'mon' },
  { label: 'Tuesday', short: 'T', value: 'tue' },
  { label: 'Wednesday', short: 'W', value: 'wed' },
  { label: 'Thursday', short: 'T', value: 'thu' },
  { label: 'Friday', short: 'F', value: 'fri' },
  { label: 'Saturday', short: 'S', value: 'sat' },
];
