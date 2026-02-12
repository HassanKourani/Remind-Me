import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <View className="flex-row items-center border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <Pressable onPress={() => router.back()} className="mr-3">
          <ArrowLeft size={24} color="#64748b" />
        </Pressable>
        <Text className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Privacy Policy
        </Text>
      </View>
      <ScrollView className="flex-1 px-4 py-4">
        <Text className="mb-4 text-base leading-6 text-slate-700 dark:text-slate-300">
          Last updated: January 2025
        </Text>

        <Text className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          1. Information We Collect
        </Text>
        <Text className="mb-4 text-base leading-6 text-slate-600 dark:text-slate-400">
          We collect information you provide (email, name, reminder content) and device information (location when permitted, device type). Guest users' data stays entirely on-device.
        </Text>

        <Text className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          2. How We Use Your Information
        </Text>
        <Text className="mb-4 text-base leading-6 text-slate-600 dark:text-slate-400">
          We use your data to provide reminder functionality, sync data across devices, send notifications, and improve the app. We do not sell your personal information.
        </Text>

        <Text className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          3. Location Data
        </Text>
        <Text className="mb-4 text-base leading-6 text-slate-600 dark:text-slate-400">
          Location data is used solely for location-based reminders and geofencing. Background location access is only used when you have active location reminders. Location data is not shared with third parties.
        </Text>

        <Text className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          4. Data Storage
        </Text>
        <Text className="mb-4 text-base leading-6 text-slate-600 dark:text-slate-400">
          Your reminders are stored locally on your device using SQLite. If you create an account, data is also synced to our cloud servers (Supabase) for backup and cross-device access.
        </Text>

        <Text className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          5. Third-Party Services
        </Text>
        <Text className="mb-4 text-base leading-6 text-slate-600 dark:text-slate-400">
          We use Google Maps for location services, RevenueCat for subscription management, and Google Mobile Ads for advertising to free users. Each service has its own privacy policy.
        </Text>

        <Text className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          6. Data Deletion
        </Text>
        <Text className="mb-4 text-base leading-6 text-slate-600 dark:text-slate-400">
          You can delete your account and all associated data at any time from the Settings screen. You can also export your data before deletion.
        </Text>

        <Text className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          7. Contact
        </Text>
        <Text className="mb-8 text-base leading-6 text-slate-600 dark:text-slate-400">
          For privacy-related inquiries, contact support@remindmepro.app
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
