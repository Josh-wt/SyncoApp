import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlowTopRight } from '../components/icons';
import { scheduleReminder, setupNotificationCategory } from '../lib/notifications';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        await setupNotificationCategory();
      } catch (error) {
        console.error('Error setting notification category:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPreferences();
  }, []);

  const handleTestNotification = async () => {
    try {
      console.log('Sending test notification');
      await scheduleReminder({
        reminderId: 'test-reminder-123',
        title: 'Test Reminder',
        body: 'Try snooze from the notification actions.',
        triggerAt: new Date(Date.now() + 3000),
      });
      console.log('Test notification sent successfully');
    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <ActivityIndicator size="large" color="#2F00FF" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      {/* Background glow */}
      <View style={styles.glowTopRight}>
        <GlowTopRight />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Customize your Synco experience</Text>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <Text style={styles.settingTitle}>Snooze Mode</Text>
            </View>
            <Text style={styles.settingDescription}>
              Snooze uses text input when supported, with a 10-minute fallback button.
            </Text>

            {/* Test Notification Button */}
            <TouchableOpacity
              style={styles.testButton}
              onPress={handleTestNotification}
            >
              <Text style={styles.testButtonText}>Send Test Notification</Text>
            </TouchableOpacity>
            <Text style={styles.testButtonHint}>
              iOS: Long-press notification to see actions. Android: Expand notification.
            </Text>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.settingCard}>
            <Text style={styles.aboutText}>Synco v1.0.0</Text>
            <Text style={styles.aboutSubtext}>
              Your intelligent reminder companion
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F4FF',
  },
  glowTopRight: {
    position: 'absolute',
    top: -100,
    right: -100,
    opacity: 0.6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 36,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#6b7280',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  settingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#2F00FF',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(47, 0, 255, 0.1)',
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  settingTitle: {
    fontSize: 18,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#1f2937',
  },
  settingDescription: {
    fontSize: 14,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#6b7280',
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  optionInfo: {
    flex: 1,
    marginRight: 16,
  },
  optionLabel: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#1f2937',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#9ca3af',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  aboutText: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  aboutSubtext: {
    fontSize: 14,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#6b7280',
  },
  testButton: {
    backgroundColor: '#2F00FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#2F00FF',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'BricolageGrotesque-Bold',
  },
  testButtonHint: {
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
});
