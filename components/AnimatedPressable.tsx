import { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  ViewStyle,
} from 'react-native';

interface AnimatedPressableProps {
  onPress?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
  pressScale?: number;
  pressOpacity?: number;
  enableGlow?: boolean;
  glowColor?: string;
}

export default function AnimatedPressable({
  onPress,
  disabled = false,
  children,
  style,
  pressScale = 0.98,
  pressOpacity = 0.95,
  enableGlow = true,
  glowColor = 'rgba(0, 255, 255, 0.15)',
}: AnimatedPressableProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: pressScale,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: pressOpacity,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
      Animated.timing(translateYAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
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
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
    ]).start();
  };

  const animatedBorderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0, 255, 255, 0)', glowColor],
  });

  const animatedShadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.04, 0.12],
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
          styles.container,
          style,
          {
            transform: [
              { scale: scaleAnim },
              { translateY: translateYAnim },
            ],
            opacity: opacityAnim,
            borderColor: enableGlow ? animatedBorderColor : 'transparent',
          },
          disabled && styles.disabled,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderColor: 'transparent',
  },
  disabled: {
    opacity: 0.6,
  },
});
