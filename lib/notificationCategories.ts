/**
 * Dynamic Notification Categories System
 *
 * This module handles creating and managing notification categories dynamically
 * based on reminder quick actions. Each reminder can have unique action buttons
 * in its notification.
 */

import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import { ReminderAction, ReminderActionType } from './types';
import { updateReminderStatus } from './reminders';
import { getReminderActions } from './reminderActions';

// Action identifier prefixes
const PREFIX_COMPLETE = 'complete';
const PREFIX_SNOOZE = 'snooze';
const PREFIX_CALL = 'call';
const PREFIX_LINK = 'link';
const PREFIX_LOCATION = 'location';
const PREFIX_EMAIL = 'email';
const PREFIX_NOTE = 'note';
const PREFIX_SUBTASKS = 'subtasks';

/**
 * Generates a unique category identifier based on action types combination
 * Example: "actions_call_link" or "actions_email_location"
 */
function generateCategoryId(actionTypes: ReminderActionType[]): string {
  if (actionTypes.length === 0) {
    return 'reminder_default';
  }

  const sortedTypes = [...actionTypes].sort();
  return `actions_${sortedTypes.join('_')}`;
}

/**
 * Creates a notification action button config for a reminder action
 */
function createNotificationActionButton(
  action: ReminderAction,
  index: number
): Notifications.NotificationAction {
  const configs: Record<ReminderActionType, {
    prefix: string;
    title: string;
    emoji: string;
    opensApp: boolean;
  }> = {
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
  snoozeMinutes: number = 15
): Promise<string> {
  console.log('🔔 [CATEGORY] Creating notification category for reminder:', reminderId);
  console.log('🔔 [CATEGORY] Received actions:', JSON.stringify(actions, null, 2));
  console.log('🔔 [CATEGORY] Snooze minutes:', snoozeMinutes);

  // Filter to only actionable types that can be executed from notification
  const actionableTypes: ReminderActionType[] = ['call', 'link', 'location', 'email'];
  const actionableActions = actions.filter(a =>
    actionableTypes.includes(a.action_type)
  );

  console.log('🔔 [CATEGORY] Actionable actions (filtered):', actionableActions.length);
  console.log('🔔 [CATEGORY] Actionable actions:', JSON.stringify(actionableActions, null, 2));

  // Generate category ID based on action types
  const actionTypes = actionableActions.map(a => a.action_type);
  const categoryId = generateCategoryId(actionTypes);

  console.log('🔔 [CATEGORY] Generated category ID:', categoryId);

  const notificationActions: Notifications.NotificationAction[] = [];

  // Add quick action buttons (limit to 2 to leave room for Complete/Snooze)
  actionableActions.slice(0, 2).forEach((action, index) => {
    notificationActions.push(createNotificationActionButton(action, index));
  });

  // Add Snooze button
  const snoozeLabel = snoozeMinutes >= 60
    ? `⏰ Snooze ${snoozeMinutes / 60}h`
    : `⏰ Snooze ${snoozeMinutes}m`;

  notificationActions.push({
    identifier: `${PREFIX_SNOOZE}_${reminderId}`,
    buttonTitle: snoozeLabel,
    options: { opensAppToForeground: false },
  });

  // Add Complete button (always last, destructive style)
  notificationActions.push({
    identifier: `${PREFIX_COMPLETE}_${reminderId}`,
    buttonTitle: '✓ Complete',
    options: {
      opensAppToForeground: false,
      isDestructive: true,
    },
  });

  console.log('🔔 [CATEGORY] Total notification actions:', notificationActions.length);
  console.log('🔔 [CATEGORY] Actions:', JSON.stringify(notificationActions, null, 2));

  // Create/update the category
  try {
    await Notifications.setNotificationCategoryAsync(
      categoryId,
      notificationActions,
      {
        allowInCarPlay: true,
        allowAnnouncement: true,
      }
    );
    console.log('✅ [CATEGORY] Successfully registered category:', categoryId);

    // Verify it was registered
    const categories = await Notifications.getNotificationCategoriesAsync();
    console.log('🔔 [CATEGORY] All registered categories:', categories.length);
    console.log('🔔 [CATEGORY] Category IDs:', categories.map(c => c.identifier));

  } catch (error) {
    console.error('❌ [CATEGORY] Error registering category:', error);
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
    console.warn('No reminderId in notification data');
    return false;
  }

  // Parse action identifier: "prefix_actionId" or "prefix_reminderId"
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
        const snoozeMinutes = data?.defaultSnoozeMinutes || 15;
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
  } catch (error) {
    console.error('Error handling notification action:', error);
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
