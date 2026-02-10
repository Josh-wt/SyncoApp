import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const OPEN_FADE_DURATION = Platform.OS === 'ios' ? 200 : 240;
const CLOSE_FADE_DURATION = Platform.OS === 'ios' ? 150 : 180;
const SPRING_CONFIG = Platform.select({
  ios: { tension: 300, friction: 30 },
  android: { tension: 220, friction: 26 },
});

interface ActionOption {
  id: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color?: string;
  onPress: () => void;
}

interface ActionPickerModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: ActionOption[];
}

export default function ActionPickerModal({
  visible,
  onClose,
  title,
  options,
}: ActionPickerModalProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: OPEN_FADE_DURATION,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          ...(SPRING_CONFIG || { tension: 260, friction: 28 }),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: CLOSE_FADE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: CLOSE_FADE_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleOptionPress = (option: ActionOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    option.onPress();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
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

        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={[styles.modal, { paddingBottom: insets.bottom + 8 }]}>
            <View style={styles.handle} />

            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>

            <View style={styles.actions}>
              {options.map((option) => (
                <Pressable
                  key={option.id}
                  style={({ pressed }) => [
                    styles.actionRow,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => handleOptionPress(option)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                >
                  <View style={[styles.iconCircle, { backgroundColor: option.color || '#2F00FF' }]}>
                    <MaterialIcons name={option.icon} size={24} color="#ffffff" />
                  </View>
                  <Text style={styles.actionText}>{option.label}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && { backgroundColor: '#f5f5f5' },
              ]}
              onPress={handleClose}
            >
              <Text style={styles.cancelText}>Cancel</Text>
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
    paddingHorizontal: 20,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 8,
    shadowColor: Platform.OS === 'ios' ? '#000' : undefined,
    shadowOpacity: Platform.OS === 'ios' ? 0.2 : 0,
    shadowRadius: Platform.OS === 'ios' ? 24 : 0,
    shadowOffset: Platform.OS === 'ios' ? { width: 0, height: -4 } : { width: 0, height: 0 },
    elevation: Platform.OS === 'android' ? 12 : 0,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: -0.3,
    color: '#121118',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  actions: {
    gap: 2,
    paddingHorizontal: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 17,
    fontFamily: 'BricolageGrotesque-Medium',
    letterSpacing: -0.2,
    color: '#1a1a1a',
    flex: 1,
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#9ca3af',
  },
});
