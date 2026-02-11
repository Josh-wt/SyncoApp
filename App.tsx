import './global.css';
import { useEffect, useRef, useState } from 'react';
import { AppState, View, Linking } from 'react-native';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from './lib/supabase';
import { completeAuthFromUrl } from './lib/auth';
import {
  handleNotificationResponse,
  initializeNotifications,
  setupNotificationResponseHandler,
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
  const [notificationOpenRequest, setNotificationOpenRequest] = useState<{ id: string; at: number } | null>(null);
  const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null);
  const notificationReceivedListener = useRef<Notifications.EventSubscription | null>(null);
  const sessionUserId = session?.user?.id ?? null;

  // Preload native modules to avoid runtime cold-load reload behavior on first use.
  useEffect(() => {
    if (Device.isDevice) {
      import('expo-audio').catch(() => {});
    }
    import('expo-file-system').catch(() => {});
  }, []);

  // Auth session effect
  useEffect(() => {
    let isMounted = true;
    const handleDeepLink = async (url: string | null | undefined) => {
      try {
        await completeAuthFromUrl(url);
      } catch {
        // Ignore deep-link auth completion errors here; Auth screen will surface sign-in errors.
      }
    };

    const bootstrapAuth = async () => {
      const initialUrl = await Linking.getInitialURL();
      await handleDeepLink(initialUrl);

      const { data } = await supabase.auth.getSession();
      if (isMounted) {
        setSession((data.session as Session) ?? null);
        setIsCheckingSession(false);
      }
    };

    void bootstrapAuth();

    const { data } = supabase.auth.onAuthStateChange((_event: string, nextSession: Session) => {
      if (isMounted) {
        setSession(nextSession);
      }
    });

    const deepLinkSubscription = Linking.addEventListener('url', ({ url }) => {
      void handleDeepLink(url);
    });

    return () => {
      isMounted = false;
      deepLinkSubscription.remove();
      data.subscription.unsubscribe();
    };
  }, []);

  // Initialize push notifications when user is authenticated
  useEffect(() => {
    if (!sessionUserId) return;

    const initNotifications = async () => {
      try {
        await initializeNotifications();

        await syncLocalReminderSchedules();

        notificationReceivedListener.current = setupNotificationReceivedHandler(() => {});

        notificationResponseListener.current = setupNotificationResponseHandler(
          (reminderId) => {
            setNotificationOpenRequest({ id: reminderId, at: Date.now() });
          },
        );

        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (lastResponse) {
          await handleNotificationResponse(lastResponse, (reminderId) => {
            setNotificationOpenRequest({ id: reminderId, at: Date.now() });
          });
          await Notifications.clearLastNotificationResponseAsync().catch(() => {});
        }
      } catch (error) {
        // Notification initialization failed silently
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
  }, [sessionUserId]);

  if (!fontsLoaded || isCheckingSession) {
    return <View />;
  }

  return (
    <ThemeProvider>
      {session ? (
        <HomeScreen notificationOpenRequest={notificationOpenRequest} />
      ) : showAuth ? (
        <AuthScreen onBack={() => setShowAuth(false)} />
      ) : (
        <OnboardingScreen onSkip={() => setShowAuth(true)} />
      )}
    </ThemeProvider>
  );
}
