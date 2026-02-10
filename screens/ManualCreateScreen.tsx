import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackIcon, CalendarSmallIcon, ScheduleIcon, CheckAllIcon, GlowTopRight, GlowBottomLeft, BellNavIcon, RepeatIcon, ChevronRightIcon, CloseIcon, BlockIcon, DailyIcon, BookmarkIcon, SlidersIcon, CheckCircleIcon, MicSparkleIcon } from '../components/icons';
import RecurringRuleModal from '../components/RecurringRuleModal';
import TaskConfigSection, { QuickAction } from '../components/TaskConfigSection';
import { createRecurringRule, getRecurringRules } from '../lib/reminders';
import { createReminderActions } from '../lib/reminderActions';
import { parseReminderFromVoice } from '../lib/aiReminders';
import { canCreateReminder } from '../lib/reminderLimits';
import { useVoiceRecording } from '../hooks/useVoiceRecording';
import { UnstableSiriOrb } from '../src/shared/ui/organisms/unstable_siri_orb';
import { CreateReminderInput, NOTIFICATION_TIMING_OPTIONS, RecurringOption, RecurringRule, CreateReminderActionInput } from '../lib/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Animated Card Component
function AnimatedCard({
  onPress,
  children,
  style,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  style?: object;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(translateYAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
    ]).start();
  };

  if (!onPress) {
    return <View style={style}>{children}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

// Animated Back Button
function AnimatedBackButton({ onPress }: { onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      tension: 400,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 400,
      friction: 10,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Animated.View style={[styles.backButton, { transform: [{ scale: scaleAnim }] }]}>
        <BackIcon />
      </Animated.View>
    </Pressable>
  );
}

// Animated Save Button with spin loading animation
function AnimatedSaveButton({
  onPress,
  disabled,
  isSaving,
}: {
  onPress: () => void;
  disabled: boolean;
  isSaving: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinnerScale = useRef(new Animated.Value(0)).current;
  const spinAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isSaving) {
      // Scale in the spinner
      Animated.spring(spinnerScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
      // Start continuous rotation
      spinAnim.setValue(0);
      const loop = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: undefined, // linear
        })
      );
      spinAnimRef.current = loop;
      loop.start();
    } else {
      // Scale out the spinner
      Animated.timing(spinnerScale, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
      // Stop rotation
      if (spinAnimRef.current) {
        spinAnimRef.current.stop();
        spinAnimRef.current = null;
      }
    }
  }, [isSaving, spinAnim, spinnerScale]);

  const handlePressIn = () => {
    if (disabled) return;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(translateYAnim, {
        toValue: 2,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
    ]).start();
  };

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.saveButton,
          disabled && styles.saveButtonDisabled,
          {
            transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
          },
        ]}
      >
        {/* Blur Layer for Glassmorphism */}
        <BlurView intensity={30} tint="light" style={styles.saveButtonBlur}>
          {/* Main Gradient */}
          <LinearGradient
            colors={disabled ? ['#9CA3AF', '#9CA3AF', '#9CA3AF'] : ['#2F00FF', '#2F00FF', '#2F00FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.saveButtonGradient}
          >
            {/* Top Highlight */}
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 0.5 }}
              style={styles.highlightTop}
            />
            {/* Bottom Highlight */}
            <LinearGradient
              colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.4)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 0, y: 1 }}
              style={styles.highlightBottom}
            />
            <View style={styles.saveButtonContent}>
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Saving' : 'Save Reminder'}
              </Text>
              {isSaving ? (
                <Animated.View
                  style={{
                    transform: [{ rotate: spinInterpolate }, { scale: spinnerScale }],
                    opacity: spinnerScale,
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2.5,
                      borderColor: 'rgba(255,255,255,0.3)',
                      borderTopColor: '#ffffff',
                    }}
                  />
                </Animated.View>
              ) : (
                <CheckAllIcon />
              )}
            </View>
          </LinearGradient>
        </BlurView>
      </Animated.View>
    </Pressable>
  );
}

// Animated Picker Option
function AnimatedPickerOptionItem({
  onPress,
  isSelected,
  label,
}: {
  onPress: () => void;
  isSelected: boolean;
  label: string;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 400,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 400,
      friction: 10,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Animated.View
        style={[
          styles.pickerOption,
          isSelected && styles.pickerOptionSelected,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextSelected]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// Animated Confirm Button (uses same BlurView + 3D highlights as Save button)
function AnimatedConfirmButton({ onPress, label }: { onPress: () => void; label: string }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(translateYAnim, {
        toValue: 2,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
    ]).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Animated.View
        style={[
          styles.pickerConfirm,
          { transform: [{ scale: scaleAnim }, { translateY: translateYAnim }] },
        ]}
      >
        <BlurView intensity={30} tint="light" style={styles.saveButtonBlur}>
          <LinearGradient
            colors={['#2F00FF', '#2F00FF', '#2F00FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.pickerConfirmGradient}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 0.5 }}
              style={styles.highlightTop}
            />
            <LinearGradient
              colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.4)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 0, y: 1 }}
              style={styles.highlightBottom}
            />
            <View style={{ zIndex: 1 }}>
              <Text style={styles.pickerConfirmText}>{label}</Text>
            </View>
          </LinearGradient>
        </BlurView>
      </Animated.View>
    </Pressable>
  );
}

const DATE_ITEM_WIDTH = 56;
const TIME_ITEM_HEIGHT = 36;

// Combined Date & Time Picker Component - Single Horizontal Row
function DateTimePicker({
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
}: {
  selectedDate: Date;
  selectedTime: Date;
  onDateChange: (date: Date) => void;
  onTimeChange: (time: Date) => void;
}) {
  const dateListRef = useRef<FlatList>(null);
  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);
  const isScrollingRef = useRef(false);

  const [selectedHour, setSelectedHour] = useState(selectedTime.getHours());
  const [selectedMinute, setSelectedMinute] = useState(selectedTime.getMinutes());

  const [dates] = useState(() => {
    return Array.from({ length: 60 }, (_, i) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + i);
      return date;
    });
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const selectedDateIndex = dates.findIndex(
    (d) => d.toDateString() === selectedDate.toDateString()
  );

  // Update internal state when selectedTime prop changes (from AI)
  useEffect(() => {
    // Skip if we're currently scrolling to prevent feedback loop
    if (isScrollingRef.current) {
      return;
    }

    const newHour = selectedTime.getHours();
    const newMinute = selectedTime.getMinutes();

    if (newHour !== selectedHour) {
      setSelectedHour(newHour);
      hourScrollRef.current?.scrollTo({
        y: newHour * TIME_ITEM_HEIGHT,
        animated: true,
      });
    }

    if (newMinute !== selectedMinute) {
      setSelectedMinute(newMinute);
      minuteScrollRef.current?.scrollTo({
        y: newMinute * TIME_ITEM_HEIGHT,
        animated: true,
      });
    }
  }, [selectedTime, selectedHour, selectedMinute]);

  // Initial scroll to selected values
  useEffect(() => {
    setTimeout(() => {
      if (dateListRef.current && selectedDateIndex >= 0) {
        dateListRef.current.scrollToIndex({
          index: selectedDateIndex,
          animated: false,
          viewPosition: 0.5,
        });
      }
      hourScrollRef.current?.scrollTo({
        y: selectedHour * TIME_ITEM_HEIGHT,
        animated: false,
      });
      minuteScrollRef.current?.scrollTo({
        y: selectedMinute * TIME_ITEM_HEIGHT,
        animated: false,
      });
    }, 100);
  }, []);

  // Update time when hour/minute changes
  useEffect(() => {
    const newTime = new Date(selectedTime);
    newTime.setHours(selectedHour);
    newTime.setMinutes(selectedMinute);
    onTimeChange(newTime);
  }, [selectedHour, selectedMinute]);

  const handleHourScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    isScrollingRef.current = true;
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / TIME_ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, hours.length - 1));
    if (clampedIndex !== selectedHour) {
      setSelectedHour(clampedIndex);
    }
    // Clear the flag after a short delay to allow the change to propagate
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 100);
  };

  const handleMinuteScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    isScrollingRef.current = true;
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / TIME_ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, minutes.length - 1));
    if (clampedIndex !== selectedMinute) {
      setSelectedMinute(clampedIndex);
    }
    // Clear the flag after a short delay to allow the change to propagate
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 100);
  };

  const formatDayLabel = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tmrw';
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const renderDateItem = ({ item }: { item: Date }) => {
    const isSelected = item.toDateString() === selectedDate.toDateString();

    return (
      <Pressable
        onPress={() => onDateChange(item)}
        style={[styles.compactDateItem, isSelected && styles.compactDateItemSelected]}
      >
        <Text style={[styles.compactDateDay, isSelected && styles.compactDateDaySelected]}>
          {formatDayLabel(item)}
        </Text>
        <Text style={[styles.compactDateNum, isSelected && styles.compactDateNumSelected]}>
          {item.getDate()}
        </Text>
      </Pressable>
    );
  };

  const renderTimeWheel = (
    items: number[],
    selectedValue: number,
    scrollRef: React.RefObject<ScrollView | null>,
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void,
    isMinute: boolean = false
  ) => {
    return (
      <View style={styles.compactTimeColumn}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={TIME_ITEM_HEIGHT}
          decelerationRate="fast"
          onMomentumScrollEnd={onScroll}
          onScrollEndDrag={onScroll}
          contentContainerStyle={{ paddingVertical: TIME_ITEM_HEIGHT }}
          style={styles.compactTimeScroll}
          nestedScrollEnabled={true}
          scrollEventThrottle={16}
        >
          {items.map((item) => {
            const isSelected = item === selectedValue;
            return (
              <Pressable
                key={item}
                onPress={() => {
                  isScrollingRef.current = true;
                  scrollRef.current?.scrollTo({
                    y: item * TIME_ITEM_HEIGHT,
                    animated: true,
                  });
                  if (isMinute) {
                    setSelectedMinute(item);
                  } else {
                    setSelectedHour(item);
                  }
                  setTimeout(() => {
                    isScrollingRef.current = false;
                  }, 100);
                }}
                style={styles.compactTimeItem}
              >
                <Text style={[styles.compactTimeText, isSelected && styles.compactTimeTextSelected]}>
                  {item.toString().padStart(2, '0')}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.compactTimeHighlight} pointerEvents="none" />
      </View>
    );
  };

  return (
    <View style={styles.dateTimePickerRow}>
      {/* Date Section */}
      <View style={styles.dateSection}>
        <View style={styles.sectionHeader}>
          <CalendarSmallIcon />
          <Text style={styles.sectionLabel}>Date</Text>
        </View>
        <FlatList
          ref={dateListRef}
          data={dates}
          renderItem={renderDateItem}
          keyExtractor={(item) => item.toISOString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateListContent}
          snapToInterval={DATE_ITEM_WIDTH + 6}
          decelerationRate="fast"
          getItemLayout={(_, index) => ({
            length: DATE_ITEM_WIDTH + 6,
            offset: (DATE_ITEM_WIDTH + 6) * index,
            index,
          })}
          onScrollToIndexFailed={() => {}}
        />
      </View>

      {/* Divider */}
      <View style={styles.pickerDivider} />

      {/* Time Section */}
      <View style={styles.timeSection}>
        <View style={styles.sectionHeader}>
          <ScheduleIcon />
          <Text style={styles.sectionLabel}>Time</Text>
        </View>
        <View style={styles.compactTimeWheels}>
          {renderTimeWheel(hours, selectedHour, hourScrollRef, handleHourScroll, false)}
          <Text style={styles.compactTimeSep}>:</Text>
          {renderTimeWheel(minutes, selectedMinute, minuteScrollRef, handleMinuteScroll, true)}
        </View>
      </View>
    </View>
  );
}

interface ManualCreateScreenProps {
  onBack: () => void;
  onSave: (input: CreateReminderInput) => Promise<{ id: string } | void>;
}

function getNotifyLabel(minutes: number): string {
  const option = NOTIFICATION_TIMING_OPTIONS.find(opt => opt.value === minutes);
  return option?.label ?? 'At scheduled time';
}

export default function ManualCreateScreen({ onBack, onSave }: ManualCreateScreenProps) {
  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Fetch saved recurring rules from database
  const [savedRules, setSavedRules] = useState<RecurringRule[]>([]);

  useEffect(() => {
    getRecurringRules()
      .then(setSavedRules)
      .catch(() => setSavedRules([]));
  }, []);
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [isPriority, setIsPriority] = useState(false);
  const [notifyBeforeMinutes, setNotifyBeforeMinutes] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Recurring reminder state
  const [recurringOption, setRecurringOption] = useState<RecurringOption>('none');
  const [selectedSavedRule, setSelectedSavedRule] = useState<RecurringRule | null>(null);
  const [customRule, setCustomRule] = useState<RecurringRule | null>(null);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showRecurringPicker, setShowRecurringPicker] = useState(false);

  // Reminder actions state
  const [reminderActions, setReminderActions] = useState<CreateReminderActionInput[]>([]);

  // Notification picker modal state
  const [showNotifyPicker, setShowNotifyPicker] = useState(false);
  const [notifyPickerMounted, setNotifyPickerMounted] = useState(false);
  const [tempNotifyMinutes, setTempNotifyMinutes] = useState(0);

  // Recurring picker modal mounted state
  const [recurringPickerMounted, setRecurringPickerMounted] = useState(false);

  // Voice mode state
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [showVoiceOverlay, setShowVoiceOverlay] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isCreatingReminder, setIsCreatingReminder] = useState(false);
  const [pendingReminders, setPendingReminders] = useState<CreateReminderInput[]>([]);

  // Voice recording hook
  const { isRecording, duration, error: recordingError, startRecording, stopRecording, cancelRecording } = useVoiceRecording();

  // Voice mode animations
  const micPositionAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const micScaleAnim = useRef(new Animated.Value(1)).current;
  const micOpacityAnim = useRef(new Animated.Value(1)).current;
  const voiceOverlayOpacity = useRef(new Animated.Value(0)).current;
  const orbPositionAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const orbScaleAnim = useRef(new Animated.Value(1)).current;

  // Modal animations
  const notifyPickerSlide = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const notifyPickerBackdrop = useRef(new Animated.Value(0)).current;
  const recurringPickerSlide = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const recurringPickerBackdrop = useRef(new Animated.Value(0)).current;

  // Auto-stop timer ref
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check microphone permission on mount
  useEffect(() => {
    import('expo-audio').then(({ AudioModule }) => {
      AudioModule.getRecordingPermissionsAsync().then((status) => {
        setHasPermission(status.granted);
      });
    });
  }, []);


  // Handle voice mode toggle
  const handleMicPress = useCallback(async () => {
    if (isVoiceMode) return;

    // Check and request permission if needed
    if (hasPermission === false) {
      const { AudioModule } = await import('expo-audio');
      const status = await AudioModule.requestRecordingPermissionsAsync();
      setHasPermission(status.granted);

      if (!status.granted) {
        setVoiceError('Microphone permission is required for voice reminders.');
        return;
      }
    }

    setVoiceError(null);
    setVoiceTranscript('');
    setAiResponse('');
    setIsCreatingReminder(false);

    // Reset orb position before starting
    orbPositionAnim.setValue({ x: 0, y: 0 });
    orbScaleAnim.setValue(1);

    // Show overlay immediately so it can animate in
    setShowVoiceOverlay(true);
    setIsVoiceMode(true);

    // Animate mic to center with smooth transition
    Animated.parallel([
      Animated.spring(micPositionAnim, {
        toValue: { x: -(SCREEN_WIDTH / 2 - 48 - 24), y: SCREEN_HEIGHT / 3 - 48 },
        useNativeDriver: true,
        tension: 50,
        friction: 12,
      }),
      Animated.spring(micScaleAnim, {
        toValue: 1.8,
        useNativeDriver: true,
        tension: 50,
        friction: 12,
      }),
      Animated.timing(micOpacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(voiceOverlayOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      // Start recording after animation completes
      await startRecording();
    });
  }, [isVoiceMode, hasPermission, micPositionAnim, micScaleAnim, voiceOverlayOpacity, orbPositionAnim, orbScaleAnim, startRecording]);

  // Reset voice state for next recording
  const resetVoiceForNextRecording = useCallback(async () => {
    setVoiceTranscript('');
    setAiResponse('');
    setVoiceError(null);
    setIsProcessingVoice(false);

    // Start recording again after brief delay
    setTimeout(async () => {
      await startRecording();
    }, 500);
  }, [startRecording]);

  // Handle stop recording and process voice
  const handleStopVoice = useCallback(async () => {
    if (!isRecording) return;

    // Clear auto-stop timer
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }

    setIsProcessingVoice(true);
    setVoiceError(null);

    try {
      const audioData = await stopRecording();
      if (!audioData) {
        throw new Error('No audio recorded');
      }

      // Process voice with AI
      const result = await parseReminderFromVoice(audioData.base64, audioData.mimeType);

      // Update transcript
      setVoiceTranscript(result.transcript);

      // Check if this is a conversation or reminder creation
      if (result.type === 'conversation') {
        // Just display the AI response and reset for next command
        setAiResponse(result.response);

        // Reset after showing response
        setTimeout(() => {
          resetVoiceForNextRecording();
        }, 2000);
      } else if (result.type === 'reminder') {
        // Show transcription immediately
        setVoiceTranscript(result.transcript);

        const reminderCount = result.reminders.length;

        // Single reminder: populate form for user review
        if (reminderCount === 1) {
          const { reminder: reminderData, recurringRule: recurringRuleData } = result.reminders[0];

          // Populate form fields
          setTitle(reminderData.title);
          if (reminderData.scheduled_time) {
            const scheduledDate = new Date(reminderData.scheduled_time);
            setSelectedDate(scheduledDate);
            setSelectedTime(scheduledDate);
          }
          if (reminderData.description) {
            setNotes(reminderData.description);
          }
          if (reminderData.is_priority !== undefined) {
            setIsPriority(reminderData.is_priority);
          }
          if (reminderData.notify_before_minutes !== undefined) {
            setNotifyBeforeMinutes(reminderData.notify_before_minutes);
          }

          // Handle recurring rule
          if (recurringRuleData) {
            setCustomRule({
              id: '',
              name: recurringRuleData.name,
              frequency: recurringRuleData.frequency,
              frequency_unit: recurringRuleData.frequency_unit,
              selected_days: recurringRuleData.selected_days,
            });
            setRecurringOption('custom');
            setSelectedSavedRule(null);
          }

          // Show success message and close voice mode
          setAiResponse('Review and save your reminder');
          setTimeout(() => {
            setIsVoiceMode(false);
            setIsProcessingVoice(false);
            // Animate out smoothly, then unmount
            Animated.parallel([
              Animated.spring(micPositionAnim, {
                toValue: { x: 0, y: 0 },
                useNativeDriver: true,
                tension: 50,
                friction: 12,
              }),
              Animated.spring(micScaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                tension: 50,
                friction: 12,
              }),
              Animated.timing(micOpacityAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(voiceOverlayOpacity, {
                toValue: 0,
                duration: 350,
                useNativeDriver: true,
              }),
            ]).start(() => {
              setShowVoiceOverlay(false);
            });
          }, 1500);
        } else {
          // Multiple reminders: auto-create all and close
          setTimeout(() => {
            setIsCreatingReminder(true);
            setAiResponse(`Creating ${reminderCount} reminders...`);

            Animated.parallel([
              Animated.spring(orbPositionAnim, {
                toValue: { x: 0, y: -SCREEN_HEIGHT / 6 },
                useNativeDriver: true,
                tension: 50,
                friction: 8,
              }),
              Animated.spring(orbScaleAnim, {
                toValue: 1.2,
                useNativeDriver: true,
                tension: 50,
                friction: 8,
              }),
            ]).start();
          }, 300);

          // Process all reminders in background
          setTimeout(async () => {
            try {
              // Create all reminders
              for (const { reminder: reminderData, recurringRule: recurringRuleData } of result.reminders) {
                const scheduledTime = new Date(reminderData.scheduled_time);

                let recurringRuleId: string | undefined;
                if (recurringRuleData) {
                  const createdRule = await createRecurringRule({
                    name: recurringRuleData.name,
                    frequency: recurringRuleData.frequency,
                    frequency_unit: recurringRuleData.frequency_unit,
                    selected_days: recurringRuleData.selected_days,
                  });
                  recurringRuleId = createdRule.id;
                }

                const reminderInput: CreateReminderInput = {
                  title: reminderData.title,
                  scheduled_time: scheduledTime.toISOString(),
                  description: reminderData.description,
                  is_priority: reminderData.is_priority,
                  notify_before_minutes: reminderData.notify_before_minutes,
                  recurring_rule_id: recurringRuleId,
                };

                await onSave(reminderInput);
              }

              // Show success and animate orb to top right
              setAiResponse(`${reminderCount} reminders created!`);

              await new Promise<void>((resolve) => {
                Animated.parallel([
                  Animated.spring(orbPositionAnim, {
                    toValue: { x: SCREEN_WIDTH / 3, y: -SCREEN_HEIGHT / 2.5 },
                    useNativeDriver: true,
                    tension: 50,
                    friction: 8,
                  }),
                  Animated.spring(orbScaleAnim, {
                    toValue: 0.4,
                    useNativeDriver: true,
                    tension: 50,
                    friction: 8,
                  }),
                ]).start(() => resolve());
              });

              // Navigate to home
              setTimeout(() => {
                setIsCreatingReminder(false);
                setIsVoiceMode(false);
                setShowVoiceOverlay(false);
                onBack();
              }, 800);
            } catch (error) {
              setVoiceError('Failed to create reminders');
              setIsCreatingReminder(false);
              setTimeout(() => {
                resetVoiceForNextRecording();
              }, 2000);
            }
          }, 800);
        }
      }
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'Failed to process voice');

      // Reset after showing error
      setTimeout(() => {
        resetVoiceForNextRecording();
      }, 3000);
    } finally {
      setIsProcessingVoice(false);
    }
  }, [isRecording, stopRecording, onSave, resetVoiceForNextRecording]);

  // Auto-stop recording after duration (simulates silence detection)
  useEffect(() => {
    if (isRecording && isVoiceMode) {
      // Auto-stop after 10 seconds of recording
      autoStopTimerRef.current = setTimeout(() => {
        handleStopVoice();
      }, 10000);

      return () => {
        if (autoStopTimerRef.current) {
          clearTimeout(autoStopTimerRef.current);
          autoStopTimerRef.current = null;
        }
      };
    }
  }, [isRecording, isVoiceMode, handleStopVoice]);

  // Animate notify picker modal
  useEffect(() => {
    if (showNotifyPicker) {
      setNotifyPickerMounted(true);
      // Opening animation - very slow and smooth
      Animated.parallel([
        Animated.spring(notifyPickerSlide, {
          toValue: 0,
          useNativeDriver: true,
          tension: 30,
          friction: 25,
        }),
        Animated.timing(notifyPickerBackdrop, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (notifyPickerMounted) {
      // Closing animation - very slow and smooth
      Animated.parallel([
        Animated.spring(notifyPickerSlide, {
          toValue: SCREEN_HEIGHT,
          useNativeDriver: true,
          tension: 25,
          friction: 30,
        }),
        Animated.timing(notifyPickerBackdrop, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setNotifyPickerMounted(false);
        }
      });
    }
  }, [showNotifyPicker, notifyPickerMounted, notifyPickerSlide, notifyPickerBackdrop]);

  // Animate recurring picker modal
  useEffect(() => {
    if (showRecurringPicker) {
      setRecurringPickerMounted(true);
      // Opening animation - very slow and smooth
      Animated.parallel([
        Animated.spring(recurringPickerSlide, {
          toValue: 0,
          useNativeDriver: true,
          tension: 30,
          friction: 25,
        }),
        Animated.timing(recurringPickerBackdrop, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (recurringPickerMounted) {
      // Closing animation - very slow and smooth
      Animated.parallel([
        Animated.spring(recurringPickerSlide, {
          toValue: SCREEN_HEIGHT,
          useNativeDriver: true,
          tension: 25,
          friction: 30,
        }),
        Animated.timing(recurringPickerBackdrop, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setRecurringPickerMounted(false);
        }
      });
    }
  }, [showRecurringPicker, recurringPickerMounted, recurringPickerSlide, recurringPickerBackdrop]);

  // Handle close voice mode
  const handleCloseVoiceMode = useCallback(async () => {
    // Clear auto-stop timer
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }

    await cancelRecording();
    setIsVoiceMode(false);
    setVoiceTranscript('');
    setAiResponse('');
    setVoiceError(null);
    setIsCreatingReminder(false);

    // Animate FIRST, then unmount overlay after animation completes
    Animated.parallel([
      Animated.spring(micPositionAnim, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true,
        tension: 50,
        friction: 12,
      }),
      Animated.spring(micScaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 12,
      }),
      Animated.timing(micOpacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(orbPositionAnim, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true,
        tension: 40,
        friction: 10,
      }),
      Animated.spring(orbScaleAnim, {
        toValue: 0.3,
        useNativeDriver: true,
        tension: 40,
        friction: 10,
      }),
      Animated.timing(voiceOverlayOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Only unmount after exit animation completes
      setShowVoiceOverlay(false);
      orbScaleAnim.setValue(1);
    });
  }, [cancelRecording, micPositionAnim, micScaleAnim, micOpacityAnim, voiceOverlayOpacity, orbPositionAnim, orbScaleAnim]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
      }
    };
  }, []);


  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      return;
    }

    // Immediate feedback - set loading state and haptic FIRST
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Check reminder limits (after showing loading state)
    const { allowed, reason } = await canCreateReminder();
    if (!allowed) {
      setIsSaving(false); // Reset loading state
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Limit Reached', reason || 'Unable to create reminder', [
        { text: 'OK', style: 'cancel' },
      ]);
      return;
    }
    try {
      // Combine date and time
      const scheduledTime = new Date(selectedDate);
      scheduledTime.setHours(selectedTime.getHours());
      scheduledTime.setMinutes(selectedTime.getMinutes());
      scheduledTime.setSeconds(0);
      scheduledTime.setMilliseconds(0);

      // Handle recurring rule - create in database if needed
      let recurringRuleId: string | undefined;

      if (recurringOption === 'daily') {
        // Create a daily recurring rule
        const dailyRule = await createRecurringRule({
          name: 'Every day',
          frequency: 1,
          frequency_unit: 'days',
          selected_days: [],
        });
        recurringRuleId = dailyRule.id;
      } else if (recurringOption === 'saved' && selectedSavedRule) {
        recurringRuleId = selectedSavedRule.id;
      } else if (recurringOption === 'custom' && customRule) {
        // Create the custom recurring rule in database
        const newRule = await createRecurringRule({
          name: customRule.name,
          frequency: customRule.frequency,
          frequency_unit: customRule.frequency_unit,
          selected_days: customRule.selected_days,
        });
        recurringRuleId = newRule.id;
      }

      const newReminder = await onSave({
        title: title.trim(),
        description: notes.trim() || undefined,
        scheduled_time: scheduledTime.toISOString(),
        is_priority: isPriority,
        notify_before_minutes: notifyBeforeMinutes,
        recurring_rule_id: recurringRuleId,
      });

      // Create reminder actions if any were selected
      if (reminderActions.length > 0 && newReminder?.id) {
        try {
          await createReminderActions(newReminder.id, reminderActions);
        } catch (error) {
          console.error('Failed to create reminder actions:', error);
          // Don't fail the whole operation if actions fail
        }
      }

      onBack();
    } catch {
      // Error handled by parent
    } finally {
      setIsSaving(false);
    }
  }, [title, notes, selectedDate, selectedTime, isPriority, notifyBeforeMinutes, recurringOption, selectedSavedRule, customRule, reminderActions, onSave, onBack]);

  const getRecurringLabel = (): string => {
    switch (recurringOption) {
      case 'none':
        return 'Does not repeat';
      case 'daily':
        return 'Every day';
      case 'saved':
        return selectedSavedRule?.name ?? 'Saved rule';
      case 'custom':
        return customRule?.name ?? 'Custom';
      default:
        return 'Does not repeat';
    }
  };

  const handleRecurringSelect = (option: RecurringOption, rule?: RecurringRule) => {
    if (option === 'custom') {
      // Don't close the repeat picker - open modal on top
      setShowRecurringModal(true);
      return;
    }

    setRecurringOption(option);
    if (option === 'saved' && rule) {
      setSelectedSavedRule(rule);
      setCustomRule(null);
    } else {
      // Reset saved rule and custom rule for other options
      setSelectedSavedRule(null);
      setCustomRule(null);
    }
    setShowRecurringPicker(false);
  };

  const handleCustomRuleSave = (rule: RecurringRule) => {
    setCustomRule(rule);
    setRecurringOption('custom');
    setShowRecurringPicker(false); // Close repeat picker after saving custom rule
  };

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.canvas,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.glowTopRight}>
          <GlowTopRight />
        </View>
        <View style={styles.glowBottomLeft}>
          <GlowBottomLeft />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              contentContainerStyle={[
                styles.content,
                { paddingTop: insets.top, paddingBottom: insets.bottom + 120 },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header */}
              <View style={styles.header}>
                <AnimatedBackButton onPress={onBack} />
                <Text style={styles.headerTitle}>New Reminder</Text>
                <Pressable style={styles.headerIcon} onPress={handleMicPress}>
                  <Animated.View
                    style={{
                      transform: [
                        { translateX: micPositionAnim.x },
                        { translateY: micPositionAnim.y },
                        { scale: micScaleAnim },
                      ],
                      opacity: micOpacityAnim,
                    }}
                  >
                    <MicSparkleIcon size={24} />
                  </Animated.View>
                </Pressable>
              </View>

              {/* Bento Grid */}
              <View style={styles.bentoGrid}>
                {/* Title Input Card */}
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>Title</Text>
                  <View style={styles.titleInputContainer}>
                    <TextInput
                      style={styles.titleInput}
                      placeholder="Meeting with Design"
                      placeholderTextColor="#dddae7"
                      value={title}
                      onChangeText={setTitle}
                    />
                  </View>
                </View>

                {/* Date & Time Picker - Single Row */}
                <DateTimePicker
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onDateChange={setSelectedDate}
                  onTimeChange={setSelectedTime}
                />

                {/* Notification Timing Card */}
                <AnimatedCard
                  style={styles.notifyCard}
                  onPress={() => {
                    setTempNotifyMinutes(notifyBeforeMinutes);
                    setShowNotifyPicker(true);
                  }}
                >
                  <View style={styles.notifyHeader}>
                    <View style={styles.notifyIconWrapper}>
                      <BellNavIcon color="#2F00FF" />
                    </View>
                    <Text style={styles.notifyLabel}>Notify</Text>
                  </View>
                  <Text style={styles.notifyValue}>{getNotifyLabel(notifyBeforeMinutes)}</Text>
                </AnimatedCard>

                {/* Recurring Reminder Card */}
                <AnimatedCard
                  style={styles.recurringCard}
                  onPress={() => setShowRecurringPicker(true)}
                >
                  <View style={styles.recurringCardLeft}>
                    <View style={[styles.recurringIconWrapper, recurringOption !== 'none' && styles.recurringIconWrapperActive]}>
                      <RepeatIcon color={recurringOption !== 'none' ? '#ffffff' : '#2F00FF'} />
                    </View>
                    <View style={styles.recurringCardText}>
                      <Text style={styles.recurringCardLabel}>Repeat</Text>
                      <Text style={[styles.recurringCardValue, recurringOption !== 'none' && styles.recurringCardValueActive]}>
                        {getRecurringLabel()}
                      </Text>
                    </View>
                  </View>
                  <ChevronRightIcon opacity={0.3} />
                </AnimatedCard>

                {/* Task Configuration Section */}
                <TaskConfigSection
                  onActionsChange={(actions) => {
                    const actionInputs: CreateReminderActionInput[] = actions.map(action => ({
                      action_type: action.type,
                      action_value: action.value,
                    }));
                    setReminderActions(actionInputs);
                  }}
                  onRepeatChange={(repeat) => {
                    // Handle repeat configuration
                    console.log('Repeat config:', repeat);
                  }}
                />

                {/* Notes Card */}
                <View style={styles.card}>
                  <Text style={styles.cardLabelSmall}>Notes</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Add additional details or context here..."
                    placeholderTextColor="#dddae7"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                {/* Priority Toggle Card */}
                <View style={styles.priorityCard}>
                  <View style={styles.priorityTextContainer}>
                    <Text style={styles.cardLabelSmall}>Priority</Text>
                    <Text style={styles.priorityText}>Mark as Important</Text>
                  </View>
                  <Pressable
                    style={[styles.toggle, isPriority && styles.toggleActive]}
                    onPress={() => setIsPriority(!isPriority)}
                  >
                    <Animated.View
                      style={[
                        styles.toggleKnob,
                        isPriority && styles.toggleKnobActive,
                      ]}
                    />
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>

        {/* Floating Save Button */}
        <View style={[styles.floatingFooter, { bottom: insets.bottom + 24 }]}>
          <View style={styles.floatingFooterInner}>
            <AnimatedSaveButton
              onPress={handleSave}
              disabled={!title.trim() || isSaving}
              isSaving={isSaving}
            />
          </View>
        </View>

        {/* Notification Timing Picker Modal */}
        {notifyPickerMounted && (
          <View style={styles.modalOverlay}>
            <Animated.View style={[styles.modalBackdrop, { opacity: notifyPickerBackdrop }]}>
              <Pressable
                style={StyleSheet.absoluteFillObject}
                onPress={() => setShowNotifyPicker(false)}
              />
            </Animated.View>
            <Animated.View
              style={[
                styles.pickerModal,
                {
                  paddingBottom: insets.bottom + 16,
                  transform: [{ translateY: notifyPickerSlide }]
                }
              ]}
            >
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Notification Timing</Text>
                <Pressable onPress={() => setShowNotifyPicker(false)}>
                  <Text style={styles.pickerCancel}>Cancel</Text>
                </Pressable>
              </View>
              <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                {NOTIFICATION_TIMING_OPTIONS.map((option) => {
                  const isSelected = option.value === tempNotifyMinutes;
                  return (
                    <AnimatedPickerOptionItem
                      key={option.value}
                      onPress={() => setTempNotifyMinutes(option.value)}
                      isSelected={isSelected}
                      label={option.label}
                    />
                  );
                })}
              </ScrollView>
              <AnimatedConfirmButton
                onPress={() => {
                  setNotifyBeforeMinutes(tempNotifyMinutes);
                  setShowNotifyPicker(false);
                }}
                label="Confirm"
              />
            </Animated.View>
          </View>
        )}

        {/* Recurring Picker Modal */}
        {recurringPickerMounted && (
          <View style={styles.modalOverlay}>
            <Animated.View style={[styles.modalBackdrop, { opacity: recurringPickerBackdrop }]}>
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                activeOpacity={1}
                onPress={() => setShowRecurringPicker(false)}
              />
            </Animated.View>
            <Animated.View
              style={[
                styles.repeatPickerModal,
                {
                  paddingBottom: insets.bottom + 24,
                  transform: [{ translateY: recurringPickerSlide }]
                }
              ]}
            >
              {/* Handle Bar */}
              <View style={styles.repeatPickerHandle} />

              {/* Header */}
              <View style={styles.repeatPickerHeader}>
                <Text style={styles.repeatPickerTitle}>Repeat</Text>
                <TouchableOpacity
                  style={styles.repeatPickerCloseButton}
                  onPress={() => setShowRecurringPicker(false)}
                  activeOpacity={0.7}
                >
                  <CloseIcon size={20} color="#121018" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.repeatPickerContent}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.repeatPickerScrollContent}
              >
                {/* Quick Options */}
                <View style={styles.repeatPickerSection}>
                  <View style={styles.repeatPickerQuickOptions}>
                    {/* No Repeat */}
                    <TouchableOpacity
                      style={[
                        styles.repeatPickerCard,
                        recurringOption === 'none' && styles.repeatPickerCardSelected,
                      ]}
                      onPress={() => handleRecurringSelect('none')}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.repeatPickerCardIcon,
                        recurringOption === 'none' && styles.repeatPickerCardIconSelected,
                      ]}>
                        <BlockIcon color={recurringOption === 'none' ? '#ffffff' : '#888888'} />
                      </View>
                      <Text style={[
                        styles.repeatPickerCardText,
                        recurringOption === 'none' && styles.repeatPickerCardTextSelected,
                      ]}>
                        Never
                      </Text>
                      {recurringOption === 'none' && (
                        <View style={styles.repeatPickerCardCheck}>
                          <CheckCircleIcon color="#ffffff" />
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Daily */}
                    <TouchableOpacity
                      style={[
                        styles.repeatPickerCard,
                        recurringOption === 'daily' && styles.repeatPickerCardSelected,
                      ]}
                      onPress={() => handleRecurringSelect('daily')}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.repeatPickerCardIcon,
                        recurringOption === 'daily' && styles.repeatPickerCardIconSelected,
                      ]}>
                        <DailyIcon color={recurringOption === 'daily' ? '#ffffff' : '#2F00FF'} />
                      </View>
                      <Text style={[
                        styles.repeatPickerCardText,
                        recurringOption === 'daily' && styles.repeatPickerCardTextSelected,
                      ]}>
                        Daily
                      </Text>
                      {recurringOption === 'daily' && (
                        <View style={styles.repeatPickerCardCheck}>
                          <CheckCircleIcon color="#ffffff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Saved Rules */}
                {savedRules.length > 0 && (
                  <View style={styles.repeatPickerSection}>
                    <View style={styles.repeatPickerSectionHeader}>
                      <BookmarkIcon color="rgba(214, 198, 245, 0.6)" />
                      <Text style={styles.repeatPickerSectionTitle}>Saved Rules</Text>
                    </View>
                    <View style={styles.repeatPickerSavedList}>
                      {savedRules.map((rule) => {
                        const isSelected = recurringOption === 'saved' && selectedSavedRule?.id === rule.id;
                        return (
                          <TouchableOpacity
                            key={rule.id}
                            style={[
                              styles.repeatPickerSavedItem,
                              isSelected && styles.repeatPickerSavedItemSelected,
                            ]}
                            onPress={() => handleRecurringSelect('saved', rule)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.repeatPickerSavedItemLeft}>
                              <View style={[
                                styles.repeatPickerSavedDot,
                                isSelected && styles.repeatPickerSavedDotSelected,
                              ]} />
                              <Text style={[
                                styles.repeatPickerSavedText,
                                isSelected && styles.repeatPickerSavedTextSelected,
                              ]}>
                                {rule.name}
                              </Text>
                            </View>
                            {isSelected && <CheckCircleIcon color="#2F00FF" />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Custom Rule */}
                <View style={styles.repeatPickerSection}>
                  <TouchableOpacity
                    style={[
                      styles.repeatPickerCustomCard,
                      recurringOption === 'custom' && customRule && styles.repeatPickerCustomCardSelected,
                    ]}
                    onPress={() => handleRecurringSelect('custom')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.repeatPickerCustomLeft}>
                      <View style={[
                        styles.repeatPickerCustomIcon,
                        recurringOption === 'custom' && customRule && styles.repeatPickerCustomIconSelected,
                      ]}>
                        <SlidersIcon color={recurringOption === 'custom' && customRule ? '#ffffff' : '#2F00FF'} />
                      </View>
                      <View style={styles.repeatPickerCustomText}>
                        <Text style={[
                          styles.repeatPickerCustomTitle,
                          recurringOption === 'custom' && customRule && styles.repeatPickerCustomTitleSelected,
                        ]}>
                          {customRule ? customRule.name : 'Custom Schedule'}
                        </Text>
                        <Text style={[
                          styles.repeatPickerCustomSubtitle,
                          recurringOption === 'custom' && customRule && styles.repeatPickerCustomSubtitleSelected,
                        ]}>
                          {customRule ? 'Tap to edit' : 'Create your own pattern'}
                        </Text>
                      </View>
                    </View>
                    <View style={[
                      styles.repeatPickerCustomArrow,
                      recurringOption === 'custom' && customRule && styles.repeatPickerCustomArrowSelected,
                    ]}>
                      <ChevronRightIcon
                        color={recurringOption === 'custom' && customRule ? '#ffffff' : '#2F00FF'}
                        opacity={0.8}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Animated.View>
          </View>
        )}

        {/* Recurring Rule Modal */}
        <RecurringRuleModal
          visible={showRecurringModal}
          onClose={() => setShowRecurringModal(false)}
          onSave={handleCustomRuleSave}
          initialRule={customRule ?? undefined}
          selectedTime={selectedTime}
        />

        {/* Voice Recording Overlay */}
        {showVoiceOverlay && (
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                opacity: voiceOverlayOpacity,
                pointerEvents: isVoiceMode ? 'auto' : 'none',
                zIndex: 200,
                backgroundColor: 'rgba(230, 220, 245, 0.98)',
              },
            ]}
          >
            <View style={styles.voiceOverlayContent}>
              {/* Close Button */}
              <Pressable style={styles.voiceCloseButton} onPress={handleCloseVoiceMode}>
                <CloseIcon size={20} color="#2F00FF" />
              </Pressable>

              {/* Header with "I'm Listening..." */}
              <View style={styles.voiceHeader}>
                <View style={styles.voiceWaveformIcon}>
                  <View style={[styles.waveformBar, { height: 12 }]} />
                  <View style={[styles.waveformBar, { height: 20 }]} />
                  <View style={[styles.waveformBar, { height: 16 }]} />
                  <View style={[styles.waveformBar, { height: 24 }]} />
                  <View style={[styles.waveformBar, { height: 14 }]} />
                </View>
                <Text style={styles.voiceHeaderText}>I'm Listening...</Text>
              </View>

              {/* Chat Bubbles Container - Hide when creating reminder */}
              {!isCreatingReminder && (
                <View style={styles.voiceChatContainer}>
                  <ScrollView
                    contentContainerStyle={styles.voiceChatContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {!voiceTranscript && !aiResponse && !isProcessingVoice && !voiceError && !recordingError && (
                      <View style={styles.chatBubblePlaceholder}>
                        <Text style={styles.chatBubblePlaceholderText}>
                          {isRecording ? "Speak now..." : "Ready to listen..."}
                        </Text>
                      </View>
                    )}

                    {voiceTranscript && (
                      <View style={styles.chatBubbleUser}>
                        <Text style={styles.chatBubbleUserText}>{voiceTranscript}</Text>
                      </View>
                    )}

                    {aiResponse && !isCreatingReminder && (
                      <View style={styles.chatBubbleAI}>
                        <Text style={styles.chatBubbleAIText}>{aiResponse}</Text>
                      </View>
                    )}

                    {(voiceError || recordingError) && (
                      <View style={styles.chatBubbleError}>
                        <Text style={styles.chatBubbleErrorText}>{voiceError || recordingError}</Text>
                      </View>
                    )}

                    {isProcessingVoice && (
                      <View style={styles.chatBubbleProcessing}>
                        <View style={styles.processingDots}>
                          <View style={styles.processingDot} />
                          <View style={styles.processingDot} />
                          <View style={styles.processingDot} />
                        </View>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}

              {/* Siri Orb */}
              <Animated.View
                style={[
                  styles.voiceOrbContainer,
                  {
                    transform: [
                      { translateX: orbPositionAnim.x },
                      { translateY: orbPositionAnim.y },
                      { scale: orbScaleAnim },
                    ],
                  },
                ]}
              >
                <UnstableSiriOrb
                  size={200}
                  speed={isRecording ? 1.5 : isCreatingReminder ? 1.0 : 0.5}
                  primaryColor={{ r: 0.18, g: 0.0, b: 1.0 }}
                  secondaryColor={{ r: 1.0, g: 0.0, b: 0.01 }}
                  paused={!isRecording && !isProcessingVoice && !isCreatingReminder}
                />
              </Animated.View>

              {/* Recording Status */}
              {isRecording && !isCreatingReminder && (
                <View style={styles.voiceControls}>
                  <View style={styles.voiceListeningIndicator}>
                    <Text style={styles.voiceHint}>Listening... Speak now</Text>
                  </View>
                </View>
              )}

              {/* Creating Reminder Status */}
              {isCreatingReminder && (
                <View style={styles.voiceControls}>
                  <Text style={styles.voiceHint}>Creating your reminder...</Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}
      </Animated.View>
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
  keyboardView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#121018',
    flex: 1,
    textAlign: 'center',
  },
  headerIcon: {
    width: 48,
    height: 48,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bentoGrid: {
    gap: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
  },
  cardLabel: {
    fontSize: 10,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#2F00FF',
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  cardLabelSmall: {
    fontSize: 10,
    fontFamily: 'BricolageGrotesque-Bold',
    color: 'rgba(18, 16, 24, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  titleInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleInput: {
    flex: 1,
    fontSize: 24,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#121018',
    padding: 0,
  },
  // Combined Date & Time Picker - Single Row
  dateTimePickerRow: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  dateSection: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 4,
  },
  timeSection: {
    width: 120,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 9,
    fontFamily: 'BricolageGrotesque-Bold',
    color: 'rgba(18, 16, 24, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  dateListContent: {
    gap: 6,
  },
  compactDateItem: {
    width: 56,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#f8f7fa',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  compactDateItemSelected: {
    backgroundColor: '#2F00FF',
  },
  compactDateDay: {
    fontSize: 9,
    fontFamily: 'BricolageGrotesque-Bold',
    color: 'rgba(18, 16, 24, 0.5)',
    textTransform: 'uppercase',
  },
  compactDateDaySelected: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  compactDateNum: {
    fontSize: 20,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#121018',
  },
  compactDateNumSelected: {
    color: '#ffffff',
  },
  pickerDivider: {
    width: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    marginHorizontal: 12,
  },
  compactTimeWheels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 108,
  },
  compactTimeColumn: {
    width: 44,
    height: 108,
    position: 'relative',
    overflow: 'hidden',
  },
  compactTimeScroll: {
    height: 108,
    overflow: 'hidden',
  },
  compactTimeItem: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactTimeText: {
    fontSize: 22,
    fontFamily: 'BricolageGrotesque-Regular',
    color: 'rgba(18, 16, 24, 0.25)',
  },
  compactTimeTextSelected: {
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#121018',
  },
  compactTimeHighlight: {
    position: 'absolute',
    top: 36,
    left: 0,
    right: 0,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(214, 198, 245, 0.15)',
    zIndex: -1,
  },
  compactTimeSep: {
    fontSize: 22,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#121018',
    marginHorizontal: 2,
  },

  notifyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  notifyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  notifyLabel: {
    fontSize: 10,
    fontFamily: 'BricolageGrotesque-Bold',
    color: 'rgba(18, 16, 24, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  notifyIconWrapper: {
    transform: [{ scale: 0.7 }],
    marginLeft: -4,
    marginRight: -4,
  },
  notifyValue: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#121018',
  },
  recurringCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recurringCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  recurringIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(214, 198, 245, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recurringIconWrapperActive: {
    backgroundColor: '#2F00FF',
  },
  recurringCardText: {
    gap: 2,
  },
  recurringCardLabel: {
    fontSize: 10,
    fontFamily: 'BricolageGrotesque-Bold',
    color: 'rgba(18, 16, 24, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  recurringCardValue: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#121018',
  },
  recurringCardValueActive: {
    color: '#2F00FF',
  },
  repeatPickerModal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    minHeight: '60%',
  },
  repeatPickerHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  repeatPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  repeatPickerTitle: {
    fontSize: 20,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#121018',
  },
  repeatPickerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatPickerContent: {
    flex: 1,
  },
  repeatPickerScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  repeatPickerSection: {
    marginBottom: 24,
  },
  repeatPickerQuickOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  repeatPickerCard: {
    flex: 1,
    backgroundColor: '#f8f7fa',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  repeatPickerCardSelected: {
    backgroundColor: '#2F00FF',
    borderColor: '#2F00FF',
  },
  repeatPickerCardIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  repeatPickerCardIconSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  repeatPickerCardText: {
    fontSize: 15,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#121018',
  },
  repeatPickerCardTextSelected: {
    color: '#ffffff',
  },
  repeatPickerCardCheck: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  repeatPickerSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  repeatPickerSectionTitle: {
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Bold',
    color: 'rgba(18, 16, 24, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  repeatPickerSavedList: {
    backgroundColor: '#f8f7fa',
    borderRadius: 16,
    overflow: 'hidden',
  },
  repeatPickerSavedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  repeatPickerSavedItemSelected: {
    backgroundColor: 'rgba(214, 198, 245, 0.15)',
  },
  repeatPickerSavedItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  repeatPickerSavedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  repeatPickerSavedDotSelected: {
    backgroundColor: '#2F00FF',
  },
  repeatPickerSavedText: {
    fontSize: 15,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#121018',
  },
  repeatPickerSavedTextSelected: {
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#2F00FF',
  },
  repeatPickerCustomCard: {
    backgroundColor: 'rgba(214, 198, 245, 0.1)',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'rgba(214, 198, 245, 0.25)',
  },
  repeatPickerCustomCardSelected: {
    backgroundColor: '#2F00FF',
    borderColor: '#2F00FF',
  },
  repeatPickerCustomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  repeatPickerCustomIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(214, 198, 245, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatPickerCustomIconSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  repeatPickerCustomText: {
    flex: 1,
    gap: 2,
  },
  repeatPickerCustomTitle: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#2F00FF',
  },
  repeatPickerCustomTitleSelected: {
    color: '#ffffff',
  },
  repeatPickerCustomSubtitle: {
    fontSize: 13,
    fontFamily: 'BricolageGrotesque-Regular',
    color: 'rgba(214, 198, 245, 0.7)',
  },
  repeatPickerCustomSubtitleSelected: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  repeatPickerCustomArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(214, 198, 245, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatPickerCustomArrowSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  notesInput: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#121018',
    minHeight: 120,
    padding: 0,
    lineHeight: 24,
  },
  priorityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priorityTextContainer: {
    flex: 1,
  },
  priorityText: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#121018',
  },
  toggle: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dddae7',
    padding: 4,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#2F00FF',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  floatingFooter: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  floatingFooterInner: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 32,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  saveButton: {
    position: 'relative',
    borderRadius: 100,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonBlur: {
    borderRadius: 100,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.6)',
  },
  saveButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    position: 'relative',
  },
  highlightTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderRadius: 100,
  },
  highlightBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderRadius: 100,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 1,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  pickerModal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    maxHeight: '60%',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerTitle: {
    fontSize: 18,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#121018',
  },
  pickerCancel: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#888888',
  },
  pickerScroll: {
    maxHeight: 300,
  },
  pickerOption: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  pickerOptionSelected: {
    backgroundColor: '#f6f1ff',
  },
  pickerOptionText: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#121018',
    textAlign: 'center',
  },
  pickerOptionTextSelected: {
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#2F00FF',
  },
  pickerConfirm: {
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 100,
    overflow: 'hidden',
    shadowColor: '#2F00FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  pickerConfirmGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    position: 'relative',
  },
  pickerConfirmText: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  // Voice Overlay Styles
  voiceOverlayContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 120,
    paddingBottom: 60,
  },
  voiceCloseButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(214, 198, 245, 0.3)',
  },
  voiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  voiceWaveformIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
  },
  waveformBar: {
    width: 3,
    backgroundColor: '#ff0066',
    borderRadius: 2,
  },
  voiceHeaderText: {
    fontSize: 20,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#2F00FF',
  },
  voiceChatContainer: {
    flex: 1,
    width: '100%',
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 24,
    padding: 16,
    minHeight: 200,
  },
  voiceChatContent: {
    gap: 16,
    flexGrow: 1,
  },
  chatBubblePlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(214, 198, 245, 0.3)',
    borderStyle: 'dashed',
  },
  chatBubblePlaceholderText: {
    fontSize: 15,
    fontFamily: 'BricolageGrotesque-Regular',
    color: 'rgba(214, 198, 245, 0.7)',
    textAlign: 'center',
  },
  chatBubbleUser: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    maxWidth: '85%',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(214, 198, 245, 0.3)',
    shadowColor: '#2F00FF',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  chatBubbleUserText: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#1a1a2e',
    lineHeight: 24,
  },
  chatBubbleAI: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    maxWidth: '85%',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(214, 198, 245, 0.3)',
    shadowColor: '#2F00FF',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  chatBubbleAIText: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#1a1a2e',
    lineHeight: 24,
  },
  chatBubbleError: {
    backgroundColor: 'rgba(255, 100, 100, 0.2)',
    borderRadius: 24,
    padding: 20,
    maxWidth: '85%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 100, 100, 0.4)',
  },
  chatBubbleErrorText: {
    fontSize: 14,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#ff6b6b',
    textAlign: 'center',
    lineHeight: 20,
  },
  chatBubbleProcessing: {
    backgroundColor: 'rgba(230, 220, 245, 0.95)',
    borderRadius: 24,
    padding: 20,
    maxWidth: '85%',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  processingDots: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  processingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2F00FF',
  },
  voiceOrbContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  voiceControls: {
    alignItems: 'center',
  },
  voiceStopButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ff0066',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff0066',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  voiceStopIcon: {
    width: 28,
    height: 28,
    backgroundColor: '#ffffff',
    borderRadius: 6,
  },
  voiceHint: {
    marginTop: 16,
    fontSize: 13,
    letterSpacing: 0.5,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#2F00FF',
  },
  voiceListeningIndicator: {
    alignItems: 'center',
    paddingVertical: 12,
  },
});
