import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { successAnimation, shakeAnimation } from '../lib/animations';

export type FeedbackType = 'success' | 'error' | null;

interface FeedbackOverlayProps {
  type: FeedbackType;
  onComplete?: () => void;
}

/**
 * Animated feedback overlay showing success/error states
 * with checkmark animation and haptic feedback
 */
export default function FeedbackOverlay({ type, onComplete }: FeedbackOverlayProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (type === 'success') {
      successAnimation(scaleAnim, opacityAnim, onComplete);
    } else if (type === 'error') {
      shakeAnimation(shakeAnim, onComplete);
      // Also show the icon briefly
      scaleAnim.setValue(1);
      opacityAnim.setValue(1);
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
        ]).start();
      }, 1500);
    }
  }, [type, scaleAnim, opacityAnim, shakeAnim, onComplete]);

  if (!type) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View
        style={[
          styles.feedbackContainer,
          {
            transform: [
              { scale: scaleAnim },
              { translateX: type === 'error' ? shakeAnim : 0 },
            ],
            opacity: opacityAnim,
          },
        ]}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: type === 'success' ? '#10B981' : '#EF4444' },
          ]}
        >
          <MaterialIcons
            name={type === 'success' ? 'check' : 'close'}
            size={48}
            color="#FFFFFF"
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  feedbackContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
