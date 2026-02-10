import { useEffect, useRef, useState } from 'react';
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
const CLOSE_FADE_DURATION = Platform.OS === 'ios' ? 500 : 500;
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
          duration: OPEN_FADE_DURATION,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          ...(SPRING_CONFIG || { tension: 260, friction: 28 }),
          useNativeDriver: true,
        }),
      ]);
      openAnim.start();
      return () => openAnim.stop();
    }

    if (isMounted) {
      const closeAnim = Animated.parallel([
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
      ]);
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

  const handleOptionPress = (option: ActionOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    option.onPress();
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
            styles.sheetWrapper,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View
            style={[
              styles.sheet,
              { paddingBottom: insets.bottom + 12 },
            ]}
          >
            <View style={styles.handle} />

            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>

            <View style={styles.actions}>
              {options.map((option, index) => {
                const isLast = index === options.length - 1;
                return (
                <Pressable
                  key={option.id}
                  style={({ pressed }) => [
                    styles.actionRowHit,
                    pressed && styles.actionRowPressed,
                  ]}
                  onPress={() => handleOptionPress(option)}
                  hitSlop={{ top: 6, bottom: 6, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                >
                  <View style={[styles.actionRow, !isLast && styles.actionRowDivider]}>
                    <View style={styles.iconCircle}>
                      <MaterialIcons name={option.icon} size={20} color={option.color || '#2F00FF'} />
                    </View>
                    <Text style={styles.actionText} numberOfLines={1}>
                      {option.label}
                    </Text>
                    <MaterialIcons name="chevron-right" size={20} color="#c7cdd8" />
                  </View>
                </Pressable>
              )})}
            </View>

            <View style={styles.cancelSection}>
              <Pressable
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && styles.cancelButtonPressed,
                ]}
                onPress={handleClose}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  sheetWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  sheet: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingTop: 10,
    paddingBottom: 6,
    shadowColor: Platform.OS === 'ios' ? '#000' : undefined,
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0,
    shadowRadius: Platform.OS === 'ios' ? 24 : 0,
    shadowOffset: Platform.OS === 'ios' ? { width: 0, height: -8 } : { width: 0, height: 0 },
    elevation: Platform.OS === 'android' ? 10 : 0,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: -0.2,
    color: '#121118',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 6,
  },
  actions: {
    paddingHorizontal: 8,
    paddingBottom: 2,
  },
  actionRowHit: {
    width: '100%',
  },
  actionRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  actionRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#eef1f6',
  },
  actionRowPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: '#f5f6fb',
    borderRadius: 12,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionText: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Medium',
    letterSpacing: -0.1,
    color: '#111827',
    flex: 1,
    minWidth: 0,
  },
  cancelSection: {
    paddingHorizontal: 8,
    paddingBottom: 10,
    paddingTop: 4,
    alignItems: 'center',
  },
  cancelButton: {
    marginTop: 6,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    minWidth: 140,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#eef1f6',
  },
  cancelButtonPressed: {
    backgroundColor: '#f5f6fb',
  },
  cancelText: {
    fontSize: 15,
    fontFamily: 'BricolageGrotesque-SemiBold',
    color: '#6b7280',
  },
});
