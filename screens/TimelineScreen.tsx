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
import { useTheme } from '../contexts/ThemeContext';
import BottomNavBar, { TabName } from '../components/BottomNavBar';
import { CreationMode } from '../components/CreateReminderModal';
import DateScrollerEnhanced from '../components/DateScrollerEnhanced';
import TimeOfDayHeader, { TimeOfDayPeriod } from '../components/TimeOfDayHeader';
import ReminderCardEnhanced from '../components/ReminderCardEnhanced';
import FeedbackOverlay, { FeedbackType } from '../components/FeedbackOverlay';
import {
  getAllFutureReminders,
  processRemindersStatus,
  deleteReminder,
  snoozeReminder,
  updateReminderStatus,
} from '../lib/reminders';
import { Reminder } from '../lib/types';
import { supabase } from '../lib/supabase';

interface TimelineScreenProps {
  onBack: () => void;
  onCreateReminder: (mode: CreationMode) => void;
  onTabPress: (tab: TabName) => void;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function getTimeOfDay(date: Date): TimeOfDayPeriod {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

interface GroupedReminders {
  morning: Reminder[];
  afternoon: Reminder[];
  evening: Reminder[];
  night: Reminder[];
}

function groupRemindersByTimeOfDay(reminders: Reminder[]): GroupedReminders {
  return reminders.reduce(
    (groups, reminder) => {
      const date = new Date(reminder.scheduled_time);
      const period = getTimeOfDay(date);
      groups[period].push(reminder);
      return groups;
    },
    {
      morning: [],
      afternoon: [],
      evening: [],
      night: [],
    } as GroupedReminders
  );
}

export default function TimelineScreen({
  onBack,
  onCreateReminder,
  onTabPress,
}: TimelineScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [feedback, setFeedback] = useState<FeedbackType>(null);

  const fetchReminders = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getAllFutureReminders();
      const processed = processRemindersStatus(data);
      setReminders(processed);
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
    const subscription = supabase
      .channel('timeline_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' }, () =>
        fetchReminders()
      )
      .subscribe();
    return () => {
      subscription.unsubscribe();
    };
  }, [fetchReminders]);

  const handleTabPress = useCallback(
    (tab: TabName) => {
      if (tab === 'dashboard') onBack();
      else onTabPress(tab);
    },
    [onBack, onTabPress]
  );

  const handleDeleteReminder = useCallback(
    async (reminder: Reminder) => {
      Alert.alert('Delete Reminder', `Delete "${reminder.title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReminder(reminder.id);
              setReminders((prev) => prev.filter((r) => r.id !== reminder.id));
              setFeedback('success');
            } catch (error) {
              setFeedback('error');
              Alert.alert('Error', 'Failed to delete reminder.');
            }
          },
        },
      ]);
    },
    []
  );

  const handleSnoozeReminder = useCallback(
    async (reminder: Reminder) => {
      Alert.alert('Snooze', 'Snooze for how long?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '15 minutes',
          onPress: async () => {
            try {
              await snoozeReminder(reminder.id, 15);
              fetchReminders();
              setFeedback('success');
            } catch (error) {
              setFeedback('error');
              Alert.alert('Error', 'Failed to snooze.');
            }
          },
        },
        {
          text: '1 hour',
          onPress: async () => {
            try {
              await snoozeReminder(reminder.id, 60);
              fetchReminders();
              setFeedback('success');
            } catch (error) {
              setFeedback('error');
              Alert.alert('Error', 'Failed to snooze.');
            }
          },
        },
        {
          text: '1 day',
          onPress: async () => {
            try {
              await snoozeReminder(reminder.id, 1440);
              fetchReminders();
              setFeedback('success');
            } catch (error) {
              setFeedback('error');
              Alert.alert('Error', 'Failed to snooze.');
            }
          },
        },
      ]);
    },
    [fetchReminders]
  );

  const handleCompleteReminder = useCallback(
    async (reminder: Reminder) => {
      try {
        await updateReminderStatus(reminder.id, 'completed');
        fetchReminders();
        setFeedback('success');
      } catch (error) {
        setFeedback('error');
        Alert.alert('Error', 'Failed to complete reminder.');
      }
    },
    [fetchReminders]
  );

  // Filter reminders for selected date and group by time of day
  const selectedDateReminders = reminders
    .filter((r) => isSameDay(new Date(r.scheduled_time), selectedDate))
    .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());

  const groupedReminders = groupRemindersByTimeOfDay(selectedDateReminders);

  const periods: TimeOfDayPeriod[] = ['morning', 'afternoon', 'evening', 'night'];

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.canvas}>
        {/* Header with date scroller */}
        <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: theme.colors.background }]}>
          <Text style={[styles.title, { color: theme.colors.text, fontSize: theme.fontSize.heading }]}>
            Timeline
          </Text>
          <DateScrollerEnhanced selectedDate={selectedDate} onDateSelect={setSelectedDate} daysToShow={14} />
        </View>

        {/* Reminders list grouped by time of day */}
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 140 }]}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading reminders...
              </Text>
            </View>
          ) : selectedDateReminders.length > 0 ? (
            <View style={styles.list}>
              {periods.map((period) => {
                const periodReminders = groupedReminders[period];
                if (periodReminders.length === 0) return null;

                return (
                  <View key={period} style={styles.periodSection}>
                    <TimeOfDayHeader period={period} count={periodReminders.length} />
                    {periodReminders.map((reminder) => (
                      <ReminderCardEnhanced
                        key={reminder.id}
                        reminder={reminder}
                        onComplete={handleCompleteReminder}
                        onSnooze={handleSnoozeReminder}
                        onDelete={handleDeleteReminder}
                      />
                    ))}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>✨</Text>
              <Text style={[styles.emptyTitle, { color: theme.colors.text, fontSize: theme.fontSize.xlarge }]}>
                All Clear
              </Text>
              <Text
                style={[
                  styles.emptyDesc,
                  { color: theme.colors.textSecondary, fontSize: theme.fontSize.medium },
                ]}
              >
                No reminders scheduled for this day
              </Text>
            </View>
          )}
        </ScrollView>

        <BottomNavBar
          activeTab="calendar"
          onTabPress={handleTabPress}
          onCreateReminder={onCreateReminder}
        />

        {/* Feedback overlay for success/error animations */}
        <FeedbackOverlay type={feedback} onComplete={() => setFeedback(null)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  title: {
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: 20,
    letterSpacing: -1,
  },
  content: {
    paddingTop: 20,
    paddingHorizontal: 24,
  },
  list: {
    gap: 24,
  },
  periodSection: {
    marginBottom: 8,
  },
  loadingContainer: {
    marginTop: 100,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontFamily: 'BricolageGrotesque-Regular',
  },
  empty: {
    marginTop: 100,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emptyDesc: {
    fontFamily: 'BricolageGrotesque-Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
});
