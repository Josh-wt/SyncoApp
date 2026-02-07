import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { initializeRevenueCat } from '../lib/revenueCat';

interface SubscriptionStatus {
  isProUser: boolean;
  entitlements: string[];
  expiresDate?: string;
}

export function useSubscription() {
  const [isProUser, setIsProUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [entitlements, setEntitlements] = useState<string[]>([]);
  const [expiresDate, setExpiresDate] = useState<string | undefined>();

  useEffect(() => {
    loadSubscriptionStatus();
    initializeRevenueCatSdk();
  }, []);

  const initializeRevenueCatSdk = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Initialize RevenueCat SDK for purchases (client-side)
        await initializeRevenueCat(user.id);
      }
    } catch (error) {
      console.error('Error initializing RevenueCat:', error);
    }
  };

  const loadSubscriptionStatus = async () => {
    try {
      // Call edge function to check subscription status (server-side)
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        method: 'POST',
      });

      if (error) {
        console.error('Error checking subscription:', error);
        setIsProUser(false);
        setEntitlements([]);
        return;
      }

      if (data) {
        setIsProUser(data.isProUser || false);
        setEntitlements(data.entitlements || []);
        setExpiresDate(data.expiresDate);
      }
    } catch (error) {
      console.error('Error loading subscription status:', error);
      setIsProUser(false);
      setEntitlements([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshSubscriptionStatus = async () => {
    setLoading(true);
    await loadSubscriptionStatus();
  };

  return {
    isProUser,
    loading,
    entitlements,
    expiresDate,
    refreshSubscriptionStatus,
  };
}
