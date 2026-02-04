import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AuroraBackgroundProps {
  /** Position: 'bottom' | 'top' - where the aurora emanates from */
  position?: 'bottom' | 'top';
  /** Intensity of the blur (1-100) */
  intensity?: number;
  /** Primary color */
  color1?: string;
  /** Secondary color */
  color2?: string;
  /** Tertiary color */
  color3?: string;
  /** Enable subtle animation */
  animated?: boolean;
}

export function AuroraBackground({
  position = 'bottom',
  intensity = 60,
  color1 = 'rgba(139, 92, 246, 0.4)',   // Purple
  color2 = 'rgba(99, 102, 241, 0.3)',   // Indigo
  color3 = 'rgba(147, 197, 253, 0.25)', // Light blue
  animated = true,
}: AuroraBackgroundProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animated) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: 30,
            duration: 8000,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -20,
            duration: 6000,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1.1,
            duration: 7000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: -30,
            duration: 8000,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 20,
            duration: 6000,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 7000,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [animated, translateX, translateY, scale]);

  const isBottom = position === 'bottom';

  return (
    <View style={[styles.container, isBottom ? styles.bottom : styles.top]}>
      {/* Layer 1: Large gradient blob */}
      <Animated.View
        style={[
          styles.blob,
          styles.blob1,
          isBottom ? styles.blob1Bottom : styles.blob1Top,
          animated && {
            transform: [
              { translateX },
              { translateY },
              { scale },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', color1, color2, 'transparent']}
          start={{ x: 0, y: isBottom ? 1 : 0 }}
          end={{ x: 1, y: isBottom ? 0 : 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Layer 2: Secondary blob offset */}
      <Animated.View
        style={[
          styles.blob,
          styles.blob2,
          isBottom ? styles.blob2Bottom : styles.blob2Top,
          animated && {
            transform: [
              { translateX: Animated.multiply(translateX, -0.7) },
              { translateY: Animated.multiply(translateY, -0.5) },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', color2, color3, 'transparent']}
          start={{ x: 0.2, y: isBottom ? 1 : 0 }}
          end={{ x: 0.8, y: isBottom ? 0 : 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Layer 3: Accent blob */}
      <Animated.View
        style={[
          styles.blob,
          styles.blob3,
          isBottom ? styles.blob3Bottom : styles.blob3Top,
          animated && {
            transform: [
              { translateX: Animated.multiply(translateX, 0.5) },
              { scale: Animated.add(scale, -0.05) },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', color3, color1, 'transparent']}
          start={{ x: 0.5, y: isBottom ? 1 : 0 }}
          end={{ x: 0.5, y: isBottom ? 0 : 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Blur overlay */}
      {Platform.OS === 'ios' ? (
        <BlurView intensity={intensity} tint="light" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.blurFallback]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: -50,
    right: -50,
    height: SCREEN_HEIGHT * 0.55,
    overflow: 'hidden',
  },
  bottom: {
    bottom: -50,
  },
  top: {
    top: -50,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blob1: {
    width: SCREEN_WIDTH * 1.2,
    height: SCREEN_WIDTH * 1.2,
  },
  blob1Bottom: {
    bottom: -SCREEN_WIDTH * 0.4,
    left: -SCREEN_WIDTH * 0.1,
  },
  blob1Top: {
    top: -SCREEN_WIDTH * 0.4,
    left: -SCREEN_WIDTH * 0.1,
  },
  blob2: {
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_WIDTH * 0.9,
  },
  blob2Bottom: {
    bottom: -SCREEN_WIDTH * 0.2,
    right: -SCREEN_WIDTH * 0.2,
  },
  blob2Top: {
    top: -SCREEN_WIDTH * 0.2,
    right: -SCREEN_WIDTH * 0.2,
  },
  blob3: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
  },
  blob3Bottom: {
    bottom: -SCREEN_WIDTH * 0.1,
    left: SCREEN_WIDTH * 0.2,
  },
  blob3Top: {
    top: -SCREEN_WIDTH * 0.1,
    left: SCREEN_WIDTH * 0.2,
  },
  blurFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
});

export default AuroraBackground;
