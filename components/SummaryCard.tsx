import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export type CardType = 'priority' | 'upcoming';

interface SummaryCardProps {
  type: CardType;
  value: number;
  onPress?: () => void;
}

export default function SummaryCard({ type, value, onPress }: SummaryCardProps) {
  const isPriority = type === 'priority';

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
      style={styles.pressable}
    >
      <Animated.View
        style={[
          styles.summaryCard,
          isPriority && styles.priorityCard,
          {
            transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
          },
        ]}
      >
      <View style={styles.cardTop}>
        <Text style={styles.cardLabel}>{isPriority ? 'Priority' : 'Upcoming'}</Text>
        {isPriority ? (
          <View style={styles.priorityDot} />
        ) : (
          <MaterialIcons name="calendar-today" size={18} color="#2F00FF" />
        )}
      </View>
      <View style={styles.cardBottom}>
        <Text style={styles.cardValue}>{value}</Text>
        <Text style={isPriority ? styles.cardMeta : styles.cardMetaSmall}>
          {isPriority ? 'Due Today' : 'THIS WEEK'}
        </Text>
      </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 32,
    padding: 24,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  priorityCard: {},
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLabel: {
    fontSize: 10,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#888888',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2F00FF',
    shadowColor: '#2F00FF',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  cardBottom: {
    marginTop: 10,
  },
  cardValue: {
    fontSize: 40,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#161117',
  },
  cardMeta: {
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#161117',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(47,0,255,0.2)',
    paddingBottom: 2,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  cardMetaSmall: {
    fontSize: 10,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#888888',
    letterSpacing: 1.2,
    marginTop: 8,
  },
});
