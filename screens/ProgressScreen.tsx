import { useCallback, useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import BottomNavBar, { TabName } from '../components/BottomNavBar';
import ActionPickerModal from '../components/ActionPickerModal';
import SnoozePickerModal from '../components/SnoozePickerModal';
import ErrorModal from '../components/ErrorModal';
import { CreationMode } from '../components/CreateReminderModal';
import { getOverdueReminders, updateReminderStatus, deleteReminder, snoozeReminder } from '../lib/reminders';
import { getReminderActions, executeReminderAction, getActionIcon } from '../lib/reminderActions';
import { calculateUserAnalytics, UserAnalytics } from '../lib/analytics';
import { generateRemmyMessage } from '../lib/progressTips';
import { Reminder, ReminderAction } from '../lib/types';
import { supabase } from '../lib/supabase';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

interface ProgressScreenProps {
  onBack: () => void;
  onCreateReminder: (mode: CreationMode) => void;
  onTabPress: (tab: TabName) => void;
}

// Helper to format time
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === date.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  if (isTomorrow) {
    return 'TOMORROW';
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
  }).toUpperCase();
}

// Helper to calculate overdue time
function getOverdueLabel(scheduledTime: string): string {
  const scheduled = new Date(scheduledTime).getTime();
  const now = Date.now();
  const diffMs = now - scheduled;
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'OVERDUE';
  if (diffHours < 24) return `OVERDUE ${diffHours}H`;
  if (diffDays === 1) return 'OVERDUE 1D';
  return `OVERDUE ${diffDays}D`;
}

// Get priority level based on overdue status
function getPriority(reminder: Reminder): number {
  if (!reminder.notified_at) return 5;

  const scheduled = new Date(reminder.scheduled_time).getTime();
  const now = Date.now();
  const diffHours = Math.floor((now - scheduled) / 3600000);

  if (diffHours > 12) return 1; // Most urgent
  if (diffHours > 6) return 2;
  if (diffHours > 2) return 3;
  if (diffHours > 0) return 4;
  return 5;
}

// Get action icon based on reminder content
function getReminderIcon(reminder: Reminder): keyof typeof MaterialIcons.glyphMap {
  const title = reminder.title.toLowerCase();
  if (title.includes('call')) return 'phone';
  if (title.includes('email') || title.includes('send')) return 'email';
  if (title.includes('meet') || title.includes('visit')) return 'location-on';
  if (title.includes('review') || title.includes('check')) return 'visibility';
  return 'arrow-forward';
}

// Task Card Component with priority-based styling
function TaskCard({ reminder, priority, onPress }: { reminder: Reminder; priority: number; onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isOverdue = reminder.notified_at && new Date(reminder.scheduled_time) < new Date();
  const [actions, setActions] = useState<ReminderAction[]>([]);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  // Fetch actions for this reminder
  useEffect(() => {
    getReminderActions(reminder.id)
      .then(setActions)
      .catch(err => console.error('Failed to fetch actions:', err));
  }, [reminder.id]);

  const handleActionPress = async (action: ReminderAction) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await executeReminderAction(action);
    } catch (error) {
      console.error('Failed to execute action:', error);
      Alert.alert('Error', 'Failed to execute action');
    }
  };

  const widthPercentages = [1, 0.92, 0.88, 0.84, 0.80];
  const opacities = [1, 1, 1, 0.9, 0.6];
  const shadowLevels = ['level3', 'level2', 'level1', 'soft', 'minimal'];

  const cardWidth = SCREEN_WIDTH * 0.88 * widthPercentages[priority - 1];
  const cardOpacity = opacities[priority - 1];
  const shadowStyle = styles[`shadow${shadowLevels[priority - 1]}` as keyof typeof styles];

  const actionIcon = getReminderIcon(reminder);

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={[
          styles.card,
          shadowStyle,
          {
            width: cardWidth,
            opacity: cardOpacity,
            transform: [{ scale: scaleAnim }],
          },
          priority === 1 && styles.cardPriority1,
        ]}
      >
        {/* Corner decoration for priority 1 */}
        {priority === 1 && <View style={styles.cornerDecoration} />}

        <View style={[styles.cardContent, priority === 1 && styles.cardContentLarge]}>
          <View style={styles.cardLeft}>
            {isOverdue && priority <= 2 && (
              <Text style={styles.overdueBadge}>{getOverdueLabel(reminder.scheduled_time)}</Text>
            )}
            <Text
              style={[
                styles.cardTitle,
                priority === 1 && styles.cardTitleLarge,
              ]}
              numberOfLines={2}
            >
              {reminder.title}
            </Text>
            <Text style={styles.cardTime}>{formatTime(reminder.scheduled_time)}</Text>
          </View>

          {/* Action button/icon based on priority */}
          {priority === 1 && (
            <View style={styles.actionButtonLarge}>
              <MaterialIcons name={actionIcon} size={20} color="#ffffff" />
            </View>
          )}

          {priority === 2 && (
            <View style={styles.actionButtonMedium}>
              <MaterialIcons name={actionIcon} size={18} color="#888888" />
            </View>
          )}

          {priority === 3 && (
            <View style={styles.checkbox} />
          )}

          {priority === 4 && reminder.description && (
            <View style={styles.collaborators}>
              <View style={styles.avatar} />
              <View style={styles.avatarCount}>
                <Text style={styles.avatarCountText}>+1</Text>
              </View>
            </View>
          )}

          {/* Action chips - show for priority 2-3 if actions exist */}
          {priority >= 2 && priority <= 3 && actions.length > 0 && (
            <View style={styles.actionChips}>
              {actions.slice(0, 3).map(action => (
                <Pressable
                  key={action.id}
                  style={styles.actionChip}
                  onPress={() => handleActionPress(action)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Execute ${action.action_type} action`}
                >
                  <MaterialIcons name={getActionIcon(action.action_type) as any} size={14} color="#2F00FF" />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default function ProgressScreen({
  onBack,
  onCreateReminder,
  onTabPress,
}: ProgressScreenProps) {
  const insets = useSafeAreaInsets();
  const [overdueReminders, setOverdueReminders] = useState<Reminder[]>([]);
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [remmyMessage, setRemmyMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [showActionPicker, setShowActionPicker] = useState(false);
  const [showSnoozePicker, setShowSnoozePicker] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchProgressData = useCallback(async () => {
    try {
      setIsLoading(true);

      const [overdue, stats] = await Promise.all([
        getOverdueReminders(),
        calculateUserAnalytics(),
      ]);

      // Sort by priority
      const sortedOverdue = overdue
        .map(reminder => ({ reminder, priority: getPriority(reminder) }))
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 5) // Show max 5 cards
        .map(item => item.reminder);

      setOverdueReminders(sortedOverdue);
      setAnalytics(stats);

      const message = generateRemmyMessage(stats, overdue.length);
      setRemmyMessage(message);
    } catch (error) {
      console.error('Failed to fetch progress data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgressData();

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

  const handleCardPress = useCallback(
    (reminder: Reminder) => {
      setSelectedReminder(reminder);
      setShowActionPicker(true);
    },
    []
  );

  const handleMarkComplete = useCallback(async () => {
    if (!selectedReminder) return;

    try {
      await updateReminderStatus(selectedReminder.id, 'completed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await fetchProgressData();
    } catch (error) {
      setErrorMessage('Failed to complete reminder');
      setShowError(true);
    }
  }, [selectedReminder, fetchProgressData]);

  const handleSnooze = useCallback(() => {
    setShowActionPicker(false);
    setShowSnoozePicker(true);
  }, []);

  const handleSnoozeSelect = useCallback(
    async (minutes: number) => {
      if (!selectedReminder) return;

      try {
        await snoozeReminder(selectedReminder.id, minutes);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await fetchProgressData();
      } catch (error) {
        setErrorMessage('Failed to snooze reminder');
        setShowError(true);
      }
    },
    [selectedReminder, fetchProgressData]
  );

  const handleDelete = useCallback(async () => {
    if (!selectedReminder) return;

    try {
      await deleteReminder(selectedReminder.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await fetchProgressData();
    } catch (error) {
      setErrorMessage('Failed to delete reminder');
      setShowError(true);
    }
  }, [selectedReminder, fetchProgressData]);

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

  const timeOfDay = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    if (hour < 21) return 'Evening';
    return 'Night';
  })();

  return (
    <View style={styles.root}>
      {/* Background glows */}
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />

      {/* Header buttons */}
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <Pressable style={styles.headerButton}>
          <MaterialIcons name="menu" size={20} color="#121118" />
        </Pressable>
        <Pressable style={styles.headerButton}>
          <MaterialIcons name="search" size={20} color="#121118" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 120, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Remmy Character */}
        <View style={styles.remmyContainer}>
          <View style={styles.remmyCircle}>
            <Image
              source={require('../assets/zero.png')}
              style={styles.remmyImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.mainTitle}>PROGRESS</Text>
            <Text style={styles.subtitle}>
              {analytics ? `${analytics.completionRate}% Complete` : `${timeOfDay} View`}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2F00FF" />
          </View>
        ) : overdueReminders.length > 0 ? (
          <View style={styles.cardsContainer}>
            {overdueReminders.map((reminder, index) => (
              <TaskCard
                key={reminder.id}
                reminder={reminder}
                priority={Math.min(index + 1, 5)}
                onPress={() => handleCardPress(reminder)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>All Caught Up! 🎉</Text>
            <Text style={styles.emptySubtitle}>No tasks need your attention right now</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavBar
        activeTab="notifications"
        onTabPress={handleTabPress}
        onCreateReminder={onCreateReminder}
      />

      {/* Action Picker Modal */}
      <ActionPickerModal
        visible={showActionPicker}
        onClose={() => setShowActionPicker(false)}
        title={selectedReminder?.title || ''}
        options={[
          {
            id: 'complete',
            label: 'Mark Complete',
            icon: 'check-circle',
            color: '#10b981',
            onPress: handleMarkComplete,
          },
          {
            id: 'snooze',
            label: 'Snooze',
            icon: 'schedule',
            color: '#2F00FF',
            onPress: handleSnooze,
          },
          {
            id: 'delete',
            label: 'Delete',
            icon: 'delete',
            color: '#ef4444',
            onPress: handleDelete,
          },
        ]}
      />

      {/* Snooze Picker Modal */}
      <SnoozePickerModal
        visible={showSnoozePicker}
        onClose={() => setShowSnoozePicker(false)}
        onSelect={handleSnoozeSelect}
        title={selectedReminder?.title || ''}
      />

      {/* Error Modal */}
      <ErrorModal
        visible={showError}
        onClose={() => setShowError(false)}
        title="Error"
        message={errorMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f6f1ff',
  },
  glowTopRight: {
    position: 'absolute',
    top: -160,
    right: -160,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(47, 0, 255, 0.05)',
    opacity: 0.9,
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: -120,
    left: -120,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(47, 0, 255, 0.08)',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    zIndex: 30,
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  scrollContent: {
    alignItems: 'center',
  },
  remmyContainer: {
    alignItems: 'center',
    marginBottom: 32,
    zIndex: 20,
  },
  remmyCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginBottom: 24,
    shadowColor: '#2F00FF',
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  remmyImage: {
    width: '100%',
    height: '100%',
  },
  titleContainer: {
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 30,
    fontFamily: 'BricolageGrotesque-Light',
    letterSpacing: 6,
    textTransform: 'uppercase',
    color: '#121118',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#2F00FF',
  },
  loadingContainer: {
    marginTop: 60,
    alignItems: 'center',
  },
  cardsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 24,
    zIndex: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  shadowlevel3: {
    shadowColor: '#2F00FF',
    shadowOpacity: 0.12,
    shadowRadius: 48,
    shadowOffset: { width: 16, height: 24 },
    elevation: 12,
  },
  shadowlevel2: {
    shadowColor: '#2F00FF',
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 12, height: 12 },
    elevation: 6,
  },
  shadowlevel1: {
    shadowColor: '#2F00FF',
    shadowOpacity: 0.03,
    shadowRadius: 16,
    shadowOffset: { width: 8, height: 8 },
    elevation: 3,
  },
  shadowsoft: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  shadowminimal: {
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardPriority1: {
    position: 'relative',
  },
  cornerDecoration: {
    position: 'absolute',
    top: -16,
    right: -16,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(47, 0, 255, 0.05)',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  cardContentLarge: {
    padding: 24,
  },
  cardLeft: {
    flex: 1,
    gap: 4,
  },
  overdueBadge: {
    fontSize: 10,
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#2F00FF',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'BricolageGrotesque-Light',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#121118',
  },
  cardTitleLarge: {
    fontSize: 24,
  },
  cardTime: {
    fontSize: 10,
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#2F00FF',
    marginTop: 4,
  },
  actionButtonLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2F00FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F00FF',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  actionButtonMedium: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e5e5',
  },
  collaborators: {
    flexDirection: 'row',
    marginLeft: -8,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  avatarCount: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(47, 0, 255, 0.1)',
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  avatarCountText: {
    fontSize: 8,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#2F00FF',
  },
  emptyContainer: {
    marginTop: 60,
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  emptyTitle: {
    fontSize: 24,
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
  actionChips: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  actionChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(47, 0, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(47, 0, 255, 0.2)',
  },
});
