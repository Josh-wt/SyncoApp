import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { validateAndSyncFromCode } from '../../lib/accountCodes';

interface AccountCodeInputProps {
  onSyncSuccess?: () => void;
}

export default function AccountCodeInput({ onSyncSuccess }: AccountCodeInputProps) {
  const { theme } = useTheme();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCodeChange = (text: string) => {
    // Convert to uppercase and remove non-alphanumeric characters
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    // Limit to 6 characters
    setCode(cleaned.slice(0, 6));
  };

  const handleValidate = async () => {
    if (code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-character code.');
      return;
    }

    setLoading(true);
    try {
      const success = await validateAndSyncFromCode(code);

      if (success) {
        Alert.alert(
          'Success',
          'Your device has been synced with the account!',
          [
            {
              text: 'OK',
              onPress: () => {
                setCode('');
                onSyncSuccess?.();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Invalid Code',
          'The code you entered is invalid or has expired. Please check and try again.'
        );
      }
    } catch (error) {
      console.error('Error validating code:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isValidLength = code.length === 6;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <MaterialIcons name="device-hub" size={24} color={theme.colors.primary} />
        <Text
          style={[
            styles.title,
            {
              color: theme.colors.text,
              fontSize: theme.fontSize.medium,
              fontFamily: 'BricolageGrotesque-Medium',
            },
          ]}
        >
          Sync with Another Device
        </Text>
      </View>

      <Text
        style={[
          styles.description,
          {
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.small,
            fontFamily: 'BricolageGrotesque-Regular',
          },
        ]}
      >
        Enter the 6-character code from your other device to sync your reminders and settings.
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.background,
              borderColor: isValidLength ? theme.colors.primary : theme.colors.border,
              color: theme.colors.text,
              fontSize: theme.fontSize.xlarge,
            },
          ]}
          value={code}
          onChangeText={handleCodeChange}
          placeholder="XXXXXX"
          placeholderTextColor={theme.colors.textTertiary}
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!loading}
          textAlign="center"
        />

        <Pressable
          onPress={handleValidate}
          disabled={!isValidLength || loading}
          style={({ pressed }) => [
            styles.validateButton,
            {
              backgroundColor:
                !isValidLength || loading
                  ? theme.colors.borderLight
                  : pressed
                  ? theme.colors.primaryDark
                  : theme.colors.primary,
              opacity: !isValidLength || loading ? 0.5 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcons name="sync" size={20} color="#FFFFFF" />
              <Text
                style={[
                  styles.validateButtonText,
                  {
                    fontSize: theme.fontSize.medium,
                    fontFamily: 'BricolageGrotesque-Bold',
                  },
                ]}
              >
                Validate & Sync
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <View
        style={[
          styles.infoBox,
          {
            backgroundColor: theme.colors.backgroundSecondary,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <MaterialIcons name="info" size={16} color={theme.colors.info} />
        <Text
          style={[
            styles.infoText,
            {
              color: theme.colors.textSecondary,
              fontSize: theme.fontSize.tiny,
              fontFamily: 'BricolageGrotesque-Regular',
            },
          ]}
        >
          Codes expire after 24 hours. Make sure to use the code from the other device before it
          expires.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    marginLeft: 8,
    letterSpacing: -0.3,
  },
  description: {
    marginBottom: 16,
    lineHeight: 18,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: 6,
  },
  validateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  validateButtonText: {
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  infoText: {
    flex: 1,
    lineHeight: 14,
  },
});
