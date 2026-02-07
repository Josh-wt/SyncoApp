import { useRef, useState, useEffect } from 'react';
import { Animated, StyleSheet, Text, View, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { accordionAnimation } from '../lib/animations';
import type { Reminder, ReminderStatus } from '../lib/types';

interface ReminderCardEnhancedProps {
  reminder: Reminder;
  onPress?: (reminder: Reminder) => void;
  onComplete?: (reminder: Reminder) => void;
  onSnooze?: (reminder: Reminder) => void;
  onDelete?: (reminder: Reminder) => void;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function getCountdownText(scheduledTime: string): string | null {
  const now = new Date();
  const scheduled = new Date(scheduledTime);
  const diffMs = scheduled.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 0) return null; // Past
  if (diffMinutes === 0) return 'Now';
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours < 24) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return null; // More than 24 hours away
}

function getStatusColor(status: ReminderStatus, isPriority: boolean): string {
  if (isPriority) return '#EF4444'; // Red for priority

  switch (status) {
    case 'completed':
      return '#10B981'; // Green
    case 'current':
      return '#2F00FF'; // Purple
    case 'upcoming':
      return '#F59E0B'; // Orange
    case 'future':
      return '#6B7280'; // Gray
    default:
      return '#9CA3AF'; // Light gray
  }
}

function getStatusIcon(status: ReminderStatus): keyof typeof MaterialIcons.glyphMap {
  switch (status) {
    case 'completed':
      return 'check-circle';
    case 'current':
      return 'schedule';
    case 'upcoming':
      return 'notification-important';
    case 'future':
      return 'event';
    default:
      return 'circle';
  }
}

export default function ReminderCardEnhanced({
  reminder,
  onPress,
  onComplete,
  onSnooze,
  onDelete,
}: ReminderCardEnhancedProps) {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const actionsHeightAnim = useRef(new Animated.Value(0)).current;
  const actionsOpacityAnim = useRef(new Animated.Value(0)).current;
  const [countdown, setCountdown] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);

  const statusColor = getStatusColor(reminder.status, reminder.is_priority);
  const statusIcon = getStatusIcon(reminder.status);

  // Update countdown every minute for reminders within 60 minutes
  useEffect(() => {
    const updateCountdown = () => {
      const text = getCountdownText(reminder.scheduled_time);
      setCountdown(text);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [reminder.scheduled_time]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
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

  const handlePress = () => {
    if (onPress) {
      onPress(reminder);
    } else {
      const newShowActions = !showActions;
      setShowActions(newShowActions);

      // Accordion animation for actions
      accordionAnimation(actionsHeightAnim, newShowActions, 68, 0);

      // Fade in/out opacity
      Animated.timing(actionsOpacityAnim, {
        toValue: newShowActions ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }).start();

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const accessibilityLabel = `${reminder.title}. ${reminder.is_priority ? 'Priority reminder.' : ''} Scheduled for ${formatTime(reminder.scheduled_time)}. ${countdown ? `${countdown} remaining.` : ''} ${reminder.status === 'completed' ? 'Completed.' : ''}`;

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={() => setShowActions(!showActions)}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={showActions ? 'Action buttons are shown. Tap again to hide them.' : 'Tap to expand and show action buttons'}
      accessibilityState={{ selected: showActions, disabled: reminder.status === 'completed' }}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            transform: [{ scale: scaleAnim }],
          },
          reminder.is_priority && styles.priorityCard,
        ]}
      >
        {/* Left status border */}
        <View style={[styles.statusBorder, { backgroundColor: statusColor }]} />

        {/* Main content */}
        <View style={styles.content}>
          {/* Top row: Time and status */}
          <View style={styles.topRow}>
            {/* Time box with gradient */}
            <LinearGradient
              colors={['#00D9FF', '#0099CC', '#006B99']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.timeBox}
            >
              <Text style={styles.timeText}>{formatTime(reminder.scheduled_time)}</Text>
            </LinearGradient>

            {/* Status and badges */}
            <View style={styles.badgesRow}>
              {countdown && (
                <View style={[styles.badge, { backgroundColor: theme.colors.primaryLight }]}>
                  <MaterialIcons name="timer" size={12} color={theme.colors.primary} />
                  <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
                    {countdown}
                  </Text>
                </View>
              )}

              {reminder.recurring_rule_id && (
                <View style={[styles.badge, { backgroundColor: theme.colors.primaryLight }]}>
                  <MaterialIcons name="repeat" size={12} color={theme.colors.primary} />
                  <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
                    Recurring
                  </Text>
                </View>
              )}

              {reminder.is_priority && (
                <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
                  <MaterialIcons name="priority-high" size={12} color="#EF4444" />
                  <Text style={[styles.badgeText, { color: '#EF4444' }]}>
                    Priority
                  </Text>
                </View>
              )}

              <MaterialIcons name={statusIcon} size={20} color={statusColor} />
            </View>
          </View>

          {/* Title */}
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.text,
                fontSize: theme.fontSize.large,
              },
              reminder.status === 'completed' && styles.titleCompleted,
            ]}
            numberOfLines={2}
          >
            {reminder.title}
          </Text>

          {/* Description if exists */}
          {reminder.description && (
            <Text
              style={[
                styles.description,
                {
                  color: theme.colors.textSecondary,
                  fontSize: theme.fontSize.small,
                },
              ]}
              numberOfLines={2}
            >
              {reminder.description}
            </Text>
          )}

          {/* Metadata row */}
          <View style={styles.metadataRow}>
            {reminder.notify_before_minutes > 0 && (
              <View style={styles.metadataItem}>
                <MaterialIcons
                  name="notifications-active"
                  size={14}
                  color={theme.colors.textTertiary}
                />
                <Text style={[styles.metadataText, { color: theme.colors.textTertiary }]}>
                  {reminder.notify_before_minutes}m before
                </Text>
              </View>
            )}
          </View>

          {/* Action buttons (shown when card is expanded) */}
          {reminder.status !== 'completed' && (
            <Animated.View
              style={[
                styles.actionsRow,
                {
                  height: actionsHeightAnim,
                  opacity: actionsOpacityAnim,
                  overflow: 'hidden',
                },
              ]}
            >
              {onComplete && (
                <Pressable
                  style={[styles.actionButton, { backgroundColor: theme.colors.success }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onComplete(reminder);
                    setShowActions(false);
                    accordionAnimation(actionsHeightAnim, false, 68, 0);
                    Animated.timing(actionsOpacityAnim, {
                      toValue: 0,
                      duration: 200,
                      useNativeDriver: false,
                    }).start();
                  }}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Mark as complete"
                  accessibilityHint={`Mark ${reminder.title} as completed`}
                >
                  <MaterialIcons name="check" size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Complete</Text>
                </Pressable>
              )}

              {onSnooze && (
                <Pressable
                  style={[styles.actionButton, { backgroundColor: theme.colors.warning }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onSnooze(reminder);
                    setShowActions(false);
                    accordionAnimation(actionsHeightAnim, false, 68, 0);
                    Animated.timing(actionsOpacityAnim, {
                      toValue: 0,
                      duration: 200,
                      useNativeDriver: false,
                    }).start();
                  }}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Snooze reminder"
                  accessibilityHint={`Snooze ${reminder.title} for later`}
                >
                  <MaterialIcons name="snooze" size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Snooze</Text>
                </Pressable>
              )}

              {onDelete && (
                <Pressable
                  style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onDelete(reminder);
                    setShowActions(false);
                    accordionAnimation(actionsHeightAnim, false, 68, 0);
                    Animated.timing(actionsOpacityAnim, {
                      toValue: 0,
                      duration: 200,
                      useNativeDriver: false,
                    }).start();
                  }}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Delete reminder"
                  accessibilityHint={`Delete ${reminder.title} permanently`}
                >
                  <MaterialIcons name="delete" size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Delete</Text>
                </Pressable>
              )}
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    minHeight: 60,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  priorityCard: {
    shadowColor: '#EF4444',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  statusBorder: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeBox: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: 0.5,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: 0.3,
  },
  title: {
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: 4,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  description: {
    fontFamily: 'BricolageGrotesque-Regular',
    marginBottom: 8,
    lineHeight: 18,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataText: {
    fontSize: 11,
    fontFamily: 'BricolageGrotesque-Regular',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: 0.3,
  },
});
