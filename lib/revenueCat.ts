import Purchases, { PurchasesOffering, CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { Alert, Platform } from 'react-native';

// RevenueCat public SDK keys (safe for client-side use)
const REVENUECAT_ANDROID_PUBLIC_SDK_KEY = 'goog_OJqyYaAaHBAPmIiPXSiwBYQGWOV';
const REVENUECAT_IOS_PUBLIC_SDK_KEY = 'appl_yLRoJlSzsAbtnhAYoXawFRFpuPP';

function getRevenueCatPublicKey(): string {
  if (Platform.OS === 'android') {
    return REVENUECAT_ANDROID_PUBLIC_SDK_KEY;
  }
  return REVENUECAT_IOS_PUBLIC_SDK_KEY;
}

/**
 * Initialize RevenueCat SDK
 * Call this once when the app starts (after user authentication)
 */
export async function initializeRevenueCat(userId?: string) {
  try {
    const apiKey = getRevenueCatPublicKey();

    // Enable debug mode in development BEFORE configure
    if (__DEV__) {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    }

    Purchases.configure({ apiKey, appUserID: userId });
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
