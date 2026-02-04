import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomNavBar, { TabName } from '../components/BottomNavBar';
import { CreationMode } from '../components/CreateReminderModal';
import {
  getAllFutureReminders,
  processRemindersStatus,
  deleteReminder,
  snoozeReminder,
} from '../lib/reminders';
import { Reminder } from '../lib/types';
import { supabase } from '../lib/supabase';

const PRIMARY = '#2F00FF';
const CYAN = '#00D4FF';
const CYAN_BG = 'rgba(0, 212, 255, 0.06)';
const CYAN_BORDER = 'rgba(0, 212, 255, 0.15)';

interface TimelineScreenProps {
  onBack: () => void;
  onCreateReminder: (mode: CreationMode) => void;
  onTabPress: (tab: TabName) => void;
}

function formatDayShort(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function formatDayNumber(date: Date): string {
  return date.getDate().toString().padStart(2, '0');
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function getDaysArray(centerDate: Date, range: number = 14): Date[] {
  const days: Date[] = [];
  for (let i = -3; i <= range; i++) {
    const day = new Date(centerDate);
    day.setDate(centerDate.getDate() + i);
    days.push(day);
  }
  return days;
}

// Reminder Card - matching reference with cyan transparent bg
function ReminderCard({
  reminder,
  onDelete,
  onPostpone,
}: {
  reminder: Reminder;
  onDelete: (id: string) => void;
  onPostpone: (id: string) => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 400,
      friction: 20,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 400,
      friction: 20,
    }).start();
  };

  const handleDelete = () => {
    Alert.alert('Cancel Reminder', `Cancel "${reminder.title}"?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel It',
        style: 'destructive',
        onPress: () => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }).start(() => onDelete(reminder.id));
        },
      },
    ]);
  };

  const handlePostpone = () => {
    Alert.alert('Postpone', 'Snooze for how long?', [
      { text: 'Never mind', style: 'cancel' },
      { text: '15 min', onPress: () => onPostpone(reminder.id) },
      { text: '1 hour', onPress: () => onPostpone(reminder.id) },
      { text: 'Tomorrow', onPress: () => onPostpone(reminder.id) },
    ]);
  };

  const isRecurring = !!reminder.recurring_rule_id;
  const isPriority = reminder.is_priority;
  const isSnoozed = reminder.status === 'upcoming' && reminder.notified_at;
  const notifyBefore = reminder.notify_before_minutes;

  const scheduledDate = new Date(reminder.scheduled_time);
  const hour = scheduledDate.getHours();
  const minute = scheduledDate.getMinutes();
  const ampm = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour % 12 || 12;

  return (
    <Animated.View style={[styles.cardOuter, { opacity: fadeAnim }]}>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          {/* Left: Time Box */}
          <View style={styles.timeBox}>
            <Text style={styles.timeBoxLabel}>{ampm}</Text>
            <Text style={styles.timeBoxNumber}>{displayHour.toString().padStart(2, '0')}</Text>
            <Text style={styles.timeBoxMinute}>:{minute.toString().padStart(2, '0')}</Text>
          </View>

          {/* Right: Content */}
          <View style={styles.cardContent}>
            {/* Title */}
            <Text style={styles.cardTitle} numberOfLines={2}>
              {reminder.title}
            </Text>

            {/* Details line - all reminder info */}
            <Text style={styles.cardDetails} numberOfLines={2}>
              {[
                isPriority && '⚡ Priority',
                isRecurring && '↻ Recurring',
                isSnoozed && '⏸ Snoozed',
                notifyBefore > 0 && `🔔 ${notifyBefore}m before`,
                reminder.description,
              ]
                .filter(Boolean)
                .join(' · ') || 'No additional details'}
            </Text>

            {/* Status indicators */}
            <View style={styles.statusRow}>
              {isPriority && <View style={styles.priorityDot} />}
              {isRecurring && <View style={styles.recurringDot} />}
              {isSnoozed && <View style={styles.snoozedDot} />}
            </View>

            {/* Buttons - opposite sides */}
            <View style={styles.buttonRow}>
              <Pressable
                onPress={handleDelete}
                style={({ pressed }) => [styles.cancelBtn, pressed && styles.btnPressed]}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handlePostpone}
                style={({ pressed }) => [styles.postponeBtn, pressed && styles.btnPressed]}
              >
                <Text style={styles.postponeBtnText}>Postpone</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// Day Chip
function DayItem({
  date,
  isSelected,
  hasReminders,
  onPress,
}: {
  date: Date;
  isSelected: boolean;
  hasReminders: boolean;
  onPress: () => void;
}) {
  const today = new Date();
  const isToday = isSameDay(date, today);

  return (
    <Pressable onPress={onPress} style={styles.dayChip}>
      <Text style={[styles.dayName, isSelected && styles.dayNameActive]}>
        {formatDayShort(date)}
      </Text>
      <View
        style={[
          styles.dayCircle,
          isSelected && styles.dayCircleActive,
          isToday && !isSelected && styles.dayCircleToday,
        ]}
      >
        <Text
          style={[
            styles.dayNum,
            isSelected && styles.dayNumActive,
            isToday && !isSelected && styles.dayNumToday,
          ]}
        >
          {formatDayNumber(date)}
        </Text>
      </View>
      {hasReminders && !isSelected && <View style={styles.dayIndicator} />}
    </Pressable>
  );
}

export default function TimelineScreen({
  onBack,
  onCreateReminder,
  onTabPress,
}: TimelineScreenProps) {
  const insets = useSafeAreaInsets();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const scrollViewRef = useRef<ScrollView>(null);
  const dayScrollRef = useRef<ScrollView>(null);

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

  const handleDeleteReminder = useCallback(async (id: string) => {
    try {
      await deleteReminder(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel reminder.');
    }
  }, []);

  const handlePostponeReminder = useCallback(
    async (id: string) => {
      try {
        await snoozeReminder(id, 15);
        fetchReminders();
      } catch (error) {
        Alert.alert('Error', 'Failed to postpone.');
      }
    },
    [fetchReminders]
  );

  const days = getDaysArray(new Date());
  const selectedDateReminders = reminders
    .filter((r) => isSameDay(new Date(r.scheduled_time), selectedDate))
    .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
  const daysWithReminders = new Set(reminders.map((r) => new Date(r.scheduled_time).toDateString()));

  const navigateDay = (dir: 'prev' | 'next') => {
    const d = new Date(selectedDate);
    d.setDate(selectedDate.getDate() + (dir === 'next' ? 1 : -1));
    setSelectedDate(d);
  };

  return (
    <View style={styles.root}>
      <View style={styles.canvas}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={styles.navRow}>
            <Pressable onPress={() => navigateDay('prev')} style={styles.navBtn}>
              <Text style={styles.navArrow}>‹</Text>
            </Pressable>
            <Text style={styles.monthLabel}>{formatMonthYear(selectedDate)}</Text>
            <Pressable onPress={() => navigateDay('next')} style={styles.navBtn}>
              <Text style={styles.navArrow}>›</Text>
            </Pressable>
          </View>
          <ScrollView
            ref={dayScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayRow}
          >
            {days.map((day, i) => (
              <DayItem
                key={i}
                date={day}
                isSelected={isSameDay(day, selectedDate)}
                hasReminders={daysWithReminders.has(day.toDateString())}
                onPress={() => setSelectedDate(day)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Timeline */}
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 140 }]}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <ActivityIndicator size="large" color={PRIMARY} style={{ marginTop: 80 }} />
          ) : selectedDateReminders.length > 0 ? (
            <View style={styles.list}>
              {selectedDateReminders.map((r) => (
                <ReminderCard
                  key={r.id}
                  reminder={r}
                  onDelete={handleDeleteReminder}
                  onPostpone={handlePostponeReminder}
                />
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>✨</Text>
              <Text style={styles.emptyTitle}>All clear</Text>
              <Text style={styles.emptyDesc}>Nothing scheduled</Text>
            </View>
          )}
        </ScrollView>

        <BottomNavBar
          activeTab="calendar"
          onTabPress={handleTabPress}
          onCreateReminder={onCreateReminder}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  canvas: { flex: 1 },

  // Header
  header: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEEEF0', paddingBottom: 8 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12, paddingHorizontal: 16 },
  navBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: CYAN_BG, alignItems: 'center', justifyContent: 'center' },
  navArrow: { fontSize: 20, color: PRIMARY, fontFamily: 'BricolageGrotesque-Bold', marginTop: -2 },
  monthLabel: { fontSize: 17, fontFamily: 'BricolageGrotesque-Bold', color: '#1A1A1F', marginHorizontal: 16, letterSpacing: -0.3 },
  dayRow: { paddingHorizontal: 10, gap: 2 },
  dayChip: { alignItems: 'center', width: 46, paddingVertical: 2 },
  dayName: { fontSize: 9, fontFamily: 'BricolageGrotesque-Medium', color: '#9999A5', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  dayNameActive: { color: PRIMARY },
  dayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dayCircleActive: { backgroundColor: PRIMARY },
  dayCircleToday: { borderWidth: 1.5, borderColor: PRIMARY },
  dayNum: { fontSize: 14, fontFamily: 'BricolageGrotesque-Bold', color: '#5A5A65' },
  dayNumActive: { color: '#FFF' },
  dayNumToday: { color: PRIMARY },
  dayIndicator: { width: 4, height: 4, borderRadius: 2, backgroundColor: PRIMARY, marginTop: 2 },

  // Content
  content: { paddingTop: 20, paddingHorizontal: 16 },
  list: { gap: 14 },

  // Card - Transparent cyan background
  cardOuter: { marginBottom: 2 },
  card: {
    flexDirection: 'row',
    backgroundColor: CYAN_BG,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: CYAN_BORDER,
  },

  // Time Box - Left side
  timeBox: {
    width: 60,
    height: 72,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  timeBoxLabel: {
    fontSize: 10,
    fontFamily: 'BricolageGrotesque-Bold',
    color: CYAN,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  timeBoxNumber: {
    fontSize: 28,
    fontFamily: 'BricolageGrotesque-Bold',
    color: PRIMARY,
    lineHeight: 30,
  },
  timeBoxMinute: {
    fontSize: 13,
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#666',
    marginTop: -2,
  },

  // Card Content - Right side
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#1A1A1F',
    lineHeight: 21,
    marginBottom: 4,
  },
  cardDetails: {
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#5A5A65',
    lineHeight: 16,
    marginBottom: 6,
  },

  // Status indicators
  statusRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E11D48',
  },
  recurringDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },
  snoozedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },

  // Buttons - opposite sides
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  cancelBtnText: {
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#888',
  },
  postponeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: PRIMARY,
  },
  postponeBtnText: {
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#FFF',
  },
  btnPressed: {
    opacity: 0.7,
  },

  // Empty
  empty: { marginTop: 100, alignItems: 'center' },
  emptyIcon: { fontSize: 32, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontFamily: 'BricolageGrotesque-Bold', color: '#1A1A1F', marginBottom: 4 },
  emptyDesc: { fontSize: 13, fontFamily: 'BricolageGrotesque-Regular', color: '#9999A5' },
});
