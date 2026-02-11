import Purchases, { PurchasesOffering, CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { Alert } from 'react-native';

// RevenueCat unified public SDK key (safe for client-side use)
// This test key works for both iOS and Android in sandbox mode
const REVENUECAT_PUBLIC_SDK_KEY = 'test_VztDxPSOfdZXaKLQsEkkEcDqEFs';

/**
 * Initialize RevenueCat SDK
 * Call this once when the app starts (after user authentication)
 */
export async function initializeRevenueCat(userId?: string) {
  try {
    // Enable debug mode in development BEFORE configure
    if (__DEV__) {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    }

    Purchases.configure({ apiKey: REVENUECAT_PUBLIC_SDK_KEY, appUserID: userId });
  } catch (error) {
    // Initialization failed silently
  }
}

/**
 * Check if user has an active Pro subscription
 */
export async function isPro(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active['pro'] !== undefined;
  } catch (error) {
    return false;
  }
}

/**
 * Get available offerings (subscription packages)
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    return null;
  }
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);

    if (customerInfo.entitlements.active['pro']) {
      return true;
    }

    return false;
  } catch (error: any) {
    if (!error.userCancelled) {
      Alert.alert('Purchase Failed', 'Unable to complete purchase. Please try again.');
    }
    return false;
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.restorePurchases();

    if (customerInfo.entitlements.active['pro']) {
      Alert.alert('Success', 'Your Pro subscription has been restored!');
      return true;
    } else {
      Alert.alert('No Purchases Found', 'No active subscriptions were found.');
      return false;
    }
  } catch (error) {
    Alert.alert('Restore Failed', 'Unable to restore purchases. Please try again.');
    return false;
  }
}

/**
 * Get customer info
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    return null;
  }
}
