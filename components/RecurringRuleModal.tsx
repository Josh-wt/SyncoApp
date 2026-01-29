import { useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AutoAwesomeIcon,
  CloseIcon,
  CheckCircleIcon,
} from './icons';
import {
  DayOfWeek,
  DAYS_OF_WEEK,
  FrequencyUnit,
  RecurringRule,
} from '../lib/types';

// Animated Button Component for RecurringRuleModal
function AnimatedModalButton({
  onPress,
  style,
  children,
  variant = 'primary',
}: {
  onPress: () => void;
  style?: object;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'close';
}) {
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
        toValue: variant === 'close' ? 0 : 2,
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

// Animated Picker Option Component
function AnimatedPickerOption({
  onPress,
  isSelected,
  children,
  style,
}: {
  onPress: () => void;
  isSelected: boolean;
  children: React.ReactNode;
  style?: object;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
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
          style,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

interface RecurringRuleModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (rule: RecurringRule) => void;
  initialRule?: RecurringRule;
  selectedTime?: Date;
}

type ActivePicker = 'frequency' | 'unit' | 'days' | null;

const FREQUENCY_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const FREQUENCY_UNITS: { label: string; singular: string; value: FrequencyUnit }[] = [
  { label: 'days', singular: 'day', value: 'days' },
  { label: 'weeks', singular: 'week', value: 'weeks' },
  { label: 'months', singular: 'month', value: 'months' },
  { label: 'years', singular: 'year', value: 'years' },
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).toLowerCase();
}

export default function RecurringRuleModal({
  visible,
  onClose,
  onSave,
  initialRule,
  selectedTime,
}: RecurringRuleModalProps) {
  const [frequency, setFrequency] = useState<number>(initialRule?.frequency ?? 2);
  const [frequencyUnit, setFrequencyUnit] = useState<FrequencyUnit>(
    initialRule?.frequency_unit ?? 'weeks'
  );
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(
    initialRule?.selected_days ?? ['sun']
  );
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [ruleName, setRuleName] = useState<string>(initialRule?.name ?? '');

  const getUnitLabel = () => {
    const unit = FREQUENCY_UNITS.find(u => u.value === frequencyUnit);
    return frequency === 1 ? unit?.singular : unit?.label;
  };

  const getDaysLabel = () => {
    if (selectedDays.length === 0) return 'no days';
    if (selectedDays.length === 7) return 'every day';

    const dayLabels = selectedDays.map(d => {
      const day = DAYS_OF_WEEK.find(dw => dw.value === d);
      return day?.label.slice(0, 3) ?? d;
    });

    if (dayLabels.length === 1) return dayLabels[0];
    if (dayLabels.length === 2) return `${dayLabels[0]} & ${dayLabels[1]}`;
    return dayLabels.join(', ');
  };

  const toggleDay = (day: DayOfWeek) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const getGeneratedName = () => {
    return `Every ${frequency} ${getUnitLabel()}${frequencyUnit === 'weeks' ? ` on ${getDaysLabel()}` : ''}`;
  };

  const handleSave = () => {
    const rule: RecurringRule = {
      id: initialRule?.id ?? generateId(),
      name: ruleName.trim() || getGeneratedName(),
      frequency,
      frequency_unit: frequencyUnit,
      selected_days: frequencyUnit === 'weeks' ? selectedDays : [],
    };
    onSave(rule);
    onClose();
  };

  const closePicker = () => setActivePicker(null);

  const timeDisplay = selectedTime ? formatTime(selectedTime) : '9:00 am';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Custom Schedule</Text>
            <AnimatedModalButton onPress={onClose} style={styles.closeBtn} variant="close">
              <CloseIcon />
            </AnimatedModalButton>
          </View>

          {/* Main Natural Language Card */}
          <View style={styles.mainCard}>
            <View style={styles.cardGlow} />
            <View style={styles.cardIconWrapper}>
              <AutoAwesomeIcon />
            </View>

            <Text style={styles.ruleText}>
              Remind me at{' '}
              <Text style={styles.tokenStatic}>{timeDisplay}</Text>
              {'\n'}every{' '}
              <Text
                style={styles.tokenActive}
                onPress={() => setActivePicker('frequency')}
              >
                {frequency}
              </Text>
              {' '}
              <Text
                style={styles.tokenActive}
                onPress={() => setActivePicker('unit')}
              >
                {getUnitLabel()}
              </Text>
              {frequencyUnit === 'weeks' && (
                <>
                  {' '}on{' '}
                  <Text
                    style={styles.tokenActive}
                    onPress={() => setActivePicker('days')}
                  >
                    {getDaysLabel()}
                  </Text>
                </>
              )}
            </Text>

            <Text style={styles.hintText}>
              Tap highlighted values to adjust
            </Text>
          </View>

          {/* Optional Name Input */}
          <View style={styles.nameInputContainer}>
            <Text style={styles.nameInputLabel}>Name (optional)</Text>
            <TextInput
              style={styles.nameInput}
              placeholder={getGeneratedName()}
              placeholderTextColor="rgba(18, 16, 24, 0.3)"
              value={ruleName}
              onChangeText={setRuleName}
              maxLength={50}
            />
          </View>

          {/* Save Button */}
          <AnimatedModalButton onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>
              {initialRule ? 'Update' : 'Done'}
            </Text>
          </AnimatedModalButton>
        </View>

        {/* Frequency Picker Modal */}
        <Modal
          visible={activePicker === 'frequency'}
          transparent
          animationType="fade"
          onRequestClose={closePicker}
        >
          <Pressable style={styles.pickerOverlay} onPress={closePicker}>
            <Pressable style={styles.pickerContainer} onPress={e => e.stopPropagation()}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select Frequency</Text>
                <AnimatedModalButton onPress={closePicker} style={styles.pickerCloseBtn} variant="close">
                  <CloseIcon />
                </AnimatedModalButton>
              </View>
              <View style={styles.pickerGrid}>
                {FREQUENCY_OPTIONS.map(num => (
                  <AnimatedPickerOption
                    key={num}
                    onPress={() => {
                      setFrequency(num);
                      closePicker();
                    }}
                    isSelected={frequency === num}
                    style={[
                      styles.pickerOption,
                      frequency === num && styles.pickerOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        frequency === num && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {num}
                    </Text>
                    {frequency === num && (
                      <View style={styles.pickerCheck}>
                        <CheckCircleIcon color="#ffffff" />
                      </View>
                    )}
                  </AnimatedPickerOption>
                ))}
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Unit Picker Modal */}
        <Modal
          visible={activePicker === 'unit'}
          transparent
          animationType="fade"
          onRequestClose={closePicker}
        >
          <Pressable style={styles.pickerOverlay} onPress={closePicker}>
            <Pressable style={styles.pickerContainer} onPress={e => e.stopPropagation()}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select Time Unit</Text>
                <AnimatedModalButton onPress={closePicker} style={styles.pickerCloseBtn} variant="close">
                  <CloseIcon />
                </AnimatedModalButton>
              </View>
              <View style={styles.pickerList}>
                {FREQUENCY_UNITS.map(unit => (
                  <AnimatedPickerOption
                    key={unit.value}
                    onPress={() => {
                      setFrequencyUnit(unit.value);
                      closePicker();
                    }}
                    isSelected={frequencyUnit === unit.value}
                    style={[
                      styles.pickerListItem,
                      frequencyUnit === unit.value && styles.pickerListItemSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pickerListText,
                        frequencyUnit === unit.value && styles.pickerListTextSelected,
                      ]}
                    >
                      {unit.label.charAt(0).toUpperCase() + unit.label.slice(1)}
                    </Text>
                    {frequencyUnit === unit.value && (
                      <CheckCircleIcon color="#2F00FF" />
                    )}
                  </AnimatedPickerOption>
                ))}
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Days Picker Modal */}
        <Modal
          visible={activePicker === 'days'}
          transparent
          animationType="fade"
          onRequestClose={closePicker}
        >
          <Pressable style={styles.pickerOverlay} onPress={closePicker}>
            <Pressable style={[styles.pickerContainer, styles.pickerContainerWide]} onPress={e => e.stopPropagation()}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select Days</Text>
                <AnimatedModalButton onPress={closePicker} style={styles.pickerCloseBtn} variant="close">
                  <CloseIcon />
                </AnimatedModalButton>
              </View>
              <Text style={styles.pickerSubtitle}>
                Choose which days of the week
              </Text>
              <View style={styles.daysGrid}>
                {DAYS_OF_WEEK.map(day => (
                  <AnimatedPickerOption
                    key={day.value}
                    onPress={() => toggleDay(day.value)}
                    isSelected={selectedDays.includes(day.value)}
                    style={[
                      styles.dayChip,
                      selectedDays.includes(day.value) && styles.dayChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayChipText,
                        selectedDays.includes(day.value) && styles.dayChipTextSelected,
                      ]}
                    >
                      {day.label}
                    </Text>
                  </AnimatedPickerOption>
                ))}
              </View>
              <AnimatedModalButton onPress={closePicker} style={styles.daysConfirmBtn}>
                <Text style={styles.daysConfirmText}>Done</Text>
              </AnimatedModalButton>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 16, 24, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: '#f6f1ff',
    borderRadius: 28,
    width: '100%',
    maxWidth: 380,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    color: '#121018',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(18, 16, 24, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Main Card
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#2F00FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(47, 0, 255, 0.06)',
    marginBottom: 16,
  },
  cardGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(47, 0, 255, 0.03)',
  },
  cardIconWrapper: {
    position: 'absolute',
    top: 12,
    right: 12,
    opacity: 0.12,
  },
  ruleText: {
    fontSize: 22,
    fontFamily: 'DMSans-Medium',
    color: '#121018',
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  tokenStatic: {
    color: '#655e8d',
    fontFamily: 'DMSans-SemiBold',
  },
  tokenActive: {
    color: '#2F00FF',
    fontFamily: 'DMSans-Bold',
    backgroundColor: 'rgba(47, 0, 255, 0.1)',
  },
  hintText: {
    fontSize: 12,
    fontFamily: 'DMSans-Regular',
    color: '#655e8d',
    marginTop: 16,
  },

  // Name Input
  nameInputContainer: {
    marginBottom: 16,
  },
  nameInputLabel: {
    fontSize: 11,
    fontFamily: 'DMSans-Medium',
    color: 'rgba(18, 16, 24, 0.5)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nameInput: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'DMSans-Medium',
    color: '#121018',
    borderWidth: 1,
    borderColor: 'rgba(47, 0, 255, 0.08)',
  },

  // Save Button
  saveButton: {
    backgroundColor: '#2F00FF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    // 3D effect with cyan glow
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    // Cyan outline
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    // 3D bottom edge
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0, 200, 200, 0.4)',
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: 'DMSans-Bold',
    color: '#ffffff',
  },

  // Picker Modals
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 16, 24, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 320,
    padding: 20,
    // 3D shadow effect
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 20,
    // Cyan outline
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  pickerContainerWide: {
    maxWidth: 360,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    color: '#121018',
  },
  pickerCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(18, 16, 24, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerSubtitle: {
    fontSize: 12,
    fontFamily: 'DMSans-Regular',
    color: '#655e8d',
    marginBottom: 16,
    marginTop: -6,
  },

  // Frequency Picker Grid
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: 'rgba(18, 16, 24, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pickerOptionSelected: {
    backgroundColor: '#2F00FF',
  },
  pickerOptionText: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    color: '#121018',
  },
  pickerOptionTextSelected: {
    color: '#ffffff',
  },
  pickerCheck: {
    position: 'absolute',
    top: 2,
    right: 2,
  },

  // Unit Picker List
  pickerList: {
    gap: 6,
  },
  pickerListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(18, 16, 24, 0.04)',
  },
  pickerListItemSelected: {
    backgroundColor: 'rgba(47, 0, 255, 0.1)',
    borderWidth: 2,
    borderColor: '#2F00FF',
  },
  pickerListText: {
    fontSize: 15,
    fontFamily: 'DMSans-Medium',
    color: '#121018',
  },
  pickerListTextSelected: {
    fontFamily: 'DMSans-Bold',
    color: '#2F00FF',
  },

  // Days Picker
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(18, 16, 24, 0.04)',
  },
  dayChipSelected: {
    backgroundColor: '#2F00FF',
  },
  dayChipText: {
    fontSize: 13,
    fontFamily: 'DMSans-Medium',
    color: '#121018',
  },
  dayChipTextSelected: {
    color: '#ffffff',
    fontFamily: 'DMSans-Bold',
  },
  daysConfirmBtn: {
    backgroundColor: '#2F00FF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    // 3D effect with cyan glow
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    // Cyan outline
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0, 200, 200, 0.3)',
  },
  daysConfirmText: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
    color: '#ffffff',
  },
});
