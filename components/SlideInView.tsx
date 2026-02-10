import { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface SlideInViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  from?: 'left' | 'right' | 'top' | 'bottom';
  style?: ViewStyle;
}

/**
 * Animated container that slides in from a specified direction
 */
export default function SlideInView({
  children,
  delay = 0,
  duration = 240,
  from = 'bottom',
  style,
}: SlideInViewProps) {
  const translateAnim = useRef(new Animated.Value(from === 'left' || from === 'right' ? 80 : 80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Set initial position based on direction
    const initialValue = from === 'left' ? -80 : from === 'right' ? 80 : from === 'top' ? -80 : 80;
    translateAnim.setValue(initialValue);

    Animated.parallel([
      Animated.spring(translateAnim, {
        toValue: 0,
        delay,
        useNativeDriver: true,
        tension: 120,
        friction: 12,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        delay,
        duration,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, duration, from, translateAnim, opacityAnim]);

  const getTransform = () => {
    if (from === 'left' || from === 'right') {
      return [{ translateX: translateAnim }];
    }
    return [{ translateY: translateAnim }];
  };

  return (
    <Animated.View
      style={[
        {
          opacity: opacityAnim,
          transform: getTransform(),
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
