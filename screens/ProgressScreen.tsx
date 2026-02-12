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
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import BottomNavBar, { TabName } from '../components/BottomNavBar';
import ActionPickerModal from '../components/ActionPickerModal';
import SnoozePickerModal from '../components/SnoozePickerModal';
import ErrorModal from '../components/ErrorModal';
import { CreationMode } from '../components/CreateReminderModal';
import { getOverdueReminders, getReminderById, updateReminderStatus, deleteReminder, snoozeReminder, getReminders, getRecurringRules } from '../lib/reminders';
import { syncReminderNotifications } from '../lib/notifications';
import { getReminderActions, executeReminderAction, getActionIcon } from '../lib/reminderActions';
import { Reminder, ReminderAction, RecurringRule } from '../lib/types';
import { supabase } from '../lib/supabase';
import { CircularProgress } from '../src/shared/ui/organisms/circular-progress';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

interface ProgressScreenProps {
  onBack: () => void;
  onCreateReminder: (mode: CreationMode) => void;
  onTabPress: (tab: TabName) => void;
  openReminderRequest?: { id: string; at: number } | null;
}

interface CompletionMetric {
  total: number;
  completed: number;
  percentage: number;
}

interface CompletionMetrics {
  overall: CompletionMetric;
  daily: CompletionMetric;
  weekly: CompletionMetric;
}

const EMPTY_COMPLETION_METRIC: CompletionMetric = {
  total: 0,
  completed: 0,
  percentage: 0,
};

const EMPTY_COMPLETION_METRICS: CompletionMetrics = {
  overall: EMPTY_COMPLETION_METRIC,
  daily: EMPTY_COMPLETION_METRIC,
  weekly: EMPTY_COMPLETION_METRIC,
};

function toCompletionMetric(reminders: Reminder[]): CompletionMetric {
  const validTasks = reminders.filter((reminder) => reminder.status !== 'placeholder');
  const total = validTasks.length;
  const completed = validTasks.filter((reminder) => reminder.status === 'completed').length;
  return {
    total,
    completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

function isWeeklyRule(rule: RecurringRule | undefined): boolean {
  if (!rule) return false;
  if (rule.frequency_unit === 'weeks') return true;
  return rule.frequency_unit === 'days' && rule.frequency >= 7 && rule.frequency % 7 === 0;
}

function isDailyRule(rule: RecurringRule | undefined): boolean {
  if (!rule) return false;
  return rule.frequency_unit === 'days' && !isWeeklyRule(rule);
}

function buildCompletionMetrics(reminders: Reminder[], recurringRules: RecurringRule[]): CompletionMetrics {
  const recurringRuleMap = new Map(recurringRules.map((rule) => [rule.id, rule]));

  const dailyReminders = reminders.filter((reminder) => {
    if (!reminder.recurring_rule_id) return false;
    return isDailyRule(recurringRuleMap.get(reminder.recurring_rule_id));
  });

  const weeklyReminders = reminders.filter((reminder) => {
    if (!reminder.recurring_rule_id) return false;
    return isWeeklyRule(recurringRuleMap.get(reminder.recurring_rule_id));
  });

  return {
    overall: toCompletionMetric(reminders),
    daily: toCompletionMetric(dailyReminders),
    weekly: toCompletionMetric(weeklyReminders),
  };
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
  const shadowStyles = [
    styles.shadowlevel3,
    styles.shadowlevel2,
    styles.shadowlevel1,
    styles.shadowsoft,
    styles.shadowminimal,
  ];

  const cardWidth = SCREEN_WIDTH * 0.88 * widthPercentages[priority - 1];
  const cardOpacity = opacities[priority - 1];
  const shadowStyle = shadowStyles[priority - 1];

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
                  style={({ pressed }) => [styles.actionChip, pressed && { opacity: 0.6, transform: [{ scale: 0.9 }] }]}
                  onPress={() => handleActionPress(action)}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
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
  openReminderRequest,
}: ProgressScreenProps) {
  const insets = useSafeAreaInsets();
  const [overdueReminders, setOverdueReminders] = useState<Reminder[]>([]);
  const [completionMetrics, setCompletionMetrics] = useState<CompletionMetrics>(EMPTY_COMPLETION_METRICS);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [selectedActions, setSelectedActions] = useState<ReminderAction[]>([]);
  const [showActionPicker, setShowActionPicker] = useState(false);
  const [showSnoozePicker, setShowSnoozePicker] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const lastOpenRequest = useRef<number | null>(null);
  const overallProgress = useSharedValue(0);
  const dailyProgress = useSharedValue(0);
  const weeklyProgress = useSharedValue(0);

  const fetchProgressData = useCallback(async () => {
    try {
      setIsLoading(true);

      const [overdue, reminders, recurringRules] = await Promise.all([
        getOverdueReminders(),
        getReminders(),
        getRecurringRules(),
      ]);

      // Sort by priority
        const sortedOverdue = overdue
        .map(reminder => ({ reminder, priority: getPriority(reminder) }))
        .sort((a, b) => a.priority - b.priority)
        .map(item => item.reminder);

      setOverdueReminders(sortedOverdue);
      setCompletionMetrics(buildCompletionMetrics(reminders, recurringRules));
    } catch (error) {
      console.error('Failed to fetch progress data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    overallProgress.value = withTiming(completionMetrics.overall.percentage, { duration: 380 });
    dailyProgress.value = withTiming(completionMetrics.daily.percentage, { duration: 380 });
    weeklyProgress.value = withTiming(completionMetrics.weekly.percentage, { duration: 380 });
  }, [completionMetrics, overallProgress, dailyProgress, weeklyProgress]);

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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recurring_rules',
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

  const openReminderWithActions = useCallback(async (reminder: Reminder) => {
    let actions: ReminderAction[] = [];
    try {
      actions = await getReminderActions(reminder.id);
    } catch (err) {
      console.error('Failed to fetch actions for picker:', err);
    }

    setSelectedReminder(reminder);
    setSelectedActions(actions);
    setShowActionPicker(true);
  }, []);

  const openReminderById = useCallback(async (reminderId: string) => {
    let reminder = overdueReminders.find((item) => item.id === reminderId) ?? null;
    if (!reminder) {
      reminder = await getReminderById(reminderId);
    }
    if (reminder) {
      await openReminderWithActions(reminder);
    }
  }, [openReminderWithActions, overdueReminders]);

  useEffect(() => {
    if (!openReminderRequest?.id) return;
    if (openReminderRequest.at === lastOpenRequest.current) return;
    lastOpenRequest.current = openReminderRequest.at;
    void openReminderById(openReminderRequest.id);
  }, [openReminderRequest, openReminderById]);

  const handleCardPress = useCallback(
    (reminder: Reminder) => {
      void openReminderWithActions(reminder);
    },
    [openReminderWithActions]
  );

  const handleQuickActionPress = useCallback(async (action: ReminderAction) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (action.action_type === 'note') {
        const noteText = action.action_value?.text?.trim() || 'No note saved.';
        Alert.alert('Note', noteText);
        return;
      }
      if (action.action_type === 'subtasks') {
        const subtasksText = action.action_value?.text?.trim() || 'No subtasks added.';
        Alert.alert('Subtasks', subtasksText);
        return;
      }
      await executeReminderAction(action);
    } catch (error) {
      console.error('Failed to execute action:', error);
      Alert.alert('Error', 'Failed to execute action');
    }
  }, []);

  const quickActionOptions = selectedActions.map((action) => ({
    id: action.id,
    label: (() => {
      switch (action.action_type) {
        case 'call':
          return 'Call';
        case 'link':
          return 'Open Link';
        case 'email':
          return 'Send Email';
        case 'location':
          return 'Navigate';
        case 'note':
          return 'View Note';
        case 'subtasks':
          return 'View Subtasks';
        default:
          return 'Action';
      }
    })(),
    description: (() => {
      switch (action.action_type) {
        case 'call':
          return action.action_value?.label || action.action_value?.phone || 'Phone number';
        case 'link':
          return action.action_value?.label || action.action_value?.url || 'Link';
        case 'email':
          return action.action_value?.label || action.action_value?.email || 'Email';
        case 'location':
          return action.action_value?.label || action.action_value?.address || 'Location';
        case 'note':
          return action.action_value?.text ? 'Saved note' : 'No note saved';
        case 'subtasks':
          return action.action_value?.text ? 'Checklist items' : 'No subtasks';
        default:
          return 'Quick action';
      }
    })(),
    icon: getActionIcon(action.action_type) as keyof typeof MaterialIcons.glyphMap,
    color: ({
      call: '#14b8a6',
      link: '#2563eb',
      email: '#0ea5e9',
      location: '#f97316',
      note: '#64748b',
      subtasks: '#84cc16',
    } as Record<string, string>)[action.action_type] ?? '#2F00FF',
    onPress: () => handleQuickActionPress(action),
  }));

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
        void syncReminderNotifications();
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

  return (
    <View style={styles.root}>
      {/* Header buttons */}
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <Pressable
          style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7, transform: [{ scale: 0.92 }] }]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        >
          <MaterialIcons name="menu" size={20} color="#121118" />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7, transform: [{ scale: 0.92 }] }]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        >
          <MaterialIcons name="search" size={20} color="#121118" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 132, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progressRingsContainer}>
          <View style={styles.progressRingItem}>
            <CircularProgress
              progress={overallProgress}
              size={90}
              strokeWidth={5}
              gap={2}
              outerCircleColor="rgba(47, 0, 255, 0.16)"
              progressCircleColor="#2F00FF"
              backgroundColor="#ffffff"
              renderIcon={() => (
                <View style={styles.progressRingInner}>
                  <Text style={styles.progressRingPercent}>{completionMetrics.overall.percentage}%</Text>
                  <Text style={styles.progressRingFraction}>
                    {completionMetrics.overall.completed}/{completionMetrics.overall.total}
                  </Text>
                </View>
              )}
            />
            <Text style={styles.progressRingLabel}>All</Text>
          </View>

          <View style={styles.progressRingItem}>
            <CircularProgress
              progress={dailyProgress}
              size={90}
              strokeWidth={5}
              gap={2}
              outerCircleColor="rgba(14, 165, 233, 0.2)"
              progressCircleColor="#0ea5e9"
              backgroundColor="#ffffff"
              renderIcon={() => (
                <View style={styles.progressRingInner}>
                  <Text style={styles.progressRingPercent}>{completionMetrics.daily.percentage}%</Text>
                  <Text style={styles.progressRingFraction}>
                    {completionMetrics.daily.completed}/{completionMetrics.daily.total}
                  </Text>
                </View>
              )}
            />
            <Text style={styles.progressRingLabel}>Daily</Text>
          </View>

          <View style={styles.progressRingItem}>
            <CircularProgress
              progress={weeklyProgress}
              size={90}
              strokeWidth={5}
              gap={2}
              outerCircleColor="rgba(20, 184, 166, 0.2)"
              progressCircleColor="#14b8a6"
              backgroundColor="#ffffff"
              renderIcon={() => (
                <View style={styles.progressRingInner}>
                  <Text style={styles.progressRingPercent}>{completionMetrics.weekly.percentage}%</Text>
                  <Text style={styles.progressRingFraction}>
                    {completionMetrics.weekly.completed}/{completionMetrics.weekly.total}
                  </Text>
                </View>
              )}
            />
            <Text style={styles.progressRingLabel}>Weekly</Text>
          </View>
        </View>

        {/* Remmy Character */}
        <View style={styles.remmyContainer}>
          <Image
            source={require('../assets/zero.png')}
            style={styles.remmyImage}
            resizeMode="contain"
          />
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
        quickActions={quickActionOptions}
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
  progressRingsContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 26,
  },
  progressRingItem: {
    alignItems: 'center',
    width: 96,
  },
  progressRingInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingPercent: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#121118',
    lineHeight: 18,
  },
  progressRingFraction: {
    marginTop: 2,
    fontSize: 9,
    fontFamily: 'BricolageGrotesque-SemiBold',
    color: '#606070',
    lineHeight: 11,
  },
  progressRingLabel: {
    marginTop: 10,
    fontSize: 11,
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#3d3b46',
  },
  remmyContainer: {
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 36,
    zIndex: 20,
  },
  remmyImage: {
    width: 124,
    height: 124,
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
