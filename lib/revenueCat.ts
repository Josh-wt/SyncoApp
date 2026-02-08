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
    console.log('=== RevenueCat Initialization ===');
    console.log('API Key:', REVENUECAT_PUBLIC_SDK_KEY);
    console.log('API Key length:', REVENUECAT_PUBLIC_SDK_KEY.length);
    console.log('API Key prefix:', REVENUECAT_PUBLIC_SDK_KEY.substring(0, 10));
    console.log('User ID:', userId || 'anonymous');

    // Enable debug mode in development BEFORE configure
    if (__DEV__) {
      console.log('Setting debug log level...');
      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    }

    console.log('Configuring RevenueCat...');
    Purchases.configure({ apiKey: REVENUECAT_PUBLIC_SDK_KEY, appUserID: userId });

    console.log('✅ RevenueCat initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing RevenueCat:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
  }
}

/**
 * Check if user has an active Pro subscription
 */
export async function isPro(): Promise<boolean> {
  try {
    console.log('Checking Pro status...');
    const customerInfo = await Purchases.getCustomerInfo();
    console.log('Customer info retrieved:', {
      activeEntitlements: Object.keys(customerInfo.entitlements.active),
      isPro: customerInfo.entitlements.active['pro'] !== undefined
    });
    return customerInfo.entitlements.active['pro'] !== undefined;
  } catch (error) {
    console.error('❌ Error checking Pro status:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return false;
  }
}

/**
 * Get available offerings (subscription packages)
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    console.log('Fetching offerings...');
    const offerings = await Purchases.getOfferings();
    console.log('Offerings retrieved:', {
      current: offerings.current?.identifier,
      availablePackages: offerings.current?.availablePackages.length || 0
    });
    return offerings.current;
  } catch (error) {
    console.error('❌ Error fetching offerings:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));

    // Check if it's an API key error
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = (error as any).message || '';
      if (errorMessage.toLowerCase().includes('api key') || errorMessage.toLowerCase().includes('invalid')) {
        console.error('🔑 API KEY ERROR DETECTED!');
        console.error('Current key being used:', REVENUECAT_PUBLIC_SDK_KEY.substring(0, 20) + '...');
      }
    }

    return null;
  }
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
  try {
    console.log('Attempting purchase:', pkg.identifier);
    const { customerInfo } = await Purchases.purchasePackage(pkg);

    console.log('Purchase completed, checking entitlements...');
    if (customerInfo.entitlements.active['pro']) {
      console.log('✅ Pro entitlement active!');
      return true;
    }

    console.log('⚠️ Purchase completed but Pro entitlement not active');
    return false;
  } catch (error: any) {
    if (error.userCancelled) {
      console.log('User cancelled purchase');
    } else {
      console.error('❌ Error purchasing package:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
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
