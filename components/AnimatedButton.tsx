import { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';

interface AnimatedButtonProps {
  onPress?: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
  label?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  variant?: 'primary' | 'secondary' | 'ghost' | 'white';
  size?: 'small' | 'medium' | 'large';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export default function AnimatedButton({
  onPress,
  disabled = false,
  children,
  label,
  style,
  textStyle,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
}: AnimatedButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const shadowAnim = useRef(new Animated.Value(1)).current;

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
      Animated.timing(shadowAnim, {
        toValue: 0.5,
        duration: 100,
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
      Animated.timing(shadowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          container: styles.primaryContainer,
          text: styles.primaryText,
          shadow: styles.primaryShadow,
        };
      case 'secondary':
        return {
          container: styles.secondaryContainer,
          text: styles.secondaryText,
          shadow: styles.secondaryShadow,
        };
      case 'ghost':
        return {
          container: styles.ghostContainer,
          text: styles.ghostText,
          shadow: {},
        };
      case 'white':
        return {
          container: styles.whiteContainer,
          text: styles.whiteText,
          shadow: styles.whiteShadow,
        };
      default:
        return {
          container: styles.primaryContainer,
          text: styles.primaryText,
          shadow: styles.primaryShadow,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: styles.sizeSmall,
          text: styles.textSmall,
        };
      case 'large':
        return {
          container: styles.sizeLarge,
          text: styles.textLarge,
        };
      default:
        return {
          container: styles.sizeMedium,
          text: styles.textMedium,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const animatedShadowOpacity = shadowAnim.interpolate({
    inputRange: [0.5, 1],
    outputRange: [0.15, 0.35],
  });

  const animatedShadowRadius = shadowAnim.interpolate({
    inputRange: [0.5, 1],
    outputRange: [6, 12],
  });

  const animatedShadowOffset = shadowAnim.interpolate({
    inputRange: [0.5, 1],
    outputRange: [2, 6],
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={({ pressed }) => [
        styles.pressableWrapper,
        disabled && styles.disabled,
      ]}
    >
      <Animated.View
        style={[
          styles.baseContainer,
          variantStyles.container,
          sizeStyles.container,
          variantStyles.shadow,
          style,
          disabled && styles.disabledContainer,
          {
            transform: [
              { scale: scaleAnim },
              { translateY: translateYAnim },
            ],
          },
        ]}
      >
        {/* 3D Bottom Layer */}
        <View style={[styles.bottomLayer, variantStyles.container]} />

        {/* Main Content Layer */}
        <View style={styles.contentLayer}>
          {children ? (
            children
          ) : (
            <View style={styles.buttonContent}>
              {icon && iconPosition === 'left' && (
                <View style={styles.iconWrapper}>{icon}</View>
              )}
              {label && (
                <Text
                  style={[
                    styles.baseText,
                    variantStyles.text,
                    sizeStyles.text,
                    textStyle,
                    disabled && styles.disabledText,
                  ]}
                >
                  {label}
                </Text>
              )}
              {icon && iconPosition === 'right' && (
                <View style={styles.iconWrapper}>{icon}</View>
              )}
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressableWrapper: {
    alignSelf: 'stretch',
  },
  baseContainer: {
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    // Cyan outline for 3D effect
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  bottomLayer: {
    position: 'absolute',
    top: 3,
    left: 0,
    right: 0,
    bottom: -3,
    borderRadius: 50,
    opacity: 0.4,
  },
  contentLayer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseText: {
    fontFamily: 'DMSans-Bold',
  },

  // Variants
  primaryContainer: {
    backgroundColor: '#2F00FF',
    shadowColor: '#2F00FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryText: {
    color: '#ffffff',
  },
  primaryShadow: {
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },

  secondaryContainer: {
    backgroundColor: 'rgba(47, 0, 255, 0.1)',
    borderColor: 'rgba(0, 255, 255, 0.4)',
  },
  secondaryText: {
    color: '#2F00FF',
  },
  secondaryShadow: {
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },

  ghostContainer: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  ghostText: {
    color: '#888888',
  },

  whiteContainer: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0, 255, 255, 0.25)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  whiteText: {
    color: '#000000',
  },
  whiteShadow: {
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },

  // Sizes
  sizeSmall: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  sizeMedium: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  sizeLarge: {
    paddingVertical: 18,
    paddingHorizontal: 32,
  },

  textSmall: {
    fontSize: 14,
  },
  textMedium: {
    fontSize: 16,
  },
  textLarge: {
    fontSize: 18,
  },

  // Disabled
  disabled: {
    opacity: 0.6,
  },
  disabledContainer: {
    backgroundColor: '#a5a5a5',
    borderColor: 'rgba(128, 128, 128, 0.3)',
  },
  disabledText: {
    color: '#ffffff',
  },
});
