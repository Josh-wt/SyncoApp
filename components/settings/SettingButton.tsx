import { Animated, Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface SettingButtonProps {
  label: string;
  description?: string;
  onPress: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export default function SettingButton({
  label,
  description,
  onPress,
  icon,
  disabled = false,
  loading = false,
  variant = 'primary',
}: SettingButtonProps) {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
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

  const getGradientColors = () => {
    switch (variant) {
      case 'primary':
        return [theme.colors.primary, theme.colors.primary, theme.colors.primary];
      case 'secondary':
        return ['#6B7280', '#6B7280', '#6B7280'];
      case 'danger':
        return [theme.colors.error, theme.colors.error, theme.colors.error];
      default:
        return [theme.colors.primary, theme.colors.primary, theme.colors.primary];
    }
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={styles.wrapper}
    >
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ scale: scaleAnim }],
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <BlurView intensity={30} tint="light" style={styles.blurLayer}>
          <LinearGradient
            colors={getGradientColors()}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.gradientButton}
          >
            {/* Top Highlight */}
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 0.5 }}
              style={styles.highlightTop}
            />
            {/* Bottom Highlight */}
            <LinearGradient
              colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.4)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 0, y: 1 }}
              style={styles.highlightBottom}
            />
            {/* Left Highlight */}
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.highlightLeft}
            />
            {/* Right Highlight */}
            <LinearGradient
              colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.4)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.highlightRight}
            />

            <View style={styles.content}>
              {icon && !loading && <View style={styles.icon}>{icon}</View>}
              {loading && (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                  style={styles.loader}
                />
              )}
              <View style={styles.textContainer}>
                <Text
                  style={[
                    styles.label,
                    {
                      fontSize: theme.fontSize.medium,
                      fontFamily: 'BricolageGrotesque-Bold',
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
                        fontSize: theme.fontSize.small,
                        fontFamily: 'BricolageGrotesque-Regular',
                      },
                    ]}
                  >
                    {description}
                  </Text>
                )}
              </View>
            </View>
          </LinearGradient>
        </BlurView>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  container: {
    borderRadius: 16,
  },
  blurLayer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.6)',
  },
  gradientButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    position: 'relative',
  },
  highlightTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderRadius: 16,
  },
  highlightBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderRadius: 16,
  },
  highlightLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '25%',
    borderRadius: 16,
  },
  highlightRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '25%',
    borderRadius: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  icon: {
    marginRight: 12,
  },
  loader: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    lineHeight: 16,
  },
});
