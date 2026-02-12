import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <View className="flex-row items-center border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <Pressable onPress={() => router.back()} className="mr-3">
          <ArrowLeft size={24} color="#64748b" />
        </Pressable>
        <Text className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Terms of Service
        </Text>
      </View>
      <ScrollView className="flex-1 px-4 py-4">
        <Text className="mb-4 text-base leading-6 text-slate-700 dark:text-slate-300">
          Last updated: January 2025
        </Text>

        <Text className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          1. Acceptance of Terms
        </Text>
        <Text className="mb-4 text-base leading-6 text-slate-600 dark:text-slate-400">
          By downloading, installing, or using RemindMe Pro, you agree to be bound by these Terms of Service. If you do not agree, do not use the app.
        </Text>

        <Text className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          2. Description of Service
        </Text>
        <Text className="mb-4 text-base leading-6 text-slate-600 dark:text-slate-400">
          RemindMe Pro is a mobile application that helps users create and manage reminders, including time-based and location-based notifications.
        </Text>

        <Text className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          3. User Accounts
        </Text>
        <Text className="mb-4 text-base leading-6 text-slate-600 dark:text-slate-400">
          You may use the app as a guest or create an account. You are responsible for maintaining the security of your account credentials.
        </Text>

        <Text className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          4. Premium Subscriptions
        </Text>
        <Text className="mb-4 text-base leading-6 text-slate-600 dark:text-slate-400">
          Premium features are available through in-app purchases. Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period. Manage subscriptions through the Google Play Store.
        </Text>

        <Text className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          5. Data & Privacy
        </Text>
        <Text className="mb-4 text-base leading-6 text-slate-600 dark:text-slate-400">
          Your data is stored locally on your device and, if you create an account, synced to our cloud servers. See our Privacy Policy for details on how we handle your data.
        </Text>

        <Text className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          6. Limitation of Liability
        </Text>
        <Text className="mb-4 text-base leading-6 text-slate-600 dark:text-slate-400">
          RemindMe Pro is provided "as is" without warranty. We are not liable for missed reminders, data loss, or any damages arising from use of the app.
        </Text>

        <Text className="mb-8 text-base leading-6 text-slate-600 dark:text-slate-400">
          For questions about these terms, contact support@remindmepro.app
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
