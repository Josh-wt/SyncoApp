import { Dimensions, StyleSheet, Text, View, Pressable } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect, Ellipse } from 'react-native-svg';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemo, useState, useEffect } from 'react';
import { GiftIcon } from './icons';
import { supabase } from '../lib/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface QuickGlanceCardProps {
  onGiftPress?: () => void;
}

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function getGreeting(timeOfDay: TimeOfDay): string {
  switch (timeOfDay) {
    case 'morning': return 'Morning';
    case 'afternoon': return 'Afternoon';
    case 'evening': return 'Evening';
    case 'night': return 'Night';
  }
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekDates() {
  const today = new Date();
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push({
      dayName: WEEKDAYS[date.getDay()],
      dayNumber: date.getDate(),
      isToday: i === 0,
    });
  }
  return dates;
}

// Color themes based on time of day
const themes = {
  morning: {
    warmColor: '#F5D4A8',
    warmColorMid: '#FAE0BE',
    warmColorLight: '#FCECD5',
    blueLight: '#D8E6F3',
    blueMid: '#B5CFE8',
    blueDark: '#8FB5D9',
  },
  afternoon: {
    warmColor: '#F5D4A8',
    warmColorMid: '#FAE0BE',
    warmColorLight: '#FCECD5',
    blueLight: '#D8E6F3',
    blueMid: '#B5CFE8',
    blueDark: '#8FB5D9',
  },
  evening: {
    warmColor: '#E8B896',
    warmColorMid: '#F0C8A8',
    warmColorLight: '#F5DBC8',
    blueLight: '#C5D4E8',
    blueMid: '#9BB5D6',
    blueDark: '#7A9BC4',
  },
  night: {
    warmColor: '#C4A88A',
    warmColorMid: '#D4BCA0',
    warmColorLight: '#E0D0BC',
    blueLight: '#A8B8CC',
    blueMid: '#8498B4',
    blueDark: '#5C7294',
  },
};

export default function QuickGlanceCard({ onGiftPress }: QuickGlanceCardProps) {
  const insets = useSafeAreaInsets();
  const gradientHeight = 480 + insets.top;
  const [userName, setUserName] = useState('Sunshine');

  const timeOfDay = useMemo(() => getTimeOfDay(), []);
  const greeting = useMemo(() => getGreeting(timeOfDay), [timeOfDay]);
  const weekDates = useMemo(() => getWeekDates(), []);
  const theme = themes[timeOfDay];

  // Fetch user's name from their account
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Try to get name from user metadata (Google/Apple sign-in)
          const fullName = user.user_metadata?.full_name || user.user_metadata?.name;
          if (fullName) {
            // Use first name only
            const firstName = fullName.split(' ')[0];
            setUserName(firstName);
          } else if (user.email) {
            // Fallback to email username if no name available
            const emailName = user.email.split('@')[0];
            const capitalized = emailName.charAt(0).toUpperCase() + emailName.slice(1);
            setUserName(capitalized);
          }
        }
      } catch (error) {
        // Keep default "Sunshine" if error
        console.log('Error fetching user name:', error);
      }
    };

    fetchUserName();
  }, []);

  return (
    <View style={styles.container}>
      {/* Background gradient layer - extends to top of screen */}
      <View style={[styles.gradientWrapper, { top: -(insets.top + 24) }]}>
        <Svg
          width={SCREEN_WIDTH}
          height={gradientHeight}
          style={styles.svgGradient}
        >
          <Defs>
            {/* Warm peach/orange sun - smaller and higher */}
            <RadialGradient
              id="warmGlow"
              cx="50%"
              cy={insets.top + 60}
              rx={SCREEN_WIDTH * 0.35}
              ry={100}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0%" stopColor={theme.warmColor} stopOpacity={1} />
              <Stop offset="30%" stopColor={theme.warmColorMid} stopOpacity={0.9} />
              <Stop offset="60%" stopColor={theme.warmColorLight} stopOpacity={0.6} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>

            {/* Blue ring - light blue inner, darker middle, light outer */}
            <RadialGradient
              id="coolGlow"
              cx="50%"
              cy={insets.top + 100}
              rx={SCREEN_WIDTH * 1.1}
              ry={380}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0%" stopColor={theme.blueLight} stopOpacity={0.3} />
              <Stop offset="20%" stopColor={theme.blueMid} stopOpacity={0.9} />
              <Stop offset="35%" stopColor={theme.blueDark} stopOpacity={1} />
              <Stop offset="50%" stopColor={theme.blueMid} stopOpacity={0.85} />
              <Stop offset="70%" stopColor={theme.blueLight} stopOpacity={0.5} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
          </Defs>

          {/* White base */}
          <Rect x="0" y="0" width={SCREEN_WIDTH} height={gradientHeight} fill="#FFFFFF" />

          {/* Blue glow layer */}
          <Ellipse
            cx={SCREEN_WIDTH / 2}
            cy={insets.top + 100}
            rx={SCREEN_WIDTH * 1.1}
            ry={380}
            fill="url(#coolGlow)"
          />

          {/* Warm peach sun on top */}
          <Ellipse
            cx={SCREEN_WIDTH / 2}
            cy={insets.top + 60}
            rx={SCREEN_WIDTH * 0.35}
            ry={100}
            fill="url(#warmGlow)"
          />
        </Svg>
      </View>

      {/* Content - positioned with safe area */}
      <View style={[styles.content, { paddingTop: insets.top + 20 }]}>
        {/* Header row */}
        <View style={styles.header}>
          <Text style={styles.heading}>
            <Text style={styles.headingLight}>{greeting}, </Text>
            <Text style={styles.headingDark}>{userName}</Text>
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.giftButton,
              pressed && styles.giftButtonPressed,
            ]}
            onPress={onGiftPress}
          >
            <GiftIcon color="#2F00FF" />
          </Pressable>
        </View>

        {/* Days row */}
        <View style={styles.daysRow}>
          {weekDates.map((date, index) => (
            <View key={index} style={styles.dayColumn}>
              <Text style={[styles.dayLabel, date.isToday ? styles.dayLabelActive : styles.dayLabelInactive]}>
                {date.dayName}
              </Text>
              <View style={styles.dayCircle}>
                <BlurView
                  blurType="light"
                  blurAmount={20}
                  reducedTransparencyFallbackColor="white"
                  style={styles.dayCircleBlur}
                />
                <Text style={[styles.dayNumber, date.isToday ? styles.dayNumberActive : styles.dayNumberInactive]}>
                  {date.dayNumber}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: -24,
    marginTop: -24,
    marginBottom: 8,
  },
  gradientWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  svgGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  heading: {
    fontSize: 28,
    lineHeight: 36,
    fontFamily: 'BricolageGrotesque-Medium',
    letterSpacing: -0.5,
    marginTop: SCREEN_HEIGHT * 0.07,
  },
  headingDark: {
    color: '#1F2937',
  },
  headingLight: {
    color: '#D6C6F5',
  },
  giftButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 20,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  giftButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    transform: [{ scale: 0.96 }],
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  dayColumn: {
    alignItems: 'center',
    gap: 6,
  },
  dayLabel: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  dayLabelActive: {
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#374151',
  },
  dayLabelInactive: {
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#9CA3AF',
  },
  dayCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  dayCircleBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dayNumber: {
    fontSize: 20,
    fontFamily: 'BricolageGrotesque-Medium',
  },
  dayNumberActive: {
    color: '#1F2937',
  },
  dayNumberInactive: {
    color: '#9CA3AF',
  },
});
