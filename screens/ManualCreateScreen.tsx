import { useCallback, useEffect, useState } from 'react';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
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
import { BackIcon, CalendarSmallIcon, ScheduleIcon, CheckAllIcon, GlowTopRight, GlowBottomLeft, NotificationIcon, RepeatIcon, ChevronRightIcon, CloseIcon, BlockIcon, DailyIcon, BookmarkIcon, SlidersIcon, CheckCircleIcon } from '../components/icons';
import RecurringRuleModal from '../components/RecurringRuleModal';
import { createRecurringRule, getRecurringRules } from '../lib/reminders';
import { CreateReminderInput, NOTIFICATION_TIMING_OPTIONS, RecurringOption, RecurringRule } from '../lib/types';

interface ManualCreateScreenProps {
  onBack: () => void;
  onSave: (input: CreateReminderInput) => Promise<void>;
}

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTimeDisplay(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getNotifyLabel(minutes: number): string {
  const option = NOTIFICATION_TIMING_OPTIONS.find(opt => opt.value === minutes);
  return option?.label ?? 'At scheduled time';
}

export default function ManualCreateScreen({ onBack, onSave }: ManualCreateScreenProps) {
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

  // Date picker modal state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showNotifyPicker, setShowNotifyPicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [tempTime, setTempTime] = useState(new Date());
  const [tempNotifyMinutes, setTempNotifyMinutes] = useState(0);

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

  // Generate date options (today + next 30 days)
  const dateOptions = Array.from({ length: 31 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  // Generate time options (every 15 minutes)
  const timeOptions = Array.from({ length: 96 }, (_, i) => {
    const date = new Date();
    date.setHours(Math.floor(i / 4), (i % 4) * 15, 0, 0);
    return date;
  });

  return (
    <View style={styles.root}>
      <View style={styles.canvas}>
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
                <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
                  <BackIcon />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Reminder</Text>
                <View style={styles.headerSpacer} />
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

                {/* Date & Time Row */}
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity
                    style={styles.dateTimeCard}
                    activeOpacity={0.7}
                    onPress={() => {
                      setTempDate(selectedDate);
                      setShowDatePicker(true);
                    }}
                  >
                    <View style={styles.dateTimeHeader}>
                      <CalendarSmallIcon />
                      <Text style={styles.dateTimeLabel}>Date</Text>
                    </View>
                    <Text style={styles.dateTimeValue}>{formatDateDisplay(selectedDate)}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dateTimeCard}
                    activeOpacity={0.7}
                    onPress={() => {
                      setTempTime(selectedTime);
                      setShowTimePicker(true);
                    }}
                  >
                    <View style={styles.dateTimeHeader}>
                      <ScheduleIcon />
                      <Text style={styles.dateTimeLabel}>Time</Text>
                    </View>
                    <Text style={styles.dateTimeValue}>{formatTimeDisplay(selectedTime)}</Text>
                  </TouchableOpacity>
                </View>

                {/* Notification Timing Card */}
                <TouchableOpacity
                  style={styles.notifyCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    setTempNotifyMinutes(notifyBeforeMinutes);
                    setShowNotifyPicker(true);
                  }}
                >
                  <View style={styles.dateTimeHeader}>
                    <View style={styles.notifyIconWrapper}>
                      <NotificationIcon />
                    </View>
                    <Text style={styles.dateTimeLabel}>Notify</Text>
                  </View>
                  <Text style={styles.notifyValue}>{getNotifyLabel(notifyBeforeMinutes)}</Text>
                </TouchableOpacity>

                {/* Recurring Reminder Card */}
                <TouchableOpacity
                  style={styles.recurringCard}
                  activeOpacity={0.7}
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
                </TouchableOpacity>

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
            <TouchableOpacity
              style={[styles.saveButton, (!title.trim() || isSaving) && styles.saveButtonDisabled]}
              activeOpacity={0.9}
              onPress={handleSave}
              disabled={!title.trim() || isSaving}
            >
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Saving...' : 'Save Reminder'}
              </Text>
              {!isSaving && <CheckAllIcon />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setShowDatePicker(false)}
            />
            <View style={[styles.pickerModal, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.pickerCancel}>Cancel</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                {dateOptions.map((date, index) => {
                  const isSelected = date.toDateString() === tempDate.toDateString();
                  const isToday = date.toDateString() === new Date().toDateString();
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
                      onPress={() => setTempDate(date)}
                    >
                      <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextSelected]}>
                        {isToday ? 'Today' : formatDateDisplay(date)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity
                style={styles.pickerConfirm}
                onPress={() => {
                  setSelectedDate(tempDate);
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.pickerConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Time Picker Modal */}
        {showTimePicker && (
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setShowTimePicker(false)}
            />
            <View style={[styles.pickerModal, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select Time</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.pickerCancel}>Cancel</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                {timeOptions.map((time, index) => {
                  const isSelected =
                    time.getHours() === tempTime.getHours() &&
                    time.getMinutes() === tempTime.getMinutes();
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
                      onPress={() => setTempTime(time)}
                    >
                      <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextSelected]}>
                        {formatTimeDisplay(time)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity
                style={styles.pickerConfirm}
                onPress={() => {
                  setSelectedTime(tempTime);
                  setShowTimePicker(false);
                }}
              >
                <Text style={styles.pickerConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Notification Timing Picker Modal */}
        {showNotifyPicker && (
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setShowNotifyPicker(false)}
            />
            <View style={[styles.pickerModal, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Notification Timing</Text>
                <TouchableOpacity onPress={() => setShowNotifyPicker(false)}>
                  <Text style={styles.pickerCancel}>Cancel</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                {NOTIFICATION_TIMING_OPTIONS.map((option) => {
                  const isSelected = option.value === tempNotifyMinutes;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
                      onPress={() => setTempNotifyMinutes(option.value)}
                    >
                      <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextSelected]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity
                style={styles.pickerConfirm}
                onPress={() => {
                  setNotifyBeforeMinutes(tempNotifyMinutes);
                  setShowNotifyPicker(false);
                }}
              >
                <Text style={styles.pickerConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
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
    fontFamily: 'DMSans-Bold',
    color: '#121018',
    flex: 1,
    textAlign: 'center',
    marginRight: 48,
  },
  headerSpacer: {
    width: 0,
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
    fontFamily: 'DMSans-Bold',
    color: '#2F00FF',
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  cardLabelSmall: {
    fontSize: 10,
    fontFamily: 'DMSans-Bold',
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
    fontFamily: 'DMSans-Bold',
    color: '#121018',
    padding: 0,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 16,
  },
  dateTimeCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
  },
  dateTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dateTimeLabel: {
    fontSize: 10,
    fontFamily: 'DMSans-Bold',
    color: 'rgba(18, 16, 24, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  dateTimeValue: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    color: '#121018',
  },
  notifyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
  },
  notifyIconWrapper: {
    transform: [{ scale: 0.7 }],
    marginLeft: -4,
    marginRight: -4,
  },
  notifyValue: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    color: '#121018',
  },
  recurringCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
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
    fontFamily: 'DMSans-Bold',
    color: 'rgba(18, 16, 24, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  recurringCardValue: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
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
    fontFamily: 'DMSans-Bold',
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
    fontFamily: 'DMSans-Bold',
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
    fontFamily: 'DMSans-Bold',
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
    fontFamily: 'DMSans-Regular',
    color: '#121018',
  },
  repeatPickerSavedTextSelected: {
    fontFamily: 'DMSans-Bold',
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
    fontFamily: 'DMSans-Bold',
    color: '#2F00FF',
  },
  repeatPickerCustomTitleSelected: {
    color: '#ffffff',
  },
  repeatPickerCustomSubtitle: {
    fontSize: 13,
    fontFamily: 'DMSans-Regular',
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
    fontFamily: 'DMSans-Regular',
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
    fontFamily: 'DMSans-Bold',
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
    fontFamily: 'DMSans-Bold',
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
    fontFamily: 'DMSans-Bold',
    color: '#121018',
  },
  pickerCancel: {
    fontSize: 16,
    fontFamily: 'DMSans-Regular',
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
    fontFamily: 'DMSans-Regular',
    color: '#121018',
    textAlign: 'center',
  },
  pickerOptionTextSelected: {
    fontFamily: 'DMSans-Bold',
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
    fontFamily: 'DMSans-Bold',
    color: '#ffffff',
  },
});
