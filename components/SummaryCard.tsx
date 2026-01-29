import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export type CardType = 'priority' | 'upcoming';

interface SummaryCardProps {
  type: CardType;
  value: number;
  onPress?: () => void;
}

export default function SummaryCard({ type, value, onPress }: SummaryCardProps) {
  const isPriority = type === 'priority';

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.summaryCard, isPriority && styles.priorityCard]}
      onPress={onPress}
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
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 32,
    padding: 24,
    minHeight: 160,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  priorityCard: {
    borderColor: 'rgba(255,255,255,0.9)',
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
