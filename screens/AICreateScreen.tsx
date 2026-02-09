import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BackIcon,
  CloseIcon,
  HistoryIcon,
  KeyboardIcon,
  StopIcon,
  WaveIcon,
} from '../components/icons';
import { parseReminderFromText } from '../lib/aiReminders';
import { canCreateReminder } from '../lib/reminderLimits';
import { CreateReminderInput } from '../lib/types';

interface AICreateScreenProps {
  onBack: () => void;
  onSave: (input: CreateReminderInput) => Promise<{ id: string } | void>;
}

const SAMPLE_PROMPTS = [
  'Remind me to call the architect at 2 PM',
  'Pay rent on the first of every month',
  'Dentist appointment next Friday at 9 AM',
];

export default function AICreateScreen({ onBack, onSave }: AICreateScreenProps) {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    );

    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 2600, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2600, useNativeDriver: true }),
      ])
    );

    pulse.start();
    float.start();

    return () => {
      pulse.stop();
      float.stop();
    };
  }, [pulseAnim, floatAnim]);

  const outerGlowScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.07],
  });

  const coreScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.98],
  });

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  const promptText = useMemo(() => {
    if (input.trim().length > 0) return input.trim();
    return SAMPLE_PROMPTS[0];
  }, [input]);

  const handleStop = async () => {
    if (!input.trim()) {
      setError('Tell me what to remind you about.');
      return;
    }

    // Check reminder limits
    const { allowed, reason } = await canCreateReminder();
    if (!allowed) {
      Alert.alert('Limit Reached', reason || 'Unable to create reminder', [
        { text: 'OK', style: 'cancel' },
      ]);
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const parsed = await parseReminderFromText(input.trim());
      await onSave(parsed);
      setInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create reminder.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.canvas, { paddingTop: insets.top + 8 }]}> 
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.iconButton}>
            <BackIcon color="#2F00FF" />
          </Pressable>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <Pressable style={styles.iconButton}>
            <CloseIcon color="#2F00FF" size={22} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.body}
        >
          <ScrollView contentContainerStyle={styles.bodyContent}>
            <View style={styles.orbWrap}>
              <Animated.View
                style={[
                  styles.orbOuterGlow,
                  {
                    transform: [{ scale: outerGlowScale }],
                    opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0.95] }),
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.orbMiddle,
                  { transform: [{ translateY: floatTranslate }] },
                ]}
              />
              <Animated.View
                style={[
                  styles.orbCore,
                  {
                    transform: [{ scale: coreScale }, { translateY: floatTranslate }],
                  },
                ]}
              >
                <WaveIcon />
              </Animated.View>
            </View>

            <Text style={styles.listeningTag}>Listening...</Text>
            <Text style={styles.promptText}>{promptText}</Text>

            <View style={styles.inputCard}>
              <TextInput
                value={input}
                onChangeText={(text) => {
                  setInput(text);
                  if (error) setError(null);
                }}
                placeholder="Say or type your reminder..."
                placeholderTextColor="rgba(16,16,24,0.4)"
                style={styles.input}
                multiline
                textAlignVertical="top"
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}> 
          <View style={styles.controlPill}>
            <Pressable style={styles.pillIcon}>
              <KeyboardIcon />
            </Pressable>
            <Pressable
              style={[styles.stopButton, isProcessing && styles.stopButtonDisabled]}
              onPress={handleStop}
              disabled={isProcessing}
            >
              <StopIcon />
            </Pressable>
            <Pressable style={styles.pillIcon}>
              <HistoryIcon />
            </Pressable>
          </View>
          <Text style={styles.footerHint}>{isProcessing ? 'Creating reminder…' : 'Tap to stop'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f6f1ff',
  },
  canvas: {
    flex: 1,
    backgroundColor: '#f6f1ff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#101018',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
  },
  bodyContent: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
  },
  orbWrap: {
    width: 320,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  orbOuterGlow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(59, 26, 110, 0.32)',
    shadowColor: '#2f00ff',
    shadowOpacity: 0.2,
    shadowRadius: 60,
  },
  orbMiddle: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 120,
    backgroundColor: 'rgba(47, 0, 255, 0.28)',
  },
  orbCore: {
    width: 170,
    height: 170,
    borderRadius: 95,
    backgroundColor: '#2F00FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F00FF',
    shadowOpacity: 0.4,
    shadowRadius: 40,
  },
  listeningTag: {
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontFamily: 'BricolageGrotesque-Bold',
    color: 'rgba(47, 0, 255, 0.6)',
    marginBottom: 16,
  },
  promptText: {
    fontSize: 28,
    fontFamily: 'BBHHegarty-Regular',
    color: '#101018',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 34,
  },
  inputCard: {
    width: '100%',
    minHeight: 120,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  input: {
    fontSize: 14,
    color: '#101018',
    fontFamily: 'BricolageGrotesque-Regular',
    minHeight: 88,
  },
  errorText: {
    marginTop: 12,
    color: '#b42318',
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Bold',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  controlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 240,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  pillIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2F00FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F00FF',
    shadowOpacity: 0.3,
    shadowRadius: 18,
  },
  stopButtonDisabled: {
    opacity: 0.6,
  },
  footerHint: {
    marginTop: 10,
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: 'rgba(94, 94, 141, 0.7)',
    fontFamily: 'BricolageGrotesque-Bold',
  },
});
