import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import appleAuth, {
  AppleError,
  AppleRequestOperation,
  AppleRequestScope,
} from '@invertase/react-native-apple-authentication';
import { supabase } from './supabase';

const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'synco',
  path: 'auth',
});

const completedAuthCallbacks = new Set<string>();
const inFlightAuthCallbacks = new Map<string, Promise<boolean>>();

function getCallbackParams(callbackUrl: string): {
  queryParams: URLSearchParams;
  hashParams: URLSearchParams;
} {
  const url = new URL(callbackUrl);
  return {
    queryParams: new URLSearchParams(url.search),
    hashParams: new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash),
  };
}

export async function completeAuthFromUrl(callbackUrl: string | null | undefined): Promise<boolean> {
  if (!callbackUrl) {
    return false;
  }

  let queryParams: URLSearchParams;
  let hashParams: URLSearchParams;
  try {
    ({ queryParams, hashParams } = getCallbackParams(callbackUrl));
  } catch {
    return false;
  }

  const errorCode = queryParams.get('error') || hashParams.get('error');
  const errorDescription =
    queryParams.get('error_description') ||
    hashParams.get('error_description');

  if (errorCode || errorDescription) {
    throw new Error(errorDescription || errorCode || 'OAuth sign in failed');
  }

  const authCode = queryParams.get('code') || hashParams.get('code');
  const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');

  if (authCode) {
    const callbackKey = `code:${authCode}`;

    if (completedAuthCallbacks.has(callbackKey)) {
      return true;
    }

    const existingCompletion = inFlightAuthCallbacks.get(callbackKey);
    if (existingCompletion) {
      return existingCompletion;
    }

    const completion = (async (): Promise<boolean> => {
      const { error } = await supabase.auth.exchangeCodeForSession(authCode);
      if (error) {
        // Another callback handler may have already exchanged this code.
        const { data: existingSession } = await supabase.auth.getSession();
        if (existingSession.session) {
          return true;
        }
        throw error;
      }
      return true;
    })();

    inFlightAuthCallbacks.set(callbackKey, completion);

    try {
      const handled = await completion;
      if (handled) {
        completedAuthCallbacks.add(callbackKey);
        if (completedAuthCallbacks.size > 20) {
          const oldestKey = completedAuthCallbacks.values().next().value;
          if (oldestKey) {
            completedAuthCallbacks.delete(oldestKey);
          }
        }
      }
      return handled;
    } finally {
      inFlightAuthCallbacks.delete(callbackKey);
    }
  }

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      throw error;
    }
    return true;
  }

  return false;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUri,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data.url) {
    throw new Error('No OAuth URL returned');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

  if (result.type === 'success') {
    await completeAuthFromUrl(result.url);
  }

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      throw sessionError;
    }
    if (sessionData.session) {
      return sessionData;
    }
    if (attempt < 5) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  if (result.type === 'success') {
    throw new Error('OAuth callback did not contain a valid session');
  }

  return null;
}

export async function signInWithApple() {
  try {
    console.log('🍎 [Apple Auth] Starting Apple sign-in flow');

    if (!appleAuth.isSupported) {
      console.error('🔴 [Apple Auth] Apple Sign In is not supported on this device');
      throw new Error('Apple Sign In is not supported on this device');
    }

    const credential = await appleAuth.performRequest({
      requestedOperation: AppleRequestOperation.LOGIN,
      requestedScopes: [AppleRequestScope.FULL_NAME, AppleRequestScope.EMAIL],
      nonceEnabled: true,
    });

    const nonce =
      typeof credential.nonce === 'string' && credential.nonce.length > 0
        ? credential.nonce
        : undefined;

    console.log('🍎 [Apple Auth] Credential received:', {
      hasToken: !!credential.identityToken,
      hasNonce: !!nonce,
      email: credential.email,
      user: credential.user,
      fullName: credential.fullName
    });

    if (!credential.identityToken) {
      console.error('🔴 [Apple Auth] No identity token returned from Apple');
      throw new Error('No identity token returned from Apple');
    }

    console.log('🍎 [Apple Auth] Sending identity token to Supabase');
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      ...(nonce ? { nonce } : {}),
    });

    if (error) {
      console.error('🔴 [Apple Auth] Supabase sign-in error:', error);
      throw error;
    }

    console.log('✅ [Apple Auth] Sign-in successful:', {
      hasSession: !!data.session,
      hasUser: !!data.user,
      userId: data.user?.id,
      userEmail: data.user?.email
    });

    // Session is automatically set by signInWithIdToken, no need to set it again
    return data;
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === AppleError.CANCELED
    ) {
      // User canceled the sign-in
      console.log('⚠️ [Apple Auth] Sign-in canceled by user');
      return null;
    }
    console.error('🔴 [Apple Auth] Unexpected error:', error);
    throw error;
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthStateChange(callback: (session: any) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}
