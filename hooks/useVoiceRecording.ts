import { useAudioRecorder, RecordingPresets, AudioModule } from 'expo-audio';
import { File } from 'expo-file-system';
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

  // Create recorder with high quality preset
  const recorder = useAudioRecorder(
    RecordingPresets.HIGH_QUALITY,
    (recordingStatus) => {
      // Handle recording status updates if needed
      if (recordingStatus.isFinished) {
        isRecordingRef.current = false;
      }
    }
  );

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const permissionStatus = await AudioModule.requestRecordingPermissionsAsync();
      return permissionStatus.granted;
    } catch {
      return false;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setError('Microphone permission is required to record voice reminders.');
        setStatus('error');
        return;
      }

      // Prepare and start recording
      await recorder.prepareToRecordAsync();
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
  }, [requestPermissions, recorder]);

  const stopRecording = useCallback(async (): Promise<{ uri: string; base64: string; mimeType: string } | null> => {
    // Clear duration timer
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

      // Read the file as base64 using expo-file-system File class
      const file = new File(uri);
      const base64 = await file.base64();

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
        // Ignore errors during cancel
      }
      isRecordingRef.current = false;
    }

    setStatus('idle');
    setDuration(0);
    setError(null);
  }, [recorder]);

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
