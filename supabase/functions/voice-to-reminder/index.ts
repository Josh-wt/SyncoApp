import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

interface VoiceRequest {
  audio: string; // base64 encoded audio
  mimeType?: string; // audio/wav, audio/webm, etc.
  timezoneOffset?: number; // User's timezone offset in minutes (e.g., -480 for UTC+8)
}

const OPENAI_API_URL = 'https://api.openai.com/v1';

async function transcribeAudio(audioBase64: string, mimeType: string, apiKey: string): Promise<string> {
  // Convert base64 to binary
  const binaryString = atob(audioBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Determine file extension from mime type
  const extMap: Record<string, string> = {
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
  const ext = extMap[mimeType] || 'wav';

  // Create form data for Whisper API
  const formData = new FormData();
  const blob = new Blob([bytes], { type: mimeType });
  formData.append('file', blob, `audio.${ext}`);
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
    throw new Error(`Whisper API failed: ${errorText}`);
  }

  const data = await response.json();
  return data.text;
}

async function detectIntent(transcript: string, apiKey: string): Promise<{ isReminderRequest: boolean; reasoning?: string }> {
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
    throw new Error(`Intent detection failed: ${errorText}`);
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

  return JSON.parse(cleanContent);
}

async function generateConversationalResponse(transcript: string, apiKey: string): Promise<string> {
  const systemPrompt = `You are a helpful AI assistant for a reminder app called Synco.

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
  // Get user's local time - timezoneOffset is inverted (negative = UTC+)
  const nowUTC = new Date();
  const localTime = new Date(nowUTC.getTime() - timezoneOffset * 60000);

  // Simple timezone string formatting
  const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
  const offsetMinutes = Math.abs(timezoneOffset) % 60;
  const offsetSign = timezoneOffset <= 0 ? '+' : '-';
  const timezone = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;

  const systemPrompt = `Convert voice input to reminder JSON.

TIMEZONE: ${timezone}
CURRENT TIME: ${localTime.toISOString().slice(0, 19)}${timezone}
CURRENT DATE: ${localTime.getFullYear()}-${String(localTime.getMonth() + 1).padStart(2, '0')}-${String(localTime.getDate()).padStart(2, '0')}

OUTPUT - Array of reminders:
{
  "reminders": [
    {
      "title": "Brief action (2-6 words max)",
      "scheduled_time": "YYYY-MM-DDTHH:mm:ss${timezone}",
      "description": "Short note with context (5-15 words). ALWAYS create a note - never leave null",
      "is_priority": false,
      "notify_before_minutes": 0,
      "recurring_rule": null
    }
  ]
}

CRITICAL RULES:
1. title = SHORT action (e.g., "Call mom", "Buy groceries")
2. description = SHORT contextual note (e.g., "Check in about her appointment", "Get milk, bread, and eggs for dinner")
3. ALWAYS create description - extract key context from user's words
4. description should add useful context, NOT repeat the title
5. scheduled_time ALWAYS uses ${timezone}

TIME RULES:
- "today" = day ${String(localTime.getDate()).padStart(2, '0')}
- "tomorrow" = day ${String(localTime.getDate() + 1).padStart(2, '0')}
- "7pm" = 19:00:00
- Format: ${localTime.getFullYear()}-MM-DDT19:00:00${timezone}

EXAMPLES:
"remind me to call mom tomorrow at 7pm to ask about her doctor appointment"
→ { "title": "Call mom", "description": "Ask about doctor appointment", "scheduled_time": "${localTime.getFullYear()}-${String(localTime.getMonth() + 1).padStart(2, '0')}-${String(localTime.getDate() + 1).padStart(2, '0')}T19:00:00${timezone}" }

"buy groceries at 3pm - need milk and bread"
→ { "title": "Buy groceries", "description": "Get milk and bread", "scheduled_time": "${localTime.getFullYear()}-${String(localTime.getMonth() + 1).padStart(2, '0')}-${String(localTime.getDate()).padStart(2, '0')}T15:00:00${timezone}" }

MULTIPLE: "call mom and buy groceries" = 2 separate reminders

Return JSON only.`;

  const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript.trim() },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GPT API failed: ${errorText}`);
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

  return JSON.parse(cleanContent);
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

  let payload: VoiceRequest;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!payload.audio || payload.audio.trim().length === 0) {
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
    const mimeType = payload.mimeType || 'audio/wav';
    const transcript = await transcribeAudio(payload.audio, mimeType, openaiKey);

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
      const parsedData = await parseReminderFromTranscript(transcript, openaiKey, payload.timezoneOffset || 0);

      return new Response(JSON.stringify({
        type: 'reminder',
        transcript,
        reminders: parsedData.reminders || [parsedData], // Support both array and single object format
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } else {
      // Step 3b: Generate conversational response
      const response = await generateConversationalResponse(transcript, openaiKey);

      return new Response(JSON.stringify({
        type: 'conversation',
        transcript,
        response,
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
