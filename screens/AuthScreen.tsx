import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signInWithGoogle, signInWithEmail } from '../lib/auth';
import { GlowTopRight, GlowBottomLeft } from '../components/icons';

interface AuthScreenProps {
  onBack?: () => void;
}

export default function AuthScreen({ onBack }: AuthScreenProps) {
  const insets = useSafeAreaInsets();
  const [loadingProvider, setLoadingProvider] = useState<'email' | 'google' | null>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);
  const isLoading = loadingProvider !== null;

  const handleGoogleSignIn = async () => {
    setLoadingProvider('google');
    setError(null);
    setEmailSentTo(null);

    try {
      await signInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in with Google';
      setError(message);
      Alert.alert('Sign In Error', message);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleEmailSignIn = async () => {
    setLoadingProvider('email');
    setError(null);
    setEmailSentTo(null);

    try {
      const result = await signInWithEmail(email);
      setEmailSentTo(result.email);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in with email';
      setError(message);
      Alert.alert('Sign In Error', message);
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.glowTopRight}>
        <GlowTopRight />
      </View>
      <View style={styles.glowBottomLeft}>
        <GlowBottomLeft />
      </View>

      <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Remmy</Text>
          <Text style={styles.subtitle}>
            Sign in to start creating and managing your reminders
          </Text>
        </View>

        {/* Auth Buttons */}
        <View style={styles.buttonContainer}>
          <View style={styles.emailContainer}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.emailInput}
              placeholder="you@example.com"
              placeholderTextColor="rgba(18, 16, 24, 0.4)"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />

            <Pressable
              style={[styles.authButton, styles.emailButton, isLoading && styles.buttonDisabled]}
              onPress={handleEmailSignIn}
              disabled={isLoading}
            >
              {loadingProvider === 'email' ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.emailIcon}>@</Text>
                  <Text style={styles.authButtonText}>Continue with Email</Text>
                </>
              )}
            </Pressable>
          </View>

          <Pressable
            style={[styles.authButton, styles.googleButton, isLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            {loadingProvider === 'google' ? (
              <ActivityIndicator color="#2F00FF" />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={[styles.authButtonText, styles.googleButtonText]}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          {emailSentTo && (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>Check {emailSentTo} for your sign-in link.</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        {/* Terms */}
        <Text style={styles.termsText}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>

        {onBack && (
          <Pressable style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Back to Onboarding</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f6f1ff',
  },
  glowTopRight: {
    position: 'absolute',
    top: -160,
    right: -160,
    opacity: 0.9,
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: -120,
    left: -120,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 64,
    alignItems: 'center',
  },
  title: {
    fontSize: 40,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#121018',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Regular',
    color: 'rgba(18, 16, 24, 0.6)',
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    gap: 16,
  },
  emailContainer: {
    gap: 12,
  },
  emailInput: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(47, 0, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#121018',
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  emailButton: {
    backgroundColor: '#2F00FF',
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(47, 0, 255, 0.2)',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  authButtonText: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#ffffff',
  },
  googleButtonText: {
    color: '#121018',
  },
  emailIcon: {
    fontSize: 20,
    color: '#ffffff',
  },
  googleIcon: {
    fontSize: 18,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#2F00FF',
  },
  errorContainer: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.2)',
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#dc2626',
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.28)',
  },
  successText: {
    fontSize: 14,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#166534',
    textAlign: 'center',
  },
  termsText: {
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Regular',
    color: 'rgba(18, 16, 24, 0.4)',
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 24,
  },
  backButtonText: {
    fontSize: 14,
    fontFamily: 'BricolageGrotesque-Regular',
    color: 'rgba(18, 16, 24, 0.4)',
  },
});
