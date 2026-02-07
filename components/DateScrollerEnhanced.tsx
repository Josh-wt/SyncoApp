import { useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';

interface DateInfo {
  date: Date;
  dayName: string;
  dayNumber: number;
  monthName: string;
  isToday: boolean;
  isSelected: boolean;
}

interface DateScrollerEnhancedProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  daysToShow?: number;
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function generateDates(centerDate: Date, count: number): DateInfo[] {
  const dates: DateInfo[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOffset = Math.floor(count / 2);

  for (let i = 0; i < count; i++) {
    const date = new Date(centerDate);
    date.setDate(date.getDate() - startOffset + i);
    date.setHours(0, 0, 0, 0);

    const isToday = date.getTime() === today.getTime();
    const isSelected = date.getTime() === centerDate.getTime();

    dates.push({
      date,
      dayName: WEEKDAY_NAMES[date.getDay()],
      dayNumber: date.getDate(),
      monthName: MONTH_NAMES[date.getMonth()],
      isToday,
      isSelected,
    });
  }

  return dates;
}

export default function DateScrollerEnhanced({
  selectedDate,
  onDateSelect,
  daysToShow = 14,
}: DateScrollerEnhancedProps) {
  const { theme } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [dates] = useState(() => generateDates(selectedDate, daysToShow));
  const selectedIndex = dates.findIndex((d) => d.isSelected);

  const handleDatePress = (date: Date) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDateSelect(date);
  };

  const handlePrevWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    onDateSelect(newDate);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    onDateSelect(newDate);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleToday = () => {
    onDateSelect(new Date());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const currentMonth = dates[selectedIndex]?.monthName || '';
  const currentYear = dates[selectedIndex]?.date.getFullYear() || new Date().getFullYear();

  return (
    <View style={styles.container}>
      {/* Month and navigation header */}
      <View style={styles.header}>
        <View style={styles.monthInfo}>
          <Text style={[styles.monthText, { color: theme.colors.text, fontSize: theme.fontSize.large }]}>
            {currentMonth} {currentYear}
          </Text>
        </View>

        <View style={styles.navigationButtons}>
          <Pressable
            onPress={handlePrevWeek}
            style={({ pressed }) => [
              styles.navButton,
              {
                backgroundColor: pressed ? theme.colors.backgroundSecondary : theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <MaterialIcons name="chevron-left" size={20} color={theme.colors.text} />
          </Pressable>

          <Pressable
            onPress={handleToday}
            style={({ pressed }) => [
              styles.todayButton,
              {
                backgroundColor: pressed ? theme.colors.primaryDark : theme.colors.primary,
              },
            ]}
          >
            <Text style={styles.todayButtonText}>Today</Text>
          </Pressable>

          <Pressable
            onPress={handleNextWeek}
            style={({ pressed }) => [
              styles.navButton,
              {
                backgroundColor: pressed ? theme.colors.backgroundSecondary : theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <MaterialIcons name="chevron-right" size={20} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Date scroller */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={72} // 56 (width) + 16 (gap)
        decelerationRate="fast"
        contentOffset={{ x: selectedIndex * 72, y: 0 }}
      >
        {dates.map((dateInfo, index) => (
          <DateCircle
            key={index}
            dateInfo={dateInfo}
            onPress={() => handleDatePress(dateInfo.date)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function DateCircle({ dateInfo, onPress }: { dateInfo: DateInfo; onPress: () => void }) {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      tension: 400,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 400,
      friction: 10,
    }).start();
  };

  const isActive = dateInfo.isSelected || dateInfo.isToday;

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={[
          styles.dateCircleContainer,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Text
          style={[
            styles.dayName,
            {
              color: isActive ? theme.colors.primary : theme.colors.textSecondary,
              fontSize: theme.fontSize.tiny,
            },
          ]}
        >
          {dateInfo.dayName}
        </Text>

        <View
          style={[
            styles.circle,
            {
              backgroundColor: dateInfo.isSelected
                ? theme.colors.primary
                : dateInfo.isToday
                ? theme.colors.primaryLight
                : theme.colors.card,
              borderColor: dateInfo.isToday ? theme.colors.primary : theme.colors.border,
            },
            dateInfo.isSelected && styles.selectedCircle,
          ]}
        >
          <Text
            style={[
              styles.dayNumber,
              {
                color: dateInfo.isSelected
                  ? '#FFFFFF'
                  : dateInfo.isToday
                  ? theme.colors.primary
                  : theme.colors.text,
                fontSize: theme.fontSize.xlarge,
              },
            ]}
          >
            {dateInfo.dayNumber}
          </Text>
        </View>

        {dateInfo.isToday && !dateInfo.isSelected && (
          <View style={[styles.todayIndicator, { backgroundColor: theme.colors.primary }]} />
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  monthInfo: {
    flex: 1,
  },
  monthText: {
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: -0.5,
  },
  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  todayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  todayButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingHorizontal: 4,
    gap: 16,
  },
  dateCircleContainer: {
    alignItems: 'center',
    width: 56,
  },
  dayName: {
    fontFamily: 'BricolageGrotesque-Medium',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedCircle: {
    shadowColor: '#2F00FF',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dayNumber: {
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: -0.5,
  },
  todayIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
});
