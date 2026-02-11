import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';
import { File } from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

export type RecordingStatus = 'idle' | 'recording' | 'processing' | 'error';

interface UseVoiceRecordingReturn {
  status: RecordingStatus;
  isRecording: boolean;
  duration: number;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{ uri: string; file: File; mimeType: string } | null>;
  cancelRecording: () => Promise<void>;
}

const RECORDING_OPTIONS =
  Platform.OS === 'android'
    ? {
        ...RecordingPresets.HIGH_QUALITY,
        extension: '.m4a',
        android: {
          ...RecordingPresets.HIGH_QUALITY.android,
          outputFormat: 'mpeg4' as const,
          audioEncoder: 'aac' as const,
          extension: '.m4a',
          sampleRate: 44100,
          bitRate: 128000,
          numberOfChannels: 1,
        },
      }
    : RecordingPresets.HIGH_QUALITY;

export function useVoiceRecording(): UseVoiceRecordingReturn {
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(false);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      const permissionStatus = await AudioModule.requestRecordingPermissionsAsync();
      if (!permissionStatus.granted) {
        setError('Microphone permission is required to record voice reminders.');
        setStatus('error');
        return;
      }

      await recorder.prepareToRecordAsync();
      recorder.record();

      isRecordingRef.current = true;
      setStatus('recording');
      setDuration(0);

      durationIntervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setError(`Recording failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('error');
    }
  }, [recorder]);

  const stopRecording = useCallback(async (): Promise<{ uri: string; file: File; mimeType: string } | null> => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (!isRecordingRef.current) {
      return null;
    }

    setStatus('processing');

    try {
      await recorder.stop();
      isRecordingRef.current = false;

      const uri = recorder.uri;
      if (!uri) {
        throw new Error('No recording URI');
      }

      const file = new File(uri);
      const extension = file.extension.toLowerCase();
      const mimeType =
        extension === '.webm'
          ? 'audio/webm'
          : extension === '.m4a' || extension === '.mp4'
            ? 'audio/mp4'
            : extension === '.ogg' || extension === '.oga'
              ? 'audio/ogg'
              : extension === '.mp3'
                ? 'audio/mpeg'
                : extension === '.wav'
                  ? 'audio/wav'
                  : 'audio/mp4';

      setStatus('idle');
      return { uri, file, mimeType };
    } catch (err) {
      setError(`Failed to process recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('error');
      isRecordingRef.current = false;
      return null;
    }
  }, [recorder]);

  const cancelRecording = useCallback(async () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (isRecordingRef.current) {
      try {
        await recorder.stop();
      } catch {
      }
      isRecordingRef.current = false;
    }

    setStatus('idle');
    setDuration(0);
    setError(null);
  }, [recorder]);

  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (isRecordingRef.current) {
        try {
          recorder.stop();
        } catch {}
      }
    };
  }, [recorder]);

  return {
    status,
    isRecording: status === 'recording',
    duration,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
