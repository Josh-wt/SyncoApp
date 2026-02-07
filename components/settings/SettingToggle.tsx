import { Animated, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface SettingToggleProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export default function SettingToggle({
  label,
  description,
  value,
  onValueChange,
  icon,
  disabled = false,
}: SettingToggleProps) {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
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

  const handlePress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessible={true}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description || `Toggle ${label}`}
      accessibilityState={{ checked: value, disabled }}
    >
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            transform: [{ scale: scaleAnim }],
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
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
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{
            false: theme.colors.borderLight,
            true: theme.colors.primary,
          }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={theme.colors.borderLight}
          disabled={disabled}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
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
});
