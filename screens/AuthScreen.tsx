import { useState, useEffect } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { signInWithGoogle, signInWithApple } from '../lib/auth';
import { GlowTopRight, GlowBottomLeft } from '../components/icons';

interface AuthScreenProps {
  onBack?: () => void;
}

export default function AuthScreen({ onBack }: AuthScreenProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setIsAppleAuthAvailable);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      await signInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in with Google';
      setError(message);
      Alert.alert('Sign In Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      await signInWithApple();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in with Apple';
      setError(message);
      Alert.alert('Sign In Error', message);
    } finally {
      setLoading(false);
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
          <Text style={styles.title}>Welcome to Synco</Text>
          <Text style={styles.subtitle}>
            Sign in to start creating and managing your reminders
          </Text>
        </View>

        {/* Auth Buttons */}
        <View style={styles.buttonContainer}>
          {isAppleAuthAvailable && (
            <Pressable
              style={[styles.authButton, styles.appleButton, loading && styles.buttonDisabled]}
              onPress={handleAppleSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.appleIcon}></Text>
                  <Text style={styles.authButtonText}>Continue with Apple</Text>
                </>
              )}
            </Pressable>
          )}

          <Pressable
            style={[styles.authButton, styles.googleButton, loading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#2F00FF" />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={[styles.authButtonText, styles.googleButtonText]}>Continue with Google</Text>
              </>
            )}
          </Pressable>

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
  appleButton: {
    backgroundColor: '#000000',
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
  appleIcon: {
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
