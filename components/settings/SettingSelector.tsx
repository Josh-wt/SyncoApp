import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRef, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

interface SettingSelectorOption<T> {
  label: string;
  value: T;
  description?: string;
}

interface SettingSelectorProps<T> {
  label: string;
  description?: string;
  options: SettingSelectorOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export default function SettingSelector<T extends string | number>({
  label,
  description,
  options,
  value,
  onValueChange,
  icon,
  disabled = false,
}: SettingSelectorProps<T>) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const selectedOption = options.find((opt) => opt.value === value);

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
      const newExpanded = !expanded;
      setExpanded(newExpanded);

      Animated.timing(rotateAnim, {
        toValue: newExpanded ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleOptionPress = (optionValue: T) => {
    onValueChange(optionValue);
    setExpanded(false);
    Animated.timing(rotateAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${label}. Current selection: ${selectedOption?.label || 'None'}`}
        accessibilityHint={expanded ? 'Collapse options' : 'Expand to see all options'}
        accessibilityState={{ expanded, disabled }}
      >
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.card,
              borderColor: expanded ? theme.colors.primary : theme.colors.border,
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
            {selectedOption && (
              <Text
                style={[
                  styles.selectedValue,
                  {
                    color: theme.colors.primary,
                    fontSize: theme.fontSize.small,
                    fontFamily: 'BricolageGrotesque-Medium',
                  },
                ]}
              >
                {selectedOption.label}
              </Text>
            )}
          </View>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <MaterialIcons
              name="keyboard-arrow-down"
              size={24}
              color={theme.colors.textSecondary}
            />
          </Animated.View>
        </Animated.View>
      </Pressable>

      {expanded && (
        <View
          style={[
            styles.optionsContainer,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {options.map((option, index) => (
            <Pressable
              key={index}
              onPress={() => handleOptionPress(option.value)}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: pressed
                    ? theme.colors.backgroundSecondary
                    : 'transparent',
                },
                index < options.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.optionContent}>
                <Text
                  style={[
                    styles.optionLabel,
                    {
                      color:
                        option.value === value
                          ? theme.colors.primary
                          : theme.colors.text,
                      fontSize: theme.fontSize.medium,
                      fontFamily:
                        option.value === value
                          ? 'BricolageGrotesque-Bold'
                          : 'BricolageGrotesque-Regular',
                    },
                  ]}
                >
                  {option.label}
                </Text>
                {option.description && (
                  <Text
                    style={[
                      styles.optionDescription,
                      {
                        color: theme.colors.textSecondary,
                        fontSize: theme.fontSize.small,
                        fontFamily: 'BricolageGrotesque-Regular',
                      },
                    ]}
                  >
                    {option.description}
                  </Text>
                )}
              </View>
              {option.value === value && (
                <MaterialIcons
                  name="check"
                  size={20}
                  color={theme.colors.primary}
                />
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
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
  selectedValue: {
    marginTop: 4,
    letterSpacing: 0.2,
  },
  optionsContainer: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    letterSpacing: -0.3,
  },
  optionDescription: {
    marginTop: 2,
    lineHeight: 16,
  },
});
