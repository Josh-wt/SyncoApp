import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface SnoozeOption {
  minutes: number;
  label: string;
}

const SNOOZE_OPTIONS: SnoozeOption[] = [
  { minutes: 15, label: '15 minutes' },
  { minutes: 30, label: '30 minutes' },
  { minutes: 60, label: '1 hour' },
  { minutes: 120, label: '2 hours' },
  { minutes: 240, label: '4 hours' },
  { minutes: 1440, label: 'Tomorrow' },
];

interface SnoozePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (minutes: number) => void;
  title: string;
}

export default function SnoozePickerModal({
  visible,
  onClose,
  onSelect,
  title,
}: SnoozePickerModalProps) {
  const [isMounted, setIsMounted] = useState(visible);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      fadeAnim.setValue(0);
      slideAnim.setValue(SCREEN_HEIGHT);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const openAnim = Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 300,
          friction: 30,
          useNativeDriver: true,
        }),
      ]);
      openAnim.start();
      return () => openAnim.stop();
    }

    if (isMounted) {
      const closeAnim = Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      });
      closeAnim.start(({ finished }) => {
        if (finished) {
          setIsMounted(false);
        }
      });
      return () => closeAnim.stop();
    }
  }, [visible, isMounted, fadeAnim, slideAnim]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleSelect = (minutes: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(minutes);
    onClose();
  };

  if (!isMounted) return null;

  return (
    <Modal
      visible={isMounted}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        {/* Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.5],
              }),
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* Modal content */}
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.modal}>
            {/* Handle bar */}
            <View style={styles.handleBar} />

            {/* Header */}
            <View style={styles.header}>
              <MaterialIcons name="schedule" size={24} color="#2F00FF" />
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            </View>

            <Text style={styles.subtitle}>Select snooze duration</Text>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {SNOOZE_OPTIONS.map((option, index) => (
                <Pressable
                  key={option.minutes}
                  style={({ pressed }) => [
                    styles.option,
                    pressed && styles.optionPressed,
                    index !== SNOOZE_OPTIONS.length - 1 && styles.optionBorder,
                    pressed && { transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => handleSelect(option.minutes)}
                  hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
                >
                  <View style={styles.optionContent}>
                    <View style={styles.timeIndicator}>
                      <Text style={styles.timeIndicatorText}>
                        {option.minutes < 60
                          ? `${option.minutes}m`
                          : option.minutes < 1440
                          ? `${option.minutes / 60}h`
                          : '1d'}
                      </Text>
                    </View>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#cccccc" />
                </Pressable>
              ))}
            </View>

            {/* Cancel button */}
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.cancelButtonPressed,
              ]}
              onPress={handleClose}
            >
              <Text style={styles.cancelText}>CANCEL</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  modalContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -5 },
    elevation: 10,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#121118',
    letterSpacing: 0.5,
    flex: 1,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#888888',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  optionsContainer: {
    paddingHorizontal: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionPressed: {
    backgroundColor: '#f8f8f8',
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  timeIndicator: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(47, 0, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(47, 0, 255, 0.15)',
  },
  timeIndicatorText: {
    fontSize: 13,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#2F00FF',
    letterSpacing: 0.5,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#121118',
    letterSpacing: 0.3,
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  cancelButtonPressed: {
    backgroundColor: '#f8f8f8',
  },
  cancelText: {
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#888888',
    letterSpacing: 2,
  },
});
