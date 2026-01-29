import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { supabase } from './lib/supabase';
import {
  initializeNotifications,
  setupNotificationResponseHandler,
} from './lib/notifications';
import HomeScreen from './screens/HomeScreen';
import OnboardingScreen from './screens/OnboardingScreen';

type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'];

export default function App() {
  const [fontsLoaded] = useFonts({
    'DMSans-Regular': require('./assets/fonts/DMSans/DMSans-Regular.ttf'),
    'DMSans-Bold': require('./assets/fonts/DMSans/DMSans-Bold.ttf'),
    'DMSans-Black': require('./assets/fonts/DMSans/DMSans-Black.ttf'),
    'BBHHegarty-Regular': require('./assets/fonts/BBH-Hegarty/BBHHegarty-Regular.ttf'),
  });

  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [skippedOnboarding, setSkippedOnboarding] = useState(false);
  const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null);

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

    initializeNotifications().catch((error) => {
      console.error('Failed to initialize notifications:', error);
    });

    // Set up handler for when user taps on a notification
    notificationResponseListener.current = setupNotificationResponseHandler((reminderId) => {
      // TODO: Navigate to reminder detail or handle the tap
      console.log('Notification tapped for reminder:', reminderId);
    });

    return () => {
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
      }
    };
  }, [session]);

  if (!fontsLoaded || isCheckingSession) {
    return <View />;
  }

  if (session || skippedOnboarding) {
    return <HomeScreen />;
  }

  return <OnboardingScreen onSkip={() => setSkippedOnboarding(true)} />;
}
