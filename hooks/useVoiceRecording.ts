import * as FileSystem from 'expo-file-system';
import * as Device from 'expo-device';
import { useCallback, useEffect, useRef, useState } from 'react';

export type RecordingStatus = 'idle' | 'recording' | 'processing' | 'error';

interface UseVoiceRecordingReturn {
  status: RecordingStatus;
  isRecording: boolean;
  duration: number;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{ uri: string; base64: string; mimeType: string } | null>;
  cancelRecording: () => Promise<void>;
}

export function useVoiceRecording(): UseVoiceRecordingReturn {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(false);
  const recorderRef = useRef<any>(null);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      // Check if running on physical device
      if (!Device.isDevice) {
        console.log('Audio recording is not available in simulator');
        return false;
      }

      // Dynamically import expo-audio to avoid simulator crash
      const { AudioModule } = await import('expo-audio');
      const permissionStatus = await AudioModule.requestRecordingPermissionsAsync();
      return permissionStatus.granted;
    } catch (err) {
      console.error('Permission request failed:', err);
      return false;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Check if running on physical device
      if (!Device.isDevice) {
        setError('Audio recording is only available on physical devices, not in the simulator.');
        setStatus('error');
        return;
      }

      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setError('Microphone permission is required to record voice reminders.');
        setStatus('error');
        return;
      }

      // Dynamically import and create recorder if not already created
      if (!recorderRef.current) {
        const { AudioRecorder, RecordingPresets } = await import('expo-audio');
        recorderRef.current = new AudioRecorder();
        await recorderRef.current.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
      }

      const recorder = recorderRef.current;

      // Start recording
      recorder.record();

      isRecordingRef.current = true;
      setStatus('recording');
      setDuration(0);

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to start recording. Please try again.');
      setStatus('error');
    }
  }, [requestPermissions]);

  const stopRecording = useCallback(async (): Promise<{ uri: string; base64: string; mimeType: string } | null> => {
    // Clear duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (!isRecordingRef.current || !recorderRef.current) {
      return null;
    }

    setStatus('processing');

    try {
      const recorder = recorderRef.current;
      await recorder.stop();
      isRecordingRef.current = false;

      const uri = recorder.uri;

      if (!uri) {
        throw new Error('No recording URI');
      }

      // Read the file as base64 using expo-file-system
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Determine mime type - HIGH_QUALITY preset uses m4a
      const mimeType = 'audio/m4a';

      setStatus('idle');
      return { uri, base64, mimeType };

    } catch (err) {
      console.error('Failed to stop recording:', err);
      setError('Failed to process recording. Please try again.');
      setStatus('error');
      isRecordingRef.current = false;
      return null;
    }
  }, []);

  const cancelRecording = useCallback(async () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (isRecordingRef.current && recorderRef.current) {
      try {
        await recorderRef.current.stop();
      } catch {
        // Ignore errors during cancel
      }
      isRecordingRef.current = false;
    }

    setStatus('idle');
    setDuration(0);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

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
