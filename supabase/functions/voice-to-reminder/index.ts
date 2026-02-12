import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

interface VoiceRequest {
  audio?: string; // base64 encoded audio
  mimeType?: string; // audio/wav, audio/webm, etc.
  timezoneOffset?: number; // User's timezone offset in minutes (e.g., -480 for UTC+8)
}

const OPENAI_API_URL = 'https://api.openai.com/v1';

const EXTENSION_BY_MIME: Record<string, string> = {
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/x-wav': 'wav',
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/ogg': 'ogg',
};

function normalizeBase64(input: string): string {
  return input.replace(/^data:.*;base64,/, '').replace(/\s/g, '');
}

function resolveMimeType(mimeType?: string, fileType?: string, fileName?: string): string {
  const trimmed = mimeType?.trim();
  if (trimmed) return trimmed;

  const fileTypeTrimmed = fileType?.trim();
  if (fileTypeTrimmed) return fileTypeTrimmed;

  const lowerName = fileName?.toLowerCase() || '';
  if (lowerName.endsWith('.m4a') || lowerName.endsWith('.mp4')) return 'audio/mp4';
  if (lowerName.endsWith('.mp3')) return 'audio/mpeg';
  if (lowerName.endsWith('.wav')) return 'audio/wav';
  if (lowerName.endsWith('.ogg') || lowerName.endsWith('.oga')) return 'audio/ogg';
  if (lowerName.endsWith('.webm')) return 'audio/webm';

  return 'audio/wav';
}

function resolveExtension(mimeType: string, fileName?: string): string {
  const match = fileName?.toLowerCase().match(/\.([a-z0-9]+)$/);
  if (match) return match[1];
  return EXTENSION_BY_MIME[mimeType] || 'wav';
}

/**
 * Fix Android 3GP files: Android often produces 3GP4 containers even when MPEG4 is
 * requested. These are identical to MP4 internally (same ISO BMFF structure, same AAC
 * audio) but Whisper rejects the 3GP brand. Patching 4 bytes in the ftyp box fixes it.
 */
function fixAndroid3gpHeader(bytes: Uint8Array): Uint8Array {
  // ftyp box: [size:4][ftyp:4][brand:4][version:4]
  // Check for 'ftyp' at offset 4 and '3gp' at offset 8
  if (
    bytes.length > 12 &&
    bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70 && // 'ftyp'
    bytes[8] === 0x33 && bytes[9] === 0x67 && bytes[10] === 0x70 // '3gp'
  ) {
    const fixed = new Uint8Array(bytes);
    fixed[8] = 0x69;  // 'i'
    fixed[9] = 0x73;  // 's'
    fixed[10] = 0x6f; // 'o'
    fixed[11] = 0x6d; // 'm'
    return fixed;
  }
  return bytes;
}

async function transcribeAudio(audioInput: string | File, mimeType: string | undefined, apiKey: string): Promise<string> {
  try {
    const resolvedMimeType =
      typeof audioInput === 'string'
        ? resolveMimeType(mimeType)
        : resolveMimeType(mimeType, audioInput.type, audioInput.name);

    const formData = new FormData();

    if (typeof audioInput === 'string') {
      const normalized = normalizeBase64(audioInput);
      const binaryString = atob(normalized);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const fixedBytes = fixAndroid3gpHeader(bytes);
      const ext = resolveExtension(resolvedMimeType);
      const file = new File([fixedBytes as BlobPart], `audio.${ext}`, { type: resolvedMimeType });
      formData.append('file', file);
    } else {
      // Read the file bytes so we can fix Android 3GP headers
      const rawBytes = new Uint8Array(await audioInput.arrayBuffer());
      const fixedBytes = fixAndroid3gpHeader(rawBytes);
      const ext = resolveExtension(resolvedMimeType, audioInput.name);
      const fileName = audioInput.name?.includes('.') ? audioInput.name : `audio.${ext}`;
      const fixedFile = new File([fixedBytes as BlobPart], fileName, { type: resolvedMimeType });
      formData.append('file', fixedFile, fileName);
    }

    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    const response = await fetch(`${OPENAI_API_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Whisper API failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    throw error;
  }
}

async function detectIntent(transcript: string, apiKey: string): Promise<{ isReminderRequest: boolean; reasoning?: string }> {
  try {
    const systemPrompt = `You are an AI assistant that determines if a user's input is a reminder creation request or general conversation.

Analyze the user's transcript and determine if they want to:
1. CREATE A REMINDER - includes requests like "remind me to...", "set a reminder...", "don't forget...", "tomorrow at 3pm...", time-based tasks, recurring events, etc.
2. GENERAL CONVERSATION - greetings, questions, statements, casual chat, etc.

Return ONLY a JSON object with these keys:
{
  "isReminderRequest": boolean,
  "reasoning": "brief explanation of decision"
}

Examples of REMINDER requests:
- "remind me to call mom tomorrow at 3pm"
- "every day at 9am take medication"
- "meeting with design team on Monday"
- "buy groceries"
- "don't forget the dentist appointment"

Examples of CONVERSATION:
- "hello"
- "how are you?"
- "what's the weather like?"
- "tell me a joke"
- "what can you do?"

Return ONLY valid JSON without markdown code blocks.`;

    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.1,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript.trim() },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Intent detection failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content returned from intent detection');
    }

    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.slice(7);
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.slice(0, -3);
    }
    cleanContent = cleanContent.trim();

    const parsed = JSON.parse(cleanContent);
    return parsed;
  } catch (error) {
    throw error;
  }
}

async function generateConversationalResponse(transcript: string, apiKey: string): Promise<string> {
  const systemPrompt = `You are a helpful AI assistant for a reminder app called Remmy.

Be friendly, concise, and helpful. Keep responses brief (1-3 sentences).

If asked what you can do, explain that you can:
- Create reminders from natural language (e.g., "remind me to call mom tomorrow at 3pm")
- Set up recurring reminders (daily, weekly, monthly, hourly, etc.)
- Help organize and manage reminders

Be conversational and warm, but don't be overly verbose.`;

  const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript.trim() },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Conversation generation failed: ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No response generated');
  }

  return content.trim();
}

async function parseReminderFromTranscript(transcript: string, apiKey: string, timezoneOffset: number = 0): Promise<object> {
  try {
    // Get user's local time - timezoneOffset is inverted (negative = UTC+)
    const nowUTC = new Date();
    const localTime = new Date(nowUTC.getTime() - timezoneOffset * 60000);

    // Simple timezone string formatting
    const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
    const offsetMinutes = Math.abs(timezoneOffset) % 60;
    const offsetSign = timezoneOffset <= 0 ? '+' : '-';
    const timezone = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;

    const currentDate = `${localTime.getFullYear()}-${String(localTime.getMonth() + 1).padStart(2, '0')}-${String(localTime.getDate()).padStart(2, '0')}`;
    const tomorrowDate = `${localTime.getFullYear()}-${String(localTime.getMonth() + 1).padStart(2, '0')}-${String(localTime.getDate() + 1).padStart(2, '0')}`;

    const systemPrompt = `You are a reminder extraction engine. Parse the user's voice transcript into one or MORE reminders.

CONTEXT:
- TIMEZONE: ${timezone}
- CURRENT_TIME: ${localTime.toISOString().slice(0, 19)}${timezone}
- CURRENT_DATE: ${currentDate}
- DAY_OF_WEEK: ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][localTime.getDay()]}

OUTPUT FORMAT (always return a JSON object with a "reminders" array):
{
  "reminders": [
    {
      "title": "Brief action (2-6 words)",
      "scheduled_time": "YYYY-MM-DDTHH:mm:ss${timezone}",
      "description": "Short context note (5-15 words). Never null.",
      "is_priority": false,
      "notify_before_minutes": 0,
      "recurring_rule": null
    }
  ]
}

CRITICAL - MULTIPLE REMINDERS:
Users often describe their ENTIRE DAY or MULTIPLE TASKS in one recording. You MUST split each distinct task/event into its OWN reminder. Look for:
- Separate activities ("then", "and then", "also", "after that", "next")
- Different times mentioned ("at 9am... at noon... at 3pm")
- Different topics/actions ("call mom", "buy groceries", "go to gym")
- Transition words ("first... then... later... finally...")
- Lists of tasks ("I need to do X, Y, and Z")

Example: "Tomorrow I have a meeting at 9am with the design team, then lunch with Sarah at noon, I need to pick up my dry cleaning around 3, and don't forget to call the dentist before 5pm"
→ 4 separate reminders, each with its own time and context.

TITLE RULES:
- 2-6 words, action-focused
- e.g., "Call Mom", "Team Meeting", "Pick Up Dry Cleaning"

DESCRIPTION RULES:
- 5-15 words of useful context extracted from what the user said
- Add detail that isn't in the title
- Never leave null or empty

TIME RULES:
- "today" = ${currentDate}
- "tomorrow" = ${tomorrowDate}
- If no time specified for a task, infer a reasonable time based on context
- If no time can be inferred, default to 30 minutes from now
- scheduled_time MUST include timezone: ${timezone}

RECURRING RULES (when applicable):
- "every day/daily" → { "name": "Daily", "frequency": 1, "frequency_unit": "days", "selected_days": [] }
- "every week/weekly" → { "name": "Weekly", "frequency": 1, "frequency_unit": "weeks", "selected_days": [] }
- "every Monday and Wednesday" → { "name": "Mon & Wed", "frequency": 1, "frequency_unit": "weeks", "selected_days": ["monday","wednesday"] }

Return ONLY valid JSON, no markdown.`;

    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript.trim() },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GPT API failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content returned from GPT');
    }

    // Clean up potential markdown code blocks
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.slice(7);
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.slice(0, -3);
    }
    cleanContent = cleanContent.trim();

    const parsed = JSON.parse(cleanContent);
    return parsed;
  } catch (error) {
    throw error;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify user is authenticated
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const contentType = req.headers.get('content-type') || '';
  let payload: VoiceRequest | null = null;
  let audioFile: File | null = null;
  let audioBase64: string | null = null;
  let mimeType: string | undefined;
  let timezoneOffset = 0;

  if (contentType.includes('application/octet-stream')) {
    const bytes = new Uint8Array(await req.arrayBuffer());
    if (bytes.length === 0) {
      return new Response(JSON.stringify({ error: 'Empty audio payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const headerMime = req.headers.get('x-audio-mime') || undefined;
    const headerName = req.headers.get('x-audio-name') || undefined;
    const headerTimezone = req.headers.get('x-timezone-offset');

    mimeType = headerMime?.trim() || undefined;
    if (headerTimezone && headerTimezone.trim().length > 0) {
      const parsedOffset = Number(headerTimezone);
      if (Number.isFinite(parsedOffset)) {
        timezoneOffset = parsedOffset;
      }
    }

    const resolvedMime = resolveMimeType(mimeType, undefined, headerName);
    const ext = resolveExtension(resolvedMime, headerName);
    const fileName = headerName && headerName.includes('.') ? headerName : `audio.${ext}`;
    audioFile = new File([bytes], fileName, { type: resolvedMime });
  } else if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const fileField = formData.get('file');

    if (fileField instanceof File) {
      audioFile = fileField;
    } else if (typeof fileField === 'string') {
      audioBase64 = fileField;
    }

    const mimeField = formData.get('mimeType');
    if (typeof mimeField === 'string' && mimeField.trim().length > 0) {
      mimeType = mimeField.trim();
    }

    const timezoneField = formData.get('timezoneOffset');
    if (typeof timezoneField === 'string' && timezoneField.trim().length > 0) {
      const parsedOffset = Number(timezoneField);
      if (Number.isFinite(parsedOffset)) {
        timezoneOffset = parsedOffset;
      }
    }
  } else {
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    audioBase64 = payload.audio?.trim() || null;
    mimeType = payload.mimeType;
    timezoneOffset = payload.timezoneOffset ?? 0;
  }

  if (!audioFile && (!audioBase64 || audioBase64.length === 0)) {
    return new Response(JSON.stringify({ error: 'Missing audio data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) {
    return new Response(JSON.stringify({ error: 'OpenAI key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Step 1: Transcribe audio with Whisper
    const resolvedMimeType = resolveMimeType(mimeType, audioFile?.type, audioFile?.name);

    const audioInput = audioFile ?? audioBase64;
    if (!audioInput) {
      throw new Error('No audio input provided');
    }

    const transcript = await transcribeAudio(audioInput, resolvedMimeType, openaiKey);

    if (!transcript || transcript.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Could not transcribe audio. Please speak clearly and try again.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Detect intent - is this a reminder request or conversation?
    const intent = await detectIntent(transcript, openaiKey);

    if (intent.isReminderRequest) {
      // Step 3a: Parse transcript into reminder structure(s)
      const parsedData = await parseReminderFromTranscript(transcript, openaiKey, timezoneOffset);

      const result = {
        type: 'reminder',
        transcript,
        reminders: parsedData.reminders || [parsedData], // Support both array and single object format
      };

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } else {
      // Step 3b: Generate conversational response
      const response = await generateConversationalResponse(transcript, openaiKey);

      const result = {
        type: 'conversation',
        transcript,
        response,
      };

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      error: message,
      errorType: error?.constructor?.name || 'Unknown',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
