import { StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useTheme } from '../../contexts/ThemeContext';

interface SettingSliderProps {
  label: string;
  description?: string;
  value: number;
  onValueChange: (value: number) => void;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  unit?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export default function SettingSlider({
  label,
  description,
  value,
  onValueChange,
  minimumValue,
  maximumValue,
  step = 1,
  unit = '',
  icon,
  disabled = false,
}: SettingSliderProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <View style={styles.content}>
          <Text
            style={[
              styles.label,
              {
                color: theme.colors.text,
                fontSize: theme.fontSize.medium,
                fontFamily: 'BricolageGrotesque-Medium',
              },
            ]}
          >
            {label}
          </Text>
          {description && (
            <Text
              style={[
                styles.description,
                {
                  color: theme.colors.textSecondary,
                  fontSize: theme.fontSize.small,
                  fontFamily: 'BricolageGrotesque-Regular',
                },
              ]}
            >
              {description}
            </Text>
          )}
        </View>
        <View
          style={[
            styles.valueBadge,
            {
              backgroundColor: theme.colors.primaryLight,
            },
          ]}
        >
          <Text
            style={[
              styles.valueText,
              {
                color: theme.colors.primary,
                fontSize: theme.fontSize.medium,
                fontFamily: 'BricolageGrotesque-Bold',
              },
            ]}
          >
            {value}
            {unit}
          </Text>
        </View>
      </View>

      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          value={value}
          onValueChange={onValueChange}
          minimumValue={minimumValue}
          maximumValue={maximumValue}
          step={step}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.borderLight}
          thumbTintColor={theme.colors.primary}
          disabled={disabled}
          accessible={true}
          accessibilityLabel={`${label} slider`}
          accessibilityHint={`Adjust ${label} between ${minimumValue} and ${maximumValue}${unit}. Current value is ${value}${unit}`}
          accessibilityRole="adjustable"
          accessibilityValue={{ min: minimumValue, max: maximumValue, now: value, text: `${value}${unit}` }}
        />
        <View style={styles.rangeLabels}>
          <Text
            style={[
              styles.rangeLabel,
              {
                color: theme.colors.textTertiary,
                fontSize: theme.fontSize.tiny,
                fontFamily: 'BricolageGrotesque-Regular',
              },
            ]}
          >
            {minimumValue}
            {unit}
          </Text>
          <Text
            style={[
              styles.rangeLabel,
              {
                color: theme.colors.textTertiary,
                fontSize: theme.fontSize.tiny,
                fontFamily: 'BricolageGrotesque-Regular',
              },
            ]}
          >
            {maximumValue}
            {unit}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  label: {
    letterSpacing: -0.3,
  },
  description: {
    marginTop: 2,
    lineHeight: 16,
  },
  valueBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  valueText: {
    letterSpacing: 0.5,
  },
  sliderContainer: {
    paddingTop: 4,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  rangeLabel: {
    letterSpacing: 0.2,
  },
});
