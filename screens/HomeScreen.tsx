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
import ManualCreateScreen from './ManualCreateScreen';
import AICreateScreen from './AICreateScreen';
import ProgressScreen from './ProgressScreen';
import TimelineScreenV2 from './TimelineScreenV2';
import SettingsScreen from './SettingsScreen';
import { CreateReminderInput } from '../lib/types';

const HINT_STORAGE_KEY = '@synco_first_time_hint_shown';

type Screen = 'home' | 'manual-create' | 'ai-create' | 'notifications' | 'timeline' | 'settings';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { reminders, isLoading, error, addReminder } = useReminders();
  const [showFirstTimeHint, setShowFirstTimeHint] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');

  // Animation values for smooth screen transitions
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

  const handleDismissHint = useCallback(async () => {
    setShowFirstTimeHint(false);
    try {
      await AsyncStorage.setItem(HINT_STORAGE_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleCreateReminder = useCallback((mode: CreationMode) => {
    const screen = mode === 'ai' ? 'ai-create' : 'manual-create';
    setCurrentScreen(screen);
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 10,
    }).start();
  }, [slideAnim]);

  const handleSaveReminder = useCallback(async (input: CreateReminderInput) => {
    try {
      const newReminder = await addReminder(input);
      return newReminder;
    } catch {
      Alert.alert('Error', 'Failed to save reminder. Please try again.');
      throw new Error('Failed to save');
    }
  }, [addReminder]);

  const handleBackToHome = useCallback(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 10,
    }).start(() => {
      setCurrentScreen('home');
    });
  }, [slideAnim]);

  const handleTabPress = useCallback((tab: TabName) => {
    if (tab === 'dashboard') {
      setCurrentScreen('home');
    } else if (tab === 'notifications') {
      setCurrentScreen('notifications');
    } else if (tab === 'calendar') {
      setCurrentScreen('timeline');
    } else if (tab === 'settings') {
      setCurrentScreen('settings');
    }
  }, []);

  // Render separate screens for timeline, notifications, settings
  if (currentScreen === 'notifications') {
    return (
      <ProgressScreen
        onBack={handleBackToHome}
        onCreateReminder={handleCreateReminder}
        onTabPress={handleTabPress}
      />
    );
  }

  if (currentScreen === 'timeline') {
    return (
      <TimelineScreenV2
        onCreateReminder={handleCreateReminder}
        onTabPress={handleTabPress}
      />
    );
  }

  if (currentScreen === 'settings') {
    return (
      <>
        <SettingsScreen />
        <BottomNavBar
          activeTab="settings"
          onTabPress={handleTabPress}
          onCreateReminder={handleCreateReminder}
        />
      </>
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

  const showCreateScreen = currentScreen === 'manual-create' || currentScreen === 'ai-create';

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

      {/* Manual Create Screen - pre-mounted and slides in from right */}
      <Animated.View
        style={[
          styles.createScreenContainer,
          {
            transform: [{ translateX: createScreenTranslateX }],
            opacity: currentScreen === 'manual-create' ? 1 : 0,
          },
        ]}
        pointerEvents={currentScreen === 'manual-create' ? 'auto' : 'none'}
      >
        <ManualCreateScreen
          onBack={handleBackToHome}
          onSave={handleSaveReminder}
        />
      </Animated.View>

      {/* AI Create Screen - pre-mounted and slides in from right */}
      <Animated.View
        style={[
          styles.createScreenContainer,
          {
            transform: [{ translateX: createScreenTranslateX }],
            opacity: currentScreen === 'ai-create' ? 1 : 0,
          },
        ]}
        pointerEvents={currentScreen === 'ai-create' ? 'auto' : 'none'}
      >
        <AICreateScreen
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
