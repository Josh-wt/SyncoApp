import '../global.css';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Pressable, ActivityIndicator, StyleSheet, View, Text } from 'react-native';
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
          duration: 170,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 240,
          friction: 26,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (isMounted) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 170,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: Dimensions.get('window').height,
          duration: 190,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
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
        if (offering.availablePackages.length > 0) {
          setSelectedPackage(offering.availablePackages[0]);
        }
      }
    } catch {
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
    } catch {
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
    } catch {
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
          <View className="bg-[#f6f1ff] rounded-t-[40px] pt-8 pb-12 px-6">
            {/* Close button */}
            <Pressable onPress={onClose} className="absolute top-6 right-6 z-10 w-10 h-10 items-center justify-center rounded-full bg-black/5">
              <MaterialIcons name="close" size={22} color="#666" />
            </Pressable>

            {loading ? (
              <View className="py-20 items-center justify-center">
                <ActivityIndicator size="large" color="#2f00ff" />
              </View>
            ) : (
              <View>
                {/* Title */}
                <View className="items-center mt-2 mb-8">
                  <Text className="text-[32px] tracking-tight text-[#121018]" style={{ fontFamily: 'BricolageGrotesque-Bold' }}>
                    Go Pro
                  </Text>
                  <Text className="text-base text-gray-400 mt-1" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                    Unlock everything, forever.
                  </Text>
                </View>

                {/* Benefits - minimal list */}
                <View className="mb-8 gap-4">
                  <View className="flex-row items-center gap-4">
                    <View className="w-10 h-10 rounded-2xl bg-[#2f00ff]/8 items-center justify-center">
                      <MaterialIcons name="all-inclusive" size={22} color="#2f00ff" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base text-[#121018]" style={{ fontFamily: 'BricolageGrotesque-Medium' }}>
                        Unlimited reminders
                      </Text>
                      <Text className="text-sm text-gray-400" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                        No daily limits
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-4">
                    <View className="w-10 h-10 rounded-2xl bg-[#2f00ff]/8 items-center justify-center">
                      <MaterialIcons name="mic" size={22} color="#2f00ff" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base text-[#121018]" style={{ fontFamily: 'BricolageGrotesque-Medium' }}>
                        Unlimited voice creation
                      </Text>
                      <Text className="text-sm text-gray-400" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                        Describe your whole day at once
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-4">
                    <View className="w-10 h-10 rounded-2xl bg-[#2f00ff]/8 items-center justify-center">
                      <MaterialIcons name="favorite" size={22} color="#2f00ff" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base text-[#121018]" style={{ fontFamily: 'BricolageGrotesque-Medium' }}>
                        Support development
                      </Text>
                      <Text className="text-sm text-gray-400" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                        Help us keep building
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Price card */}
                {packages.length > 0 && (
                  <View className="bg-white rounded-3xl p-5 mb-6 border border-gray-100">
                    <View className="flex-row justify-between items-center">
                      <View>
                        <Text className="text-lg text-[#121018]" style={{ fontFamily: 'BricolageGrotesque-Bold' }}>
                          Lifetime
                        </Text>
                        <Text className="text-sm text-gray-400" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                          One-time purchase
                        </Text>
                      </View>
                      <Text className="text-3xl text-[#2f00ff]" style={{ fontFamily: 'BricolageGrotesque-Bold' }}>
                        {selectedPackage?.product.priceString}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Purchase Button */}
                <Pressable
                  onPress={handlePurchase}
                  disabled={!selectedPackage || purchasing}
                  className="bg-[#2f00ff] rounded-2xl py-4 items-center mb-4"
                  style={{ opacity: (!selectedPackage || purchasing) ? 0.5 : 1 }}
                >
                  {purchasing ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text className="text-white text-lg" style={{ fontFamily: 'BricolageGrotesque-Bold' }}>
                      Purchase
                    </Text>
                  )}
                </Pressable>

                {/* Restore */}
                <Pressable
                  onPress={handleRestore}
                  disabled={purchasing}
                  className="py-3 items-center"
                >
                  <Text className="text-gray-400 text-sm" style={{ fontFamily: 'BricolageGrotesque-Regular' }}>
                    Restore Purchases
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
