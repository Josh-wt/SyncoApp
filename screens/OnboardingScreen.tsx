import { useState, useRef, useEffect } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import appleAuth from '@invertase/react-native-apple-authentication';
import { signInWithGoogle, signInWithApple } from '../lib/auth';

interface OnboardingScreenProps {
  onSkip?: () => void;
}

const SLIDES = [
  {
    title: 'Meet Remmy\nSet Reminders. Finish Tasks.',
    image: require('../assets/zero.png'),
    isIntro: true,
  },
  {
    title: 'Create reminders seamlessly with full control',
    image: require('../assets/one.png'),
    topImage: require('../assets/onetop.png'),
  },
  {
    title: 'Smart snooze\nthat works for you',
    image: require('../assets/two.png'),
    topImage: require('../assets/onetop.png'),
  },
  {
    title: 'Your reminders, everywhere.',
    image: require('../assets/four.png'),
    topImage: require('../assets/onetop.png'),
  },
];

// Animated dot component for smooth transitions
function AnimatedDot({ active }: { active: boolean }) {
  const widthAnim = useRef(new Animated.Value(active ? 24 : 8)).current;
  const opacityAnim = useRef(new Animated.Value(active ? 1 : 0.35)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(widthAnim, {
        toValue: active ? 24 : 8,
        useNativeDriver: false,
        tension: 300,
        friction: 15,
      }),
      Animated.timing(opacityAnim, {
        toValue: active ? 1 : 0.35,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start();
  }, [active]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: widthAnim,
          backgroundColor: opacityAnim.interpolate({
            inputRange: [0.35, 1],
            outputRange: ['rgba(255, 255, 255, 0.35)', '#ffffff'],
          }),
        },
      ]}
    />
  );
}

export default function OnboardingScreen({ onSkip }: OnboardingScreenProps) {
  const { width, height } = useWindowDimensions();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAppleAuthAvailable] = useState(
    () => Platform.OS === 'ios' && appleAuth.isSupported
  );
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;

  // Sign-in page animations
  const signInLogoAnim = useRef(new Animated.Value(0)).current;
  const signInTitleAnim = useRef(new Animated.Value(0)).current;
  const signInButtonsAnim = useRef(new Animated.Value(0)).current;
  const signInTermsAnim = useRef(new Animated.Value(0)).current;

  // Auth button press animations
  const appleScaleAnim = useRef(new Animated.Value(1)).current;
  const googleScaleAnim = useRef(new Animated.Value(1)).current;

  const isSignInSlide = currentSlide === SLIDES.length;
  const totalSlides = SLIDES.length + 1; // +1 for sign-in slide

  // Staggered entry animation for sign-in slide
  useEffect(() => {
    if (isSignInSlide) {
      signInLogoAnim.setValue(0);
      signInTitleAnim.setValue(0);
      signInButtonsAnim.setValue(0);
      signInTermsAnim.setValue(0);

      Animated.stagger(25, [
        Animated.spring(signInLogoAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 150,
          friction: 12,
        }),
        Animated.spring(signInTitleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 150,
          friction: 12,
        }),
        Animated.spring(signInButtonsAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 150,
          friction: 12,
        }),
        Animated.spring(signInTermsAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 150,
          friction: 12,
        }),
      ]).start();
    }
  }, [isSignInSlide]);

  const handleNext = () => {
    if (currentSlide < SLIDES.length) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Animate out current slide
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: -30,
          useNativeDriver: true,
          tension: 180,
          friction: 16,
        }),
      ]).start(() => {
        setCurrentSlide(currentSlide + 1);
        slideAnim.setValue(30);

        Animated.parallel([
          Animated.spring(fadeAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 180,
            friction: 16,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 180,
            friction: 16,
          }),
        ]).start();
      });
    }
  };

  const handleButtonPressIn = () => {
    Animated.spring(buttonScaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 400,
      friction: 10,
    }).start();
  };

  const handleButtonPressOut = () => {
    Animated.spring(buttonScaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 400,
      friction: 10,
    }).start();
  };

  const handleAuthPressIn = (anim: Animated.Value) => {
    Animated.spring(anim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 400,
      friction: 10,
    }).start();
  };

  const handleAuthPressOut = (anim: Animated.Value) => {
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 400,
      friction: 10,
    }).start();
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setAuthError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    setAuthError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await signInWithApple();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  // Sign-in slide
  if (isSignInSlide) {
    return (
      <View style={styles.container}>
        <Image
          source={require('../assets/onboarding-bg.png')}
          style={[styles.pngBackground, { width, height }]}
          resizeMode="cover"
        />

        <Animated.View
          style={[
            styles.signInContainer,
            {
              paddingTop: height * 0.18,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Logo */}
          <Animated.View
            style={{
              opacity: signInLogoAnim,
              transform: [
                {
                  translateY: signInLogoAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
                {
                  scale: signInLogoAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            }}
          >
            <Image
              source={require('../assets/zero.png')}
              style={{ width: width * 0.3, height: width * 0.3 }}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Title */}
          <Animated.View
            style={{
              opacity: signInTitleAnim,
              transform: [
                {
                  translateY: signInTitleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
              marginTop: 28,
              alignItems: 'center',
            }}
          >
            <Text style={styles.signInTitle}>Get started</Text>
            <Text style={styles.signInSubtitle}>
              Sign in to sync your reminders across devices
            </Text>
          </Animated.View>

          {/* Auth Buttons */}
          <Animated.View
            style={{
              opacity: signInButtonsAnim,
              transform: [
                {
                  translateY: signInButtonsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
              marginTop: 40,
              width: '100%',
              paddingHorizontal: 24,
              gap: 12,
            }}
          >
            {/* Apple Sign In */}
            {isAppleAuthAvailable && (
              <Animated.View style={{ transform: [{ scale: appleScaleAnim }] }}>
                <Pressable
                  onPress={handleAppleSignIn}
                  onPressIn={() => handleAuthPressIn(appleScaleAnim)}
                  onPressOut={() => handleAuthPressOut(appleScaleAnim)}
                  disabled={loading}
                  style={styles.authButtonOuter}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <BlurView intensity={25} tint="dark" style={styles.authBlur}>
                    <LinearGradient
                      colors={['#1a1a1a', '#000000']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.authGradient}
                    >
                      <LinearGradient
                        colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 0.5 }}
                        style={styles.highlightTop}
                      />
                      {loading ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <View style={styles.authContent}>
                          <Ionicons name="logo-apple" size={22} color="#ffffff" />
                          <Text style={styles.authButtonText}>Continue with Apple</Text>
                        </View>
                      )}
                    </LinearGradient>
                  </BlurView>
                </Pressable>
              </Animated.View>
            )}

            {/* Google Sign In */}
            <Animated.View style={{ transform: [{ scale: googleScaleAnim }] }}>
              <Pressable
                onPress={handleGoogleSignIn}
                onPressIn={() => handleAuthPressIn(googleScaleAnim)}
                onPressOut={() => handleAuthPressOut(googleScaleAnim)}
                disabled={loading}
                style={styles.authButtonOuter}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <BlurView intensity={25} tint="light" style={styles.authBlur}>
                  <LinearGradient
                    colors={['#ffffff', '#f5f5f5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.authGradient}
                  >
                    <LinearGradient
                      colors={['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 0.5 }}
                      style={styles.highlightTop}
                    />
                    {loading ? (
                      <ActivityIndicator color="#2F00FF" />
                    ) : (
                      <View style={styles.authContent}>
                        <Ionicons name="logo-google" size={20} color="#4285F4" />
                        <Text style={[styles.authButtonText, { color: '#1a1a1a' }]}>
                          Continue with Google
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
                </BlurView>
              </Pressable>
            </Animated.View>

            {authError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            )}
          </Animated.View>

          {/* Dots + Terms */}
          <Animated.View
            style={{
              opacity: signInTermsAnim,
              transform: [
                {
                  translateY: signInTermsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
              marginTop: 36,
              alignItems: 'center',
            }}
          >
            <View style={styles.dotsRow}>
              {Array.from({ length: totalSlides }).map((_, index) => (
                <AnimatedDot key={index} active={index === currentSlide} />
              ))}
            </View>

            <Text style={styles.termsText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </Animated.View>
        </Animated.View>
      </View>
    );
  }

  const slide = SLIDES[currentSlide];
  const isSnoozeSlide = currentSlide === 2;
  const isSyncSlide = currentSlide === 3;
  const isSecondSlide = currentSlide === 1;
  const isThirdSlide = currentSlide === 2;
  const isFourthSlide = currentSlide === 3;
  const hasTopImage = Boolean(slide.topImage);
  const imageScale = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });
  const defaultImageTop = slide.isIntro
    ? hasTopImage
      ? height * 0.32
      : height * 0.25
    : isSnoozeSlide
    ? hasTopImage
      ? height * 0.28
      : height * 0.2
    : isSyncSlide
    ? hasTopImage
      ? height * 0.26
      : height * 0.18
    : hasTopImage
    ? height * 0.44
    : height * 0.38;
  const imageTop =
    isSecondSlide ? height * 0.41 : isThirdSlide ? height * 0.38 : isFourthSlide ? height * 0.36 : defaultImageTop;
  const baseImageWidth = slide.isIntro
    ? width * 0.65
    : isSnoozeSlide
    ? width * 0.75
    : isSyncSlide
    ? width * 0.9
    : width * 1.3;
  const baseImageHeight = slide.isIntro
    ? width * 0.65
    : isSnoozeSlide
    ? width * 1.1
    : isSyncSlide
    ? width * 0.65
    : width * 1.2;
  const imageSizeScale = isThirdSlide ? 1.339 : 1;
  const imageWidth = baseImageWidth * imageSizeScale;
  const imageHeight = baseImageHeight * imageSizeScale;

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/onboarding-bg.png')}
        style={[styles.pngBackground, { width, height }]}
        resizeMode="cover"
      />

      {slide.topImage && (
        <Animated.View
          style={[
            styles.oneImageWrap,
            {
              top: height * 0.06,
              alignItems: 'flex-start',
              paddingLeft: (width - width * 0.987376) / 2 - width * 0.055,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Image
            source={slide.topImage}
            style={[styles.oneImage, { width: width * 0.987376, height: width * 0.987376 }]}
            resizeMode="contain"
          />
        </Animated.View>
      )}

      <Animated.View
        style={[
          styles.oneImageWrap,
          {
            top: imageTop,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: imageScale }],
          },
        ]}
      >
        <Image
          source={slide.image}
          style={[
            styles.oneImage,
            {
              width: imageWidth,
              height: imageHeight,
            },
          ]}
          resizeMode="contain"
        />
      </Animated.View>

      <View style={[styles.skipWrap, { top: 52, right: 20 }]}>
        <Pressable
          onPress={onSkip}
          style={styles.skipButton}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <Animated.View
        style={[
          styles.textBlock,
          slide.isIntro
            ? {
                left: 24,
                right: 24,
                top: height * 0.25 + width * 0.95 + 24,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: imageScale }],
              }
            : {
                left: 24,
                right: 24,
                bottom: 120,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: imageScale }],
              },
        ]}
      >
        <Text style={[styles.headline, slide.isIntro && { textAlign: 'center', fontSize: 24, lineHeight: 30 }]}>
          {slide.title}
        </Text>
        {!slide.isIntro && (
          <View style={styles.dotsRow}>
            {Array.from({ length: totalSlides }).map((_, index) => (
              <AnimatedDot key={index} active={index === currentSlide} />
            ))}
          </View>
        )}
      </Animated.View>

      <View style={[styles.buttonWrap, { left: 20, right: 20, bottom: 36 }]}>
        <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
          <Pressable
            onPress={handleNext}
            onPressIn={handleButtonPressIn}
            onPressOut={handleButtonPressOut}
            style={styles.primaryButton}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          >
            <BlurView intensity={30} tint="light" style={styles.blurLayer}>
              <LinearGradient
                colors={['#2F00FF', '#2F00FF', '#2F00FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.gradientButton}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 0.5 }}
                  style={styles.highlightTop}
                />
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.4)']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.highlightBottom}
                />
                <Text style={styles.primaryButtonText}>
                  {currentSlide === 0 ? 'Start' : 'Next'}
                </Text>
              </LinearGradient>
            </BlurView>
          </Pressable>
        </Animated.View>
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
  pngBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  oneImageWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  oneImage: {},
  skipWrap: {
    position: 'absolute',
    zIndex: 5,
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  skipText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'BricolageGrotesque-Bold',
  },
  textBlock: {
    position: 'absolute',
    zIndex: 3,
  },
  headline: {
    color: '#ffffff',
    fontSize: 28,
    lineHeight: 34,
    fontFamily: 'BricolageGrotesque-Bold',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  dot: {
    height: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  buttonWrap: {
    position: 'absolute',
    zIndex: 4,
  },
  primaryButton: {
    position: 'relative',
    borderRadius: 100,
  },
  blurLayer: {
    borderRadius: 100,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.6)',
  },
  gradientButton: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    position: 'relative',
  },
  highlightTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderRadius: 100,
  },
  highlightBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderRadius: 100,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: 0.5,
    zIndex: 1,
  },

  // Sign-in slide styles
  signInContainer: {
    flex: 1,
    alignItems: 'center',
    zIndex: 3,
  },
  signInTitle: {
    color: '#ffffff',
    fontSize: 30,
    fontFamily: 'BricolageGrotesque-Bold',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  signInSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 15,
    fontFamily: 'BricolageGrotesque-Regular',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
    paddingHorizontal: 32,
  },

  // Auth button styles (CTA style with BlurView + LinearGradient)
  authButtonOuter: {
    borderRadius: 100,
  },
  authBlur: {
    borderRadius: 100,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  authGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    position: 'relative',
  },
  authContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 1,
  },
  authButtonText: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#ffffff',
    letterSpacing: 0.3,
  },

  errorContainer: {
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#fca5a5',
    textAlign: 'center',
  },
  termsText: {
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Regular',
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
    paddingHorizontal: 40,
  },
});
