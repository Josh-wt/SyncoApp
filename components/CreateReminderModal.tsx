import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useRef } from 'react';
import { PlusCircleIcon } from './icons';

// Animated Option Card Component
function AnimatedOptionCard({
  onPress,
  icon,
  title,
  description,
  isManual = false,
}: {
  onPress: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  isManual?: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

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
    ]).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={[
          styles.optionCard,
          isManual && styles.manualCard,
          {
            transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
          },
        ]}
      >
        <View style={styles.iconContainer}>{icon}</View>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </Animated.View>
    </Pressable>
  );
}

export type CreationMode = 'ai' | 'manual';

interface CreateReminderModalProps {
  visible: boolean;
  onSelectMode: (mode: CreationMode) => void;
  onClose: () => void;
}

export default function CreateReminderModal({ visible, onSelectMode, onClose }: CreateReminderModalProps) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View style={[styles.content, { transform: [{ translateY: slideAnim }] }]}>
        <AnimatedOptionCard
          onPress={() => onSelectMode('manual')}
          icon={<PlusCircleIcon />}
          title="Create Reminder"
          description="Use voice AI or manual input"
          isManual
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(246, 241, 255, 0.85)',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 180,
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  manualCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconContainerManual: {
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 22,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#161117',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#9CA3AF',
  },
});
