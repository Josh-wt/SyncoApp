import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import BottomNavBar, { TabName } from '../components/BottomNavBar';
import { CreationMode } from '../components/CreateReminderModal';
import { GlowTopRight, GlowBottomLeft } from '../components/icons';
import { getNotifiedReminders } from '../lib/reminders';
import { Reminder } from '../lib/types';
import { supabase } from '../lib/supabase';

interface NotificationsScreenProps {
  onBack: () => void;
  onCreateReminder: (mode: CreationMode) => void;
  onTabPress: (tab: TabName) => void;
}

function formatScheduledTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatNotificationTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function isSnoozed(reminder: Reminder): boolean {
  // A reminder is considered snoozed if it was updated after being notified
  // and the update is more than 1 minute after creation
  if (!reminder.notified_at) return false;

  const notifiedAt = new Date(reminder.notified_at).getTime();
  const updatedAt = new Date(reminder.updated_at).getTime();

  // If updated more than 30 seconds after notification, it was likely snoozed
  return updatedAt > notifiedAt + 30000;
}

function getStatusDescription(reminder: Reminder): string {
  if (!reminder.notified_at) return 'Pending';
  return `Notified ${formatNotificationTime(reminder.notified_at)}`;
}

// Notification Card Component
function NotificationCard({ reminder }: { reminder: Reminder }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const wasSnoozed = isSnoozed(reminder);

  const handlePressIn = () => {
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

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={[
          styles.notificationCard,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.cardContent}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle}>{reminder.title}</Text>
            {wasSnoozed && (
              <View style={styles.snoozeBadge}>
                <Text style={styles.snoozeBadgeText}>Snoozed</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardDescription}>{getStatusDescription(reminder)}</Text>
        </View>
        <Text style={styles.timeLabel}>{formatScheduledTime(reminder.scheduled_time)}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function NotificationsScreen({
  onBack,
  onCreateReminder,
  onTabPress,
}: NotificationsScreenProps) {
  const insets = useSafeAreaInsets();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getNotifiedReminders();
      setReminders(data);
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Set up real-time subscription
    const subscription = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reminders',
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchNotifications]);

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
      <View style={styles.canvas}>
        {/* Background Glows */}
        <View style={styles.glowTopRight}>
          <GlowTopRight />
        </View>
        <View style={styles.glowBottomLeft}>
          <GlowBottomLeft />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 160 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Notifications</Text>
              <Text style={styles.headerSubtitle}>Recent activity</Text>
            </View>
            <Pressable style={styles.moreButton}>
              <MaterialIcons name="more-horiz" size={20} color="#2F00FF" />
            </Pressable>
          </View>

          {/* Notifications List */}
          {isLoading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color="#2F00FF" />
            </View>
          ) : reminders.length > 0 ? (
            <View style={styles.listContainer}>
              {reminders.map((reminder) => (
                <NotificationCard key={reminder.id} reminder={reminder} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySubtitle}>
                Notifications will appear here once sent
              </Text>
            </View>
          )}

          {/* Caught Up State */}
          {reminders.length > 0 && (
            <View style={styles.caughtUpContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.caughtUpText}>You're all caught up</Text>
            </View>
          )}
        </ScrollView>

        <BottomNavBar
          activeTab="notifications"
          onTabPress={handleTabPress}
          onCreateReminder={onCreateReminder}
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
  content: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 30,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#121118',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#888888',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  listContainer: {
    gap: 12,
  },
  notificationCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  unreadDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2F00FF',
  },
  cardContent: {
    flex: 1,
    gap: 2,
    marginRight: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#121118',
    flex: 1,
  },
  snoozeBadge: {
    backgroundColor: 'rgba(47, 0, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(47, 0, 255, 0.2)',
  },
  snoozeBadgeText: {
    fontSize: 10,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#2F00FF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardDescription: {
    fontSize: 13,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#888888',
  },
  timeLabel: {
    fontSize: 11,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#888888',
  },
  emptyContainer: {
    marginTop: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#161117',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#888888',
    textAlign: 'center',
  },
  caughtUpContainer: {
    paddingTop: 48,
    paddingBottom: 32,
    alignItems: 'center',
  },
  dividerLine: {
    width: 48,
    height: 1,
    backgroundColor: 'rgba(47, 0, 255, 0.2)',
    marginBottom: 24,
  },
  caughtUpText: {
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#888888',
    letterSpacing: 0.5,
  },
});
