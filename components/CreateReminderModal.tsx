import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useEffect, useRef } from 'react';
import { SparklesIcon, PlusCircleIcon } from './icons';

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
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[styles.content, { transform: [{ translateY: slideAnim }] }]}>
        <TouchableOpacity
          style={styles.optionCard}
          activeOpacity={0.9}
          onPress={() => onSelectMode('ai')}
        >
          <View style={styles.iconContainer}>
            <SparklesIcon />
          </View>
          <Text style={styles.optionTitle}>Create with AI</Text>
          <Text style={styles.optionDescription}>Describe your day naturally</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionCard, styles.manualCard]}
          activeOpacity={0.9}
          onPress={() => onSelectMode('manual')}
        >
          <View style={styles.iconContainerManual}>
            <PlusCircleIcon />
          </View>
          <Text style={styles.optionTitle}>Create manually</Text>
          <Text style={styles.optionDescription}>Traditional reminder input</Text>
        </TouchableOpacity>
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
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
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
    fontFamily: 'DMSans-Bold',
    color: '#161117',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
    color: '#9CA3AF',
  },
});
