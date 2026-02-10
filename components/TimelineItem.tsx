import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Reminder, ReminderStatus } from '../lib/types';

export type { Reminder, ReminderStatus };

interface TimelineItemProps {
  reminder: Reminder;
  onPress?: (reminder: Reminder) => void;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getDotStyle(status: ReminderStatus) {
  switch (status) {
    case 'completed':
      return styles.timelineDotPrimary;
    case 'current':
      return styles.timelineDotSmall;
    case 'upcoming':
      return styles.timelineDotMuted;
    case 'future':
      return styles.timelineDotLight;
    case 'placeholder':
      return styles.timelineDotDone;
    default:
      return styles.timelineDotMuted;
  }
}

function getTimeStyle(status: ReminderStatus) {
  switch (status) {
    case 'completed':
    case 'current':
      return styles.timelineTime;
    case 'upcoming':
      return styles.timelineTime;
    case 'future':
      return styles.timelineTimeMuted;
    case 'placeholder':
      return styles.timelineTimeDone;
    default:
      return styles.timelineTime;
  }
}

export default function TimelineItem({ reminder, onPress }: TimelineItemProps) {
  const { status, title, scheduled_time } = reminder;

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(translateXAnim, {
        toValue: 4,
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
      Animated.spring(translateXAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
    ]).start();
  };

  const renderBubble = () => {
    switch (status) {
      case 'current':
        return (
          <View style={[styles.timelineBubble, styles.bubbleCurrent]}>
            <Text style={styles.currentLabel}>Current</Text>
            <Text style={styles.currentTitle}>{title}</Text>
          </View>
        );
      case 'completed':
        return (
          <View style={[styles.timelineBubble, styles.bubblePrimary]}>
            <Text style={styles.timelineBubbleTitle}>{title}</Text>
          </View>
        );
      case 'upcoming':
        return (
          <View style={[styles.timelineBubble, styles.bubbleLunch]}>
            <Text style={styles.lunchTitle}>{title}</Text>
          </View>
        );
      case 'future':
        return (
          <View style={[styles.timelineBubble, styles.bubbleReview]}>
            <Text style={styles.reviewTitle}>{title}</Text>
          </View>
        );
      case 'placeholder':
        return (
          <View style={styles.bubbleWrapUp}>
            <Text style={styles.wrapTitle}>{title}</Text>
          </View>
        );
      default:
        return (
          <View style={styles.timelineBubble}>
            <Text style={styles.timelineBubbleTitle}>{title}</Text>
          </View>
        );
    }
  };

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(reminder);
      }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
    >
      <Animated.View
        style={[
          styles.timelineItem,
          status === 'placeholder' && styles.timelineItemDone,
          {
            transform: [{ scale: scaleAnim }, { translateX: translateXAnim }],
          },
        ]}
      >
        <View style={getDotStyle(status)} />
        <View style={styles.timelineRow}>
          <Text style={getTimeStyle(status)}>{formatTime(scheduled_time)}</Text>
          {renderBubble()}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  timelineItem: {
    marginBottom: 28,
  },
  timelineItemDone: {
    opacity: 0.6,
  },
  timelineDotPrimary: {
    position: 'absolute',
    left: -14,
    top: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2F00FF',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  timelineDotSmall: {
    position: 'absolute',
    left: -12,
    top: 9,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2F00FF',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  timelineDotMuted: {
    position: 'absolute',
    left: -12,
    top: 9,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(47,0,255,0.3)',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  timelineDotLight: {
    position: 'absolute',
    left: -12,
    top: 9,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: 'rgba(47,0,255,0.2)',
  },
  timelineDotDone: {
    position: 'absolute',
    left: -10,
    top: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: 'rgba(136,136,136,0.2)',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 22,
  },
  timelineTime: {
    width: 64,
    fontSize: 18,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#2F00FF',
  },
  timelineTimeMuted: {
    width: 64,
    fontSize: 18,
    fontFamily: 'BricolageGrotesque-Bold',
    color: 'rgba(47,0,255,0.6)',
  },
  timelineTimeDone: {
    width: 64,
    fontSize: 18,
    fontFamily: 'BricolageGrotesque-Bold',
    color: 'rgba(136,136,136,0.6)',
  },
  timelineBubble: {
    flex: 1,
    borderRadius: 32,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fbf8ffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubblePrimary: {
    borderRadius: 32,
  },
  bubbleCurrent: {
    backgroundColor: '#2F00FF',
  },
  bubbleLunch: {
    backgroundColor: 'rgba(246,241,255,0.8)',
    borderRadius: 32,
    alignSelf: 'center',
    maxWidth: '75%',
  },
  bubbleReview: {
    backgroundColor: 'rgba(246,241,255,0.6)',
    borderRadius: 32,
  },
  timelineBubbleTitle: {
    fontSize: 20,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#161117',
  },
  currentLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'BricolageGrotesque-Bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  currentTitle: {
    fontSize: 20,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#ffffff',
  },
  lunchTitle: {
    fontSize: 18,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#161117',
  },
  reviewTitle: {
    fontSize: 18,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#888888',
  },
  bubbleWrapUp: {
    borderWidth: 2,
    borderColor: 'rgba(136,136,136,0.2)',
    borderStyle: 'dashed',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginLeft: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  wrapTitle: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#888888',
  },
});
