import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

export type TimeOfDayPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

interface TimeOfDayHeaderProps {
  period: TimeOfDayPeriod;
  count: number;
}

interface PeriodConfig {
  label: string;
  emoji: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  gradientColors: string[];
}

const periodConfigs: Record<TimeOfDayPeriod, PeriodConfig> = {
  morning: {
    label: 'Morning',
    emoji: '🌅',
    icon: 'wb-sunny',
    gradientColors: ['#FEF3C7', '#FDE047', '#FACC15'],
  },
  afternoon: {
    label: 'Afternoon',
    emoji: '☀️',
    icon: 'wb-sunny',
    gradientColors: ['#FED7AA', '#FB923C', '#F97316'],
  },
  evening: {
    label: 'Evening',
    emoji: '🌆',
    icon: 'wb-twilight',
    gradientColors: ['#DDD6FE', '#C4B5FD', '#A78BFA'],
  },
  night: {
    label: 'Night',
    emoji: '🌙',
    icon: 'nightlight',
    gradientColors: ['#BFDBFE', '#93C5FD', '#60A5FA'],
  },
};

export default function TimeOfDayHeader({ period, count }: TimeOfDayHeaderProps) {
  const { theme } = useTheme();
  const config = periodConfigs[period];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={config.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Left: Icon and label */}
          <View style={styles.leftSection}>
            <View style={styles.iconContainer}>
              <MaterialIcons name={config.icon} size={24} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.periodLabel}>
                {config.emoji} {config.label}
              </Text>
              <Text style={styles.timeRange}>{getTimeRange(period)}</Text>
            </View>
          </View>

          {/* Right: Count badge */}
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{count}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Bottom separator line */}
      <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
    </View>
  );
}

function getTimeRange(period: TimeOfDayPeriod): string {
  switch (period) {
    case 'morning':
      return '5:00 AM - 12:00 PM';
    case 'afternoon':
      return '12:00 PM - 5:00 PM';
    case 'evening':
      return '5:00 PM - 9:00 PM';
    case 'night':
      return '9:00 PM - 5:00 AM';
  }
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  gradient: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  periodLabel: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  timeRange: {
    fontSize: 11,
    fontFamily: 'BricolageGrotesque-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  countText: {
    fontSize: 14,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#1F2937',
    letterSpacing: 0.5,
  },
  separator: {
    height: 1,
    marginTop: 8,
    opacity: 0.1,
  },
});
