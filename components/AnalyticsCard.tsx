import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface AnalyticsCardProps {
  label: string;
  value: string | number;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  subtitle?: string;
  onPress?: () => void;
}

export default function AnalyticsCard({ label, value, icon, color, subtitle, onPress }: AnalyticsCardProps) {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 0.96,
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

  const content = (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
        <MaterialIcons name={icon} size={24} color={color} />
      </View>

      <Text style={[styles.value, { color: theme.colors.text }]}>
        {value}
      </Text>

      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
        {label}
      </Text>

      {subtitle && (
        <Text style={[styles.subtitle, { color: theme.colors.textTertiary }]}>
          {subtitle}
        </Text>
      )}
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}${subtitle ? `. ${subtitle}` : ''}`}
        accessibilityHint="Tap for more details"
        style={styles.container}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      accessible={true}
      accessibilityRole="summary"
      accessibilityLabel={`${label}: ${value}${subtitle ? `. ${subtitle}` : ''}`}
      style={styles.container}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 110,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 24,
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Medium',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: 'BricolageGrotesque-Regular',
    textAlign: 'center',
    marginTop: 4,
  },
});
