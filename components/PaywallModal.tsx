import '../global.css';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Pressable, ActivityIndicator, ScrollView, StyleSheet, View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getOfferings, purchasePackage, restorePurchases } from '../lib/revenueCat';
import type { PurchasesPackage } from 'react-native-purchases';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseSuccess: () => void;
}

export default function PaywallModal({ visible, onClose, onPurchaseSuccess }: PaywallModalProps) {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [isMounted, setIsMounted] = useState(visible);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;

  useEffect(() => {
    if (visible) {
      loadOfferings();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      fadeAnim.setValue(0);
      slideAnim.setValue(Dimensions.get('window').height);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 200,
          friction: 24,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (isMounted) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setIsMounted(false);
        }
      });
    }
  }, [visible, isMounted, fadeAnim, slideAnim]);

  const loadOfferings = async () => {
    try {
      setLoading(true);
      const offering = await getOfferings();

      if (offering) {
        setPackages(offering.availablePackages);
        // Auto-select first package
        if (offering.availablePackages.length > 0) {
          setSelectedPackage(offering.availablePackages[0]);
        }
      }
    } catch (error) {
      console.error('Error loading offerings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    try {
      setPurchasing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const success = await purchasePackage(selectedPackage);

      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onPurchaseSuccess();
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setPurchasing(true);
      const success = await restorePurchases();

      if (success) {
        onPurchaseSuccess();
      }
    } catch (error) {
      console.error('Restore error:', error);
    } finally {
      setPurchasing(false);
    }
  };

  if (!isMounted) return null;

  return (
    <Modal
      visible={isMounted}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: '#000000',
              opacity: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }),
            },
          ]}
        />
        <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
          <View className="bg-[#f6f1ff] rounded-t-[40px] pt-6 pb-12 px-6" style={{ minHeight: '80%' }}>
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'BricolageGrotesque-Bold' }}>
              Upgrade to Pro
            </Text>
            <Pressable onPress={onClose} className="w-10 h-10 items-center justify-center">
              <MaterialIcons name="close" size={28} color="#121018" />
            </Pressable>
          </View>

          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#2f00ff" />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Benefits */}
              <View className="mb-8">
                <View className="flex-row items-center mb-4">
                  <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mr-4">
                    <MaterialIcons name="all-inclusive" size={28} color="#2f00ff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-semibold" style={{ fontFamily: 'BricolageGrotesque-Bold' }}>
                      Unlimited Reminders
                    </Text>
                    <Text className="text-sm text-gray-500" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                      Create as many reminders as you need
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center mb-4">
                  <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mr-4">
                    <MaterialIcons name="sync" size={28} color="#2f00ff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-semibold" style={{ fontFamily: 'BricolageGrotesque-Bold' }}>
                      Sync Across Devices
                    </Text>
                    <Text className="text-sm text-gray-500" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                      Access your reminders everywhere
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center mb-4">
                  <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mr-4">
                    <MaterialIcons name="support" size={28} color="#2f00ff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-semibold" style={{ fontFamily: 'BricolageGrotesque-Bold' }}>
                      Priority Support
                    </Text>
                    <Text className="text-sm text-gray-500" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                      Get help when you need it
                    </Text>
                  </View>
                </View>
              </View>

              {/* Package Selection */}
              <View className="mb-6">
                {packages.map((pkg) => {
                  const isSelected = selectedPackage?.identifier === pkg.identifier;
                  return (
                    <Pressable
                      key={pkg.identifier}
                      onPress={() => {
                        setSelectedPackage(pkg);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      className={`mb-3 p-5 rounded-3xl border-2 ${
                        isSelected ? 'bg-primary/5 border-primary' : 'bg-white border-gray-200'
                      }`}
                    >
                      <View className="flex-row justify-between items-center">
                        <View className="flex-1">
                          <Text className="text-xl font-bold mb-1" style={{ fontFamily: 'BricolageGrotesque-Bold' }}>
                            {pkg.product.title}
                          </Text>
                          <Text className="text-sm text-gray-500" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                            {pkg.product.description}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-2xl font-bold text-primary" style={{ fontFamily: 'BricolageGrotesque-Bold' }}>
                            {pkg.product.priceString}
                          </Text>
                          <Text className="text-xs text-gray-400" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                            {pkg.packageType}
                          </Text>
                        </View>
                      </View>
                      {isSelected && (
                        <View className="absolute top-5 right-5">
                          <MaterialIcons name="check-circle" size={24} color="#2f00ff" />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* Purchase Button */}
              <Pressable
                onPress={handlePurchase}
                disabled={!selectedPackage || purchasing}
                className="bg-primary rounded-full py-4 px-8 items-center mb-4"
              >
                {purchasing ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white font-bold text-lg" style={{ fontFamily: 'BricolageGrotesque-Bold' }}>
                    Subscribe Now
                  </Text>
                )}
              </Pressable>

              {/* Restore Button */}
              <Pressable
                onPress={handleRestore}
                disabled={purchasing}
                className="py-3 items-center"
              >
                <Text className="text-primary font-medium text-sm" style={{ fontFamily: 'BricolageGrotesque-Medium' }}>
                  Restore Purchases
                </Text>
              </Pressable>

              {/* Terms */}
              <Text className="text-xs text-gray-400 text-center mt-6" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                Subscription will auto-renew. Cancel anytime.{'\n'}
                Terms of Service and Privacy Policy apply.
              </Text>
            </ScrollView>
          )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
