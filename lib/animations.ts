import { Animated } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Reusable animation utilities for consistent micro-interactions
 */

/**
 * Spring animation for button/card press
 */
export function createPressAnimation(
  scaleAnim: Animated.Value,
  onPressIn: () => void = () => {},
  onPressOut: () => void = () => {}
) {
  return {
    handlePressIn: () => {
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        useNativeDriver: true,
        tension: 400,
        friction: 10,
      }).start();
      onPressIn();
    },
    handlePressOut: () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 400,
        friction: 10,
      }).start();
      onPressOut();
    },
  };
}

/**
 * Shake animation for error states
 */
export function shakeAnimation(translateX: Animated.Value, callback?: () => void) {
  Animated.sequence([
    Animated.timing(translateX, { toValue: 10, duration: 50, useNativeDriver: true }),
    Animated.timing(translateX, { toValue: -10, duration: 50, useNativeDriver: true }),
    Animated.timing(translateX, { toValue: 10, duration: 50, useNativeDriver: true }),
    Animated.timing(translateX, { toValue: -10, duration: 50, useNativeDriver: true }),
    Animated.timing(translateX, { toValue: 0, duration: 50, useNativeDriver: true }),
  ]).start(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    callback?.();
  });
}

/**
 * Success checkmark scale animation
 */
export function successAnimation(
  scaleAnim: Animated.Value,
  opacityAnim: Animated.Value,
  callback?: () => void
) {
  // Reset values
  scaleAnim.setValue(0);
  opacityAnim.setValue(0);

  Animated.parallel([
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 7,
    }),
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }),
  ]).start(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Auto-hide after 1.5s
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(callback);
    }, 1500);
  });
}

/**
 * Accordion expand/collapse animation
 */
export function accordionAnimation(
  heightAnim: Animated.Value,
  isExpanded: boolean,
  expandedHeight: number,
  collapsedHeight: number = 0
) {
  Animated.spring(heightAnim, {
    toValue: isExpanded ? expandedHeight : collapsedHeight,
    useNativeDriver: false, // height animation requires layout
    tension: 100,
    friction: 10,
  }).start();
}

/**
 * Fade in animation
 */
export function fadeIn(opacityAnim: Animated.Value, duration: number = 300, callback?: () => void) {
  opacityAnim.setValue(0);
  Animated.timing(opacityAnim, {
    toValue: 1,
    duration,
    useNativeDriver: true,
  }).start(callback);
}

/**
 * Fade out animation
 */
export function fadeOut(opacityAnim: Animated.Value, duration: number = 300, callback?: () => void) {
  Animated.timing(opacityAnim, {
    toValue: 0,
    duration,
    useNativeDriver: true,
  }).start(callback);
}

/**
 * Pulse animation (for notifications, badges, etc.)
 */
export function pulseAnimation(scaleAnim: Animated.Value) {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ])
  );
}

/**
 * Slide in from bottom animation
 */
export function slideInFromBottom(
  translateYAnim: Animated.Value,
  opacityAnim: Animated.Value,
  callback?: () => void
) {
  translateYAnim.setValue(100);
  opacityAnim.setValue(0);

  Animated.parallel([
    Animated.spring(translateYAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }),
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }),
  ]).start(callback);
}

/**
 * Slide out to bottom animation
 */
export function slideOutToBottom(
  translateYAnim: Animated.Value,
  opacityAnim: Animated.Value,
  callback?: () => void
) {
  Animated.parallel([
    Animated.timing(translateYAnim, {
      toValue: 100,
      duration: 200,
      useNativeDriver: true,
    }),
    Animated.timing(opacityAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }),
  ]).start(callback);
}

/**
 * Glow animation for important UI elements
 */
export function glowAnimation(opacityAnim: Animated.Value) {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.3,
        duration: 1500,
        useNativeDriver: true,
      }),
    ])
  );
}
