import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { UnstableSiriOrb } from '../src/shared/ui/organisms/unstable_siri_orb';

interface VoiceOrbComponentProps {
  isRecording: boolean;
  duration: number;
  transcript: string;
  aiResponse?: string;
  error: string | null;
  status: 'idle' | 'recording' | 'processing';
  onCancel: () => void;
  onStop: () => void;
}

const { width } = Dimensions.get('window');

export function VoiceOrbComponent({
  isRecording,
  duration,
  transcript,
  aiResponse,
  error,
  status,
  onCancel,
  onStop,
}: VoiceOrbComponentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const chatOpacity = useRef(new Animated.Value(0)).current;
  const chatTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Pulse animation for orb when recording
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [isRecording]);

  useEffect(() => {
    // Chat bubble animation
    if (isExpanded) {
      Animated.parallel([
        Animated.timing(chatOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(chatTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(chatOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(chatTranslateY, {
          toValue: 20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isExpanded]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Chat Bubble */}
      {isExpanded && (
        <Animated.View
          style={[
            styles.chatBubble,
            {
              opacity: chatOpacity,
              transform: [{ translateY: chatTranslateY }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.chatHeader}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M20.5346 6.34625L20.3501 6.7707C20.3213 6.83981 20.2727 6.89885 20.2103 6.94038C20.148 6.98191 20.0748 7.00407 19.9999 7.00407C19.925 7.00407 19.8518 6.98191 19.7895 6.94038C19.7272 6.89885 19.6785 6.83981 19.6497 6.7707L19.4652 6.34625C19.1409 5.59538 18.5469 4.99334 17.8004 4.65894L17.2312 4.40472C17.1622 4.37296 17.1037 4.32206 17.0627 4.25806C17.0217 4.19406 16.9999 4.11965 16.9999 4.04364C16.9999 3.96763 17.0217 3.89322 17.0627 3.82922C17.1037 3.76522 17.1622 3.71432 17.2312 3.68256L17.7689 3.44334C18.5341 3.09941 19.1383 2.47511 19.457 1.69904L19.6475 1.24084C19.6753 1.16987 19.7239 1.10893 19.7869 1.06598C19.8499 1.02303 19.9244 1.00006 20.0007 1.00006C20.0769 1.00006 20.1514 1.02303 20.2144 1.06598C20.2774 1.10893 20.326 1.16987 20.3539 1.24084L20.5436 1.69829C20.8619 2.47451 21.4658 3.09908 22.2309 3.44334L22.7693 3.68331C22.8382 3.71516 22.8965 3.76605 22.9373 3.82997C22.9782 3.89389 22.9999 3.96816 22.9999 4.04402C22.9999 4.11987 22.9782 4.19414 22.9373 4.25806C22.8965 4.32198 22.8382 4.37287 22.7693 4.40472L22.1994 4.65819C21.4531 4.99293 20.8594 5.59523 20.5353 6.34625"
                fill="#FF0000"
              />
              <Path
                d="M3 14V10"
                stroke="#FF0000"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <Path
                d="M21 14V10"
                stroke="#FF0000"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <Path
                d="M16.5 18V8"
                stroke="#FF0000"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <Path
                d="M12 22V2"
                stroke="#FF0000"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <Path
                d="M7.5 18V6"
                stroke="#FF0000"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </Svg>
            <Text style={styles.headerText}>I'm Listening...</Text>
          </View>

          {/* Chat Content */}
          <View style={styles.chatContent}>
            {transcript && (
              <View style={styles.messageBubble}>
                <Text style={styles.messageText}>{transcript}</Text>
              </View>
            )}

            {aiResponse && (
              <View style={[styles.messageBubble, styles.aiResponseBubble]}>
                <Text style={[styles.messageText, styles.aiResponseText]}>{aiResponse}</Text>
              </View>
            )}

            {error && (
              <View style={styles.messageBubble}>
                <Text style={[styles.messageText, styles.errorText]}>{error}</Text>
              </View>
            )}

            {isRecording && !transcript && (
              <View style={styles.messageBubble}>
                <Text style={styles.durationText}>{formatDuration(duration)}</Text>
              </View>
            )}

            {status === 'processing' && (
              <View style={styles.messageBubble}>
                <Text style={styles.messageText}>Processing...</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            {isRecording && (
              <Pressable style={styles.stopButton} onPress={onStop}>
                <Text style={styles.stopButtonText}>Stop</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      )}

      {/* Siri Orb */}
      <Pressable
        onPress={() => {
          if (isExpanded) {
            setIsExpanded(false);
            onCancel();
          } else {
            setIsExpanded(true);
          }
        }}
      >
        <Animated.View
          style={[
            styles.orbContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <UnstableSiriOrb
            size={120}
            speed={isRecording ? 1.5 : 0.8}
            primaryColor={{ r: 0.57, g: 0.28, b: 1.0 }}
            secondaryColor={{ r: 1.0, g: 0.0, b: 0.5 }}
            noiseIntensity={isRecording ? 1.5 : 1.0}
            glowIntensity={isRecording ? 2.0 : 1.5}
            saturation={2.5}
            brightness={1.2}
            rotationSpeed={isRecording ? 1.2 : 0.8}
            paused={!isRecording && status === 'idle'}
          />

          {/* Icon overlay */}
          <View style={styles.iconOverlay}>
            {/* Mic icon when not expanded */}
            {!isExpanded && (
              <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M8 2h8a4 4 0 014 4v7a4 4 0 01-4 4H8a4 4 0 01-4-4V6a4 4 0 014-4z"
                  fill="white"
                />
                <Path
                  d="M5 11a7 7 0 1 0 14 0m-7 10v-2"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            )}

            {/* X icon when expanded */}
            {isExpanded && (
              <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                <Path
                  fill="white"
                  d="M18.3 5.71a.996.996 0 0 0-1.41 0L12 10.59L7.11 5.7A.996.996 0 1 0 5.7 7.11L10.59 12L5.7 16.89a.996.996 0 1 0 1.41 1.41L12 13.41l4.89 4.89a.996.996 0 1 0 1.41-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4"
                />
              </Svg>
            )}
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  chatBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    width: width - 40,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  chatContent: {
    minHeight: 60,
    marginBottom: 16,
  },
  messageBubble: {
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  errorText: {
    color: '#FF0000',
  },
  aiResponseBubble: {
    backgroundColor: '#9147FF',
  },
  aiResponseText: {
    color: '#FFFFFF',
  },
  durationText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  stopButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#9147FF',
  },
  stopButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  orbContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
});
