import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SummaryCard from '../components/SummaryCard';
import Timeline from '../components/Timeline';
import BottomNavBar from '../components/BottomNavBar';
import { CreationMode } from '../components/CreateReminderModal';
import { GlowTopRight, GlowBottomLeft } from '../components/icons';
import { useReminders } from '../hooks/useReminders';
import ManualCreateScreen from './ManualCreateScreen';
import { CreateReminderInput } from '../lib/types';

const HINT_STORAGE_KEY = '@synco_first_time_hint_shown';

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

type Screen = 'home' | 'manual-create';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { reminders, priorityCount, upcomingCount, isLoading, error, addReminder } = useReminders();
  const [showFirstTimeHint, setShowFirstTimeHint] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');

  const today = new Date();

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
      // TODO: Navigate to AI creation screen
      Alert.alert('Coming Soon', 'AI-powered reminder creation is coming soon!');
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

  if (currentScreen === 'manual-create') {
    return (
      <ManualCreateScreen
        onBack={handleBackToHome}
        onSave={handleSaveReminder}
      />
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.canvas}>
        <View style={styles.glowTopRight}>
          <GlowTopRight />
        </View>
        <View style={styles.glowBottomLeft}>
          <GlowBottomLeft />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 160 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Quick glance</Text>
              <Text style={styles.headerSubtitle}>{formatDate(today)}</Text>
            </View>
            <View style={styles.avatarButton}>
              <Image
                source={{
                  uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBPo_bdPXEAoJe3l9YNuEhUzX-Y8fgJDt0EveVTykfaZiL5aWo6_xvXyCxrlwnHWaN0elGfdHxkxK4R4j5HNLZiXIX3bvYtx8T0Q2pK2GIuKWk7SU2QbaraKByvep5vdGWDUAY8PSB64O4SRnHotOeV9IpJ3XI_xOxI9NvoGL7xEZYZ87VnfaNiP1tQaN_BtsSFWHQCYwD_2UpJ436rqG-ntIDEOsBBova79K4pnIUCAdkhpG7TRlG8zzRzBrGgFFSSKUUFrKtlMu0',
                }}
                style={styles.avatarImage}
              />
            </View>
          </View>

          <View style={styles.cardGrid}>
            <SummaryCard type="priority" value={priorityCount} />
            <SummaryCard type="upcoming" value={upcomingCount} />
          </View>

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
          showFirstTimeHint={showFirstTimeHint}
          onDismissHint={handleDismissHint}
          onCreateReminder={handleCreateReminder}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f6f1ff',
  },
  canvas: {
    flex: 1,
    backgroundColor: '#f6f1ff',
  },
  glowTopRight: {
    position: 'absolute',
    top: -160,
    right: -160,
    opacity: 0.9,
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: -120,
    left: -120,
    opacity: 0.9,
  },
  content: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 30,
    fontFamily: 'DMSans-Bold',
    color: '#161117',
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
    color: '#888888',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  cardGrid: {
    flexDirection: 'row',
    gap: 16,
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
    fontFamily: 'DMSans-Regular',
    color: '#ef4444',
  },
  emptyContainer: {
    marginTop: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'DMSans-Bold',
    color: '#161117',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
    color: '#888888',
  },
});
