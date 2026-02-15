import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';
import { validateEmail } from '@/lib/validation';
import { useToastStore } from '@/stores/toast-store';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addToast = useToastStore((s) => s.addToast);

  const backgroundColor = useThemeColor({}, 'background');

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async () => {
    const eError = validateEmail(email);
    setEmailError(eError);
    if (eError) return;

    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setIsLoading(false);

    if (error) {
      addToast({ type: 'error', title: 'Reset failed', message: error.message });
      return;
    }

    addToast({
      type: 'success',
      title: 'Check your email',
      message: 'We sent you a link to reset your password.',
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor }}
    >
      {/* Primary header card */}
      <PageHeader onBack={() => router.back()}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialIcons name="lock-reset" size={24} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Animated.Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700' }}>
              Reset password
            </Animated.Text>
            <Animated.Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
              We'll send you a reset link
            </Animated.Text>
          </View>
        </View>
      </PageHeader>

      {/* Form content below */}
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 32,
          paddingTop: 28,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 16 }}>
          <Input
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setEmailError(null);
            }}
            error={emailError}
          />

          <Button variant="filled" size="lg" loading={isLoading} onPress={handleReset}>
            Send Reset Link
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
