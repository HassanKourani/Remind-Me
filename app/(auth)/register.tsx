import { useState } from 'react';
import { View, Text, ScrollView, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Lock, ArrowLeft } from 'lucide-react-native';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  if (password.length === 0) return { label: '', color: '#e2e8f0', width: '0%' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { label: 'Weak', color: '#ef4444', width: '20%' };
  if (score <= 2) return { label: 'Fair', color: '#f59e0b', width: '40%' };
  if (score <= 3) return { label: 'Good', color: '#eab308', width: '60%' };
  if (score <= 4) return { label: 'Strong', color: '#22c55e', width: '80%' };
  return { label: 'Very Strong', color: '#16a34a', width: '100%' };
}

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const password = watch('password');
  const strength = getPasswordStrength(password);

  const onSubmit = async (data: RegisterForm) => {
    try {
      setLoading(true);
      await signUp(data.email, data.password, data.name);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message ?? 'Please try again.');
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
          Create account
        </Text>
        <Text className="mb-8 text-base text-slate-500 dark:text-slate-400">
          Start organizing your reminders
        </Text>

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Full Name"
              icon={<User size={20} color="#94a3b8" />}
              placeholder="John Doe"
              autoCapitalize="words"
              autoComplete="name"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.name?.message}
            />
          )}
        />

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
              placeholder="At least 8 characters"
              secureTextEntry
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.password?.message}
            />
          )}
        />

        {password.length > 0 && (
          <View className="-mt-2 mb-4">
            <View className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <View
                style={{ width: strength.width, backgroundColor: strength.color }}
                className="h-full rounded-full"
              />
            </View>
            <Text style={{ color: strength.color }} className="mt-1 text-xs font-medium">
              {strength.label}
            </Text>
          </View>
        )}

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Confirm Password"
              icon={<Lock size={20} color="#94a3b8" />}
              placeholder="Repeat your password"
              secureTextEntry
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.confirmPassword?.message}
            />
          )}
        />

        <Button
          variant="primary"
          size="lg"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          className="mt-2"
        >
          Create Account
        </Button>

        <View className="mt-6 flex-row items-center justify-center pb-8">
          <Text className="text-slate-500 dark:text-slate-400">Already have an account? </Text>
          <Pressable onPress={() => router.replace('/(auth)/login')}>
            <Text className="font-semibold text-sky-500">Sign In</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
