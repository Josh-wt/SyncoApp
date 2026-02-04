import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

interface VoiceRequest {
  audio: string; // base64 encoded audio
  mimeType?: string; // audio/wav, audio/webm, etc.
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

async function parseReminderFromTranscript(transcript: string, apiKey: string): Promise<object> {
  const now = new Date();

  const systemPrompt = `You convert natural language into JSON for a reminder app.

Output JSON with these keys:
- title: A concise reminder title extracted from the user's speech
- scheduled_time: Must be ISO 8601 format (e.g., "2024-01-15T14:00:00.000Z")
- description: Optional additional context (ONE LINE ONLY - will appear in notifications); set to null if not given
- is_priority: Boolean, true if user indicates urgency/importance
- notify_before_minutes: Integer (0, 5, 15, 30, or 60). Default to 0 unless specified
- recurring_rule: Object for recurring reminders, or null if not recurring. Structure:
  {
    "name": "Human-readable rule name (e.g., 'Every weekday at 9am', 'Every hour', 'Every 30 minutes')",
    "frequency": Number (1-60 for minutes, 1-24 for hours, 1-12 for other units),
    "frequency_unit": "minutes" | "hours" | "days" | "weeks" | "months" | "years",
    "selected_days": Array of day abbreviations for weekly rules only: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] (empty array for non-weekly)
  }

IMPORTANT: Keep description to ONE LINE - it will appear in push notifications.

Guidelines:
- If user says "tomorrow", calculate the next day from current_time
- If user says a day like "Monday", find the next occurrence of that day
- If no specific time is given, default to 10 minutes from current_time
- Extract the core action/task as the title, removing filler words like "remind me to", "I need to", etc.
- If user mentions "urgent", "important", "priority", set is_priority to true

Recurring patterns to detect:
- "every 30 minutes" / "half hourly" / "every half hour" → frequency: 30, frequency_unit: "minutes", selected_days: []
- "every hour" / "hourly" / "every 1 hour" → frequency: 1, frequency_unit: "hours", selected_days: []
- "every 2 hours" → frequency: 2, frequency_unit: "hours", selected_days: []
- "every day" / "daily" → frequency: 1, frequency_unit: "days", selected_days: []
- "every week" / "weekly" → frequency: 1, frequency_unit: "weeks", selected_days: []
- "every Monday" → frequency: 1, frequency_unit: "weeks", selected_days: ["mon"]
- "every Monday and Wednesday" → frequency: 1, frequency_unit: "weeks", selected_days: ["mon", "wed"]
- "every weekday" → frequency: 1, frequency_unit: "weeks", selected_days: ["mon", "tue", "wed", "thu", "fri"]
- "every weekend" → frequency: 1, frequency_unit: "weeks", selected_days: ["sat", "sun"]
- "every month" / "monthly" → frequency: 1, frequency_unit: "months", selected_days: []
- "every 2 weeks" / "biweekly" → frequency: 2, frequency_unit: "weeks", selected_days: []
- "every year" / "yearly" / "annually" → frequency: 1, frequency_unit: "years", selected_days: []

If NO recurring pattern is mentioned, set recurring_rule to null.

Return ONLY valid JSON without markdown code blocks.`;

  const userPrompt = JSON.stringify({
    transcript: transcript.trim(),
    current_time: now.toISOString(),
  });

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
        { role: 'user', content: userPrompt },
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
      // Step 3a: Parse transcript into reminder structure
      const reminder = await parseReminderFromTranscript(transcript, openaiKey);

      return new Response(JSON.stringify({
        type: 'reminder',
        transcript,
        reminder,
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
