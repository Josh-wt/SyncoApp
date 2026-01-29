import { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  ViewStyle,
} from 'react-native';

interface AnimatedIconButtonProps {
  onPress?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
  size?: number;
  backgroundColor?: string;
  pressScale?: number;
  enableRotation?: boolean;
  rotationDegrees?: number;
  enableGlow?: boolean;
  glowColor?: string;
}

export default function AnimatedIconButton({
  onPress,
  disabled = false,
  children,
  style,
  size = 48,
  backgroundColor = '#2F00FF',
  pressScale = 0.9,
  enableRotation = false,
  rotationDegrees = 90,
  enableGlow = true,
  glowColor = 'rgba(0, 255, 255, 0.4)',
}: AnimatedIconButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: pressScale,
        useNativeDriver: true,
        tension: 400,
        friction: 10,
      }),
      enableRotation
        ? Animated.spring(rotateAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 300,
            friction: 10,
          })
        : Animated.timing(bounceAnim, {
            toValue: 1,
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
        tension: 400,
        friction: 10,
      }),
      enableRotation
        ? Animated.spring(rotateAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 300,
            friction: 10,
          })
        : Animated.spring(bounceAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 400,
            friction: 10,
          }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${rotationDegrees}deg`],
  });

  const animatedShadowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 16],
  });

  const animatedBorderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0, 255, 255, 0.2)', glowColor],
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
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor,
            borderColor: animatedBorderColor,
            transform: [
              { scale: scaleAnim },
              { rotate: enableRotation ? rotation : '0deg' },
            ],
          },
          enableGlow && styles.glow,
          style,
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 255, 0.2)',
    // 3D shadow effect
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  glow: {
    shadowColor: '#00FFFF',
    shadowOpacity: 0.4,
  },
  disabled: {
    opacity: 0.5,
  },
});
