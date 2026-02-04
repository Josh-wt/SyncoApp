import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

interface ParseRequest {
  text: string;
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

Deno.serve(async (req) => {
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

  let payload: ParseRequest;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!payload.text || payload.text.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Missing text' }), {
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

  const now = new Date();

  const systemPrompt = `You convert natural language into JSON for a reminder app.\n\nOutput JSON only with keys: title, scheduled_time, description, is_priority, notify_before_minutes.\n- scheduled_time must be ISO 8601 with timezone offset.\n- description is optional; prefer null if not given.\n- is_priority is boolean.\n- notify_before_minutes is integer (0,5,15,30,60).\n- Use the user's local timezone based on provided current_time.\n- If no time is given, set scheduled_time to current_time + 10 minutes.\n\nReturn ONLY valid JSON without markdown.`;

  const userPrompt = JSON.stringify({
    text: payload.text.trim(),
    current_time: now.toISOString(),
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
    const errorText = await response.text();
    return new Response(JSON.stringify({ error: 'OpenAI request failed', details: errorText }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    return new Response(JSON.stringify({ error: 'No content returned' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const parsed = JSON.parse(content);
    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON from model', content }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
