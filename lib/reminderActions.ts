import { Linking } from 'react-native';
import { supabase } from './supabase';
import {
  ReminderAction,
  CreateReminderActionInput,
  ReminderAttachment,
  CreateAttachmentInput,
} from './types';

// ==================== REMINDER ACTIONS ====================

/**
 * Get all actions for a reminder
 */
export async function getReminderActions(reminderId: string): Promise<ReminderAction[]> {
  const { data, error } = await supabase
    .from('reminder_actions')
    .select('*')
    .eq('reminder_id', reminderId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Create a new reminder action
 */
export async function createReminderAction(
  reminderId: string,
  input: CreateReminderActionInput
): Promise<ReminderAction> {
  const { data, error } = await supabase
    .from('reminder_actions')
    .insert({
      reminder_id: reminderId,
      action_type: input.action_type,
      action_value: input.action_value,
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create multiple reminder actions
 */
export async function createReminderActions(
  reminderId: string,
  inputs: CreateReminderActionInput[]
): Promise<ReminderAction[]> {
  if (inputs.length === 0) return [];

  const rows = inputs.map(input => ({
    reminder_id: reminderId,
    action_type: input.action_type,
    action_value: input.action_value,
    metadata: input.metadata || {},
  }));

  const { data, error } = await supabase
    .from('reminder_actions')
    .insert(rows)
    .select();

  if (error) throw error;
  return data ?? [];
}

/**
 * Update a reminder action
 */
export async function updateReminderAction(
  actionId: string,
  updates: Partial<CreateReminderActionInput>
): Promise<ReminderAction> {
  const { data, error } = await supabase
    .from('reminder_actions')
    .update(updates)
    .eq('id', actionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a reminder action
 */
export async function deleteReminderAction(actionId: string): Promise<void> {
  const { error } = await supabase
    .from('reminder_actions')
    .delete()
    .eq('id', actionId);

  if (error) throw error;
}

/**
 * Delete all actions for a reminder
 */
export async function deleteReminderActions(reminderId: string): Promise<void> {
  const { error } = await supabase
    .from('reminder_actions')
    .delete()
    .eq('reminder_id', reminderId);

  if (error) throw error;
}

// ==================== REMINDER ATTACHMENTS ====================

/**
 * Get all attachments for a reminder
 */
export async function getReminderAttachments(reminderId: string): Promise<ReminderAttachment[]> {
  const { data, error } = await supabase
    .from('reminder_attachments')
    .select('*')
    .eq('reminder_id', reminderId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Create a new reminder attachment
 */
export async function createReminderAttachment(
  reminderId: string,
  input: CreateAttachmentInput
): Promise<ReminderAttachment> {
  const { data, error } = await supabase
    .from('reminder_attachments')
    .insert({
      reminder_id: reminderId,
      attachment_type: input.attachment_type,
      storage_url: input.storage_url,
      file_name: input.file_name || null,
      file_size: input.file_size || null,
      mime_type: input.mime_type || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create multiple attachments
 */
export async function createReminderAttachments(
  reminderId: string,
  inputs: CreateAttachmentInput[]
): Promise<ReminderAttachment[]> {
  if (inputs.length === 0) return [];

  const rows = inputs.map(input => ({
    reminder_id: reminderId,
    attachment_type: input.attachment_type,
    storage_url: input.storage_url,
    file_name: input.file_name || null,
    file_size: input.file_size || null,
    mime_type: input.mime_type || null,
  }));

  const { data, error } = await supabase
    .from('reminder_attachments')
    .insert(rows)
    .select();

  if (error) throw error;
  return data ?? [];
}

/**
 * Delete a reminder attachment
 */
export async function deleteReminderAttachment(attachmentId: string): Promise<void> {
  const { error } = await supabase
    .from('reminder_attachments')
    .delete()
    .eq('id', attachmentId);

  if (error) throw error;
}

/**
 * Delete all attachments for a reminder
 */
export async function deleteReminderAttachments(reminderId: string): Promise<void> {
  const { error } = await supabase
    .from('reminder_attachments')
    .delete()
    .eq('reminder_id', reminderId);

  if (error) throw error;
}

// ==================== ACTION EXECUTION ====================

/**
 * Execute a reminder action (call, email, open link, etc.)
 */
export async function executeReminderAction(action: ReminderAction): Promise<void> {
  switch (action.action_type) {
    case 'call': {
      const phoneNumber = action.action_value.phone || action.action_value;
      const url = `tel:${phoneNumber}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        throw new Error('Cannot open phone dialer');
      }
      break;
    }

    case 'link': {
      const url = action.action_value.url || action.action_value;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        throw new Error('Cannot open URL');
      }
      break;
    }

    case 'email': {
      const email = action.action_value.email || action.action_value;
      const subject = action.action_value.subject || '';
      const body = action.action_value.body || '';
      const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        throw new Error('Cannot open email client');
      }
      break;
    }

    case 'location': {
      const { address, lat, lng } = action.action_value;
      let url: string;

      if (lat && lng) {
        // Use coordinates
        url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      } else if (address) {
        // Use address
        url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      } else {
        throw new Error('No location data available');
      }

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        throw new Error('Cannot open maps');
      }
      break;
    }

    case 'note':
    case 'assign':
    case 'photo':
    case 'voice':
    case 'subtasks':
      // These are informational actions, not executable
      break;

    default:
      break;
  }
}

/**
 * Get a user-friendly label for an action
 */
export function getActionLabel(action: ReminderAction): string {
  switch (action.action_type) {
    case 'call':
      return action.action_value.label || action.action_value.phone || 'Call';
    case 'link':
      return action.action_value.label || 'Open Link';
    case 'email':
      return action.action_value.label || action.action_value.email || 'Send Email';
    case 'location':
      return action.action_value.label || action.action_value.address || 'View Location';
    case 'note':
      return 'View Note';
    case 'assign':
      return `Shared with ${action.action_value.users?.length || 0} people`;
    case 'photo':
      return 'View Photo';
    case 'voice':
      return 'Play Voice Note';
    case 'subtasks':
      const total = action.action_value.items?.length || 0;
      const done = action.action_value.items?.filter((item: any) => item.done).length || 0;
      return `${done}/${total} subtasks`;
    default:
      return 'Action';
  }
}

/**
 * Get the appropriate icon name for an action
 */
export function getActionIcon(actionType: string): string {
  switch (actionType) {
    case 'call':
      return 'phone';
    case 'link':
      return 'link';
    case 'email':
      return 'email';
    case 'location':
      return 'location-on';
    case 'note':
      return 'description';
    case 'assign':
      return 'people';
    case 'photo':
      return 'photo-camera';
    case 'voice':
      return 'mic';
    case 'subtasks':
      return 'checklist';
    default:
      return 'label';
  }
}
