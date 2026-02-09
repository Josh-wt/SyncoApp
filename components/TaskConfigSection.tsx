import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import ActionInputModal from './ActionInputModal';
import { ReminderActionType } from '../lib/types';

export interface QuickAction {
  type: ReminderActionType;
  value: any;
  label?: string;
}

interface TaskConfigSectionProps {
  onActionsChange?: (actions: QuickAction[]) => void;
  onRepeatChange?: (repeat: any) => void;
}

const quickActionTypes = [
  { type: 'call', icon: 'phone', label: 'Call' },
  { type: 'link', icon: 'link', label: 'Link' },
  { type: 'location', icon: 'location-on', label: 'Location' },
  { type: 'email', icon: 'email', label: 'Email' },
  { type: 'note', icon: 'description', label: 'Note' },
  { type: 'assign', icon: 'people', label: 'Assign' },
  { type: 'photo', icon: 'photo-camera', label: 'Photo' },
  { type: 'voice', icon: 'mic', label: 'Voice' },
  { type: 'subtasks', icon: 'checklist', label: 'Subtasks' },
] as const;

export default function TaskConfigSection({ onActionsChange, onRepeatChange }: TaskConfigSectionProps) {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [actionValues, setActionValues] = useState<Map<string, any>>(new Map());
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedActionType, setSelectedActionType] = useState<ReminderActionType | null>(null);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const toValue = isExpanded ? 0 : 1;

    Animated.parallel([
      Animated.spring(heightAnim, {
        toValue,
        useNativeDriver: false,
        tension: 100,
        friction: 10,
      }),
      Animated.spring(rotateAnim, {
        toValue,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }),
    ]).start();

    setIsExpanded(!isExpanded);
  };

  const toggleAction = (type: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (selectedActions.has(type)) {
      // Remove action
      const newSelected = new Set(selectedActions);
      newSelected.delete(type);
      setSelectedActions(newSelected);

      const newValues = new Map(actionValues);
      newValues.delete(type);
      setActionValues(newValues);

      // Notify parent
      if (onActionsChange) {
        const actions = Array.from(newValues.entries()).map(([actionType, val]) => ({
          type: actionType as ReminderActionType,
          value: val,
        }));
        onActionsChange(actions);
      }
    } else {
      // Open modal to get input
      setSelectedActionType(type as ReminderActionType);
      setShowActionModal(true);
    }
  };

  const handleActionSave = (value: any) => {
    if (!selectedActionType) return;

    const newValues = new Map(actionValues);
    newValues.set(selectedActionType, value);
    setActionValues(newValues);

    const newSelected = new Set(selectedActions);
    newSelected.add(selectedActionType);
    setSelectedActions(newSelected);

    // Notify parent
    if (onActionsChange) {
      const actions = Array.from(newValues.entries()).map(([type, val]) => ({
        type: type as ReminderActionType,
        value: val,
      }));
      onActionsChange(actions);
    }
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const maxHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 500],
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      {/* Header */}
      <Pressable
        style={styles.header}
        onPress={toggleExpand}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Task Configuration"
        accessibilityHint={isExpanded ? 'Collapse options' : 'Expand options'}
        accessibilityState={{ expanded: isExpanded }}
      >
        <Text style={[styles.headerText, { color: theme.colors.textSecondary }]}>
          Task Configuration
        </Text>

        <Animated.View style={{ transform: [{ rotate }] }}>
          <MaterialIcons name="expand-more" size={24} color={theme.colors.textSecondary} />
        </Animated.View>
      </Pressable>

      {/* Expandable Content */}
      <Animated.View style={[styles.content, { maxHeight, opacity: heightAnim }]}>
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textTertiary }]}>
            QUICK ACTIONS
          </Text>

          <View style={styles.actionsGrid}>
            {quickActionTypes.map(({ type, icon, label }) => {
              const isSelected = selectedActions.has(type);

              return (
                <Pressable
                  key={type}
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: isSelected ? '#2F00FF' : theme.colors.background,
                      borderColor: isSelected ? '#2F00FF' : theme.colors.border,
                    },
                  ]}
                  onPress={() => toggleAction(type)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityHint={`Add ${label} action to reminder`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <MaterialIcons
                    name={icon as any}
                    size={20}
                    color={isSelected ? '#ffffff' : theme.colors.text}
                  />
                  <Text
                    style={[
                      styles.actionLabel,
                      { color: isSelected ? '#ffffff' : theme.colors.text },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        {/* Repeat Options */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textTertiary }]}>
            REPEAT
          </Text>

          <View style={styles.repeatRow}>
            {['Daily', 'Weekly', 'Custom'].map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.repeatButton,
                  { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                ]}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Repeat ${option}`}
              >
                <Text style={[styles.repeatText, { color: theme.colors.text }]}>
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        {/* Attachments */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textTertiary }]}>
            ATTACHMENTS
          </Text>

          <Pressable
            style={[styles.attachmentButton, { borderColor: theme.colors.border }]}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Add attachment"
            accessibilityHint="Add file, photo, or link"
          >
            <MaterialIcons name="add" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.attachmentText, { color: theme.colors.textSecondary }]}>
              Add file, photo, or link
            </Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* Action Input Modal */}
      <ActionInputModal
        visible={showActionModal}
        actionType={selectedActionType}
        onClose={() => setShowActionModal(false)}
        onSave={handleActionSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginVertical: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerText: {
    fontSize: 14,
    fontFamily: 'BricolageGrotesque-Medium',
  },
  content: {
    overflow: 'hidden',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    minWidth: 100,
  },
  actionLabel: {
    fontSize: 14,
    fontFamily: 'BricolageGrotesque-Medium',
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  repeatRow: {
    flexDirection: 'row',
    gap: 12,
  },
  repeatButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  repeatText: {
    fontSize: 14,
    fontFamily: 'BricolageGrotesque-Medium',
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 8,
  },
  attachmentText: {
    fontSize: 14,
    fontFamily: 'BricolageGrotesque-Regular',
  },
});
