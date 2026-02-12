import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Bell, MapPin, Cloud, Shield } from 'lucide-react-native';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';

const features = [
  {
    icon: Bell,
    title: 'Smart Reminders',
    description: 'Time-based notifications that never let you forget',
  },
  {
    icon: MapPin,
    title: 'Location Triggers',
    description: 'Get reminded when you arrive at or leave a place',
  },
  {
    icon: Cloud,
    title: 'Cloud Sync',
    description: 'Your reminders, synced across all your devices',
  },
  {
    icon: Shield,
    title: 'Offline First',
    description: 'Works without internet, syncs when connected',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { continueAsGuest } = useAuthStore();

  const handleGuest = async () => {
    await continueAsGuest();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
        <LinearGradient
          colors={['#0ea5e9', '#0284c7']}
          className="items-center px-6 pb-10 pt-16"
        >
          <Text className="text-4xl font-bold text-white">RemindMe Pro</Text>
          <Text className="mt-2 text-center text-lg text-sky-100">
            Never forget what matters most
          </Text>
        </LinearGradient>

        <View className="flex-1 px-6 pt-8">
          {features.map((feature) => (
            <View
              key={feature.title}
              className="mb-4 flex-row items-start rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
            >
              <View className="mr-4 rounded-lg bg-sky-100 p-2 dark:bg-sky-900">
                <feature.icon size={24} color="#0ea5e9" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  {feature.title}
                </Text>
                <Text className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View className="px-6 pb-8">
          <Button
            variant="primary"
            size="lg"
            onPress={() => router.push('/(auth)/register')}
            className="mb-3"
          >
            Get Started
          </Button>
          <Button
            variant="outline"
            size="lg"
            onPress={() => router.push('/(auth)/login')}
            className="mb-3"
          >
            Sign In
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onPress={handleGuest}
          >
            Continue as Guest
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
