import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TimelineItem from './TimelineItem';
import { Reminder } from '../lib/types';

interface TimelineProps {
  reminders: Reminder[];
  onReminderPress?: (reminder: Reminder) => void;
  onViewAllPress?: () => void;
}

export default function Timeline({ reminders, onReminderPress, onViewAllPress }: TimelineProps) {
  // Calculate the height of the active rail based on current/completed items
  const currentIndex = reminders.findIndex((r) => r.status === 'current');
  const activeRailHeight = currentIndex >= 0 ? (currentIndex + 1) * 56 + 60 : 0;

  return (
    <>
      <View style={styles.timelineHeader}>
        <Text style={styles.timelineTitle}>Upcoming</Text>
        <TouchableOpacity onPress={onViewAllPress}>
          <Text style={styles.timelineAction}>View all</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.timelineWrap}>
        <View style={styles.timelineRailMuted} />
        <View style={[styles.timelineRailActive, { height: activeRailHeight }]} />

        {reminders.map((reminder) => (
          <TimelineItem key={reminder.id} reminder={reminder} onPress={onReminderPress} />
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  timelineHeader: {
    marginTop: 32,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  timelineTitle: {
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#888888',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  timelineAction: {
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#2F00FF',
  },
  timelineWrap: {
    position: 'relative',
    paddingLeft: 24,
    paddingBottom: 24,
    minHeight: 300,
  },
  timelineRailMuted: {
    position: 'absolute',
    left: 6,
    top: 16,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(47,0,255,0.2)',
    borderRadius: 999,
  },
  timelineRailActive: {
    position: 'absolute',
    left: 6,
    top: 16,
    width: 2,
    backgroundColor: '#2F00FF',
    borderRadius: 999,
    shadowColor: '#2F00FF',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
});
