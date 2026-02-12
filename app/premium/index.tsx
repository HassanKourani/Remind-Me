import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, MapPin, Cloud, Bell, Shield, Zap, Crown } from 'lucide-react-native';
import { PurchasesPackage, PurchasesOffering } from 'react-native-purchases';
import { getOfferings, purchasePackage, restorePurchases } from '@/services/purchases/revenueCat';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui';

const FEATURES = [
  { icon: MapPin, label: 'Location-based reminders', color: '#ef4444' },
  { icon: Bell, label: 'Unlimited reminders', color: '#8b5cf6' },
  { icon: Cloud, label: 'Cloud sync across devices', color: '#0ea5e9' },
  { icon: Shield, label: 'No advertisements', color: '#22c55e' },
  { icon: Zap, label: 'Priority support', color: '#f59e0b' },
];

export default function PremiumScreen() {
  const router = useRouter();
  const { user, syncPremiumWithRevenueCat } = useAuthStore();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    async function loadOfferings() {
      try {
        const current = await getOfferings();
        setOffering(current);
      } catch (error) {
        console.error('[Premium] Failed to load offerings:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadOfferings();
  }, []);

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setIsPurchasing(true);
    try {
      const result = await purchasePackage(pkg);
      if (result.success) {
        await syncPremiumWithRevenueCat();
        Alert.alert('Welcome to Premium!', 'All premium features are now unlocked.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else if (result.cancelled) {
        // User cancelled, do nothing
      }
    } catch (error: any) {
      Alert.alert('Purchase Failed', error.message ?? 'Something went wrong. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.success) {
        await syncPremiumWithRevenueCat();
        Alert.alert('Restored!', 'Your premium subscription has been restored.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases were found for this account.');
      }
    } catch (error: any) {
      Alert.alert('Restore Failed', error.message ?? 'Something went wrong.');
    } finally {
      setIsRestoring(false);
    }
  };

  const getPackageLabel = (identifier: string): string => {
    if (identifier.includes('monthly')) return 'Monthly';
    if (identifier.includes('yearly')) return 'Yearly';
    if (identifier.includes('lifetime')) return 'Lifetime';
    return identifier;
  };

  const getPackageSavings = (identifier: string): string | null => {
    if (identifier.includes('yearly')) return 'Save 40%';
    if (identifier.includes('lifetime')) return 'Best Value';
    return null;
  };

  if (user?.isPremium) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
        <View className="flex-row items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <Pressable onPress={() => router.back()}>
            <X size={24} color="#64748b" />
          </Pressable>
          <Text className="text-lg font-semibold text-slate-800 dark:text-slate-100">Premium</Text>
          <View style={{ width: 24 }} />
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Crown size={48} color="#f59e0b" />
          <Text className="mt-4 text-2xl font-bold text-slate-800 dark:text-slate-100">
            You're Premium!
          </Text>
          <Text className="mt-2 text-center text-base text-slate-500 dark:text-slate-400">
            You have access to all premium features. Thank you for your support!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <View className="flex-row items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <Pressable onPress={() => router.back()}>
          <X size={24} color="#64748b" />
        </Pressable>
        <Text className="text-lg font-semibold text-slate-800 dark:text-slate-100">Upgrade</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView className="flex-1">
        {/* Header */}
        <LinearGradient colors={['#7c3aed', '#4f46e5']} className="items-center px-6 pb-8 pt-8">
          <Crown size={40} color="#fbbf24" />
          <Text className="mt-3 text-2xl font-bold text-white">
            RemindMe Pro Premium
          </Text>
          <Text className="mt-2 text-center text-sm text-purple-100">
            Unlock the full power of reminders
          </Text>
        </LinearGradient>

        {/* Features */}
        <View className="px-6 pt-6">
          {FEATURES.map((feature, i) => (
            <View key={i} className="mb-4 flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <feature.icon size={20} color={feature.color} />
              </View>
              <Text className="flex-1 text-base text-slate-800 dark:text-slate-100">
                {feature.label}
              </Text>
              <Check size={18} color="#22c55e" />
            </View>
          ))}
        </View>

        {/* Packages */}
        <View className="px-6 pt-4">
          {isLoading ? (
            <ActivityIndicator size="large" color="#7c3aed" className="py-8" />
          ) : offering?.availablePackages && offering.availablePackages.length > 0 ? (
            <View className="gap-3">
              {offering.availablePackages.map((pkg) => {
                const savings = getPackageSavings(pkg.identifier);
                return (
                  <Pressable
                    key={pkg.identifier}
                    onPress={() => handlePurchase(pkg)}
                    disabled={isPurchasing}
                    className="relative overflow-hidden rounded-2xl border-2 border-purple-200 bg-white p-4 dark:border-purple-800 dark:bg-slate-800"
                  >
                    {savings && (
                      <View className="absolute right-0 top-0 rounded-bl-xl bg-purple-600 px-3 py-1">
                        <Text className="text-xs font-bold text-white">{savings}</Text>
                      </View>
                    )}
                    <Text className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      {getPackageLabel(pkg.identifier)}
                    </Text>
                    <Text className="mt-1 text-base text-purple-600 dark:text-purple-400">
                      {pkg.product.priceString}
                      {pkg.identifier.includes('monthly') ? '/month' : pkg.identifier.includes('yearly') ? '/year' : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View className="items-center py-8">
              <Text className="text-center text-base text-slate-500 dark:text-slate-400">
                Unable to load subscription options.{'\n'}Please try again later.
              </Text>
            </View>
          )}
        </View>

        {/* Restore & Loading */}
        <View className="items-center px-6 pb-8 pt-6">
          {isPurchasing && (
            <ActivityIndicator size="small" color="#7c3aed" className="mb-4" />
          )}

          <Pressable onPress={handleRestore} disabled={isRestoring}>
            <Text className="text-sm font-medium text-purple-600 dark:text-purple-400">
              {isRestoring ? 'Restoring...' : 'Restore Purchases'}
            </Text>
          </Pressable>

          <Text className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
            By purchasing, you agree to our Terms of Service and Privacy Policy.
            Subscriptions auto-renew unless cancelled at least 24 hours before the current period ends.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
