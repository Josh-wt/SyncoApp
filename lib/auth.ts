import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from './supabase';

const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'synco',
  path: 'auth',
});

console.log('Auth redirect URI:', redirectUri);

export async function signInWithGoogle() {
  console.log('🔵 [Google Auth] Starting Google sign-in flow');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUri,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    console.error('🔴 [Google Auth] Failed to get OAuth URL:', error);
    throw error;
  }

  if (!data.url) {
    console.error('🔴 [Google Auth] No OAuth URL returned');
    throw new Error('No OAuth URL returned');
  }

  console.log('🔵 [Google Auth] Opening browser for authentication');
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

  console.log('🔵 [Google Auth] Browser result:', {
    type: result.type,
    url: result.type === 'success' ? result.url : 'N/A'
  });

  if (result.type === 'success') {
    const url = new URL(result.url);
    const params = new URLSearchParams(url.hash.slice(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    console.log('🔵 [Google Auth] Tokens received:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken
    });

    if (accessToken && refreshToken) {
      console.log('🔵 [Google Auth] Setting session with tokens');
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        console.error('🔴 [Google Auth] Failed to set session:', sessionError);
        throw sessionError;
      }

      console.log('✅ [Google Auth] Session set successfully:', {
        hasSession: !!sessionData.session,
        userId: sessionData.user?.id
      });

      return sessionData;
    } else {
      console.error('🔴 [Google Auth] Missing tokens in redirect URL');
    }
  } else {
    console.log('⚠️ [Google Auth] Browser auth not successful, result type:', result.type);
  }

  return null;
}

export async function signInWithApple() {
  try {
    console.log('🍎 [Apple Auth] Starting Apple sign-in flow');

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    console.log('🍎 [Apple Auth] Credential received:', {
      hasToken: !!credential.identityToken,
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
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_REQUEST_CANCELED') {
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
