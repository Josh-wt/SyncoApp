import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import BottomNavBar, { TabName } from '../components/BottomNavBar';
import { CreationMode } from '../components/CreateReminderModal';
import { GlowTopRight, GlowBottomLeft } from '../components/icons';
import RemmyCharacter from '../components/RemmyCharacter';
import AnalyticsCard from '../components/AnalyticsCard';
import ProgressTipCard from '../components/ProgressTipCard';
import ReminderCardEnhanced from '../components/ReminderCardEnhanced';
import { getOverdueReminders, updateReminderStatus, deleteReminder, snoozeReminder } from '../lib/reminders';
import { calculateUserAnalytics, UserAnalytics } from '../lib/analytics';
import { generateRemmyMessage, generateProgressTips, formatMinutes } from '../lib/progressTips';
import { Reminder } from '../lib/types';
import { supabase } from '../lib/supabase';

interface ProgressScreenProps {
  onBack: () => void;
  onCreateReminder: (mode: CreationMode) => void;
  onTabPress: (tab: TabName) => void;
}

export default function ProgressScreen({
  onBack,
  onCreateReminder,
  onTabPress,
}: ProgressScreenProps) {
  const insets = useSafeAreaInsets();
  const [overdueReminders, setOverdueReminders] = useState<Reminder[]>([]);
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [tips, setTips] = useState<string[]>([]);
  const [remmyMessage, setRemmyMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchProgressData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch data in parallel for better performance
      const [overdue, stats] = await Promise.all([
        getOverdueReminders(),
        calculateUserAnalytics(),
      ]);

      setOverdueReminders(overdue);
      setAnalytics(stats);

      // Generate Remmy's contextual message
      const message = generateRemmyMessage(stats, overdue.length);
      setRemmyMessage(message);

      // Generate tips
      const generatedTips = generateProgressTips(stats, overdue.length);
      setTips(generatedTips);
    } catch (error) {
      console.error('Failed to fetch progress data:', error);
      Alert.alert('Error', 'Failed to load progress data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgressData();

    // Set up real-time subscription for reminder changes
    const subscription = supabase
      .channel('progress_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reminders',
        },
        () => {
          fetchProgressData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProgressData]);

  const handleMarkComplete = useCallback(
    async (reminder: Reminder) => {
      try {
        await updateReminderStatus(reminder.id, 'completed');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await fetchProgressData();
      } catch (error) {
        console.error('Failed to mark reminder complete:', error);
        Alert.alert('Error', 'Failed to complete reminder');
      }
    },
    [fetchProgressData]
  );

  const handleSnooze = useCallback(
    async (reminder: Reminder, minutes: number) => {
      try {
        await snoozeReminder(reminder.id, minutes);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await fetchProgressData();
      } catch (error) {
        console.error('Failed to snooze reminder:', error);
        Alert.alert('Error', 'Failed to snooze reminder');
      }
    },
    [fetchProgressData]
  );

  const handleDelete = useCallback(
    async (reminder: Reminder) => {
      try {
        await deleteReminder(reminder.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await fetchProgressData();
      } catch (error) {
        console.error('Failed to delete reminder:', error);
        Alert.alert('Error', 'Failed to delete reminder');
      }
    },
    [fetchProgressData]
  );

  const handleTabPress = useCallback(
    (tab: TabName) => {
      if (tab === 'dashboard') {
        onBack();
      } else {
        onTabPress(tab);
      }
    },
    [onBack, onTabPress]
  );

  return (
    <View style={styles.root}>
      <View style={styles.canvas}>
        {/* Background Glows */}
        <View style={styles.glowTopRight}>
          <GlowTopRight />
        </View>
        <View style={styles.glowBottomLeft}>
          <GlowBottomLeft />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 160 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Progress</Text>
              <Text style={styles.headerSubtitle}>
                {analytics ? `${analytics.completionRate}% completion rate` : 'Your journey'}
              </Text>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2F00FF" />
            </View>
          ) : (
            <>
              {/* Remmy Character Section */}
              <RemmyCharacter message={remmyMessage} showBubble={true} />

              {/* Analytics Stats Row */}
              {analytics && (
                <View style={styles.statsRow}>
                  <AnalyticsCard
                    label="Completion"
                    value={`${analytics.completionRate}%`}
                    icon="check-circle"
                    color="#10b981"
                  />
                  <AnalyticsCard
                    label="Streak"
                    value={`${analytics.currentStreak}`}
                    icon="local-fire-department"
                    color="#f59e0b"
                    subtitle={`Best: ${analytics.longestStreak} days`}
                  />
                  <AnalyticsCard
                    label="Avg Time"
                    value={formatMinutes(analytics.averageResponseTimeMinutes)}
                    icon="schedule"
                    color="#6366f1"
                  />
                </View>
              )}

              {/* Overdue Tasks Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {overdueReminders.length > 0
                    ? 'Tasks Needing Attention'
                    : 'All Tasks Completed'}
                </Text>

                {overdueReminders.length > 0 ? (
                  <View style={styles.remindersList}>
                    {overdueReminders.map((reminder) => (
                      <ReminderCardEnhanced
                        key={reminder.id}
                        reminder={reminder}
                        onComplete={handleMarkComplete}
                        onSnooze={handleSnooze}
                        onDelete={handleDelete}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>Amazing! You're all caught up! 🎉</Text>
                    <Text style={styles.emptySubtitle}>
                      All your reminders are completed. Keep up the great work!
                    </Text>
                  </View>
                )}
              </View>

              {/* Tips Section */}
              {tips.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Insights & Tips</Text>
                  <View style={styles.tipsContainer}>
                    {tips.map((tip, index) => (
                      <ProgressTipCard
                        key={index}
                        tip={tip}
                        icon="lightbulb"
                        color="#8b5cf6"
                      />
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>

        <BottomNavBar
          activeTab="notifications"
          onTabPress={handleTabPress}
          onCreateReminder={onCreateReminder}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f6f1ff',
  },
  canvas: {
    flex: 1,
    backgroundColor: '#f6f1ff',
  },
  glowTopRight: {
    position: 'absolute',
    top: -160,
    right: -160,
    opacity: 0.9,
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: -120,
    left: -120,
    opacity: 0.9,
  },
  content: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 30,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#121118',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#888888',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  loadingContainer: {
    marginTop: 60,
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
    marginTop: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#888888',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  remindersList: {
    gap: 12,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(47, 0, 255, 0.1)',
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#121118',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#888888',
    textAlign: 'center',
  },
  tipsContainer: {
    gap: 0,
  },
});
