import '../global.css';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View, Pressable, Switch, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { getUserPreferences, updateNotificationPreferences } from '../lib/userPreferences';
import { generateAccountCode, getActiveAccountCode } from '../lib/accountCodes';
import { getTodayReminderCount } from '../lib/reminderLimits';
import { useSubscription } from '../hooks/useSubscription';
import type { UserPreferences, AccountCode } from '../lib/types';
import AccountCodeDisplay from '../components/settings/AccountCodeDisplay';
import AccountCodeInput from '../components/settings/AccountCodeInput';
import PaywallModal from '../components/PaywallModal';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { isProUser, loading: subLoading, refreshSubscriptionStatus } = useSubscription();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [accountCode, setAccountCode] = useState<AccountCode | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    loadData();
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
      <View className="pt-12 px-6 pb-6 flex-row justify-between items-center">
        <Text className="text-[40px] font-light tracking-tight text-[#121018]" style={{ fontFamily: 'BricolageGrotesque-Light' }}>
          Settings
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 160 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Card */}
        <View className="bg-white rounded-[40px] p-6 shadow-lg mb-5 relative overflow-hidden">
          {/* Decorative glow */}
          <View className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full" style={{ transform: [{ translateX: 40 }, { translateY: -40 }] }} />

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

        {/* Middle Row: Asymmetric Grid */}
        <View className="flex-col md:flex-row gap-5 mb-5">
          {/* Notification Preferences (Left - Tall) */}
          <View className="flex-[7] bg-white rounded-[40px] p-8 shadow-lg">
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
          </View>

          {/* Right Column: Pro Plan + Account Code */}
          <View className="flex-[5] gap-5">
            {/* Pro Plan Card */}
            <Pressable
              onPress={!isProUser ? handleUpgradeToPro : undefined}
              className="bg-primary rounded-[40px] p-6 shadow-xl relative overflow-hidden min-h-[180px] items-center justify-center"
            >
              {/* Decorative glows */}
              <View className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full" style={{ transform: [{ translateX: 40 }, { translateY: -40 }] }} />
              <View className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full" style={{ transform: [{ translateX: -20 }, { translateY: 20 }] }} />

              <MaterialIcons name={isProUser ? "verified-user" : "workspace-premium"} size={40} color="rgba(255,255,255,0.9)" />
              <Text className="text-3xl font-bold tracking-tight text-white mt-2" style={{ fontFamily: 'BricolageGrotesque-Bold' }}>
                {isProUser ? 'Pro Plan' : 'Free Plan'}
              </Text>
              <Text className="text-white/70 text-sm mt-1 text-center" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                {isProUser ? 'Unlimited reminders' : `${todayCount}/10 today`}
              </Text>
              {!isProUser && (
                <Pressable
                  onPress={handleUpgradeToPro}
                  className="mt-4 bg-white/20 px-6 py-2 rounded-full"
                >
                  <Text className="text-white font-semibold text-sm" style={{ fontFamily: 'BricolageGrotesque-Bold' }}>
                    Upgrade Now
                  </Text>
                </Pressable>
              )}
            </Pressable>

            {/* Account Code Cards */}
            <View className="bg-white rounded-[40px] p-6 shadow-lg">
              <Text className="text-base font-medium mb-4" style={{ fontFamily: 'BricolageGrotesque-Medium' }}>
                Sync Devices
              </Text>
              <AccountCodeDisplay onCodeGenerated={() => loadData()} />
              <View className="h-4" />
              <AccountCodeInput onSyncSuccess={() => loadData()} />
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <Pressable
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
        </Pressable>
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
