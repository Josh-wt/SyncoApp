import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';

type PushToken = {
  token: string;
  user_id: string;
  platform?: string | null;
  token_type?: string | null;
  device_id?: string | null;
};

type ExpoPushMessage = {
  to: string;
  data?: Record<string, unknown>;
  contentAvailable?: boolean;
  priority?: 'default' | 'normal' | 'high';
};

type FcmPushMessage = {
  to: string;
  data: Record<string, string>;
  priority: 'high' | 'normal';
};

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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const deviceId = typeof body?.deviceId === 'string' ? body.deviceId : null;

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: tokens, error: tokensError } = await serviceClient
      .from('push_tokens')
      .select('token, user_id, platform, token_type, device_id')
      .eq('user_id', user.id);

    if (tokensError) {
      throw tokensError;
    }

    const filteredTokens = (tokens as PushToken[] || []).filter((token) => !deviceId || token.device_id !== deviceId);

    if (filteredTokens.length === 0) {
      return new Response(JSON.stringify({ message: 'No targets', sent: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const expoMessages: ExpoPushMessage[] = [];
    const fcmMessages: FcmPushMessage[] = [];

    for (const token of filteredTokens) {
      const isAndroid = token.platform === 'android';
      const tokenType = token.token_type;
      const looksLikeExpo = token.token.startsWith('ExponentPushToken[') || token.token.startsWith('ExpoPushToken[');

      const data = { type: 'resync' };

      if (isAndroid && (tokenType === 'fcm' || (!tokenType && !looksLikeExpo))) {
        fcmMessages.push({
          to: token.token,
          data,
          priority: 'high',
        });
      } else {
        expoMessages.push({
          to: token.token,
          data,
          contentAvailable: true,
          priority: 'high',
        });
      }
    }

    if (expoMessages.length > 0) {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(expoMessages),
      });

      if (!response.ok) {
        await response.text();
      }
    }

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
            android: {
              priority: message.priority === 'high' ? 'HIGH' : 'NORMAL',
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
        }
      }
    }

    return new Response(JSON.stringify({ message: 'Resync push sent', sent: filteredTokens.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
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
