import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AnimatedModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  position?: 'center' | 'bottom';
  backdropOpacity?: number;
  animationDuration?: number;
  slideDistance?: number;
}

export default function AnimatedModal({
  visible,
  onClose,
  children,
  style,
  position = 'bottom',
  backdropOpacity = 0.5,
  animationDuration = 300,
  slideDistance = 50,
}: AnimatedModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(slideDistance)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: animationDuration * 0.6,
          useNativeDriver: true,
        }),
        Animated.spring(fadeAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: animationDuration * 0.4,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: animationDuration * 0.5,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: slideDistance,
          duration: animationDuration * 0.5,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: animationDuration * 0.5,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim, scaleAnim, backdropAnim, animationDuration, slideDistance]);

  if (!visible) return null;

  const animatedBackdropOpacity = backdropAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, backdropOpacity],
  });

  return (
    <View style={styles.overlay}>
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          { opacity: animatedBackdropOpacity },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Modal Content */}
      <Animated.View
        style={[
          styles.contentContainer,
          position === 'center' ? styles.centerContent : styles.bottomContent,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <View style={[styles.content, style]}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  contentContainer: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  bottomContent: {
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
});
