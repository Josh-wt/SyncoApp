import '../global.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import BottomNavBar, { TabName } from '../components/BottomNavBar';
import ConfirmModal from '../components/ConfirmModal';
import ErrorModal from '../components/ErrorModal';
import SnoozePickerModal from '../components/SnoozePickerModal';
import { CreationMode } from '../components/CreateReminderModal';
import FeedbackOverlay, { FeedbackType } from '../components/FeedbackOverlay';
import {
  getAllFutureReminders,
  processRemindersStatus,
  deleteReminder,
  snoozeReminder,
  updateReminderStatus,
} from '../lib/reminders';
import { syncReminderNotifications } from '../lib/notifications';
import { Reminder } from '../lib/types';
import { supabase } from '../lib/supabase';

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

interface TimelineScreenV2Props {
  onCreateReminder: (mode: CreationMode) => void;
  onTabPress: (tab: TabName) => void;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// Date Header Component
function DateHeader({ date }: { date: Date }) {
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return (
    <View className="flex-row items-center justify-center my-6">
      <View className="h-[1px] flex-1 bg-slate-300 opacity-30" />
      <View className="mx-4 bg-primary/10 rounded-full px-4 py-2">
        <Text className="text-sm font-bold text-primary">
          {formattedDate}
        </Text>
      </View>
      <View className="h-[1px] flex-1 bg-slate-300 opacity-30" />
    </View>
  );
}

// Floating Animation Component
function FloatingNode({
  children,
  delay = 0
}: {
  children: React.ReactNode;
  delay?: number
}) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -5,
          duration: 3000 + delay * 500,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 3000 + delay * 500,
          useNativeDriver: true,
        }),
      ])
    );

    setTimeout(() => animation.start(), delay * 1000);

    return () => animation.stop();
  }, [delay]);

  return (
    <Animated.View style={{ transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// Orbiting Node Component
function OrbitingNode({
  reminder,
  size,
  isNext,
  onComplete,
  onSnooze,
  onDelete,
}: {
  reminder: Reminder;
  size: 'large' | 'medium' | 'small' | 'tiny';
  isNext: boolean;
  onComplete: () => void;
  onSnooze: () => void;
  onDelete: () => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const actionsHeightAnim = useRef(new Animated.Value(0)).current;
  const actionsOpacityAnim = useRef(new Animated.Value(0)).current;

  // Dynamic width based on title length
  const getDynamicWidth = () => {
    const baseWidth = size === 'large' ? 200 : size === 'medium' ? 180 : size === 'small' ? 160 : 140;
    const charWidth = size === 'large' ? 10 : size === 'medium' ? 9 : size === 'small' ? 8 : 7;
    const calculatedWidth = baseWidth + (reminder.title.length * charWidth);
    const maxWidth = size === 'large' ? 360 : size === 'medium' ? 320 : size === 'small' ? 280 : 240;
    return Math.min(calculatedWidth, maxWidth);
  };

  const sizes = {
    large: { height: 100, orbit: 280, iconSize: 32 },
    medium: { height: 90, orbit: 240, iconSize: 28 },
    small: { height: 80, orbit: 200, iconSize: 24 },
    tiny: { height: 70, orbit: 160, iconSize: 20 },
  };

  const config = sizes[size];
  const dynamicWidth = getDynamicWidth();
  const actionBarWidth = Math.min(dynamicWidth, size === 'tiny' ? 230 : 290);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(actionsHeightAnim, {
        toValue: showActions ? 44 : 0,
        duration: 220,
        useNativeDriver: false,
      }),
      Animated.timing(actionsOpacityAnim, {
        toValue: showActions ? 1 : 0,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start();
  }, [actionsHeightAnim, actionsOpacityAnim, showActions]);

  return (
    <View className="relative w-full flex items-center justify-center z-10">
      {/* Orbit Path Ring - Only show for next upcoming reminder */}
      {isNext && config.orbit > 0 && (
        <View
          style={{
            width: config.orbit,
            height: config.orbit
          }}
          className="absolute rounded-full border-2 border-primary/20"
        />
      )}

      {/* Main Node */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowActions(!showActions);
        }}
        className="relative"
      >
        <View
          style={{
            width: dynamicWidth,
            height: config.height,
            borderRadius: config.height / 2,
          }}
          className="bg-white shadow-lg flex flex-row items-center px-6 py-4 relative"
        >
          <MaterialIcons
            name="event"
            size={config.iconSize}
            color="#2f00ff"
          />
          <Text
            className="text-slate-900 font-bold ml-3 flex-1"
            style={{
              fontSize: size === 'large' ? 18 : size === 'medium' ? 16 : size === 'small' ? 14 : 12
            }}
            numberOfLines={1}
          >
            {reminder.title}
          </Text>
        </View>

        {/* Orbiting Time Moon */}
        <View className={`absolute -top-4 -right-2 rounded-full shadow-lg z-30 flex-row items-center px-3 py-1 ${isNext ? 'bg-[#2f00ff]' : 'bg-white border-2 border-slate-200'}`}>
          <MaterialIcons name="schedule" size={10} color={isNext ? "#fff" : "#64748b"} />
          <Text className={`text-xs font-bold ml-1 ${isNext ? 'text-white' : 'text-slate-600'}`}>
            {formatTime(reminder.scheduled_time)}
          </Text>
        </View>

      </Pressable>

      {/* Quick Actions - compact bottom bar */}
      <Animated.View
        style={{
          width: actionBarWidth,
          height: actionsHeightAnim,
          opacity: actionsOpacityAnim,
          marginTop: actionsHeightAnim.interpolate({
            inputRange: [0, 44],
            outputRange: [0, 10],
          }),
          overflow: 'hidden',
        }}
        pointerEvents={showActions ? 'auto' : 'none'}
      >
        <View className="h-full w-full rounded-full border border-slate-200 bg-white/95 shadow-lg px-1.5 flex-row items-center">
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowActions(false);
              onComplete();
            }}
            className="flex-1 h-8 rounded-full bg-emerald-500 flex-row items-center justify-center"
          >
            <MaterialIcons name="check" size={14} color="#fff" />
            <Text className="text-white text-[11px] font-bold ml-1">Done</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowActions(false);
              onSnooze();
            }}
            className="flex-1 h-8 rounded-full bg-amber-500 flex-row items-center justify-center mx-1.5"
          >
            <MaterialIcons name="snooze" size={14} color="#fff" />
            <Text className="text-white text-[11px] font-bold ml-1">Snooze</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowActions(false);
              onDelete();
            }}
            className="flex-1 h-8 rounded-full bg-rose-500 flex-row items-center justify-center"
          >
            <MaterialIcons name="delete" size={14} color="#fff" />
            <Text className="text-white text-[11px] font-bold ml-1">Delete</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

export default function TimelineScreenV2({
  onCreateReminder,
  onTabPress,
}: TimelineScreenV2Props) {
  const insets = useSafeAreaInsets();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMounted, setDatePickerMounted] = useState(false);
  const datePickerFade = useRef(new Animated.Value(0)).current;
  const datePickerSlide = useRef(new Animated.Value(240)).current;
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [showSnoozePicker, setShowSnoozePicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchReminders = useCallback(async () => {
    try {
      setIsLoading(true);
      const allReminders = await getAllFutureReminders();
      const processed = processRemindersStatus(allReminders);
      setReminders(processed);
    } catch {
      setErrorMessage('Failed to load reminders');
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReminders();

    const subscription = supabase
      .channel('reminders-timeline')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' }, () => {
        fetchReminders();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchReminders]);

  useEffect(() => {
    if (showDatePicker) {
      setDatePickerMounted(true);
      datePickerFade.setValue(0);
      datePickerSlide.setValue(240);
      Animated.parallel([
        Animated.timing(datePickerFade, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(datePickerSlide, {
          toValue: 0,
          tension: 220,
          friction: 24,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (datePickerMounted) {
      Animated.parallel([
        Animated.timing(datePickerFade, {
          toValue: 0,
          duration: 190,
          useNativeDriver: true,
        }),
        Animated.timing(datePickerSlide, {
          toValue: 240,
          duration: 190,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setDatePickerMounted(false);
        }
      });
    }
  }, [showDatePicker, datePickerMounted, datePickerFade, datePickerSlide]);

  const handleDeleteReminder = useCallback(
    (reminder: Reminder) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectedReminder(reminder);
      setShowDeleteConfirm(true);
    },
    []
  );

  const confirmDelete = useCallback(async () => {
    if (!selectedReminder) return;

    try {
      await deleteReminder(selectedReminder.id);
      fetchReminders();
      setFeedback('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setFeedback('error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage('Failed to delete reminder.');
      setShowError(true);
    }
  }, [selectedReminder, fetchReminders]);

  const handleSnoozeReminder = useCallback(
    (reminder: Reminder) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectedReminder(reminder);
      setShowSnoozePicker(true);
    },
    []
  );

  const handleSnoozeSelect = useCallback(
    async (minutes: number) => {
      if (!selectedReminder) return;

      try {
        await snoozeReminder(selectedReminder.id, minutes);
        await fetchReminders();
        void syncReminderNotifications();
        setFeedback('success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        setFeedback('error');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setErrorMessage('Failed to snooze reminder.');
        setShowError(true);
      }
    },
    [selectedReminder, fetchReminders]
  );

  const handleCompleteReminder = useCallback(
    async (reminder: Reminder) => {
      try {
        await updateReminderStatus(reminder.id, 'completed');
        fetchReminders();
        setFeedback('success');
      } catch (error) {
        setFeedback('error');
        setErrorMessage('Failed to complete reminder.');
        setShowError(true);
      }
    },
    [fetchReminders]
  );

  const now = new Date();
  const upcomingReminders = reminders
    .filter((r) => {
      const reminderDate = new Date(r.scheduled_time);
      // Show all future reminders
      return reminderDate >= now;
    })
    .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());

  // Track reminder positions for scroll detection
  const reminderRefs = useRef<{ [key: string]: number }>({});
  const lastScrollY = useRef<number>(0);

  const handleScroll = useCallback((event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;

    // Only update if scrolled more than 50px to reduce lag
    if (Math.abs(scrollY - lastScrollY.current) < 50) return;
    lastScrollY.current = scrollY;

    // Find which reminder is at the top (optimized)
    for (let i = upcomingReminders.length - 1; i >= 0; i--) {
      const reminder = upcomingReminders[i];
      const reminderY = reminderRefs.current[reminder.id];

      if (reminderY !== undefined && scrollY >= reminderY - 100) {
        const reminderDate = new Date(reminder.scheduled_time);
        if (!isSameDay(reminderDate, selectedDate)) {
          setSelectedDate(reminderDate);
        }
        break;
      }
    }
  }, [upcomingReminders, selectedDate]);

  const getSizeForIndex = (index: number): 'large' | 'medium' | 'small' | 'tiny' => {
    if (index === 0) return 'large';
    if (index === 1) return 'medium';
    if (index === 2) return 'small';
    return 'tiny';
  };

  const getHeightForIndex = (index: number): number => {
    if (index === 0) return 320;
    if (index === 1) return 220;
    if (index === 2) return 180;
    return 140;
  };

  const getXPositionForIndex = (index: number): number => {
    // Center is 200, left is ~80, right is ~320 (out of 400 viewBox width)
    if (index % 2 === 0) return 200; // center
    if (index % 3 === 0) return 80; // left
    return 320; // right
  };

  // Generate dynamic SVG path through all nodes
  const generateSpiralPath = (): string => {
    if (upcomingReminders.length === 0) return '';

    let path = '';
    let cumulativeY = 160; // Start with offset for first card visibility

    upcomingReminders.forEach((_, index) => {
      const height = getHeightForIndex(index);
      const x = getXPositionForIndex(index);
      const y = cumulativeY + height / 2; // Center of the current container

      if (index === 0) {
        // Start the path above the first card
        path = `M ${x} ${y - 80} L ${x} ${y}`;
      } else {
        // Get previous point
        const prevIndex = index - 1;
        const prevHeight = getHeightForIndex(prevIndex);
        const prevX = getXPositionForIndex(prevIndex);
        const prevY = cumulativeY - prevHeight + prevHeight / 2;

        // Calculate distance for control points
        const deltaY = y - prevY;

        // Use cubic Bezier for smoother curves
        const cp1x = prevX;
        const cp1y = prevY + deltaY * 0.3;
        const cp2x = x;
        const cp2y = y - deltaY * 0.3;

        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y}`;
      }

      cumulativeY += height;
    });

    return path;
  };

  // Generate dates for picker (7 days before and after)
  const dateOptions = Array.from({ length: 15 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 7 + i);
    return date;
  });

  return (
    <View className="flex-1 bg-[#f6f1ff] relative">
      {/* Header */}
      <View
        style={{ paddingTop: insets.top + 48 }}
        className="px-6 pb-4 flex-row justify-between items-end z-20"
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowDatePicker(true);
          }}
        >
          <Text className="text-slate-400 text-sm font-medium tracking-wide uppercase">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
          <View className="flex-row items-center">
            <Text className="text-slate-900 text-3xl font-bold tracking-tight">
              {isSameDay(selectedDate, new Date()) ? "Today's Orbit" : 'Orbit View'}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={32} color="#0f172a" />
          </View>
        </Pressable>
        <Pressable
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          className="h-10 w-10 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center shadow-sm"
        >
          <MaterialIcons name="search" size={20} color="#334155" />
        </Pressable>
      </View>

      {/* Main Spiral Content Area */}
      <ScrollView
        className="flex-1 relative"
        contentContainerStyle={{ paddingBottom: insets.bottom + 160, minHeight: upcomingReminders.length * 250 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={100}
      >
        {/* Interactive Spiral Line (Visual Guide) */}
        {upcomingReminders.length > 0 && (
          <View className="absolute top-0 left-0 w-full pointer-events-none opacity-20 z-0" style={{ height: Math.max(1500, upcomingReminders.length * 250) }}>
            <Svg width="100%" height={Math.max(1500, upcomingReminders.length * 250)} viewBox="0 0 400 1500">
              <Path
                d={generateSpiralPath()}
                fill="none"
                stroke="#2600ff"
                strokeWidth="2"
                strokeDasharray="4, 4"
              />
            </Svg>
          </View>
        )}

        {isLoading ? (
          <View className="mt-56 items-center">
            <ActivityIndicator size="large" color="#2f00ff" />
            <Text className="mt-4 text-sm font-medium text-slate-400">
              Loading orbit...
            </Text>
          </View>
        ) : upcomingReminders.length === 0 ? (
          <View className="flex-1 justify-center items-center px-8 mt-20">
            <Text style={{ fontSize: 64 }} className="mb-4">✨</Text>
            <Text className="text-2xl font-bold text-slate-900 mb-2">
              All Clear
            </Text>
            <Text className="text-sm font-medium text-slate-400 text-center">
              No upcoming reminders in your orbit
            </Text>
          </View>
        ) : (
          <View className="relative pt-8">
            {upcomingReminders.map((reminder: Reminder, index: number) => {
              // Check if we need a date header (different day from previous reminder)
              const showDateHeader = index === 0 ||
                !isSameDay(
                  new Date(reminder.scheduled_time),
                  new Date(upcomingReminders[index - 1].scheduled_time)
                );

              return (
                <View key={reminder.id}>
                  {showDateHeader && (
                    <DateHeader date={new Date(reminder.scheduled_time)} />
                  )}
                  <View
                    onLayout={(event) => {
                      reminderRefs.current[reminder.id] = event.nativeEvent.layout.y;
                    }}
                    style={{
                      height: index === 0 ? 320 : index === 1 ? 220 : index === 2 ? 180 : 140,
                      justifyContent: 'center',
                      alignItems: index % 2 === 0 ? 'center' : index % 3 === 0 ? 'flex-start' : 'flex-end',
                      paddingHorizontal: index % 2 === 0 ? 0 : index % 3 === 0 ? 32 : 40,
                    }}
                  >
                    <FloatingNode delay={index % 4}>
                      <OrbitingNode
                        reminder={reminder}
                        size={getSizeForIndex(index)}
                        isNext={index === 0}
                        onComplete={() => handleCompleteReminder(reminder)}
                        onSnooze={() => handleSnoozeReminder(reminder)}
                        onDelete={() => handleDeleteReminder(reminder)}
                      />
                    </FloatingNode>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavBar
        activeTab="calendar"
        onTabPress={onTabPress}
        onCreateReminder={onCreateReminder}
      />

      <FeedbackOverlay type={feedback} onComplete={() => setFeedback(null)} />

      {/* Date Picker Modal */}
      <Modal
        visible={datePickerMounted}
        transparent
        animationType="none"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View className="flex-1 justify-end">
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: '#000000',
                opacity: datePickerFade.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }),
              },
            ]}
          >
            <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowDatePicker(false)} />
          </Animated.View>

          <Animated.View style={{ transform: [{ translateY: datePickerSlide }] }}>
            <TouchableOpacity activeOpacity={1} className="bg-white rounded-t-3xl p-6" style={{ paddingBottom: insets.bottom + 24 }}>
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-slate-900">Select Date</Text>
                <Pressable onPress={() => setShowDatePicker(false)}>
                  <MaterialIcons name="close" size={24} color="#64748b" />
                </Pressable>
              </View>
              <ScrollView className="max-h-80">
                {dateOptions.map((date, index) => {
                  const isSelected = isSameDay(date, selectedDate);
                  const isToday = isSameDay(date, new Date());
                  return (
                    <Pressable
                      key={index}
                      onPress={() => {
                        setSelectedDate(date);
                        setShowDatePicker(false);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      className={`py-4 px-4 rounded-2xl mb-2 ${isSelected ? 'bg-primary' : 'bg-slate-50'}`}
                    >
                      <View className="flex-row justify-between items-center">
                        <View>
                          <Text className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                          </Text>
                          {isToday && (
                            <Text className={`text-sm ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                              Today
                            </Text>
                          )}
                        </View>
                        {isSelected && <MaterialIcons name="check" size={24} color="#fff" />}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Snooze Picker Modal */}
      <SnoozePickerModal
        visible={showSnoozePicker}
        onClose={() => setShowSnoozePicker(false)}
        onSelect={handleSnoozeSelect}
        title={selectedReminder?.title || ''}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Reminder"
        message={`Are you sure you want to delete "${selectedReminder?.title}"?`}
        confirmText="Delete"
        confirmColor="#ef4444"
        icon="delete"
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
