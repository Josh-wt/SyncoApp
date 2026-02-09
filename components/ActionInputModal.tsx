import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { ReminderActionType } from '../lib/types';

interface ActionInputModalProps {
  visible: boolean;
  actionType: ReminderActionType | null;
  onClose: () => void;
  onSave: (value: any) => void;
  initialValue?: any;
}

export default function ActionInputModal({
  visible,
  actionType,
  onClose,
  onSave,
  initialValue,
}: ActionInputModalProps) {
  const { theme } = useTheme();
  const [value, setValue] = useState<any>(initialValue || {});

  const handleSave = () => {
    // Validate based on action type
    if (!actionType) return;

    switch (actionType) {
      case 'call':
        if (!value.phone?.trim()) {
          Alert.alert('Error', 'Please enter a phone number');
          return;
        }
        break;
      case 'link':
        if (!value.url?.trim()) {
          Alert.alert('Error', 'Please enter a URL');
          return;
        }
        // Ensure URL has protocol
        if (!value.url.startsWith('http://') && !value.url.startsWith('https://')) {
          value.url = 'https://' + value.url;
        }
        break;
      case 'email':
        if (!value.email?.trim()) {
          Alert.alert('Error', 'Please enter an email address');
          return;
        }
        break;
      case 'location':
        if (!value.address?.trim()) {
          Alert.alert('Error', 'Please enter an address');
          return;
        }
        break;
      case 'note':
        if (!value.text?.trim()) {
          Alert.alert('Error', 'Please enter a note');
          return;
        }
        break;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(value);
    setValue({});
    onClose();
  };

  const handleCancel = () => {
    setValue({});
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
              style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
              placeholder="+1 (555) 123-4567"
              placeholderTextColor={theme.colors.textTertiary}
              value={value.phone || ''}
              onChangeText={(text) => setValue({ ...value, phone: text })}
              keyboardType="phone-pad"
              autoFocus
            />

            <Text style={[styles.label, { color: theme.colors.text, marginTop: 16 }]}>Label (Optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
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
              style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
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
              style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
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
              style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
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
              style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
              placeholder="Email subject"
              placeholderTextColor={theme.colors.textTertiary}
              value={value.subject || ''}
              onChangeText={(text) => setValue({ ...value, subject: text })}
            />

            <Text style={[styles.label, { color: theme.colors.text, marginTop: 16 }]}>Body (Optional)</Text>
            <TextInput
              style={[styles.inputMultiline, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
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
              style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
              placeholder="123 Main St, City, State"
              placeholderTextColor={theme.colors.textTertiary}
              value={value.address || ''}
              onChangeText={(text) => setValue({ ...value, address: text })}
              autoFocus
            />

            <Text style={[styles.label, { color: theme.colors.text, marginTop: 16 }]}>Label (Optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
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
              style={[styles.inputMultiline, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
              placeholder="Enter your note here..."
              placeholderTextColor={theme.colors.textTertiary}
              value={value.text || ''}
              onChangeText={(text) => setValue({ ...value, text: text })}
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
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
              Add checklist items (one per line)
            </Text>
            <TextInput
              style={[styles.inputMultiline, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
              placeholder="Task 1&#10;Task 2&#10;Task 3"
              placeholderTextColor={theme.colors.textTertiary}
              value={value.text || ''}
              onChangeText={(text) => setValue({ ...value, text: text })}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoFocus
            />
          </View>
        );

      default:
        return (
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
            This action type is not yet implemented.
          </Text>
        );
    }
  };

  const getTitle = () => {
    if (!actionType) return 'Add Action';

    switch (actionType) {
      case 'call':
        return 'Add Phone Number';
      case 'link':
        return 'Add Link';
      case 'email':
        return 'Add Email';
      case 'location':
        return 'Add Location';
      case 'note':
        return 'Add Note';
      case 'assign':
        return 'Assign Task';
      case 'photo':
        return 'Add Photo';
      case 'voice':
        return 'Record Voice Note';
      case 'subtasks':
        return 'Add Subtasks';
      default:
        return 'Add Action';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={handleCancel} />

        <View style={[styles.modal, { backgroundColor: theme.colors.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {getTitle()}
            </Text>
            <Pressable onPress={handleCancel} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderInputFields()}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={[styles.button, styles.buttonCancel, { borderColor: theme.colors.border }]}
              onPress={handleCancel}
            >
              <Text style={[styles.buttonText, { color: theme.colors.text }]}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.buttonSave]}
              onPress={handleSave}
            >
              <Text style={[styles.buttonText, styles.buttonTextSave]}>Save</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontFamily: 'BricolageGrotesque-Bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: 'BricolageGrotesque-Medium',
    marginBottom: 4,
  },
  input: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Regular',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  inputMultiline: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Regular',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    minHeight: 100,
  },
  hint: {
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Regular',
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonSave: {
    backgroundColor: '#2F00FF',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Medium',
  },
  buttonTextSave: {
    color: '#ffffff',
  },
});
