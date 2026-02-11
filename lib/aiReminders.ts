import { supabase } from './supabase';
import { CreateReminderInput, CreateRecurringRuleInput } from './types';
import type { File as ExpoFile } from 'expo-file-system';

interface ParseResult {
  title: string;
  scheduled_time: string;
  description?: string;
}

interface VoiceParseResult {
  transcript: string;
  reminder: CreateReminderInput;
  recurringRule: CreateRecurringRuleInput | null;
}

interface VoiceConversationResult {
  type: 'conversation';
  transcript: string;
  response: string;
}

interface VoiceReminderResult {
  type: 'reminder';
  transcript: string;
  reminders: Array<{
    reminder: CreateReminderInput;
    recurringRule: CreateRecurringRuleInput | null;
  }>;
}

export type VoiceProcessResult = VoiceConversationResult | VoiceReminderResult;

function normalizeProcessedReminder(reminderData: any, fallbackDescription: string) {
  const reminder: CreateReminderInput = {
    title: reminderData?.title || 'Reminder',
    scheduled_time: reminderData?.scheduled_time,
    description: reminderData?.description || fallbackDescription,
    is_priority: Boolean(reminderData?.is_priority),
    notify_before_minutes: reminderData?.notify_before_minutes ?? 0,
  };

  let recurringRule: CreateRecurringRuleInput | null = null;
  if (reminderData?.recurring_rule) {
    const rule = reminderData.recurring_rule;
    recurringRule = {
      name: rule.name || 'Custom recurring',
      frequency: rule.frequency || 1,
      frequency_unit: rule.frequency_unit || 'days',
      selected_days: rule.selected_days || [],
    };
  }

  return { reminder, recurringRule };
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseTimeToken(token: string): { hours: number; minutes: number } | null {
  const trimmed = token.trim().toLowerCase();
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3];

  if (meridiem) {
    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
  }

  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

function parseRelativeDate(text: string, now: Date): Date | null {
  const lower = text.toLowerCase();
  if (lower.includes('today')) return startOfDay(now);
  if (lower.includes('tomorrow')) {
    const date = startOfDay(now);
    date.setDate(date.getDate() + 1);
    return date;
  }
  if (lower.includes('next week')) {
    const date = startOfDay(now);
    date.setDate(date.getDate() + 7);
    return date;
  }
  if (lower.includes('next month')) {
    const date = startOfDay(now);
    date.setMonth(date.getMonth() + 1);
    return date;
  }
  return null;
}

function parseWeekday(text: string, now: Date): Date | null {
  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const lower = text.toLowerCase();
  const match = weekdays.find((day) => lower.includes(day));
  if (!match) return null;

  const targetIndex = weekdays.indexOf(match);
  const currentIndex = now.getDay();
  const delta = (targetIndex - currentIndex + 7) % 7;
  const date = startOfDay(now);
  date.setDate(date.getDate() + (delta === 0 ? 7 : delta));
  return date;
}

function parseTime(text: string): { hours: number; minutes: number } | null {
  const lower = text.toLowerCase();
  const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/;
  const match = lower.match(timeRegex);
  if (!match) return null;
  return parseTimeToken(match[0]);
}

function parseRecurring(text: string): { frequency: number; unit: 'days' | 'weeks' | 'months' | 'years' } | null {
  const lower = text.toLowerCase();
  if (lower.includes('every day') || lower.includes('daily')) return { frequency: 1, unit: 'days' };
  if (lower.includes('every week') || lower.includes('weekly')) return { frequency: 1, unit: 'weeks' };
  if (lower.includes('every month') || lower.includes('monthly')) return { frequency: 1, unit: 'months' };
  if (lower.includes('every year') || lower.includes('yearly')) return { frequency: 1, unit: 'years' };
  return null;
}

function buildTitle(text: string): string {
  const cleaned = text
    .replace(/remind me to/i, '')
    .replace(/please/i, '')
    .replace(/\bat\b\s*\d{1,2}(:\d{2})?\s*(am|pm)?/gi, '')
    .replace(/\b(on|next|this)\b\s+[a-z]+/gi, '')
    .replace(/\b(today|tomorrow)\b/gi, '')
    .replace(/\bevery\b\s+[a-z]+/gi, '')
    .trim();

  return cleaned.length > 0 ? cleaned : 'Reminder';
}

export async function parseReminderFromText(text: string): Promise<CreateReminderInput> {
  try {
    const result = await parseRemindersFromText(text);
    if (result.type === 'reminder' && result.reminders.length > 0) {
      return result.reminders[0].reminder;
    }
    return buildLocalParse(text);
  } catch {
    return buildLocalParse(text);
  }
}

export async function parseRemindersFromText(text: string): Promise<VoiceProcessResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Please enter a reminder request');
  }

  const fallbackReminder = buildLocalParse(trimmed);

  try {
    const timezoneOffset = new Date().getTimezoneOffset();
    const { data, error } = await supabase.functions.invoke('parse-reminder', {
      body: {
        text: trimmed,
        current_time: new Date().toISOString(),
        timezone_offset: timezoneOffset,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to parse reminder text');
    }

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response from reminder parser');
    }

    if (data.type === 'conversation') {
      const response = typeof data.response === 'string' ? data.response.trim() : '';
      return {
        type: 'conversation',
        transcript: trimmed,
        response: response || "I can create reminders for you. Try something like 'remind me to call mom at 7pm'.",
      };
    }

    const remindersArray = data.reminders || (data.reminder ? [data.reminder] : null);
    if (!Array.isArray(remindersArray) || remindersArray.length === 0) {
      return {
        type: 'reminder',
        transcript: trimmed,
        reminders: [{ reminder: fallbackReminder, recurringRule: null }],
      };
    }

    const processedReminders = remindersArray.map((reminderData: any) =>
      normalizeProcessedReminder(reminderData, trimmed)
    );

    return {
      type: 'reminder',
      transcript: trimmed,
      reminders: processedReminders,
    };
  } catch {
    return {
      type: 'reminder',
      transcript: trimmed,
      reminders: [{ reminder: fallbackReminder, recurringRule: null }],
    };
  }
}

function buildLocalParse(text: string): CreateReminderInput {
  const now = new Date();
  const dateBase = parseRelativeDate(text, now) || parseWeekday(text, now) || startOfDay(now);
  const time = parseTime(text) || { hours: now.getHours(), minutes: now.getMinutes() + 10 };

  const scheduled = new Date(dateBase);
  scheduled.setHours(time.hours, time.minutes, 0, 0);

  if (scheduled.getTime() < now.getTime()) {
    scheduled.setDate(scheduled.getDate() + 1);
  }

  const title = buildTitle(text);
  const recurring = parseRecurring(text);

  const input: CreateReminderInput = {
    title,
    description: text,
    scheduled_time: scheduled.toISOString(),
    notify_before_minutes: 0,
    is_priority: text.toLowerCase().includes('priority'),
  };

  if (recurring) {
    input.description = `${text} (recurs every ${recurring.frequency} ${recurring.unit})`;
  }

  return input;
}

export async function parseReminderFromVoice(
  audioFile: ExpoFile,
  mimeType: string
): Promise<VoiceProcessResult> {
  try {
    // Get the current session to ensure we have auth token
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('You must be logged in to use voice reminders');
    }

    // Get user's timezone offset in minutes
    const timezoneOffset = new Date().getTimezoneOffset();

    const audioBytes = await audioFile.bytes();
    const body = audioBytes.buffer.slice(
      audioBytes.byteOffset,
      audioBytes.byteOffset + audioBytes.byteLength
    );
    const fileName = audioFile?.name || 'audio.m4a';

    const { data, error } = await supabase.functions.invoke('voice-to-reminder', {
      body,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'x-audio-mime': mimeType,
        'x-audio-name': fileName,
        'x-timezone-offset': String(timezoneOffset),
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to process voice');
    }

    if (!data?.transcript) {
      throw new Error('Invalid response from voice processing');
    }

    // Check if this is a conversational response
    if (data.type === 'conversation') {
      if (!data.response) {
        throw new Error('Invalid conversation response from voice processing');
      }

      return {
        type: 'conversation',
        transcript: data.transcript,
        response: data.response,
      };
    }

    // Handle reminder creation response - support both single and multiple reminders
    const remindersArray = data.reminders || (data.reminder ? [data.reminder] : null);

    if (!remindersArray || !Array.isArray(remindersArray) || remindersArray.length === 0) {
      throw new Error('Invalid reminder response from voice processing');
    }

    const processedReminders = remindersArray.map((reminderData: any) =>
      normalizeProcessedReminder(reminderData, data.transcript)
    );

    return {
      type: 'reminder',
      transcript: data.transcript,
      reminders: processedReminders,
    };
  } catch (err) {
    // If voice processing fails, throw error to be handled by caller
    const message = err instanceof Error ? err.message : 'Failed to process voice recording';
    throw new Error(message);
  }
}
