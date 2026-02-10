import './global.css';
import { useEffect, useRef, useState } from 'react';
import { AppState, View, Platform } from 'react-native';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from './lib/supabase';
import {
  initializeNotifications,
  setupNotificationResponseHandler,
  setupNotificationCategory,
  setupNotificationReceivedHandler,
  syncLocalReminderSchedules,
} from './lib/notifications';
import { getUserPreferences } from './lib/userPreferences';
import { updateReminderStatus } from './lib/reminders';
import { ThemeProvider } from './contexts/ThemeContext';
import HomeScreen from './screens/HomeScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import AuthScreen from './screens/AuthScreen';

type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'];

export default function App() {
  const [fontsLoaded] = useFonts({
    'BricolageGrotesque-Regular': require('./assets/fonts/Bricolage-Grotesque/BricolageGrotesque-Regular.ttf'),
    'BricolageGrotesque-Medium': require('./assets/fonts/Bricolage-Grotesque/BricolageGrotesque-Medium.ttf'),
    'BricolageGrotesque-SemiBold': require('./assets/fonts/Bricolage-Grotesque/BricolageGrotesque-SemiBold.ttf'),
    'BricolageGrotesque-Bold': require('./assets/fonts/Bricolage-Grotesque/BricolageGrotesque-Bold.ttf'),
    'BricolageGrotesque-ExtraBold': require('./assets/fonts/Bricolage-Grotesque/BricolageGrotesque-ExtraBold.ttf'),
    'BricolageGrotesque-Light': require('./assets/fonts/Bricolage-Grotesque/BricolageGrotesque-Light.ttf'),
  });

  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null);
  const notificationReceivedListener = useRef<Notifications.EventSubscription | null>(null);

  // Preload native modules to prevent reload on first use
  useEffect(() => {
    console.log('📦 [App] Preloading modules, Device.isDevice:', Device.isDevice);

    // Only preload expo-audio on physical devices (not simulator)
    // Simulator doesn't have microphone hardware and will crash
    if (Device.isDevice) {
      console.log('📦 [App] Preloading expo-audio on physical device');
      import('expo-audio')
        .then(() => console.log('✅ [App] expo-audio preloaded successfully'))
        .catch((err) => {
          console.error('🔴 [App] Failed to preload expo-audio:', err);
        });
    } else {
      console.log('⚠️ [App] Skipping expo-audio preload (simulator detected)');
    }

    console.log('📦 [App] Preloading expo-file-system');
    import('expo-file-system')
      .then(() => console.log('✅ [App] expo-file-system preloaded'))
      .catch((err) => console.error('🔴 [App] Failed to preload expo-file-system:', err));
  }, []);

  // Auth session effect
  useEffect(() => {
    let isMounted = true;

    console.log('🔐 [App] Initializing auth session');
    supabase.auth.getSession().then(({ data }: { data: { session: Session } }) => {
      if (isMounted) {
        console.log('🔐 [App] Initial session loaded:', {
          hasSession: !!data.session,
          userId: data.session?.user?.id
        });
        setSession(data.session ?? null);
        setIsCheckingSession(false);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event: string, nextSession: Session) => {
      if (isMounted) {
        console.log('🔐 [App] Auth state changed:', {
          event: _event,
          hasSession: !!nextSession,
          userId: nextSession?.user?.id,
          userEmail: nextSession?.user?.email
        });
        setSession(nextSession);
      }
    });

    return () => {
      console.log('🔐 [App] Auth cleanup');
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // Initialize push notifications when user is authenticated
  useEffect(() => {
    if (!session) return;

    const initNotifications = async () => {
      try {
        await initializeNotifications();

        // Load user preferences to configure snooze mode
        const prefs = await getUserPreferences();
        await setupNotificationCategory(
          prefs?.snooze_mode ?? 'text_input',
          prefs?.snooze_preset_values ?? [5, 10, 15, 30]
        );
        console.log('Notification category configured successfully');

        await syncLocalReminderSchedules();

        notificationReceivedListener.current = setupNotificationReceivedHandler((notification) => {
          console.log('Foreground notification received:', notification.request.content.data);
        });

        notificationResponseListener.current = setupNotificationResponseHandler(
          (reminderId) => {
            console.log('Notification tapped for reminder:', reminderId);
          },
          async (reminderId) => {
            try {
              await updateReminderStatus(reminderId, 'completed');
              console.log('Reminder marked as done from notification:', reminderId);
            } catch (error) {
              console.error('Failed to mark reminder as done:', error);
            }
          }
        );
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
      }
    };

    initNotifications();

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void syncLocalReminderSchedules();
      }
    });

    return () => {
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
      }
      if (notificationReceivedListener.current) {
        notificationReceivedListener.current.remove();
      }
      appStateSubscription.remove();
    };
  }, [session]);

  if (!fontsLoaded || isCheckingSession) {
    console.log('⏳ [App] Loading... fontsLoaded:', fontsLoaded, 'isCheckingSession:', isCheckingSession);
    return <View />;
  }

  console.log('🎨 [App] Rendering screen, hasSession:', !!session, 'showAuth:', showAuth);

  return (
    <ThemeProvider>
      {session ? (
        <HomeScreen />
      ) : showAuth ? (
        <AuthScreen onBack={() => setShowAuth(false)} />
      ) : (
        <OnboardingScreen onSkip={() => setShowAuth(true)} />
      )}
    </ThemeProvider>
  );
}
