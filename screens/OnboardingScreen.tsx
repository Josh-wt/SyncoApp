import { useCallback, useState, useRef } from 'react';
import { Alert, Animated, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { signInWithGoogle, signInWithApple } from '../lib/auth';

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 262 262">
      <Path
        d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
        fill="#4285F4"
      />
      <Path
        d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
        fill="#34A853"
      />
      <Path
        d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
        fill="#FBBC05"
      />
      <Path
        d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
        fill="#EB4335"
      />
    </Svg>
  );
}

function AppleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z"
        fill="#000000"
      />
    </Svg>
  );
}

interface OnboardingScreenProps {
  onSkip?: () => void;
}

// Animated Sign-In Button Component
function AnimatedSignInButton({
  onPress,
  disabled,
  icon,
  label
}: {
  onPress: () => void;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(translateYAnim, {
        toValue: 2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const animatedShadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.25],
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.signInButton,
          {
            transform: [
              { scale: scaleAnim },
              { translateY: translateYAnim },
            ],
          },
          disabled && styles.buttonDisabled,
        ]}
      >
        <View style={styles.buttonContent}>
          {icon}
          <Text style={styles.signInText}>{label}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// Animated Skip Button Component
function AnimatedSkipButton({ onPress }: { onPress?: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.skipButtonInner, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.skipText}>Skip</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function OnboardingScreen({ onSkip }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [isLoading, setIsLoading] = useState(false);

  const handleOAuthSignIn = useCallback(async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    try {
      const session = provider === 'apple' ? await signInWithApple() : await signInWithGoogle();
      if (session) {
        console.log('Signed in:', session.user?.email);
      }
    } catch (error) {
      Alert.alert('Sign in failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.bgBase} />

      <View style={styles.softWash} />

      <View style={[styles.progressContainer, { top: insets.top + 16 }]}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '25%' }]} />
        </View>
      </View>

      <View style={[styles.skipButton, { top: insets.top + 16 }]}>
        <AnimatedSkipButton onPress={onSkip} />
      </View>

      <Image
        source={{ uri: 'https://r2-pub.rork.com/attachments/tafj3o0rhg6tb0wzx829x' }}
        style={[
          styles.notificationImage,
          {
            width: width * 1.25235,
            height: width * 0.626175,
            left: width * -0.126175,
            top: height * 0.46 - width * 0.54625 - height * 0.16,
          },
        ]}
        resizeMode="contain"
      />

      <Image
        source={require('../BellPink.png')}
        style={[
          styles.centerBell,
          {
            width: width * 1.2,
            height: width * 1.2,
            left: (width - width * 1.2) / 2,
            top: (height - width * 1.2) / 2 - height * 0.05,
          },
        ]}
        resizeMode="contain"
      />

      <View style={styles.ringsContainer} />
      <View style={styles.noiseOverlay} />

      <Text
        numberOfLines={2}
        adjustsFontSizeToFit={true}
        style={[styles.taglineText, { bottom: height * 0.32 + 16 - height * 0.02, fontSize: 27.4 }]}
      >
        NEVER FORGET ANYTHING{'\n'}AGAIN
      </Text>

      <View style={[styles.whiteSheet, { height: height * 0.28, backgroundColor: 'rgb(59, 26, 110)' }]} />

      <View
        style={[
          styles.buttonsContainer,
          { paddingBottom: insets.bottom + 40, transform: [{ translateY: -height * 0.002 }] },
        ]}
      >
        <Text style={styles.getStartedText} numberOfLines={1}>
          Get Started With <Text style={styles.syncoText}>Synco</Text>
        </Text>
        <AnimatedSignInButton
          onPress={() => void handleOAuthSignIn('google')}
          disabled={isLoading}
          icon={<GoogleIcon />}
          label="Sign in with Google"
        />
        <AnimatedSignInButton
          onPress={() => void handleOAuthSignIn('apple')}
          disabled={isLoading}
          icon={<AppleIcon />}
          label="Sign in with Apple"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
  },
  bgBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f6f1ff',
  },
  softWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  svgWash: {
    position: 'absolute',
    top: '-35%',
    left: '-35%',
    opacity: 1,
  },
  ringsContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  noiseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0)',
    opacity: 0,
  },
  notificationImage: {
    position: 'absolute',
    zIndex: 10,
  },
  centerBell: {
    position: 'absolute',
    zIndex: 12,
  },
  buttonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    gap: 12,
    zIndex: 20,
  },
  getStartedText: {
    fontSize: 26.4,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 28.8,
    fontFamily: 'DMSans-Bold',
  },
  taglineText: {
    position: 'absolute',
    left: 24,
    right: 24,
    fontFamily: 'BBHHegarty-Regular',
    fontSize: 21.4,
    letterSpacing: 1.2,
    color: '#000000',
    textAlign: 'center',
  },
  syncoText: {
    fontFamily: 'DMSans-Bold',
  },
  signInButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    // 3D effect with cyan outline
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 255, 0.35)',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    // Bottom shadow for 3D depth
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0, 200, 200, 0.3)',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  skipButtonInner: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  signInText: {
    color: '#000000',
    fontSize: 17,
    fontFamily: 'DMSans-Regular',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  progressTrack: {
    width: 200,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B1A6E',
    borderRadius: 3,
  },
  skipButton: {
    position: 'absolute',
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 30,
  },
  skipText: {
    fontSize: 14,
    color: '#888888',
    fontFamily: 'DMSans-Regular',
  },
  whiteSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    zIndex: 15,
    overflow: 'hidden',
  },
});
