import { useCallback, useEffect, useRef, useState } from 'react';
import {
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackIcon, CalendarSmallIcon, ScheduleIcon, CheckAllIcon, GlowTopRight, GlowBottomLeft, BellNavIcon, RepeatIcon, ChevronRightIcon, CloseIcon, BlockIcon, DailyIcon, BookmarkIcon, SlidersIcon, CheckCircleIcon, MicSparkleIcon } from '../components/icons';
import RecurringRuleModal from '../components/RecurringRuleModal';
import { VoiceOrbComponent } from '../components/VoiceOrbComponent';
import { createRecurringRule, getRecurringRules } from '../lib/reminders';
import { parseReminderFromVoice } from '../lib/aiReminders';
import { useVoiceRecording } from '../hooks/useVoiceRecording';
import { CreateReminderInput, NOTIFICATION_TIMING_OPTIONS, RecurringOption, RecurringRule } from '../lib/types';

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
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
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
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.backButton, { transform: [{ scale: scaleAnim }] }]}>
        <BackIcon />
      </Animated.View>
    </Pressable>
  );
}

// Animated Save Button
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
        <Text style={styles.saveButtonText}>
          {isSaving ? 'Saving...' : 'Save Reminder'}
        </Text>
        {!isSaving && <CheckAllIcon />}
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
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
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

// Animated Confirm Button
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
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={[
          styles.pickerConfirm,
          { transform: [{ scale: scaleAnim }, { translateY: translateYAnim }] },
        ]}
      >
        <Text style={styles.pickerConfirmText}>{label}</Text>
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
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / TIME_ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, hours.length - 1));
    if (clampedIndex !== selectedHour) {
      setSelectedHour(clampedIndex);
    }
  };

  const handleMinuteScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / TIME_ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, minutes.length - 1));
    if (clampedIndex !== selectedMinute) {
      setSelectedMinute(clampedIndex);
    }
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
                  scrollRef.current?.scrollTo({
                    y: item * TIME_ITEM_HEIGHT,
                    animated: true,
                  });
                  if (isMinute) {
                    setSelectedMinute(item);
                  } else {
                    setSelectedHour(item);
                  }
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
  onSave: (input: CreateReminderInput) => Promise<void>;
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
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
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

  // Notification picker modal state
  const [showNotifyPicker, setShowNotifyPicker] = useState(false);
  const [tempNotifyMinutes, setTempNotifyMinutes] = useState(0);

  // Voice mode state
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Voice recording hook
  const { isRecording, duration, error: recordingError, startRecording, stopRecording, cancelRecording } = useVoiceRecording();

  // Voice mode animations
  const micPositionAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const micScaleAnim = useRef(new Animated.Value(1)).current;
  const voiceOverlayOpacity = useRef(new Animated.Value(0)).current;

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

    // Animate mic to center with smooth transition
    Animated.parallel([
      Animated.spring(micPositionAnim, {
        toValue: { x: -(SCREEN_WIDTH / 2 - 48 - 24), y: SCREEN_HEIGHT / 3 - 48 },
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      }),
      Animated.spring(micScaleAnim, {
        toValue: 3.5,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      }),
      Animated.timing(voiceOverlayOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      setIsVoiceMode(true);
      // Start recording after animation completes
      await startRecording();
    });
  }, [isVoiceMode, hasPermission, micPositionAnim, micScaleAnim, voiceOverlayOpacity, startRecording]);

  // Handle stop recording and process voice
  const handleStopVoice = useCallback(async () => {
    if (!isRecording) return;

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
        // Just display the AI response and keep voice mode open
        setAiResponse(result.response);
        // Don't close voice mode - user can continue chatting
      } else if (result.type === 'reminder') {
        // Clear any previous AI response
        setAiResponse('');

        // Populate form fields from the parsed reminder
        if (result.reminder.title) {
          setTitle(result.reminder.title);
        }
        if (result.reminder.scheduled_time) {
          const scheduledDate = new Date(result.reminder.scheduled_time);
          setSelectedDate(scheduledDate);
          setSelectedTime(scheduledDate);
        }
        if (result.reminder.description) {
          setNotes(result.reminder.description);
        }
        if (result.reminder.is_priority !== undefined) {
          setIsPriority(result.reminder.is_priority);
        }
        if (result.reminder.notify_before_minutes !== undefined) {
          setNotifyBeforeMinutes(result.reminder.notify_before_minutes);
        }

        // Handle recurring rule from voice
        if (result.recurringRule) {
          // Set as custom rule with the parsed data
          setCustomRule({
            id: '', // Will be created on save
            name: result.recurringRule.name,
            frequency: result.recurringRule.frequency,
            frequency_unit: result.recurringRule.frequency_unit,
            selected_days: result.recurringRule.selected_days,
          });
          setRecurringOption('custom');
          setSelectedSavedRule(null);
        }

        // Close voice mode after a brief delay to show the transcript
        setTimeout(() => {
          handleCloseVoiceMode();
        }, 1500);
      }
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'Failed to process voice');
    } finally {
      setIsProcessingVoice(false);
    }
  }, [isRecording, stopRecording]);

  // Handle close voice mode
  const handleCloseVoiceMode = useCallback(async () => {
    await cancelRecording();
    setIsVoiceMode(false);
    setVoiceTranscript('');
    setAiResponse('');
    setVoiceError(null);

    // Animate mic back to original position
    Animated.parallel([
      Animated.spring(micPositionAnim, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.spring(micScaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(voiceOverlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cancelRecording, micPositionAnim, micScaleAnim, voiceOverlayOpacity]);


  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      return;
    }

    setIsSaving(true);
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

      await onSave({
        title: title.trim(),
        description: notes.trim() || undefined,
        scheduled_time: scheduledTime.toISOString(),
        is_priority: isPriority,
        notify_before_minutes: notifyBeforeMinutes,
        recurring_rule_id: recurringRuleId,
      });
      onBack();
    } catch {
      // Error handled by parent
    } finally {
      setIsSaving(false);
    }
  }, [title, notes, selectedDate, selectedTime, isPriority, notifyBeforeMinutes, recurringOption, selectedSavedRule, customRule, onSave, onBack]);

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
                      autoFocus
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
        {showNotifyPicker && (
          <View style={styles.modalOverlay}>
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setShowNotifyPicker(false)}
            />
            <Animated.View style={[styles.pickerModal, { paddingBottom: insets.bottom + 16 }]}>
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
        {showRecurringPicker && (
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setShowRecurringPicker(false)}
            />
            <View style={[styles.repeatPickerModal, { paddingBottom: insets.bottom + 24 }]}>
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
                      <BookmarkIcon color="rgba(47, 0, 255, 0.5)" />
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
            </View>
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
        {isVoiceMode && (
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                opacity: voiceOverlayOpacity,
                pointerEvents: isVoiceMode ? 'auto' : 'none',
                zIndex: 200,
              },
            ]}
          >
            <VoiceOrbComponent
              isRecording={isRecording}
              duration={duration}
              transcript={voiceTranscript}
              aiResponse={aiResponse}
              error={voiceError || recordingError || null}
              status={isProcessingVoice ? 'processing' : isRecording ? 'recording' : 'idle'}
              onCancel={handleCloseVoiceMode}
              onStop={handleStopVoice}
            />
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
    backgroundColor: 'rgba(47, 0, 255, 0.08)',
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
    backgroundColor: 'rgba(47, 0, 255, 0.1)',
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
    backgroundColor: 'rgba(47, 0, 255, 0.08)',
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
    backgroundColor: 'rgba(47, 0, 255, 0.06)',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'rgba(47, 0, 255, 0.15)',
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
    backgroundColor: 'rgba(47, 0, 255, 0.12)',
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
    color: 'rgba(47, 0, 255, 0.6)',
  },
  repeatPickerCustomSubtitleSelected: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  repeatPickerCustomArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(47, 0, 255, 0.1)',
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
    backgroundColor: '#2F00FF',
    borderRadius: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#a5a5a5',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#ffffff',
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
    backgroundColor: '#2F00FF',
    marginHorizontal: 24,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  pickerConfirmText: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#ffffff',
  },
  // Voice Overlay Styles
  voiceOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
  },
  voiceGradientBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a0f',
    opacity: 0.95,
  },
  voiceOverlayContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  voiceCloseButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  voiceStatusBadge: {
    position: 'absolute',
    top: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(47, 0, 255, 0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(47, 0, 255, 0.3)',
  },
  voiceStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2F00FF',
  },
  voiceStatusText: {
    fontSize: 13,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  voiceOrbContainer: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  voiceOrbRing1: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 3,
    borderColor: '#ff0002',
    borderStyle: 'solid',
  },
  voiceOrbRing2: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 3,
    borderColor: '#3b82f6',
    borderStyle: 'solid',
  },
  voiceOrbOuterGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(47, 0, 255, 0.3)',
    shadowColor: '#2F00FF',
    shadowOpacity: 0.6,
    shadowRadius: 50,
  },
  voiceOrbMiddle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(47, 0, 255, 0.5)',
  },
  voiceOrbCore: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#2F00FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F00FF',
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 10,
  },
  voiceStatusTag: {
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontFamily: 'BricolageGrotesque-Bold',
    color: 'rgba(47, 0, 255, 0.7)',
    marginBottom: 8,
  },
  voiceDurationContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(47, 0, 255, 0.15)',
    borderRadius: 16,
  },
  voiceDuration: {
    fontSize: 36,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#ffffff',
    letterSpacing: 2,
  },
  voiceTranscriptWrapper: {
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
  },
  voiceTranscriptContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 24,
    maxWidth: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  voiceTranscript: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  voiceSuccessIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 16,
  },
  voiceSuccessText: {
    fontSize: 14,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#10b981',
  },
  voiceErrorContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  voiceError: {
    fontSize: 14,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#ff6b6b',
    textAlign: 'center',
  },
  voiceControls: {
    marginTop: 40,
    alignItems: 'center',
  },
  voiceStopButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2F00FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F00FF',
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 10,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  voiceStopIcon: {
    width: 28,
    height: 28,
    backgroundColor: '#ffffff',
    borderRadius: 6,
  },
  voiceProcessingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: 'rgba(47, 0, 255, 0.15)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(47, 0, 255, 0.3)',
  },
  voiceProcessingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2F00FF',
  },
  voiceProcessingText: {
    fontSize: 15,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#ffffff',
  },
  voiceHint: {
    marginTop: 20,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: 'BricolageGrotesque-Bold',
    color: 'rgba(255, 255, 255, 0.4)',
  },
});
