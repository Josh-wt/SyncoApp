import Purchases, { PurchasesOffering, CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { Platform, Alert } from 'react-native';

// RevenueCat API Keys (replace with your actual keys)
const REVENUECAT_API_KEY_IOS = 'your_ios_key_here';
const REVENUECAT_API_KEY_ANDROID = 'your_android_key_here';

/**
 * Initialize RevenueCat SDK
 * Call this once when the app starts (after user authentication)
 */
export async function initializeRevenueCat(userId?: string) {
  try {
    const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

    Purchases.configure({ apiKey, appUserID: userId });

    // Enable debug mode in development
    if (__DEV__) {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    }

    console.log('RevenueCat initialized successfully');
  } catch (error) {
    console.error('Error initializing RevenueCat:', error);
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
    console.error('Error checking Pro status:', error);
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
    console.error('Error fetching offerings:', error);
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
    if (error.userCancelled) {
      console.log('User cancelled purchase');
    } else {
      console.error('Error purchasing package:', error);
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
    console.error('Error restoring purchases:', error);
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
    console.error('Error getting customer info:', error);
    return null;
  }
}
