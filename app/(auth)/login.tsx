import { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, ArrowLeft } from 'lucide-react-native';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { Pressable } from 'react-native';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setLoading(true);
      await signIn(data.email, data.password);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message ?? 'Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} className="mb-4 mt-4">
          <ArrowLeft size={24} color="#64748b" />
        </Pressable>

        <Text className="mb-2 text-3xl font-bold text-slate-800 dark:text-slate-100">
          Welcome back
        </Text>
        <Text className="mb-8 text-base text-slate-500 dark:text-slate-400">
          Sign in to your account
        </Text>

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Email"
              icon={<Mail size={20} color="#94a3b8" />}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.email?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Password"
              icon={<Lock size={20} color="#94a3b8" />}
              placeholder="Enter your password"
              secureTextEntry
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.password?.message}
            />
          )}
        />

        <Pressable onPress={() => router.push('/(auth)/forgot-password')} className="mb-6 self-end">
          <Text className="text-sm font-medium text-sky-500">Forgot password?</Text>
        </Pressable>

        <Button
          variant="primary"
          size="lg"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
        >
          Sign In
        </Button>

        <View className="mt-6 flex-row items-center justify-center">
          <Text className="text-slate-500 dark:text-slate-400">Don't have an account? </Text>
          <Pressable onPress={() => router.replace('/(auth)/register')}>
            <Text className="font-semibold text-sky-500">Sign Up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
