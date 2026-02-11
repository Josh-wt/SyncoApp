import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../contexts/ThemeContext';
import { getActiveAccountCode, generateAccountCode } from '../../lib/accountCodes';
import type { AccountCode } from '../../lib/types';

interface AccountCodeDisplayProps {
  onCodeGenerated?: (code: string) => void;
}

export default function AccountCodeDisplay({ onCodeGenerated }: AccountCodeDisplayProps) {
  const { theme } = useTheme();
  const [accountCode, setAccountCode] = useState<AccountCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadAccountCode();
  }, []);

  const loadAccountCode = async () => {
    const code = await getActiveAccountCode();
    setAccountCode(code);
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const code = await generateAccountCode();
      if (code) {
        await loadAccountCode();
        onCodeGenerated?.(code);
        Alert.alert(
          'Code Generated',
          'Your account code has been generated. It will expire in 24 hours.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to generate account code. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (accountCode) {
      await Clipboard.setStringAsync(accountCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getTimeRemaining = () => {
    if (!accountCode) return '';

    const expiresAt = new Date(accountCode.expires_at);
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `Expires in ${diffHours}h ${diffMinutes}m`;
    } else if (diffMinutes > 0) {
      return `Expires in ${diffMinutes}m`;
    } else {
      return 'Expired';
    }
  };

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
        <MaterialIcons name="qr-code-2" size={24} color={theme.colors.primary} />
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
          Your Account Code
        </Text>
      </View>

      {accountCode ? (
        <View style={styles.codeContainer}>
          <View
            style={[
              styles.codeBox,
              {
                backgroundColor: theme.colors.primaryLight,
                borderColor: theme.colors.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.code,
                {
                  color: theme.colors.primary,
                  fontSize: theme.fontSize.xxlarge,
                  fontFamily: 'BricolageGrotesque-Bold',
                },
              ]}
            >
              {accountCode.code}
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={handleCopy}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: pressed
                    ? theme.colors.backgroundSecondary
                    : theme.colors.background,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <MaterialIcons
                name={copied ? 'check' : 'content-copy'}
                size={20}
                color={copied ? theme.colors.success : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.actionText,
                  {
                    color: copied ? theme.colors.success : theme.colors.textSecondary,
                    fontSize: theme.fontSize.small,
                    fontFamily: 'BricolageGrotesque-Medium',
                  },
                ]}
              >
                {copied ? 'Copied!' : 'Copy'}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleGenerate}
              disabled={loading}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: pressed
                    ? theme.colors.backgroundSecondary
                    : theme.colors.background,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <MaterialIcons
                name="refresh"
                size={20}
                color={theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.actionText,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.fontSize.small,
                    fontFamily: 'BricolageGrotesque-Medium',
                  },
                ]}
              >
                {loading ? 'Generating...' : 'Regenerate'}
              </Text>
            </Pressable>
          </View>

          <Text
            style={[
              styles.expiryText,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.fontSize.small,
                fontFamily: 'BricolageGrotesque-Regular',
              },
            ]}
          >
            {getTimeRemaining()}
          </Text>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text
            style={[
              styles.emptyText,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.fontSize.small,
                fontFamily: 'BricolageGrotesque-Regular',
              },
            ]}
          >
            No active code. Generate one to sync with other devices.
          </Text>
          <Pressable
            onPress={handleGenerate}
            disabled={loading}
            style={({ pressed }) => [
              styles.generateButton,
              {
                backgroundColor: pressed
                  ? theme.colors.primaryDark
                  : theme.colors.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.generateButtonText,
                {
                  fontSize: theme.fontSize.medium,
                  fontFamily: 'BricolageGrotesque-Bold',
                },
              ]}
            >
              {loading ? 'Generating...' : 'Generate Code'}
            </Text>
          </Pressable>
        </View>
      )}
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
    marginBottom: 12,
  },
  title: {
    marginLeft: 8,
    letterSpacing: -0.3,
  },
  codeContainer: {
    alignItems: 'center',
  },
  codeBox: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 16,
  },
  code: {
    letterSpacing: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  actionText: {
    letterSpacing: 0.2,
  },
  expiryText: {
    textAlign: 'center',
    lineHeight: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  generateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  generateButtonText: {
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
