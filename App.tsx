import './global.css';
import { useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { supabase } from './lib/supabase';
import {
  initializeNotifications,
  setupNotificationResponseHandler,
  setupNotificationCategory,
  setupNotificationReceivedHandler,
  syncLocalReminderSchedules,
} from './lib/notifications';
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

  // Removed preload to prevent crash during auth redirect
  // expo-audio and expo-file-system will be loaded when needed

  // Auth session effect
  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }: { data: { session: Session } }) => {
      if (isMounted) {
        setSession(data.session ?? null);
        setIsCheckingSession(false);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event: string, nextSession: Session) => {
      if (isMounted) {
        setSession(nextSession);
      }
    });

    return () => {
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

        await setupNotificationCategory();
        console.log('Notification category configured successfully');

        await syncLocalReminderSchedules();

        notificationReceivedListener.current = setupNotificationReceivedHandler((notification) => {
          console.log('Foreground notification received:', notification.request.content.data);
        });

        notificationResponseListener.current = setupNotificationResponseHandler((reminderId) => {
          console.log('Notification tapped for reminder:', reminderId);
        });
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
    return <View />;
  }

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
