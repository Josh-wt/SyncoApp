import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REMINDER_CATEGORY_ID = 'reminder_actions';

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
  platform?: string | null;
  token_type?: string | null;
}

interface UserPreferences {
  user_id: string;
  snooze_mode: 'text_input' | 'presets';
}

interface ExpoPushMessage {
  to: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  categoryId?: string;
  priority?: 'default' | 'normal' | 'high';
  contentAvailable?: boolean;
  reminderId: string;
}

interface FcmPushMessage {
  to: string;
  data: Record<string, string>;
  title: string;
  body: string;
  priority: 'high' | 'normal';
  reminderId: string;
}

type SnoozeMode = 'text_input' | 'presets';

function buildPayloadData(reminderId: string, type: 'reminder' | 'priority_early', title: string, body: string, snoozeMode: SnoozeMode) {
  return {
    reminderId,
    type,
    title,
    body,
    snoozeMode,
  };
}

function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const pemContents = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
  const binary = atob(pemContents);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function createAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: clientEmail,
    scope: FCM_SCOPE,
    aud: GOOGLE_OAUTH_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const encodedHeader = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const encodedClaimSet = base64UrlEncode(encoder.encode(JSON.stringify(claimSet)));
  const unsignedToken = `${encodedHeader}.${encodedClaimSet}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKey),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(unsignedToken)
  );

  const jwt = `${unsignedToken}.${base64UrlEncode(new Uint8Array(signature))}`;

  const tokenResponse = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Google OAuth token error: ${tokenResponse.status} ${errorText}`);
  }

  const tokenJson = await tokenResponse.json();
  return tokenJson.access_token as string;
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

    // Local device scheduling now handles reminder notifications; disable server pushes to avoid duplicates.
    return new Response(
      JSON.stringify({ message: 'Push notifications disabled (local scheduling enabled)', sent: 0 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

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
      .select('token, user_id, platform, token_type, device_id')
      .in('user_id', Array.from(userIds));

    if (tokensError) {
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ message: 'No push tokens found', sent: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4.5. Fetch user preferences for snooze mode
    const { data: preferences, error: prefsError } = await supabase
      .from('user_preferences')
      .select('user_id, snooze_mode')
      .in('user_id', Array.from(userIds));

    if (prefsError) {
      // Don't throw - just default to text_input mode
    }

    // Map preferences by user (default to text_input if not found)
    const prefsByUser = new Map<string, 'text_input' | 'presets'>();
    (preferences as UserPreferences[] || []).forEach((pref) => {
      prefsByUser.set(pref.user_id, pref.snooze_mode);
    });

    // Group tokens by user, de-duping by token (prefer records with a platform set)
    const tokensByUser = new Map<string, PushToken[]>();
    const dedupedTokens = new Map<string, PushToken>();
    (tokens as PushToken[]).forEach((t) => {
      const existing = dedupedTokens.get(t.token);
      if (!existing || (!existing.platform && t.platform)) {
        dedupedTokens.set(t.token, t);
      }
    });
    Array.from(dedupedTokens.values()).forEach((t) => {
      const existing = tokensByUser.get(t.user_id) || [];
      existing.push(t);
      tokensByUser.set(t.user_id, existing);
    });

    // 5. Build push messages
    const messages: ExpoPushMessage[] = [];
    const fcmMessages: FcmPushMessage[] = [];
    const regularNotificationIds: string[] = [];
    const priorityNotificationIds: string[] = [];

    // Regular notifications
    for (const reminder of remindersToNotify) {
      const userTokens = tokensByUser.get(reminder.user_id) || [];
      const snoozeMode: SnoozeMode = prefsByUser.get(reminder.user_id) || 'text_input';
      const categoryId = REMINDER_CATEGORY_ID;
      for (const token of userTokens) {
        const isAndroid = token.platform === 'android';
        const tokenType = token.token_type;
        const looksLikeExpo = token.token.startsWith('ExponentPushToken[') || token.token.startsWith('ExpoPushToken[');

        const title = reminder.is_priority ? `Priority: ${reminder.title}` : reminder.title;
        const body = reminder.description || 'Reminder is due!';
        const data = buildPayloadData(reminder.id, 'reminder', title, body, snoozeMode);

        if (isAndroid && (tokenType === 'fcm' || (!tokenType && !looksLikeExpo))) {
          // FCM notification for Android devices
          fcmMessages.push({
            to: token.token,
            data,
            title,
            body,
            priority: 'high',
            reminderId: reminder.id,
          });
        } else {
          // Expo push for iOS and legacy Expo Android tokens
          messages.push({
            to: token.token,
            title,
            body,
            data,
            sound: 'default',
            channelId: 'reminders',
            categoryId,
            priority: reminder.is_priority ? 'high' : 'default',
            reminderId: reminder.id,
          });
        }
      }
      regularNotificationIds.push(reminder.id);
    }

    // Priority early notifications
    for (const reminder of priorityToNotify) {
      const userTokens = tokensByUser.get(reminder.user_id) || [];
      const snoozeMode: SnoozeMode = prefsByUser.get(reminder.user_id) || 'text_input';
      const categoryId = REMINDER_CATEGORY_ID;
      for (const token of userTokens) {
        const isAndroid = token.platform === 'android';
        const tokenType = token.token_type;
        const looksLikeExpo = token.token.startsWith('ExponentPushToken[') || token.token.startsWith('ExpoPushToken[');

        const title = `Coming up: ${reminder.title}`;
        const body = 'Priority reminder in 30 minutes';
        const data = buildPayloadData(reminder.id, 'priority_early', title, body, snoozeMode);

        if (isAndroid && (tokenType === 'fcm' || (!tokenType && !looksLikeExpo))) {
          // FCM notification for Android devices
          fcmMessages.push({
            to: token.token,
            data,
            title,
            body,
            priority: 'high',
            reminderId: reminder.id,
          });
        } else {
          messages.push({
            to: token.token,
            title,
            body,
            data,
            sound: 'default',
            channelId: 'reminders',
            categoryId,
            priority: 'high',
            reminderId: reminder.id,
          });
        }
      }
      priorityNotificationIds.push(reminder.id);
    }

    // Track delivery success per reminder so we only mark sent when at least one push succeeded
    const deliveredReminderIds = new Set<string>();
    const failedReminderIds = new Set<string>();

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
        await response.text();
        // Don't throw; we'll leave reminders unmarked so they retry
      } else {
        const result = await response.json();

        const tickets = Array.isArray(result?.data) ? result.data : [];
        tickets.forEach((ticket: any, idx: number) => {
          const reminderId = messages[idx]?.reminderId;
          if (!reminderId) return;
          if (ticket?.status === 'ok') {
            deliveredReminderIds.add(reminderId);
          } else {
            failedReminderIds.add(reminderId);
          }
        });
      }
    }

    // 6.5. Send notifications to FCM HTTP v1 (Android data-only)
    if (fcmMessages.length > 0) {
      const fcmProjectId = Deno.env.get('FCM_PROJECT_ID');
      const fcmClientEmail = Deno.env.get('FCM_CLIENT_EMAIL');
      const fcmPrivateKeyRaw = Deno.env.get('FCM_PRIVATE_KEY');
      if (!fcmProjectId || !fcmClientEmail || !fcmPrivateKeyRaw) {
        throw new Error('Missing FCM_PROJECT_ID, FCM_CLIENT_EMAIL, or FCM_PRIVATE_KEY');
      }
      const fcmPrivateKey = fcmPrivateKeyRaw.replace(/\\n/g, '\n');
      const accessToken = await createAccessToken(fcmClientEmail, fcmPrivateKey);
      const fcmUrl = `https://fcm.googleapis.com/v1/projects/${fcmProjectId}/messages:send`;

      for (const message of fcmMessages) {
        const baseBody = {
          message: {
            token: message.to,
            data: message.data,
            notification: {
              title: message.title,
              body: message.body,
            },
            android: {
              priority: message.priority === 'high' ? 'HIGH' : 'NORMAL',
              notification: {
                channel_id: 'reminders',
                sound: 'default',
              },
            },
          },
        };

        const response = await fetch(fcmUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(baseBody),
        });

        if (!response.ok) {
          await response.text();
          failedReminderIds.add(message.reminderId);
          continue;
        }

        const result = await response.json();
        if (result?.name) {
          deliveredReminderIds.add(message.reminderId);
        } else {
          failedReminderIds.add(message.reminderId);
        }
      }
    }

    // 7. Update notified_at timestamps
    const successfulRegular = regularNotificationIds.filter((id) => deliveredReminderIds.has(id));
    if (successfulRegular.length > 0) {
      const { error: updateError } = await supabase
        .from('reminders')
        .update({ notified_at: now.toISOString() })
        .in('id', successfulRegular);

      if (updateError) {
      }
    }

    const successfulPriority = priorityNotificationIds.filter((id) => deliveredReminderIds.has(id));
    if (successfulPriority.length > 0) {
      const { error: updateError } = await supabase
        .from('reminders')
        .update({ priority_notified_at: now.toISOString() })
        .in('id', successfulPriority);

      if (updateError) {
      }
    }

    const totalDelivered = deliveredReminderIds.size;
    const totalFailed = failedReminderIds.size;
    return new Response(
      JSON.stringify({
        message: 'Notification attempt finished',
        delivered: totalDelivered,
        failed: totalFailed,
        regularReminders: regularNotificationIds.length,
        priorityReminders: priorityNotificationIds.length,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
