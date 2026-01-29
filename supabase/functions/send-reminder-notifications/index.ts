import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  scheduled_time: string;
  is_priority: boolean;
  notify_before_minutes: number;
  notified_at: string | null;
  priority_notified_at: string | null;
}

interface PushToken {
  token: string;
  user_id: string;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
}

Deno.serve(async (req) => {
  try {
    // Verify the request is authorized (using service role key from cron)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();

    // 1. Get reminders due for regular notification
    // Condition: (scheduled_time - notify_before_minutes) <= now AND notified_at IS NULL
    const { data: dueReminders, error: remindersError } = await supabase
      .from('reminders')
      .select('*')
      .is('notified_at', null)
      .lte('scheduled_time', new Date(now.getTime() + 60 * 60 * 1000).toISOString()); // Within next hour

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError);
      throw remindersError;
    }

    // Filter reminders that should be notified based on notify_before_minutes
    const remindersToNotify = (dueReminders as Reminder[]).filter((reminder) => {
      const scheduledTime = new Date(reminder.scheduled_time);
      const notifyTime = new Date(scheduledTime.getTime() - reminder.notify_before_minutes * 60 * 1000);
      return notifyTime <= now;
    });

    // 2. Get priority reminders due for early notification (30 min before)
    const { data: priorityReminders, error: priorityError } = await supabase
      .from('reminders')
      .select('*')
      .eq('is_priority', true)
      .is('priority_notified_at', null)
      .not('notified_at', 'is', null); // Already had regular notification or we'll send it now

    if (priorityError) {
      console.error('Error fetching priority reminders:', priorityError);
      throw priorityError;
    }

    // Also check priority reminders that haven't been notified at all yet
    const { data: priorityNotYetNotified, error: priorityNotYetError } = await supabase
      .from('reminders')
      .select('*')
      .eq('is_priority', true)
      .is('priority_notified_at', null)
      .is('notified_at', null)
      .lte('scheduled_time', new Date(now.getTime() + 35 * 60 * 1000).toISOString()); // Within 35 min

    if (priorityNotYetError) {
      console.error('Error fetching priority not yet notified:', priorityNotYetError);
      throw priorityNotYetError;
    }

    // Filter priority reminders that should get early notification (30 min before)
    const allPriorityReminders = [...(priorityReminders || []), ...(priorityNotYetNotified || [])] as Reminder[];
    const priorityToNotify = allPriorityReminders.filter((reminder) => {
      const scheduledTime = new Date(reminder.scheduled_time);
      const earlyNotifyTime = new Date(scheduledTime.getTime() - 30 * 60 * 1000);
      // Only send early notification if we're within the 30-min window but not past the regular notify time
      const regularNotifyTime = new Date(scheduledTime.getTime() - reminder.notify_before_minutes * 60 * 1000);
      return earlyNotifyTime <= now && now < regularNotifyTime;
    });

    // 3. Collect unique user IDs
    const userIds = new Set<string>();
    remindersToNotify.forEach((r) => userIds.add(r.user_id));
    priorityToNotify.forEach((r) => userIds.add(r.user_id));

    if (userIds.size === 0) {
      return new Response(JSON.stringify({ message: 'No notifications to send', sent: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Fetch push tokens for these users
    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('token, user_id')
      .in('user_id', Array.from(userIds));

    if (tokensError) {
      console.error('Error fetching push tokens:', tokensError);
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ message: 'No push tokens found', sent: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Group tokens by user
    const tokensByUser = new Map<string, string[]>();
    (tokens as PushToken[]).forEach((t) => {
      const existing = tokensByUser.get(t.user_id) || [];
      existing.push(t.token);
      tokensByUser.set(t.user_id, existing);
    });

    // 5. Build push messages
    const messages: ExpoPushMessage[] = [];
    const regularNotificationIds: string[] = [];
    const priorityNotificationIds: string[] = [];

    // Regular notifications
    for (const reminder of remindersToNotify) {
      const userTokens = tokensByUser.get(reminder.user_id) || [];
      for (const token of userTokens) {
        messages.push({
          to: token,
          title: reminder.is_priority ? `Priority: ${reminder.title}` : reminder.title,
          body: reminder.description || 'Reminder is due!',
          data: { reminderId: reminder.id, type: 'reminder' },
          sound: 'default',
          channelId: 'reminders',
          priority: reminder.is_priority ? 'high' : 'default',
        });
      }
      regularNotificationIds.push(reminder.id);
    }

    // Priority early notifications
    for (const reminder of priorityToNotify) {
      const userTokens = tokensByUser.get(reminder.user_id) || [];
      for (const token of userTokens) {
        messages.push({
          to: token,
          title: `Coming up: ${reminder.title}`,
          body: 'Priority reminder in 30 minutes',
          data: { reminderId: reminder.id, type: 'priority_early' },
          sound: 'default',
          channelId: 'reminders',
          priority: 'high',
        });
      }
      priorityNotificationIds.push(reminder.id);
    }

    // 6. Send notifications to Expo Push API
    if (messages.length > 0) {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Expo Push API error:', errorText);
        throw new Error(`Expo Push API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('Expo Push response:', result);
    }

    // 7. Update notified_at timestamps
    if (regularNotificationIds.length > 0) {
      const { error: updateError } = await supabase
        .from('reminders')
        .update({ notified_at: now.toISOString() })
        .in('id', regularNotificationIds);

      if (updateError) {
        console.error('Error updating notified_at:', updateError);
      }
    }

    if (priorityNotificationIds.length > 0) {
      const { error: updateError } = await supabase
        .from('reminders')
        .update({ priority_notified_at: now.toISOString() })
        .in('id', priorityNotificationIds);

      if (updateError) {
        console.error('Error updating priority_notified_at:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Notifications sent successfully',
        sent: messages.length,
        regularReminders: regularNotificationIds.length,
        priorityReminders: priorityNotificationIds.length,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
