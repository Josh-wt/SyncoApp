import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface RemmyCharacterProps {
  message: string;
  showBubble?: boolean;
  size?: number;
}

export default function RemmyCharacter({ message, showBubble = true, size = 180 }: RemmyCharacterProps) {
  const { theme } = useTheme();
  const translateY = useRef(new Animated.Value(50)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, opacity]);

  // Glow animation loop
  useEffect(() => {
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    glowAnimation.start();

    return () => glowAnimation.stop();
  }, [glowOpacity]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel="Remmy, your reminder assistant"
    >
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.glowContainer,
          {
            width: size + 40,
            height: size + 40,
            borderRadius: (size + 40) / 2,
            opacity: glowOpacity,
          },
        ]}
      />

      {/* Remmy image */}
      <Image
        source={require('../assets/zero.png')}
        style={[styles.image, { width: size, height: size }]}
        resizeMode="contain"
      />

      {/* Speech bubble */}
      {showBubble && message && (
        <View
          style={[styles.speechBubble, { backgroundColor: theme.colors.card }]}
          accessible={true}
          accessibilityRole="text"
          accessibilityLabel={`Remmy says: ${message}`}
        >
          <Text style={[styles.message, { color: theme.colors.text }]}>
            {message}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: -SCREEN_HEIGHT * 0.1, // 10% above center
    paddingVertical: 32,
  },
  glowContainer: {
    position: 'absolute',
    backgroundColor: '#2F00FF',
    opacity: 0.3,
  },
  image: {
    zIndex: 1,
  },
  speechBubble: {
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  message: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
});
