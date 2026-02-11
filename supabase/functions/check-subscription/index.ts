import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// RevenueCat REST API credentials
const REVENUECAT_API_KEY = Deno.env.get('REVENUECAT_REST_API_KEY') || '';

interface CheckSubscriptionResponse {
  isProUser: boolean;
  entitlements: string[];
  expiresDate?: string;
}

Deno.serve(async (req) => {
  // Handle CORS
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
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user from JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Check subscription status via RevenueCat REST API
    const response = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${user.id}`,
      {
        headers: {
          'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      // If user not found in RevenueCat, they're free tier
      if (response.status === 404) {
        return new Response(
          JSON.stringify({
            isProUser: false,
            entitlements: [],
          } as CheckSubscriptionResponse),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to check subscription status' }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const data = await response.json();

    // Check for active entitlements
    const entitlements = data.subscriber?.entitlements || {};
    const activeEntitlements = Object.keys(entitlements).filter(
      (key) => entitlements[key].expires_date === null || new Date(entitlements[key].expires_date) > new Date()
    );

    const isProUser = activeEntitlements.includes('pro');
    const proEntitlement = entitlements['pro'];

    return new Response(
      JSON.stringify({
        isProUser,
        entitlements: activeEntitlements,
        expiresDate: proEntitlement?.expires_date || undefined,
      } as CheckSubscriptionResponse),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
});
