import { useState, useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

interface OnboardingScreenProps {
  onSkip?: () => void;
}

const SLIDES = [
  {
    title: 'Create reminders seemlessly with full control',
    image: require('../assets/one.png'),
    topImage: require('../assets/onetop.png'),
  },
  {
    title: 'Snooze, so you don\'t lose. Handle notifications with ease',
    image: require('../assets/two.png'),
    topImage: require('../assets/onetop.png'),
  },
];

export default function OnboardingScreen({ onSkip }: OnboardingScreenProps) {
  const { width, height } = useWindowDimensions();
  const [currentSlide, setCurrentSlide] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Animate out current slide
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Change slide
        setCurrentSlide(currentSlide + 1);

        // Reset animation values
        slideAnim.setValue(50);

        // Animate in new slide
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      onSkip?.();
    }
  };

  const slide = SLIDES[currentSlide];

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/onboarding-bg.png')}
        style={[styles.pngBackground, { width, height }]}
        resizeMode="cover"
      />

      <View style={[styles.oneImageWrap, { top: height * 0.07, alignItems: 'flex-start', paddingLeft: (width - width * 0.987376) / 2 - width * 0.055 }]}>
        <Image
          source={slide.topImage}
          style={[styles.oneImage, { width: width * 0.987376, height: width * 0.987376 }]}
          resizeMode="contain"
        />
      </View>

      <Animated.View
        style={[
          styles.oneImageWrap,
          {
            top: currentSlide === 1 ? height * 0.35 : height * 0.38,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <Image
          source={slide.image}
          style={[styles.oneImage, { width: width * 1.2, height: width * 1.2 }]}
          resizeMode="contain"
        />
      </Animated.View>

      <View style={[styles.skipWrap, { top: 52, right: 20 }]}>
        <Pressable onPress={onSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <Animated.View
        style={[
          styles.textBlock,
          {
            left: 24,
            right: 24,
            bottom: 120,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <Text style={styles.headline}>
          {slide.title}
        </Text>
        <View style={styles.dotsRow}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentSlide && styles.dotActive
              ]}
            />
          ))}
        </View>
      </Animated.View>

      <View style={[styles.buttonWrap, { left: 20, right: 20, bottom: 36 }]}>
        <Pressable onPress={handleNext} style={styles.primaryButton}>
          {/* Blur Layer for Glassmorphism */}
          <BlurView intensity={30} tint="light" style={styles.blurLayer}>
            {/* Main Gradient */}
            <LinearGradient
              colors={['#2F00FF', '#2F00FF', '#2F00FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.gradientButton}
            >
              {/* Top Highlight */}
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 0.5 }}
                style={styles.highlightTop}
              />
              {/* Bottom Highlight */}
              <LinearGradient
                colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.4)']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 0, y: 1 }}
                style={styles.highlightBottom}
              />
              {/* Left Highlight */}
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.highlightLeft}
              />
              {/* Right Highlight */}
              <LinearGradient
                colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.4)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.highlightRight}
              />
              <Text style={styles.primaryButtonText}>
                {currentSlide === SLIDES.length - 1 ? 'Get Started' : 'Next'}
              </Text>
            </LinearGradient>
          </BlurView>
        </Pressable>
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
  oneImage: {
    maxWidth: 640,
    maxHeight: 640,
  },
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  dotActive: {
    width: 24,
    borderRadius: 6,
    backgroundColor: '#ffffff',
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
    borderWidth: .5,
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
  highlightLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '0%',
    borderRadius: 100,
  },
  highlightRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '0%',
    borderRadius: 100,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: 0.5,
    zIndex: 1,
  },
});
