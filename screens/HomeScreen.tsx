import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_WIDTH = Dimensions.get('window').width;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QuickGlanceCard from '../components/QuickGlanceCard';
import Timeline from '../components/Timeline';
import BottomNavBar, { TabName } from '../components/BottomNavBar';
import { CreationMode } from '../components/CreateReminderModal';
import { useReminders } from '../hooks/useReminders';
import ProgressScreen from './ProgressScreen';
import TimelineScreenV2 from './TimelineScreenV2';
import SettingsScreen from './SettingsScreen';
import { CreateReminderInput } from '../lib/types';
import ManualCreateScreen from './ManualCreateScreen';

const HINT_STORAGE_KEY = '@synco_first_time_hint_shown';

type Screen = 'home' | 'manual-create' | 'notifications' | 'timeline' | 'settings';

type NotificationOpenRequest = { id: string; at: number } | null;

interface HomeScreenProps {
  notificationOpenRequest?: NotificationOpenRequest;
}

export default function HomeScreen({ notificationOpenRequest }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const { reminders, isLoading, error, addReminder } = useReminders();
  const [showFirstTimeHint, setShowFirstTimeHint] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');

  // Animation value for home <-> create slide transition
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Check if this is the user's first time
  useEffect(() => {
    const checkFirstTime = async () => {
      try {
        const hasSeenHint = await AsyncStorage.getItem(HINT_STORAGE_KEY);
        if (!hasSeenHint) {
          setShowFirstTimeHint(true);
        }
      } catch {
        // If there's an error reading, show the hint anyway
        setShowFirstTimeHint(true);
      }
    };
    checkFirstTime();
  }, []);

  useEffect(() => {
    if (!notificationOpenRequest?.id) return;
    slideAnim.setValue(0);
    setCurrentScreen('notifications');
  }, [notificationOpenRequest, slideAnim]);

  const handleDismissHint = useCallback(async () => {
    setShowFirstTimeHint(false);
    try {
      await AsyncStorage.setItem(HINT_STORAGE_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleCreateReminder = useCallback((_mode: CreationMode) => {
    // Always use manual-create screen (AI is now integrated in manual screen)
    setCurrentScreen('manual-create');
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const switchScreen = useCallback((nextScreen: Screen) => {
    if (nextScreen === currentScreen) return;

    if (nextScreen === 'manual-create') {
      setCurrentScreen('manual-create');
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
      return;
    }

    if (currentScreen === 'manual-create' && nextScreen === 'home') {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 210,
        useNativeDriver: true,
      }).start(() => {
        setCurrentScreen('home');
      });
      return;
    }

    slideAnim.setValue(0);
    setCurrentScreen(nextScreen);
  }, [currentScreen, slideAnim]);

  const handleBackToHome = useCallback(() => {
    switchScreen('home');
  }, [switchScreen]);

  const handleTabPress = useCallback((tab: TabName) => {
    if (tab === 'dashboard') {
      switchScreen('home');
      return;
    }
    if (tab === 'notifications') {
      switchScreen('notifications');
      return;
    }
    if (tab === 'calendar') {
      switchScreen('timeline');
      return;
    }
    if (tab === 'settings') {
      switchScreen('settings');
    }
  }, [switchScreen]);

  const handleSaveReminder = useCallback(async (input: CreateReminderInput) => {
    try {
      const newReminder = await addReminder(input);
      return newReminder;
    } catch {
      Alert.alert('Error', 'Failed to save reminder. Please try again.');
      throw new Error('Failed to save');
    }
  }, [addReminder]);

  const screenTransitionStyle = {
    flex: 1,
  } as const;

  // Render separate screens for timeline, notifications, settings
  if (currentScreen === 'notifications') {
    return (
      <Animated.View style={screenTransitionStyle}>
        <ProgressScreen
          onBack={handleBackToHome}
          onCreateReminder={handleCreateReminder}
          onTabPress={handleTabPress}
          openReminderRequest={notificationOpenRequest ?? null}
        />
      </Animated.View>
    );
  }

  if (currentScreen === 'timeline') {
    return (
      <Animated.View style={screenTransitionStyle}>
        <TimelineScreenV2
          onCreateReminder={handleCreateReminder}
          onTabPress={handleTabPress}
        />
      </Animated.View>
    );
  }

  if (currentScreen === 'settings') {
    return (
      <Animated.View style={screenTransitionStyle}>
        <SettingsScreen />
        <BottomNavBar
          activeTab="settings"
          onTabPress={handleTabPress}
          onCreateReminder={handleCreateReminder}
        />
      </Animated.View>
    );
  }

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -SCREEN_WIDTH],
  });

  const createScreenTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_WIDTH, 0],
  });

  const showCreateScreen = currentScreen === 'manual-create';

  return (
    <View style={styles.root}>
      {/* Home Screen - slides left when create screen opens */}
      <Animated.View
        style={[
          styles.screenContainer,
          {
            transform: [{ translateX }],
          },
        ]}
        pointerEvents={showCreateScreen ? 'none' : 'auto'}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 160 }]}
          showsVerticalScrollIndicator={false}
        >
          <QuickGlanceCard />

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2F00FF" />
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Failed to load reminders</Text>
            </View>
          ) : reminders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No reminders today</Text>
              <Text style={styles.emptySubtitle}>Tap + to add your first reminder</Text>
            </View>
          ) : (
            <Timeline reminders={reminders.slice(0, 5)} />
          )}
        </ScrollView>

        <BottomNavBar
          activeTab="dashboard"
          showFirstTimeHint={showFirstTimeHint}
          onDismissHint={handleDismissHint}
          onCreateReminder={handleCreateReminder}
          onTabPress={handleTabPress}
        />
      </Animated.View>

      {/* Manual Create Screen - pre-rendered but off-screen */}
      <Animated.View
        style={[
          styles.createScreenContainer,
          {
            transform: [{ translateX: createScreenTranslateX }],
          },
        ]}
        pointerEvents={showCreateScreen ? 'auto' : 'none'}
      >
        <ManualCreateScreen
          onBack={handleBackToHome}
          onSave={handleSaveReminder}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  screenContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
  createScreenContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  loadingContainer: {
    marginTop: 60,
    alignItems: 'center',
  },
  errorContainer: {
    marginTop: 60,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#ef4444',
  },
  emptyContainer: {
    marginTop: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#161117',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#888888',
  },
});
