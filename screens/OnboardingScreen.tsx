import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

interface OnboardingScreenProps {
  onSkip?: () => void;
}

export default function OnboardingScreen({ onSkip }: OnboardingScreenProps) {
  const { width, height } = useWindowDimensions();

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/onboarding-bg.png')}
        style={[styles.pngBackground, { width, height }]}
        resizeMode="cover"
      />

      <View
        style={[
          styles.phoneFrame,
          {
            width: width * 0.9,
            height: height * 0.62,
            left: (width - width * 0.9) / 2,
            top: height * 0.08,
          },
        ]}
      >
      </View>

      <View style={[styles.skipWrap, { top: 52, right: 20 }]}>
        <Pressable onPress={onSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <View style={[styles.textBlock, { left: 24, right: 24, bottom: 120 }]}>
        <Text style={styles.headline}>
          Create reminders seemlessly with full control
        </Text>
        <View style={styles.dotsRow}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>

      <View style={[styles.buttonWrap, { left: 20, right: 20, bottom: 36 }]}>
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Next</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
  },
  pngBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  phoneFrame: {
    position: 'absolute',
    borderRadius: 34,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    overflow: 'hidden',
    zIndex: 2,
  },
  skipWrap: {
    position: 'absolute',
    zIndex: 5,
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  skipText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'BricolageGrotesque-Bold',
  },
  textBlock: {
    position: 'absolute',
    zIndex: 3,
  },
  headline: {
    color: '#ffffff',
    fontSize: 28,
    lineHeight: 34,
    fontFamily: 'BricolageGrotesque-Bold',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  dotActive: {
    width: 24,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  buttonWrap: {
    position: 'absolute',
    zIndex: 4,
  },
  primaryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#101010',
    fontSize: 18,
    fontFamily: 'BricolageGrotesque-Bold',
  },
});
