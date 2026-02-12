import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import type { EmailOtpType } from '@supabase/supabase-js';
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

function isEmailOtpType(value: string): value is EmailOtpType {
  return ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'].includes(value);
}

async function completeCallbackOnce(
  callbackKey: string,
  completionFactory: () => Promise<boolean>
): Promise<boolean> {
  if (completedAuthCallbacks.has(callbackKey)) {
    return true;
  }

  const existingCompletion = inFlightAuthCallbacks.get(callbackKey);
  if (existingCompletion) {
    return existingCompletion;
  }

  const completion = completionFactory();
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
  const tokenHash = queryParams.get('token_hash') || hashParams.get('token_hash');
  const otpType = queryParams.get('type') || hashParams.get('type');
  const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');

  if (authCode) {
    return completeCallbackOnce(`code:${authCode}`, async (): Promise<boolean> => {
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
    });
  }

  if (tokenHash && otpType && isEmailOtpType(otpType)) {
    return completeCallbackOnce(
      `otp:${otpType}:${tokenHash}`,
      async (): Promise<boolean> => {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        });
        if (error) {
          // Another callback handler may have already consumed this token hash.
          const { data: existingSession } = await supabase.auth.getSession();
          if (existingSession.session) {
            return true;
          }
          throw error;
        }
        return true;
      }
    );
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

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function signInWithEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) {
    throw new Error('Please enter a valid email address');
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo: redirectUri,
      shouldCreateUser: true,
    },
  });

  if (error) {
    throw error;
  }

  return { email: normalizedEmail };
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
