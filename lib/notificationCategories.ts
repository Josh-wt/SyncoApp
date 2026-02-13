/**
 * Dynamic Notification Categories System
 *
 * This module handles creating and managing notification categories dynamically
 * based on reminder quick actions. Each reminder can have unique action buttons
 * in its notification.
 */

import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import { ReminderAction, ReminderActionType, SnoozeMode } from './types';
import { updateReminderStatus } from './reminders';
import { getReminderActions } from './reminderActions';

const ACTIONABLE_NOTIFICATION_ACTION_TYPES: ReminderActionType[] = ['call', 'link', 'location', 'email'];

// Action identifier prefixes
const PREFIX_COMPLETE = 'complete';
const PREFIX_SNOOZE = 'snooze';
const PREFIX_CALL = 'call';
const PREFIX_LINK = 'link';
const PREFIX_LOCATION = 'location';
const PREFIX_EMAIL = 'email';
const PREFIX_NOTE = 'note';
const PREFIX_SUBTASKS = 'subtasks';
const MAX_NOTIFICATION_ACTIONS = 4;
const MAX_SNOOZE_PRESETS = 3;

function sanitizeIdentifierPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function hashString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

/**
 * Generates a unique category identifier for a specific reminder.
 * Categories must be reminder-specific so action identifiers and snooze behavior
 * don't drift when multiple reminders share the same action types.
 */
function generateCategoryId(
  reminderId: string,
  actionTypes: ReminderActionType[],
  snoozeMode: SnoozeMode
): string {
  const sortedTypes = [...actionTypes].sort();
  const actionSignature = sortedTypes.length > 0 ? sortedTypes.join('_') : 'default';
  const categoryId = [
    'reminder',
    sanitizeIdentifierPart(reminderId) || 'unknown',
    sanitizeIdentifierPart(snoozeMode) || 'snooze',
    sanitizeIdentifierPart(actionSignature) || 'default',
  ].join('_');

  // Keep category identifiers within a safe length for native APIs.
  if (categoryId.length <= 120) {
    return categoryId;
  }

  const digest = hashString(categoryId);
  return `${categoryId.slice(0, 100)}_${digest}`;
}

export function getDynamicNotificationCategoryId(
  reminderId: string,
  actions: ReminderAction[],
  snoozeMode: SnoozeMode = 'text_input'
): string {
  const actionableActions = actions.filter((action) =>
    ACTIONABLE_NOTIFICATION_ACTION_TYPES.includes(action.action_type)
  );
  const actionTypes = actionableActions.map((action) => action.action_type);
  return generateCategoryId(reminderId, actionTypes, snoozeMode);
}

function parseMinutesFromUserText(value: string | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/-?\d+/);
  if (!match) return null;

  const parsed = Number.parseInt(match[0], 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.floor(parsed);
}

function normalizeSnoozePresets(values: number[] | undefined, fallbackMinutes: number): number[] {
  const source = Array.isArray(values) ? values : [];
  const normalized = source
    .map((value) => Math.floor(Number(value)))
    .filter((value) => Number.isFinite(value) && value > 0);

  const uniqueSorted = Array.from(new Set(normalized)).sort((a, b) => a - b);
  if (uniqueSorted.length > 0) {
    return uniqueSorted.slice(0, MAX_SNOOZE_PRESETS);
  }

  return [Math.max(1, Math.floor(fallbackMinutes))];
}

/**
 * Creates a notification action button config for a reminder action
 */
function createNotificationActionButton(
  action: ReminderAction,
  index: number
): Notifications.NotificationAction {
  const configs: Partial<Record<ReminderActionType, {
    prefix: string;
    title: string;
    emoji: string;
    opensApp: boolean;
  }>> = {
    call: {
      prefix: PREFIX_CALL,
      title: 'Call',
      emoji: '📞',
      opensApp: false,
    },
    link: {
      prefix: PREFIX_LINK,
      title: 'Open',
      emoji: '🔗',
      opensApp: false,
    },
    location: {
      prefix: PREFIX_LOCATION,
      title: 'Navigate',
      emoji: '📍',
      opensApp: false,
    },
    email: {
      prefix: PREFIX_EMAIL,
      title: 'Email',
      emoji: '📧',
      opensApp: false,
    },
    note: {
      prefix: PREFIX_NOTE,
      title: 'Note',
      emoji: '📝',
      opensApp: true,
    },
    subtasks: {
      prefix: PREFIX_SUBTASKS,
      title: 'Tasks',
      emoji: '✓',
      opensApp: true,
    },
  };

  const config = configs[action.action_type];
  if (!config) {
    return {
      identifier: `action_${action.id}`,
      buttonTitle: action.action_type,
      options: { opensAppToForeground: true },
    };
  }

  return {
    identifier: `${config.prefix}_${action.id}`,
    buttonTitle: `${config.emoji} ${config.title}`,
    options: {
      opensAppToForeground: config.opensApp,
    },
  };
}

/**
 * Dynamically creates a notification category based on reminder actions.
 * Returns the category identifier to use when scheduling the notification.
 *
 * @param reminderId - The reminder ID
 * @param actions - Array of reminder actions from the database
 * @param snoozeMinutes - Default snooze duration (optional)
 * @returns The category identifier
 */
export async function createDynamicNotificationCategory(
  reminderId: string,
  actions: ReminderAction[],
  options?: {
    defaultSnoozeMinutes?: number;
    snoozeMode?: SnoozeMode;
    snoozePresetValues?: number[];
  }
): Promise<string> {
  const snoozeMode = options?.snoozeMode ?? 'text_input';
  const defaultSnoozeMinutes = Math.max(1, Math.floor(options?.defaultSnoozeMinutes ?? 15));
  const snoozePresets = normalizeSnoozePresets(options?.snoozePresetValues, defaultSnoozeMinutes);

  // Filter to only actionable types that can be executed from notification
  const actionableActions = actions.filter((action) =>
    ACTIONABLE_NOTIFICATION_ACTION_TYPES.includes(action.action_type)
  );

  // Generate category ID based on action types
  const categoryId = getDynamicNotificationCategoryId(reminderId, actions, snoozeMode);

  const notificationActions: Notifications.NotificationAction[] = [];

  // Add quick action buttons (limit to 2 to leave room for Complete/Snooze)
  actionableActions.slice(0, 2).forEach((action, index) => {
    notificationActions.push(createNotificationActionButton(action, index));
  });

  // Add Snooze button
  if (snoozeMode === 'text_input') {
    notificationActions.push({
      identifier: `${PREFIX_SNOOZE}_${reminderId}`,
      buttonTitle: '⏰ Snooze',
      textInput: {
        submitButtonTitle: 'Snooze',
        placeholder: 'Minutes',
      },
      options: { opensAppToForeground: false },
    });
  } else {
    const availablePresetSlots = Math.max(1, MAX_NOTIFICATION_ACTIONS - notificationActions.length - 1);
    const presetButtons = snoozePresets.slice(0, availablePresetSlots);

    presetButtons.forEach((minutes) => {
      const label = minutes >= 60
        ? `${minutes / 60}h`
        : `${minutes}m`;
      notificationActions.push({
        identifier: `${PREFIX_SNOOZE}_${minutes}_${reminderId}`,
        buttonTitle: `⏰ ${label}`,
        options: { opensAppToForeground: false },
      });
    });
  }

  // Add Complete button (always last, destructive style)
  notificationActions.push({
    identifier: `${PREFIX_COMPLETE}_${reminderId}`,
    buttonTitle: '✓ Complete',
    options: {
      opensAppToForeground: false,
      isDestructive: true,
    },
  });

  // Create/update the category
  try {
    await Notifications.setNotificationCategoryAsync(
      categoryId,
      notificationActions,
      {
        allowInCarPlay: true,
      }
    );
  } catch (error) {
    throw error;
  }

  return categoryId;
}

/**
 * Handles notification action button responses.
 * This is called when a user taps an action button on a notification.
 */
export async function handleDynamicNotificationAction(
  response: Notifications.NotificationResponse,
  onComplete?: (reminderId: string) => void,
  onSnooze?: (reminderId: string, minutes: number) => void
): Promise<boolean> {
  const { actionIdentifier, notification } = response;
  const data = notification.request.content.data as any;
  const reminderId = data?.reminderId;

  if (!reminderId) {
    return false;
  }

  // Parse action identifier: "prefix_actionId", "prefix_reminderId", or "snooze_minutes_reminderId"
  const parts = actionIdentifier.split('_');
  if (parts.length < 2) return false;

  const [prefix, id] = parts;

  try {
    switch (prefix) {
      case PREFIX_COMPLETE:
        await updateReminderStatus(reminderId, 'completed');
        onComplete?.(reminderId);
        await Notifications.dismissNotificationAsync(notification.request.identifier);
        return true;

      case PREFIX_SNOOZE:
        const presetMinutes =
          parts.length >= 3 ? Number.parseInt(parts[1], 10) : Number.NaN;
        const typedMinutes = parseMinutesFromUserText(response.userText);
        const rawSnoozeMinutes = data?.defaultSnoozeMinutes;
        const fallbackMinutes =
          typeof rawSnoozeMinutes === 'number' && Number.isFinite(rawSnoozeMinutes)
            ? rawSnoozeMinutes
            : Number.parseInt(String(rawSnoozeMinutes), 10) || 15;
        const snoozeMinutes =
          Number.isFinite(presetMinutes) && presetMinutes > 0
            ? Math.floor(presetMinutes)
            : typedMinutes ?? Math.max(1, Math.floor(fallbackMinutes));
        onSnooze?.(reminderId, snoozeMinutes);
        // Snoozing is handled by the main notification handler
        await Notifications.dismissNotificationAsync(notification.request.identifier);
        return true;

      case PREFIX_CALL: {
        const actions = await getReminderActions(reminderId);
        const callAction = actions.find(a => a.id === id && a.action_type === 'call');
        if (callAction) {
          const phone = callAction.action_value.phone || callAction.action_value;
          if (phone) {
            await Linking.openURL(`tel:${phone}`);
            await Notifications.dismissNotificationAsync(notification.request.identifier);
            return true;
          }
        }
        break;
      }

      case PREFIX_LINK: {
        const actions = await getReminderActions(reminderId);
        const linkAction = actions.find(a => a.id === id && a.action_type === 'link');
        if (linkAction) {
          const url = linkAction.action_value.url || linkAction.action_value;
          if (url) {
            await Linking.openURL(url);
            await Notifications.dismissNotificationAsync(notification.request.identifier);
            return true;
          }
        }
        break;
      }

      case PREFIX_LOCATION: {
        const actions = await getReminderActions(reminderId);
        const locationAction = actions.find(a => a.id === id && a.action_type === 'location');
        if (locationAction) {
          const { address, lat, lng } = locationAction.action_value;
          let mapUrl: string;

          if (lat && lng) {
            // Use coordinates
            mapUrl = Platform.OS === 'ios'
              ? `maps:?q=${lat},${lng}`
              : `geo:0,0?q=${lat},${lng}`;
          } else if (address) {
            // Use address
            mapUrl = Platform.OS === 'ios'
              ? `maps:?q=${encodeURIComponent(address)}`
              : `geo:0,0?q=${encodeURIComponent(address)}`;
          } else {
            return false;
          }

          await Linking.openURL(mapUrl);
          await Notifications.dismissNotificationAsync(notification.request.identifier);
          return true;
        }
        break;
      }

      case PREFIX_EMAIL: {
        const actions = await getReminderActions(reminderId);
        const emailAction = actions.find(a => a.id === id && a.action_type === 'email');
        if (emailAction) {
          const email = emailAction.action_value.email || emailAction.action_value;
          const subject = emailAction.action_value.subject || '';
          const body = emailAction.action_value.body || '';

          const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          await Linking.openURL(mailtoUrl);
          await Notifications.dismissNotificationAsync(notification.request.identifier);
          return true;
        }
        break;
      }

      case PREFIX_NOTE:
      case PREFIX_SUBTASKS:
        // These require opening the app
        // The main handler will handle opening to the specific reminder
        return false;
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Get action data to embed in notification for faster access
 * This reduces the need to query the database when handling actions
 */
export function prepareNotificationActionData(actions: ReminderAction[]): Record<string, any> {
  const actionData: Record<string, any> = {};

  actions.forEach(action => {
    actionData[action.id] = {
      type: action.action_type,
      value: action.action_value,
    };
  });

  return actionData;
}
