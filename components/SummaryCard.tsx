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
  const glowAnim = useRef(new Animated.Value(0)).current;

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
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
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
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const animatedBorderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0, 255, 255, 0.15)', 'rgba(0, 255, 255, 0.5)'],
  });

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
            borderColor: animatedBorderColor,
          },
        ]}
      >
      <View style={styles.cardTop}>
        <Text style={styles.cardLabel}>{isPriority ? 'Priority' : 'Upcoming'}</Text>
        {isPriority ? (
          <View style={styles.priorityDot} />
        ) : (
          <MaterialIcons name="calendar-today" size={18} color="#d1d5db" />
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
    // 3D shadow effect with cyan glow
    shadowColor: '#00FFFF',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    // Cyan outline
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 255, 0.15)',
    // 3D bottom edge
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0, 200, 200, 0.2)',
  },
  priorityCard: {
    borderColor: 'rgba(0, 255, 255, 0.25)',
    shadowColor: '#00FFFF',
    shadowOpacity: 0.18,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLabel: {
    fontSize: 10,
    fontFamily: 'DMSans-Bold',
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
    fontFamily: 'DMSans-Regular',
    color: '#161117',
  },
  cardMeta: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: '#161117',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(47,0,255,0.2)',
    paddingBottom: 2,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  cardMetaSmall: {
    fontSize: 10,
    fontFamily: 'DMSans-Bold',
    color: '#888888',
    letterSpacing: 1.2,
    marginTop: 8,
  },
});
