import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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

const QUICK_ACTIONS: {
  type: ReminderActionType;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  description: string;
  accent: string;
  surface: string;
  gradient: string[];
}[] = [
  {
    type: 'call',
    icon: 'phone',
    label: 'Call',
    description: 'Attach a phone number',
    accent: '#14b8a6',
    surface: '#ecfeff',
    gradient: ['#ecfeff', '#d1fae5'],
  },
  {
    type: 'link',
    icon: 'link',
    label: 'Link',
    description: 'Attach a URL',
    accent: '#2563eb',
    surface: '#eff6ff',
    gradient: ['#eff6ff', '#dbeafe'],
  },
  {
    type: 'location',
    icon: 'location-on',
    label: 'Location',
    description: 'Attach an address',
    accent: '#f97316',
    surface: '#fff7ed',
    gradient: ['#fff7ed', '#ffedd5'],
  },
  {
    type: 'email',
    icon: 'email',
    label: 'Email',
    description: 'Attach an email',
    accent: '#0ea5e9',
    surface: '#e0f2fe',
    gradient: ['#e0f2fe', '#bae6fd'],
  },
  {
    type: 'note',
    icon: 'description',
    label: 'Note',
    description: 'Attach a short note',
    accent: '#64748b',
    surface: '#f1f5f9',
    gradient: ['#f1f5f9', '#e2e8f0'],
  },
  {
    type: 'subtasks',
    icon: 'checklist',
    label: 'Subtasks',
    description: 'Attach a checklist',
    accent: '#84cc16',
    surface: '#f7fee7',
    gradient: ['#f7fee7', '#ecfccb'],
  },
];

const PRIMARY_BLUE = '#2F00FF';

function getActionPreview(type: ReminderActionType, value: any): string {
  switch (type) {
    case 'call':
      return value?.phone || 'Phone number';
    case 'link':
      return value?.url?.replace(/^https?:\/\//, '').slice(0, 30) || 'URL';
    case 'email':
      return value?.email || 'Email address';
    case 'location':
      return value?.address?.slice(0, 30) || 'Address';
    case 'note':
      return value?.text?.slice(0, 30) || 'Note';
    case 'subtasks':
      return value?.text ? `${value.text.split('\n').filter((l: string) => l.trim()).length} items` : 'Subtasks';
    default:
      return type;
  }
}

export default function TaskConfigSection({ onActionsChange }: TaskConfigSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [actionValues, setActionValues] = useState<Map<string, any>>(new Map());
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedActionType, setSelectedActionType] = useState<ReminderActionType | null>(null);

  const expandAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggleExpanded = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newExpanded = !expanded;
    setExpanded(newExpanded);

    Animated.parallel([
      Animated.spring(expandAnim, {
        toValue: newExpanded ? 1 : 0,
        useNativeDriver: false,
        tension: 100,
        friction: 12,
      }),
      Animated.spring(rotateAnim, {
        toValue: newExpanded ? 1 : 0,
        useNativeDriver: true,
        tension: 100,
        friction: 12,
      }),
    ]).start();
  };

  const toggleAction = (type: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (selectedActions.has(type)) {
      const newSelected = new Set(selectedActions);
      newSelected.delete(type);
      setSelectedActions(newSelected);

      const newValues = new Map(actionValues);
      newValues.delete(type);
      setActionValues(newValues);

      if (onActionsChange) {
        const actions = Array.from(newValues.entries()).map(([actionType, val]) => ({
          type: actionType as ReminderActionType,
          value: val,
        }));
        onActionsChange(actions);
      }
    } else {
      setSelectedActionType(type as ReminderActionType);
      setShowActionModal(true);
    }
  };

  const handleActionSave = (value: any) => {
    if (!selectedActionType) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const newValues = new Map(actionValues);
    newValues.set(selectedActionType, value);
    setActionValues(newValues);

    const newSelected = new Set(selectedActions);
    newSelected.add(selectedActionType);
    setSelectedActions(newSelected);

    if (onActionsChange) {
      const actions = Array.from(newValues.entries()).map(([type, val]) => ({
        type: type as ReminderActionType,
        value: val,
      }));
      onActionsChange(actions);
    }
  };

  const selectedCount = selectedActions.size;
  const headerDetailText = selectedCount === 0
    ? 'Add instant actions to this reminder'
    : `${selectedCount} action${selectedCount > 1 ? 's' : ''} ready`;
  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const contentHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 640],
  });

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Pressable
          style={({ pressed }) => [
            styles.headerPressable,
            expanded && styles.headerPressableExpanded,
            pressed && styles.headerPressed,
          ]}
          onPress={toggleExpanded}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Quick Actions. ${selectedCount} added`}
          accessibilityState={{ expanded }}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerBadge}>
              <MaterialIcons name="bolt" size={18} color={PRIMARY_BLUE} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Quick Actions</Text>
              <Text style={styles.headerSubtitle} numberOfLines={2}>
                {headerDetailText}
              </Text>
            </View>
            <View style={styles.headerMeta}>
              {selectedCount > 0 && (
                <View style={styles.countPill}>
                  <Text style={styles.countPillText}>{selectedCount}</Text>
                </View>
              )}
              <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
                <MaterialIcons name="expand-more" size={24} color="#b6aaf0" />
              </Animated.View>
            </View>
          </View>
        </Pressable>

        <Animated.View
          style={[
            styles.contentWrapper,
            {
              height: contentHeight,
              opacity: expandAnim,
            },
          ]}
        >
          <View style={styles.contentSurface}>
            <View style={styles.sectionIntro}>
              <Text style={styles.sectionTitle}>Build your action stack</Text>
              <Text style={styles.sectionSubtitle}>
                Add quick taps for calls, links, locations, notes, and subtasks.
              </Text>
            </View>

            <View style={styles.actionsGrid}>
              {QUICK_ACTIONS.map((action) => {
                const isSelected = selectedActions.has(action.type);
                const value = actionValues.get(action.type);

                return (
                  <Pressable
                    key={action.type}
                    style={({ pressed }) => [
                      styles.actionCard,
                      pressed && styles.actionCardPressed,
                    ]}
                    onPress={() => toggleAction(action.type)}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`${action.label}${isSelected ? '. Added' : ''}`}
                  >
                    <View style={[styles.actionCardSurface, isSelected && styles.actionCardSurfaceSelected]}>
                      {isSelected && (
                        <LinearGradient
                          colors={action.gradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.actionGradient}
                        />
                      )}
                      <View style={styles.actionCardContent}>
                        <View
                          style={[
                            styles.actionIconWrapper,
                            { backgroundColor: isSelected ? action.accent : action.surface },
                          ]}
                        >
                          <MaterialIcons
                            name={action.icon}
                            size={22}
                            color={isSelected ? '#ffffff' : action.accent}
                          />
                        </View>

                        <View style={styles.actionInfo}>
                          <Text style={styles.actionLabel}>{action.label}</Text>
                          <Text style={styles.actionDescription} numberOfLines={1}>
                            {isSelected && value ? getActionPreview(action.type, value) : action.description}
                          </Text>
                        </View>

                        <View style={[styles.actionIndicator, isSelected && styles.actionIndicatorSelected]}>
                          <MaterialIcons
                            name={isSelected ? 'check' : 'add'}
                            size={16}
                            color={isSelected ? '#ffffff' : '#475569'}
                          />
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {selectedCount > 0 && (
              <View style={styles.selectedSummary}>
                <View style={styles.summaryBadge}>
                  <MaterialIcons name="check-circle" size={18} color="#0f766e" />
                </View>
                <Text style={styles.summaryText}>
                  {selectedCount} action{selectedCount > 1 ? 's' : ''} will show up in your reminder
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      </View>

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
    marginBottom: 0,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 560,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(214, 198, 245, 0.45)',
  },
  headerPressed: {
    opacity: 0.97,
    transform: [{ scale: 0.99 }],
    backgroundColor: '#fbfaff',
  },
  headerPressable: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  headerPressableExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(214, 198, 245, 0.35)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  headerBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(214, 198, 245, 0.2)',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 10,
    fontFamily: 'BricolageGrotesque-Bold',
    color: 'rgba(18, 16, 24, 0.45)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerSubtitle: {
    marginTop: 3,
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#121018',
    letterSpacing: -0.2,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countPill: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(47, 0, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  countPillText: {
    fontSize: 11,
    fontFamily: 'BricolageGrotesque-SemiBold',
    color: '#2F00FF',
    letterSpacing: 0,
  },
  contentWrapper: {
    overflow: 'hidden',
  },
  contentSurface: {
    paddingTop: 16,
    paddingBottom: 18,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
  },
  sectionIntro: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-SemiBold',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#64748b',
    letterSpacing: -0.2,
  },
  actionsGrid: {
    gap: 12,
  },
  actionCard: {
    borderRadius: 18,
  },
  actionCardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  actionCardSurface: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.28)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  actionCardSurfaceSelected: {
    borderColor: 'rgba(99, 102, 241, 0.25)',
  },
  actionGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  actionIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionInfo: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-SemiBold',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  actionDescription: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#64748b',
    letterSpacing: -0.1,
  },
  actionIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f1f5f9',
  },
  actionIndicatorSelected: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  selectedSummary: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#ccfbf1',
  },
  summaryBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ccfbf1',
  },
  summaryText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#0f766e',
    letterSpacing: -0.2,
  },
});
