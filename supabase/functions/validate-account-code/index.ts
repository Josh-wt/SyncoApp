import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

interface ValidateCodeRequest {
  code: string;
  deviceId: string;
  deviceName?: string;
  platform?: string;
}

interface ValidateCodeResponse {
  userId?: string;
  error?: string;
}

interface DeviceSyncRecord {
  user_id: string;
  account_code_id: string | null;
  device_id: string;
  device_name: string | null;
  platform: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Parse request body
    const { code, deviceId, deviceName, platform }: ValidateCodeRequest = await req.json();

    // Validate required fields
    if (!code || !deviceId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: code and deviceId' } as ValidateCodeResponse),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' } as ValidateCodeResponse),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up the account code
    const { data: codeData, error: codeError } = await supabase
      .from('account_codes')
      .select('id, user_id, expires_at')
      .eq('code', code)
      .single();

    if (codeError || !codeData) {
      return new Response(
        JSON.stringify({ error: 'Invalid account code' } as ValidateCodeResponse),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Check if code has expired
    const expiresAt = new Date(codeData.expires_at);
    const now = new Date();

    if (expiresAt < now) {
      return new Response(
        JSON.stringify({ error: 'Account code has expired' } as ValidateCodeResponse),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Record the device sync
    const syncRecord: DeviceSyncRecord = {
      user_id: codeData.user_id,
      account_code_id: codeData.id,
      device_id: deviceId,
      device_name: deviceName || null,
      platform: platform || null,
    };

    const { error: syncError } = await supabase
      .from('device_sync_history')
      .insert(syncRecord);

    if (syncError) {
      // Don't fail the request if sync recording fails
    }

    // Return success with userId
    return new Response(
      JSON.stringify({ userId: codeData.user_id } as ValidateCodeResponse),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      } as ValidateCodeResponse),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
