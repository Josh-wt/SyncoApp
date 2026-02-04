import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QuickGlanceCard from '../components/QuickGlanceCard';
import Timeline from '../components/Timeline';
import BottomNavBar, { TabName } from '../components/BottomNavBar';
import { CreationMode } from '../components/CreateReminderModal';
import { useReminders } from '../hooks/useReminders';
import ManualCreateScreen from './ManualCreateScreen';
import AICreateScreen from './AICreateScreen';
import NotificationsScreen from './NotificationsScreen';
import TimelineScreen from './TimelineScreen';
import SettingsScreen from './SettingsScreen';
import { CreateReminderInput } from '../lib/types';

const HINT_STORAGE_KEY = '@synco_first_time_hint_shown';

type Screen = 'home' | 'manual-create' | 'ai-create' | 'notifications' | 'timeline' | 'settings';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { reminders, isLoading, error, addReminder } = useReminders();
  const [showFirstTimeHint, setShowFirstTimeHint] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');

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
    if (mode === 'ai') {
      setCurrentScreen('ai-create');
    } else {
      setCurrentScreen('manual-create');
    }
  }, []);

  const handleSaveReminder = useCallback(async (input: CreateReminderInput) => {
    try {
      await addReminder(input);
    } catch {
      Alert.alert('Error', 'Failed to save reminder. Please try again.');
      throw new Error('Failed to save');
    }
  }, [addReminder]);

  const handleBackToHome = useCallback(() => {
    setCurrentScreen('home');
  }, []);

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

  if (currentScreen === 'manual-create') {
    return (
      <ManualCreateScreen
        onBack={handleBackToHome}
        onSave={handleSaveReminder}
      />
    );
  }

  if (currentScreen === 'ai-create') {
    return (
      <AICreateScreen
        onBack={handleBackToHome}
        onSave={handleSaveReminder}
      />
    );
  }

  if (currentScreen === 'notifications') {
    return (
      <NotificationsScreen
        onBack={handleBackToHome}
        onCreateReminder={handleCreateReminder}
        onTabPress={handleTabPress}
      />
    );
  }

  if (currentScreen === 'timeline') {
    return (
      <TimelineScreen
        onBack={handleBackToHome}
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

  return (
    <View style={styles.root}>
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
            <Timeline reminders={reminders} />
          )}
      </ScrollView>

      <BottomNavBar
        activeTab="dashboard"
        showFirstTimeHint={showFirstTimeHint}
        onDismissHint={handleDismissHint}
        onCreateReminder={handleCreateReminder}
        onTabPress={handleTabPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
