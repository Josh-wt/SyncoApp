import { useEffect, useRef } from 'react';
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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.parallel([
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
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 150,
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

            {/* Title */}
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {options.map((option, index) => (
                <Pressable
                  key={option.id}
                  style={({ pressed }) => [
                    styles.option,
                    pressed && styles.optionPressed,
                    index !== options.length - 1 && styles.optionBorder,
                  ]}
                  onPress={() => handleOptionPress(option)}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      option.color && { backgroundColor: `${option.color}15` },
                    ]}
                  >
                    <MaterialIcons
                      name={option.icon}
                      size={20}
                      color={option.color || '#2F00FF'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.optionLabel,
                      option.color && { color: option.color },
                    ]}
                  >
                    {option.label}
                  </Text>
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
  title: {
    fontSize: 20,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#121118',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  optionsContainer: {
    paddingHorizontal: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 16,
  },
  optionPressed: {
    backgroundColor: '#f8f8f8',
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(47, 0, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
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
