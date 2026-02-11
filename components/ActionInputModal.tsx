import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Keyboard,
  KeyboardEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { ReminderActionType } from '../lib/types';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface ActionInputModalProps {
  visible: boolean;
  actionType: ReminderActionType | null;
  onClose: () => void;
  onSave: (value: any) => void;
  initialValue?: any;
}

function getActionMeta(actionType: ReminderActionType | null): {
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  accent: string;
} {
  switch (actionType) {
    case 'call':
      return {
        title: 'Add Phone Number',
        subtitle: 'Attach a direct call action to this reminder.',
        icon: 'phone',
        accent: '#14b8a6',
      };
    case 'link':
      return {
        title: 'Add Link',
        subtitle: 'Attach a URL that opens with one tap.',
        icon: 'link',
        accent: '#2563eb',
      };
    case 'email':
      return {
        title: 'Add Email',
        subtitle: 'Save a recipient and optional message context.',
        icon: 'email',
        accent: '#0ea5e9',
      };
    case 'location':
      return {
        title: 'Add Location',
        subtitle: 'Store an address for instant navigation.',
        icon: 'location-on',
        accent: '#f97316',
      };
    case 'note':
      return {
        title: 'Add Note',
        subtitle: 'Keep details attached to this reminder.',
        icon: 'description',
        accent: '#64748b',
      };
    case 'subtasks':
      return {
        title: 'Add Subtasks',
        subtitle: 'Split work into a quick checklist.',
        icon: 'checklist',
        accent: '#84cc16',
      };
    case 'assign':
      return {
        title: 'Assign Task',
        subtitle: 'Choose who this reminder belongs to.',
        icon: 'person-add',
        accent: '#7c3aed',
      };
    case 'photo':
      return {
        title: 'Add Photo',
        subtitle: 'Attach an image reference.',
        icon: 'photo-camera',
        accent: '#ec4899',
      };
    case 'voice':
      return {
        title: 'Record Voice Note',
        subtitle: 'Attach a short audio message.',
        icon: 'mic',
        accent: '#f43f5e',
      };
    default:
      return {
        title: 'Add Action',
        subtitle: 'Configure a quick action for this reminder.',
        icon: 'bolt',
        accent: '#2F00FF',
      };
  }
}

export default function ActionInputModal({
  visible,
  actionType,
  onClose,
  onSave,
  initialValue,
}: ActionInputModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState<any>(initialValue || {});
  const [isMounted, setIsMounted] = useState(visible);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const keyboardOffsetAnim = useRef(new Animated.Value(0)).current;

  const actionMeta = useMemo(() => getActionMeta(actionType), [actionType]);

  useEffect(() => {
    if (visible) {
      setValue(initialValue || {});
      setIsMounted(true);
      fadeAnim.setValue(0);
      slideAnim.setValue(SCREEN_HEIGHT);
      keyboardOffsetAnim.setValue(0);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 220,
          friction: 24,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (isMounted) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 170,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(keyboardOffsetAnim, {
          toValue: 0,
          duration: 170,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setIsMounted(false);
        }
      });
    }
  }, [visible, isMounted, initialValue, fadeAnim, slideAnim, keyboardOffsetAnim]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    const onKeyboardShow = (event: KeyboardEvent) => {
      const height = event.endCoordinates?.height ?? 0;
      const targetOffset = Math.max(height - insets.bottom, 0);
      Animated.timing(keyboardOffsetAnim, {
        toValue: targetOffset,
        duration: Platform.OS === 'ios' ? event.duration ?? 220 : 220,
        useNativeDriver: true,
      }).start();
    };

    const onKeyboardHide = (event: KeyboardEvent) => {
      Animated.timing(keyboardOffsetAnim, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? event.duration ?? 200 : 180,
        useNativeDriver: true,
      }).start();
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideSub = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [isMounted, insets.bottom, keyboardOffsetAnim]);

  const handleSave = () => {
    if (!actionType) return;

    const nextValue = { ...value };

    switch (actionType) {
      case 'call':
        if (!nextValue.phone?.trim()) {
          Alert.alert('Error', 'Please enter a phone number');
          return;
        }
        break;
      case 'link':
        if (!nextValue.url?.trim()) {
          Alert.alert('Error', 'Please enter a URL');
          return;
        }
        if (!nextValue.url.startsWith('http://') && !nextValue.url.startsWith('https://')) {
          nextValue.url = `https://${nextValue.url}`;
        }
        break;
      case 'email':
        if (!nextValue.email?.trim()) {
          Alert.alert('Error', 'Please enter an email address');
          return;
        }
        break;
      case 'location':
        if (!nextValue.address?.trim()) {
          Alert.alert('Error', 'Please enter an address');
          return;
        }
        break;
      case 'note':
        if (!nextValue.text?.trim()) {
          Alert.alert('Error', 'Please enter a note');
          return;
        }
        break;
      default:
        break;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(nextValue);
    setValue({});
    Keyboard.dismiss();
    onClose();
  };

  const handleCancel = () => {
    setValue({});
    Keyboard.dismiss();
    onClose();
  };

  const renderInputFields = () => {
    if (!actionType) return null;

    switch (actionType) {
      case 'call':
        return (
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Phone Number *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="+1 (555) 123-4567"
              placeholderTextColor={theme.colors.textTertiary}
              value={value.phone || ''}
              onChangeText={(text) => setValue({ ...value, phone: text })}
              keyboardType="phone-pad"
              autoFocus
            />

            <Text style={[styles.label, { color: theme.colors.text, marginTop: 16 }]}>Label (Optional)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="e.g., Office, Mobile"
              placeholderTextColor={theme.colors.textTertiary}
              value={value.label || ''}
              onChangeText={(text) => setValue({ ...value, label: text })}
            />
          </View>
        );

      case 'link':
        return (
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>URL *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="https://example.com"
              placeholderTextColor={theme.colors.textTertiary}
              value={value.url || ''}
              onChangeText={(text) => setValue({ ...value, url: text })}
              keyboardType="url"
              autoCapitalize="none"
              autoFocus
            />

            <Text style={[styles.label, { color: theme.colors.text, marginTop: 16 }]}>Label (Optional)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="e.g., Project Document"
              placeholderTextColor={theme.colors.textTertiary}
              value={value.label || ''}
              onChangeText={(text) => setValue({ ...value, label: text })}
            />
          </View>
        );

      case 'email':
        return (
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Email Address *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="name@example.com"
              placeholderTextColor={theme.colors.textTertiary}
              value={value.email || ''}
              onChangeText={(text) => setValue({ ...value, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />

            <Text style={[styles.label, { color: theme.colors.text, marginTop: 16 }]}>Subject (Optional)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="Email subject"
              placeholderTextColor={theme.colors.textTertiary}
              value={value.subject || ''}
              onChangeText={(text) => setValue({ ...value, subject: text })}
            />

            <Text style={[styles.label, { color: theme.colors.text, marginTop: 16 }]}>Body (Optional)</Text>
            <TextInput
              style={[
                styles.inputMultiline,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="Email body"
              placeholderTextColor={theme.colors.textTertiary}
              value={value.body || ''}
              onChangeText={(text) => setValue({ ...value, body: text })}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        );

      case 'location':
        return (
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Address *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="123 Main St, City, State"
              placeholderTextColor={theme.colors.textTertiary}
              value={value.address || ''}
              onChangeText={(text) => setValue({ ...value, address: text })}
              autoFocus
            />

            <Text style={[styles.label, { color: theme.colors.text, marginTop: 16 }]}>Label (Optional)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="e.g., Office, Home"
              placeholderTextColor={theme.colors.textTertiary}
              value={value.label || ''}
              onChangeText={(text) => setValue({ ...value, label: text })}
            />
          </View>
        );

      case 'note':
        return (
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Note *</Text>
            <TextInput
              style={[
                styles.inputMultiline,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="Enter your note here..."
              placeholderTextColor={theme.colors.textTertiary}
              value={value.text || ''}
              onChangeText={(text) => setValue({ ...value, text })}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoFocus
            />
          </View>
        );

      case 'subtasks':
        return (
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Subtasks</Text>
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>Add checklist items (one per line)</Text>
            <TextInput
              style={[
                styles.inputMultiline,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder={'Task 1\nTask 2\nTask 3'}
              placeholderTextColor={theme.colors.textTertiary}
              value={value.text || ''}
              onChangeText={(text) => setValue({ ...value, text })}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoFocus
            />
          </View>
        );

      default:
        return <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>This action type is not yet implemented.</Text>;
    }
  };

  if (!isMounted) return null;

  const sheetTranslateY = Animated.subtract(slideAnim, keyboardOffsetAnim);

  return (
    <Modal
      visible={isMounted}
      animationType="none"
      transparent
      onRequestClose={handleCancel}
      statusBarTranslucent
      navigationBarTranslucent
      hardwareAccelerated
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.48] }) }]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={handleCancel} />
        </Animated.View>

        <Animated.View style={[styles.sheetWrapper, { transform: [{ translateY: sheetTranslateY }] }]}> 
          <View style={[styles.sheet, { backgroundColor: theme.colors.card }]}> 
            <View style={styles.handle} />

            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}> 
              <View style={[styles.iconBadge, { backgroundColor: `${actionMeta.accent}1A` }]}> 
                <MaterialIcons name={actionMeta.icon} size={18} color={actionMeta.accent} />
              </View>
              <View style={styles.headerText}> 
                <Text style={[styles.title, { color: theme.colors.text }]}>{actionMeta.title}</Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{actionMeta.subtitle}</Text>
              </View>
              <Pressable style={[styles.closeButton, { borderColor: theme.colors.border }]} onPress={handleCancel}>
                <MaterialIcons name="close" size={22} color={theme.colors.text} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {renderInputFields()}
            </ScrollView>

            <View
              style={[
                styles.footer,
                {
                  borderTopColor: theme.colors.border,
                  paddingBottom: Math.max(insets.bottom, 12),
                },
              ]}
            >
              <Pressable
                style={({ pressed }) => [styles.button, styles.buttonPrimary, pressed && styles.buttonPressed]}
                onPress={handleSave}
              >
                <Text style={[styles.buttonText, styles.buttonTextPrimary]}>Save</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
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
    width: '100%',
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    minHeight: SCREEN_HEIGHT * 0.40,
    maxHeight: SCREEN_HEIGHT * 0.96,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -8 },
    elevation: 16,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 99,
    backgroundColor: '#d4d8e0',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'BricolageGrotesque-Regular',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontFamily: 'BricolageGrotesque-SemiBold',
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'BricolageGrotesque-Regular',
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Regular',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  inputMultiline: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Regular',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 116,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 14,
    paddingHorizontal: 18,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#2F00FF',
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonText: {
    fontSize: 18,
    fontFamily: 'BricolageGrotesque-SemiBold',
    letterSpacing: -0.2,
  },
  buttonTextPrimary: {
    color: '#ffffff',
  },
});
