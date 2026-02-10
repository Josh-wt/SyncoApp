import '../global.css';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, View, Pressable, Switch, ActivityIndicator, TextInput, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../lib/supabase';
import { getUserPreferences, updateUserPreferences, updateNotificationPreferences } from '../lib/userPreferences';
import { generateAccountCode, getActiveAccountCode } from '../lib/accountCodes';
import { getTodayReminderCount } from '../lib/reminderLimits';
import { useSubscription } from '../hooks/useSubscription';
import type { UserPreferences, AccountCode, SnoozeMode } from '../lib/types';
import { NOTIFICATION_TIMING_OPTIONS } from '../lib/types';
import { setupNotificationCategory } from '../lib/notifications';
import AccountCodeInput from '../components/settings/AccountCodeInput';
import PaywallModal from '../components/PaywallModal';

const SNOOZE_PRESET_OPTIONS = [5, 10, 15, 20, 30, 45, 60];

// Animated section wrapper with staggered entry
function AnimatedSection({
  children,
  delay,
}: {
  children: React.ReactNode;
  delay: number;
}) {
  const translateY = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// Pressable with scale animation
function AnimatedPressable({
  children,
  onPress,
  className: cn,
  disabled,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
  disabled?: boolean;
  style?: any;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 400,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 400,
      friction: 10,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View
        className={cn}
        style={[style, { transform: [{ scale: scaleAnim }] }]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { isProUser, loading: subLoading, refreshSubscriptionStatus } = useSubscription();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [accountCode, setAccountCode] = useState<AccountCode | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  const [newTemplate, setNewTemplate] = useState('');
  const [codeGenerating, setCodeGenerating] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Header animation
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    loadData();
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(headerSlide, { toValue: 0, useNativeDriver: true, tension: 65, friction: 10 }),
    ]).start();
  }, []);

  const loadData = async () => {
    try {
      const [prefs, code, count] = await Promise.all([
        getUserPreferences(),
        getActiveAccountCode(),
        getTodayReminderCount(),
      ]);

      setPreferences(prefs);
      setAccountCode(code);
      setTodayCount(count);

      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    } catch (error) {
      console.error('Error loading settings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNotification = async (key: keyof UserPreferences, value: boolean) => {
    try {
      const updated = await updateNotificationPreferences({ [key]: value } as any);
      if (updated) {
        setPreferences(updated);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Error updating preference:', error);
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handleUpdatePreference = async (updates: Partial<UserPreferences>) => {
    try {
      const updated = await updateUserPreferences(updates as any);
      if (updated) {
        setPreferences(updated);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Re-setup notification category when snooze settings change
        if ('snooze_mode' in updates || 'snooze_preset_values' in updates) {
          await setupNotificationCategory(
            updated.snooze_mode ?? 'text_input',
            updated.snooze_preset_values ?? [5, 10, 15, 30]
          );
        }
      }
    } catch (error) {
      console.error('Error updating preference:', error);
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handleSnoozePresetToggle = (minutes: number) => {
    const current = preferences?.snooze_preset_values ?? [5, 10, 15, 30];
    let updated: number[];
    if (current.includes(minutes)) {
      updated = current.filter(m => m !== minutes);
      if (updated.length === 0) {
        Alert.alert('Error', 'You must have at least one snooze preset');
        return;
      }
    } else {
      updated = [...current, minutes].sort((a, b) => a - b);
    }
    handleUpdatePreference({ snooze_preset_values: updated });
  };

  const handleAddTemplate = () => {
    const trimmed = newTemplate.trim();
    if (!trimmed) return;
    const current = preferences?.quick_reminder_templates ?? [];
    if (current.includes(trimmed)) {
      Alert.alert('Duplicate', 'This template already exists');
      return;
    }
    if (current.length >= 10) {
      Alert.alert('Limit Reached', 'Maximum 10 quick templates allowed');
      return;
    }
    handleUpdatePreference({ quick_reminder_templates: [...current, trimmed] });
    setNewTemplate('');
  };

  const handleRemoveTemplate = (template: string) => {
    const current = preferences?.quick_reminder_templates ?? [];
    handleUpdatePreference({ quick_reminder_templates: current.filter(t => t !== template) });
  };

  const handleGenerateCode = async () => {
    setCodeGenerating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const code = await generateAccountCode();
      if (code) {
        const freshCode = await getActiveAccountCode();
        setAccountCode(freshCode);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Error', 'Failed to generate code. Please try again.');
      }
    } catch (error) {
      console.error('Error generating code:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setCodeGenerating(false);
    }
  };

  const handleCopyCode = async () => {
    if (!accountCode) return;
    await Clipboard.setStringAsync(accountCode.code);
    setCodeCopied(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const getTimeRemaining = () => {
    if (!accountCode) return '';
    const expiresAt = new Date(accountCode.expires_at);
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    if (diffMs <= 0) return 'Expired';
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffHours > 0) return `Expires in ${diffHours}h ${diffMinutes}m`;
    return `Expires in ${diffMinutes}m`;
  };

  const handleUpgradeToPro = () => {
    setShowPaywall(true);
  };

  const handlePurchaseSuccess = async () => {
    setShowPaywall(false);
    await refreshSubscriptionStatus();
    await loadData();
    Alert.alert('Welcome to Pro!', 'You now have unlimited reminders. Thank you for your support!');
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  const formatMinutes = (m: number) => {
    if (m >= 60) return `${m / 60}h`;
    return `${m}m`;
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#f6f1ff] items-center justify-center">
        <ActivityIndicator size="large" color="#2f00ff" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#f6f1ff]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <Animated.View
        className="pt-12 px-6 pb-6 flex-row justify-between items-center"
        style={{ opacity: headerOpacity, transform: [{ translateY: headerSlide }] }}
      >
        <Text className="text-[40px] font-light tracking-tight text-[#121018]" style={{ fontFamily: 'BricolageGrotesque-Light' }}>
          Settings
        </Text>
      </Animated.View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 160 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Card */}
        <AnimatedSection delay={0}>
          <View className="bg-white rounded-[40px] p-6 shadow-lg mb-5 relative overflow-hidden">
            <View className="flex-row gap-6 items-center relative z-10">
              <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center">
                <MaterialIcons name="account-circle" size={48} color="#2f00ff" />
              </View>
              <View className="flex-1">
                <Text className="text-2xl font-medium tracking-tight text-[#121018]" style={{ fontFamily: 'BricolageGrotesque-Medium' }}>
                  {userEmail.split('@')[0]}
                </Text>
                <Text className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                  {userEmail}
                </Text>
              </View>
            </View>
          </View>
        </AnimatedSection>

        {/* Pro Plan Card */}
        <AnimatedSection delay={80}>
          <AnimatedPressable
            onPress={!isProUser ? handleUpgradeToPro : undefined}
            className="bg-primary rounded-[40px] p-6 shadow-xl relative overflow-hidden mb-5 items-center justify-center"
            style={{ minHeight: 160 }}
          >
            <MaterialIcons name={isProUser ? "verified-user" : "workspace-premium"} size={40} color="rgba(255,255,255,0.9)" />
            <Text className="text-3xl font-bold tracking-tight text-white mt-2" style={{ fontFamily: 'BricolageGrotesque-Bold' }}>
              {isProUser ? 'Pro Plan' : 'Free Plan'}
            </Text>
            <Text className="text-white/70 text-sm mt-1 text-center" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
              {isProUser ? 'Unlimited reminders' : `${todayCount}/10 today`}
            </Text>
            {!isProUser && (
              <View className="mt-4 bg-white/20 px-6 py-2 rounded-full">
                <Text className="text-white font-semibold text-sm" style={{ fontFamily: 'BricolageGrotesque-Bold' }}>
                  Upgrade Now
                </Text>
              </View>
            )}
          </AnimatedPressable>
        </AnimatedSection>

        {/* Notification Preferences */}
        <AnimatedSection delay={160}>
          <View className="bg-white rounded-[40px] p-8 shadow-lg mb-5">
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-xl font-normal text-gray-800" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                  Notifications
                </Text>
                <MaterialIcons name="notifications" size={24} color="#9ca3af" />
              </View>

              {/* Notification Sound */}
              <Pressable
                onPress={() => handleToggleNotification('notification_sound', !preferences?.notification_sound)}
                className="flex-row items-center justify-between py-4"
              >
                <View className="flex-row items-center gap-4 flex-1">
                  <View className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center">
                    <MaterialIcons name="volume-up" size={20} color="#6b7280" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium" style={{ fontFamily: 'BricolageGrotesque-Medium' }}>
                      Sound
                    </Text>
                    <Text className="text-xs text-gray-400" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                      Play sound with notifications
                    </Text>
                  </View>
                </View>
                <Switch
                  value={preferences?.notification_sound ?? true}
                  onValueChange={(value) => handleToggleNotification('notification_sound', value)}
                  trackColor={{ false: '#e5e7eb', true: '#2f00ff' }}
                  thumbColor="#ffffff"
                />
              </Pressable>

              {/* Notification Vibration */}
              <Pressable
                onPress={() => handleToggleNotification('notification_vibration', !preferences?.notification_vibration)}
                className="flex-row items-center justify-between py-4"
              >
                <View className="flex-row items-center gap-4 flex-1">
                  <View className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center">
                    <MaterialIcons name="vibration" size={20} color="#6b7280" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium" style={{ fontFamily: 'BricolageGrotesque-Medium' }}>
                      Vibration
                    </Text>
                    <Text className="text-xs text-gray-400" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                      Vibrate on notification
                    </Text>
                  </View>
                </View>
                <Switch
                  value={preferences?.notification_vibration ?? true}
                  onValueChange={(value) => handleToggleNotification('notification_vibration', value)}
                  trackColor={{ false: '#e5e7eb', true: '#2f00ff' }}
                  thumbColor="#ffffff"
                />
              </Pressable>

              {/* Priority Notification */}
              <Pressable
                onPress={() => handleToggleNotification('priority_notification_sound', !preferences?.priority_notification_sound)}
                className="flex-row items-center justify-between py-4"
              >
                <View className="flex-row items-center gap-4 flex-1">
                  <View className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center">
                    <MaterialIcons name="priority-high" size={20} color="#6b7280" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium" style={{ fontFamily: 'BricolageGrotesque-Medium' }}>
                      Priority Sound
                    </Text>
                    <Text className="text-xs text-gray-400" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                      Always play for priority reminders
                    </Text>
                  </View>
                </View>
                <Switch
                  value={preferences?.priority_notification_sound ?? true}
                  onValueChange={(value) => handleToggleNotification('priority_notification_sound', value)}
                  trackColor={{ false: '#e5e7eb', true: '#2f00ff' }}
                  thumbColor="#ffffff"
                />
              </Pressable>

              {/* Default Notification Timing */}
              <View className="py-4">
                <View className="flex-row items-center gap-4 mb-3">
                  <View className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center">
                    <MaterialIcons name="schedule" size={20} color="#6b7280" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium" style={{ fontFamily: 'BricolageGrotesque-Medium' }}>
                      Default Timing
                    </Text>
                    <Text className="text-xs text-gray-400" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                      When to notify for new reminders
                    </Text>
                  </View>
                </View>
                <View className="flex-row flex-wrap gap-2 ml-14">
                  {NOTIFICATION_TIMING_OPTIONS.map((option) => {
                    const isSelected = (preferences?.default_notify_before_minutes ?? 0) === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          handleUpdatePreference({ default_notify_before_minutes: option.value });
                        }}
                        className={`px-4 py-2 rounded-full border ${isSelected ? 'bg-[#2f00ff] border-[#2f00ff]' : 'bg-gray-50 border-gray-200'}`}
                      >
                        <Text
                          className={`text-xs ${isSelected ? 'text-white' : 'text-gray-600'}`}
                          style={{ fontFamily: 'BricolageGrotesque-Medium' }}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
          </View>
        </AnimatedSection>

        {/* Sync Devices */}
        <AnimatedSection delay={240}>
          <View className="bg-white rounded-[40px] p-6 shadow-lg mb-5">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-medium" style={{ fontFamily: 'BricolageGrotesque-Medium' }}>
                Sync Devices
              </Text>
              <MaterialIcons name="sync" size={20} color="#9ca3af" />
            </View>

            {accountCode ? (
              <View className="items-center">
                <View className="bg-[#f0ecff] border-2 border-[#2f00ff] rounded-2xl px-6 py-4 mb-3">
                  <Text className="text-2xl tracking-[4px] text-[#2f00ff] text-center" style={{ fontFamily: 'BricolageGrotesque-Bold' }}>
                    {accountCode.code}
                  </Text>
                </View>

                <View className="flex-row gap-3 mb-2">
                  <Pressable
                    onPress={handleCopyCode}
                    className="flex-row items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-50 border border-gray-200"
                  >
                    <MaterialIcons name={codeCopied ? 'check' : 'content-copy'} size={16} color={codeCopied ? '#10b981' : '#6b7280'} />
                    <Text className={`text-xs ${codeCopied ? 'text-green-500' : 'text-gray-500'}`} style={{ fontFamily: 'BricolageGrotesque-Medium' }}>
                      {codeCopied ? 'Copied!' : 'Copy'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleGenerateCode}
                    disabled={codeGenerating}
                    className="flex-row items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-50 border border-gray-200"
                  >
                    <MaterialIcons name="refresh" size={16} color="#6b7280" />
                    <Text className="text-xs text-gray-500" style={{ fontFamily: 'BricolageGrotesque-Medium' }}>
                      {codeGenerating ? 'Generating...' : 'New Code'}
                    </Text>
                  </Pressable>
                </View>

                <Text className="text-xs text-gray-400 text-center" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                  {getTimeRemaining()}
                </Text>
              </View>
            ) : (
              <View className="items-center py-2">
                <Text className="text-xs text-gray-400 text-center mb-4" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                  Generate a code to sync with another device
                </Text>

                <Pressable
                  onPress={handleGenerateCode}
                  disabled={codeGenerating}
                  className="bg-[#2f00ff] px-6 py-3.5 rounded-2xl w-full items-center"
                >
                  {codeGenerating ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <View className="flex-row items-center gap-2">
                      <MaterialIcons name="qr-code-2" size={20} color="#ffffff" />
                      <Text className="text-white text-sm font-bold" style={{ fontFamily: 'BricolageGrotesque-Bold' }}>
                        Generate Sync Code
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
            )}

            <View className="h-4" />
            <AccountCodeInput onSyncSuccess={() => loadData()} />
          </View>
        </AnimatedSection>

        {/* Snooze Configuration */}
        <AnimatedSection delay={320}>
          <View className="bg-white rounded-[40px] p-8 shadow-lg mb-5">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-normal text-gray-800" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                Snooze
              </Text>
              <MaterialIcons name="snooze" size={24} color="#9ca3af" />
            </View>

            {/* Snooze Mode */}
            <View className="mb-5">
              <View className="flex-row items-center gap-4 mb-3">
                <View className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center">
                  <MaterialIcons name="touch-app" size={20} color="#6b7280" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-medium" style={{ fontFamily: 'BricolageGrotesque-Medium' }}>
                    Snooze Mode
                  </Text>
                  <Text className="text-xs text-gray-400" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                    How to snooze from notifications
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-3 ml-14">
                {([
                  { value: 'text_input' as SnoozeMode, label: 'Type Duration', icon: 'keyboard' as const },
                  { value: 'presets' as SnoozeMode, label: 'Quick Presets', icon: 'timer' as const },
                ]).map((option) => {
                  const isSelected = (preferences?.snooze_mode ?? 'text_input') === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        handleUpdatePreference({ snooze_mode: option.value });
                      }}
                      className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-2xl border ${isSelected ? 'bg-[#2f00ff] border-[#2f00ff]' : 'bg-gray-50 border-gray-200'}`}
                    >
                      <MaterialIcons name={option.icon} size={16} color={isSelected ? '#ffffff' : '#6b7280'} />
                      <Text
                        className={`text-sm ${isSelected ? 'text-white' : 'text-gray-600'}`}
                        style={{ fontFamily: 'BricolageGrotesque-Medium' }}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Default Snooze Duration */}
            <View className="mb-5">
              <View className="flex-row items-center gap-4 mb-3">
                <View className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center">
                  <MaterialIcons name="av-timer" size={20} color="#6b7280" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-medium" style={{ fontFamily: 'BricolageGrotesque-Medium' }}>
                    Default Duration
                  </Text>
                  <Text className="text-xs text-gray-400" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                    Default snooze when no time specified
                  </Text>
                </View>
              </View>
              <View className="flex-row flex-wrap gap-2 ml-14">
                {[5, 10, 15, 20, 30, 45, 60].map((mins) => {
                  const isSelected = (preferences?.default_snooze_minutes ?? 10) === mins;
                  return (
                    <Pressable
                      key={mins}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        handleUpdatePreference({ default_snooze_minutes: mins });
                      }}
                      className={`px-4 py-2 rounded-full border ${isSelected ? 'bg-[#2f00ff] border-[#2f00ff]' : 'bg-gray-50 border-gray-200'}`}
                    >
                      <Text
                        className={`text-xs ${isSelected ? 'text-white' : 'text-gray-600'}`}
                        style={{ fontFamily: 'BricolageGrotesque-Medium' }}
                      >
                        {formatMinutes(mins)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Snooze Presets */}
            <View>
              <View className="flex-row items-center gap-4 mb-3">
                <View className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center">
                  <MaterialIcons name="tune" size={20} color="#6b7280" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-medium" style={{ fontFamily: 'BricolageGrotesque-Medium' }}>
                    Quick Snooze Presets
                  </Text>
                  <Text className="text-xs text-gray-400" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                    Available snooze durations in presets mode
                  </Text>
                </View>
              </View>
              <View className="flex-row flex-wrap gap-2 ml-14">
                {SNOOZE_PRESET_OPTIONS.map((mins) => {
                  const isSelected = (preferences?.snooze_preset_values ?? [5, 10, 15, 30]).includes(mins);
                  return (
                    <Pressable
                      key={mins}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        handleSnoozePresetToggle(mins);
                      }}
                      className={`px-4 py-2 rounded-full border ${isSelected ? 'bg-[#2f00ff] border-[#2f00ff]' : 'bg-gray-50 border-gray-200'}`}
                    >
                      <Text
                        className={`text-xs ${isSelected ? 'text-white' : 'text-gray-600'}`}
                        style={{ fontFamily: 'BricolageGrotesque-Medium' }}
                      >
                        {formatMinutes(mins)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </AnimatedSection>

        {/* Quick Reminder Templates */}
        <AnimatedSection delay={240}>
          <View className="bg-white rounded-[40px] p-8 shadow-lg mb-5">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-normal text-gray-800" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                Quick Templates
              </Text>
              <MaterialIcons name="text-snippet" size={24} color="#9ca3af" />
            </View>

            <Text className="text-xs text-gray-400 mb-4" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
              Save frequent reminder titles for quick creation
            </Text>

            {/* Existing Templates */}
            {(preferences?.quick_reminder_templates ?? []).length > 0 && (
              <View className="gap-2 mb-4">
                {(preferences?.quick_reminder_templates ?? []).map((template, index) => (
                  <View key={index} className="flex-row items-center bg-gray-50 rounded-2xl px-4 py-3">
                    <MaterialIcons name="bookmark" size={16} color="#2f00ff" />
                    <Text className="flex-1 ml-3 text-sm text-gray-700" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                      {template}
                    </Text>
                    <Pressable
                      onPress={() => handleRemoveTemplate(template)}
                      hitSlop={8}
                    >
                      <MaterialIcons name="close" size={18} color="#9ca3af" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Add New Template */}
            <View className="flex-row items-center gap-3">
              <TextInput
                value={newTemplate}
                onChangeText={setNewTemplate}
                placeholder="e.g. Take medication"
                placeholderTextColor="#9ca3af"
                className="flex-1 bg-gray-50 rounded-2xl px-4 py-3 text-sm text-gray-700"
                style={{ fontFamily: 'BricolageGrotesque-Regular' }}
                onSubmitEditing={handleAddTemplate}
                returnKeyType="done"
              />
              <Pressable
                onPress={handleAddTemplate}
                className={`w-10 h-10 rounded-full items-center justify-center ${newTemplate.trim() ? 'bg-[#2f00ff]' : 'bg-gray-200'}`}
                disabled={!newTemplate.trim()}
              >
                <MaterialIcons name="add" size={20} color={newTemplate.trim() ? '#ffffff' : '#9ca3af'} />
              </Pressable>
            </View>
          </View>
        </AnimatedSection>

        {/* Sign Out Button */}
        <AnimatedSection delay={320}>
          <AnimatedPressable
            onPress={handleSignOut}
            className="bg-white rounded-[40px] p-6 shadow-lg flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-4">
              <View className="w-12 h-12 rounded-full bg-red-50 items-center justify-center">
                <MaterialIcons name="logout" size={24} color="#ef4444" />
              </View>
              <View>
                <Text className="text-lg font-medium" style={{ fontFamily: 'BricolageGrotesque-Medium' }}>
                  Sign Out
                </Text>
                <Text className="text-sm text-gray-400" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                  Sign out of your account
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#d1d5db" />
          </AnimatedPressable>
        </AnimatedSection>
      </ScrollView>

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onPurchaseSuccess={handlePurchaseSuccess}
      />
    </View>
  );
}
