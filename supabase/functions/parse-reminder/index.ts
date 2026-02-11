import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

interface ParseRequest {
  text: string;
  current_time?: string;
  timezone_offset?: number;
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const ALLOWED_NOTIFY_MINUTES = new Set([0, 5, 15, 30, 60]);
const ALLOWED_FREQUENCY_UNITS = new Set(['days', 'weeks', 'months', 'years']);

function jsonResponse(body: unknown, status: number = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

function normalizeJsonFromModel(content: string): string {
  let clean = content.trim();
  if (clean.startsWith('```json')) {
    clean = clean.slice(7);
  } else if (clean.startsWith('```')) {
    clean = clean.slice(3);
  }
  if (clean.endsWith('```')) {
    clean = clean.slice(0, -3);
  }
  return clean.trim();
}

function formatTimezoneOffset(offsetMinutes: number): string {
  const absMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  const sign = offsetMinutes <= 0 ? '+' : '-';
  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function toIsoWithOffset(pseudoLocalDate: Date, timezoneOffset: number): string {
  const year = pseudoLocalDate.getUTCFullYear();
  const month = String(pseudoLocalDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(pseudoLocalDate.getUTCDate()).padStart(2, '0');
  const hours = String(pseudoLocalDate.getUTCHours()).padStart(2, '0');
  const minutes = String(pseudoLocalDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(pseudoLocalDate.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${formatTimezoneOffset(timezoneOffset)}`;
}

function getPseudoLocalNow(currentTimeIso: string | undefined, timezoneOffset: number): Date {
  const current = currentTimeIso ? new Date(currentTimeIso) : new Date();
  const utcNow = Number.isNaN(current.getTime()) ? new Date() : current;
  return new Date(utcNow.getTime() - timezoneOffset * 60000);
}

function sanitizeNotifyMinutes(input: unknown): number {
  const parsed = Number(input);
  if (Number.isFinite(parsed) && ALLOWED_NOTIFY_MINUTES.has(parsed)) {
    return parsed;
  }
  return 0;
}

function sanitizeRecurringRule(rule: unknown) {
  if (!rule || typeof rule !== 'object') {
    return null;
  }

  const recurring = rule as Record<string, unknown>;
  const frequency = Math.max(1, Math.round(Number(recurring.frequency) || 1));
  const unitCandidate = typeof recurring.frequency_unit === 'string'
    ? recurring.frequency_unit.trim().toLowerCase()
    : '';
  const frequencyUnit = ALLOWED_FREQUENCY_UNITS.has(unitCandidate) ? unitCandidate : 'days';

  const selectedDaysRaw = Array.isArray(recurring.selected_days) ? recurring.selected_days : [];
  const selectedDays = selectedDaysRaw
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);

  const nameRaw = typeof recurring.name === 'string' ? recurring.name.trim() : '';
  const name = nameRaw.length > 0 ? nameRaw : `Every ${frequency} ${frequencyUnit}`;

  return {
    name,
    frequency,
    frequency_unit: frequencyUnit,
    selected_days: selectedDays,
  };
}

function sanitizeReminder(
  reminder: unknown,
  fallbackTitle: string,
  fallbackSchedule: string,
  timezoneOffset: number
) {
  const reminderObj = typeof reminder === 'object' && reminder ? (reminder as Record<string, unknown>) : {};

  const titleRaw = typeof reminderObj.title === 'string' ? reminderObj.title.trim() : '';
  const title = titleRaw.length > 0 ? titleRaw : fallbackTitle;

  let scheduledTime = typeof reminderObj.scheduled_time === 'string'
    ? reminderObj.scheduled_time.trim()
    : '';
  if (!scheduledTime) {
    scheduledTime = fallbackSchedule;
  } else {
    const hasZoneSuffix = scheduledTime.includes('Z') || /[+-]\d{2}:\d{2}$/.test(scheduledTime);
    if (!hasZoneSuffix) {
      const normalized = scheduledTime.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
        ? `${scheduledTime}:00`
        : scheduledTime;
      const looksLikeNaiveIso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalized);
      if (looksLikeNaiveIso) {
        scheduledTime = `${normalized}${formatTimezoneOffset(timezoneOffset)}`;
      } else {
        scheduledTime = fallbackSchedule;
      }
    } else {
      const parsed = new Date(scheduledTime);
      if (Number.isNaN(parsed.getTime())) {
        scheduledTime = fallbackSchedule;
      }
    }
  }

  const descriptionRaw = typeof reminderObj.description === 'string'
    ? reminderObj.description.trim()
    : '';
  const description = descriptionRaw.length > 0 ? descriptionRaw : undefined;

  return {
    title,
    scheduled_time: scheduledTime,
    description,
    is_priority: Boolean(reminderObj.is_priority),
    notify_before_minutes: sanitizeNotifyMinutes(reminderObj.notify_before_minutes),
    recurring_rule: sanitizeRecurringRule(reminderObj.recurring_rule),
  };
}

async function parseTextWithAI(
  text: string,
  currentTimeIso: string | undefined,
  timezoneOffset: number,
  openaiKey: string
) {
  const pseudoLocalNow = getPseudoLocalNow(currentTimeIso, timezoneOffset);
  const timezone = formatTimezoneOffset(timezoneOffset);
  const fallbackSchedule = toIsoWithOffset(
    new Date(pseudoLocalNow.getTime() + 10 * 60 * 1000),
    timezoneOffset
  );

  const systemPrompt = `You are an assistant for a reminders app.

Return ONLY valid JSON with one of these shapes:
1) Conversation:
{
  "type": "conversation",
  "response": "short helpful response"
}

2) Reminder creation:
{
  "type": "reminder",
  "reminders": [
    {
      "title": "short action title",
      "scheduled_time": "ISO-8601 datetime with timezone offset",
      "description": "optional extra context",
      "is_priority": false,
      "notify_before_minutes": 0,
      "recurring_rule": null
    }
  ]
}

Rules:
- If the user is not asking to create reminders, return type "conversation".
- If the user includes multiple distinct tasks, return multiple entries in reminders.
- allowed notify_before_minutes: 0, 5, 15, 30, 60.
- scheduled_time must include timezone information.
- Use CURRENT_TIME as the reference.
- If time is missing, set scheduled_time to CURRENT_TIME + 10 minutes.
- Keep title short (2-6 words).
- recurring_rule can be null or:
  { "name": string, "frequency": number, "frequency_unit": "days"|"weeks"|"months"|"years", "selected_days": number[] }.

Return JSON only, no markdown.`;

  const userPrompt = JSON.stringify({
    text,
    current_time: toIsoWithOffset(pseudoLocalNow, timezoneOffset),
    timezone_offset_minutes: timezoneOffset,
    timezone,
  });

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI request failed: ${details}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('No content returned by model');
  }

  const parsed = JSON.parse(normalizeJsonFromModel(content));
  const fallbackTitle = text.trim().length > 0 ? text.trim() : 'Reminder';

  if (parsed?.type === 'conversation') {
    const responseText = typeof parsed.response === 'string' ? parsed.response.trim() : '';
    return {
      type: 'conversation',
      response: responseText || 'I can create reminders for you. Try: "Remind me to call mom at 7pm".',
    };
  }

  const remindersRaw = Array.isArray(parsed?.reminders)
    ? parsed.reminders
    : parsed?.reminder
      ? [parsed.reminder]
      : [];

  const reminders = (remindersRaw.length > 0 ? remindersRaw : [{}]).map((item) =>
    sanitizeReminder(item, fallbackTitle, fallbackSchedule, timezoneOffset)
  );

  return {
    type: 'reminder',
    reminders,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Missing authorization' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: 'Supabase env not configured' }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  let payload: ParseRequest;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const text = payload.text?.trim();
  if (!text) {
    return jsonResponse({ error: 'Missing text' }, 400);
  }

  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) {
    return jsonResponse({ error: 'OpenAI key not configured' }, 500);
  }

  const timezoneOffsetCandidate = Number(payload.timezone_offset);
  const timezoneOffset = Number.isFinite(timezoneOffsetCandidate)
    ? timezoneOffsetCandidate
    : 0;

  try {
    const result = await parseTextWithAI(text, payload.current_time, timezoneOffset, openaiKey);
    return jsonResponse(result, 200);
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown parser error';
    return jsonResponse({ error: 'Failed to parse text reminder', details }, 500);
  }
});
