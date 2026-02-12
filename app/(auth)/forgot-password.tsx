import { useState } from 'react';
import { View, Text, ScrollView, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft } from 'lucide-react-native';
import { Button, Input } from '@/components/ui';
import { authService } from '@/services/supabase/auth';

const forgotSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotForm) => {
    try {
      setLoading(true);
      await authService.resetPassword(data.email);
      setSent(true);
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="mb-4 text-2xl font-bold text-slate-800 dark:text-slate-100">
            Check your email
          </Text>
          <Text className="mb-8 text-center text-base text-slate-500 dark:text-slate-400">
            We've sent a password reset link to your email address.
          </Text>
          <Button variant="primary" size="lg" onPress={() => router.replace('/(auth)/login')}>
            Back to Sign In
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} className="mb-4 mt-4">
          <ArrowLeft size={24} color="#64748b" />
        </Pressable>

        <Text className="mb-2 text-3xl font-bold text-slate-800 dark:text-slate-100">
          Forgot password?
        </Text>
        <Text className="mb-8 text-base text-slate-500 dark:text-slate-400">
          Enter your email and we'll send you a reset link
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

        <Button
          variant="primary"
          size="lg"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
        >
          Send Reset Link
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
