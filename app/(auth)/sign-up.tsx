import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  getPasswordStrength,
  type PasswordStrength,
} from '@/lib/validation';
import { useToastStore } from '@/stores/toast-store';

const strengthConfig: Record<PasswordStrength, { label: string; width: number; colorIdx: number }> =
  {
    weak: { label: 'Weak', width: 0.33, colorIdx: 0 },
    medium: { label: 'Medium', width: 0.66, colorIdx: 1 },
    strong: { label: 'Strong', width: 1, colorIdx: 2 },
  };

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addToast = useToastStore((s) => s.addToast);

  const textSecondary = useThemeColor({}, 'textSecondary');
  const backgroundColor = useThemeColor({}, 'background');
  const primary = useThemeColor({}, 'primary');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const strengthWidth = useSharedValue(0);
  const strengthColorProgress = useSharedValue(0);

  const strength = getPasswordStrength(password);
  const config = strengthConfig[strength];

  if (password.length > 0) {
    strengthWidth.value = withTiming(config.width, { duration: 300 });
    strengthColorProgress.value = withTiming(config.colorIdx, { duration: 300 });
  } else {
    strengthWidth.value = withTiming(0, { duration: 300 });
  }

  const strengthBarStyle = useAnimatedStyle(() => ({
    width: `${strengthWidth.value * 100}%` as any,
    backgroundColor: interpolateColor(
      strengthColorProgress.value,
      [0, 1, 2],
      ['#EF4444', '#F59E0B', '#10B981'],
    ),
  }));

  const strengthLabelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      strengthColorProgress.value,
      [0, 1, 2],
      ['#EF4444', '#F59E0B', '#10B981'],
    ),
  }));

  const handleSignUp = async () => {
    const eError = validateEmail(email);
    const pError = validatePassword(password);
    const cError = validateConfirmPassword(password, confirmPassword);
    setEmailError(eError);
    setPasswordError(pError);
    setConfirmError(cError);
    if (eError || pError || cError) return;

    setIsLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setIsLoading(false);

    if (error) {
      addToast({ type: 'error', title: 'Sign up failed', message: error.message });
      return;
    }

    addToast({
      type: 'success',
      title: 'Check your email',
      message: 'We sent you a confirmation link to verify your account.',
    });
    router.replace('/(auth)/sign-in');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor }}
    >
      {/* Primary header card */}
      <PageHeader onBack={() => router.back()}>
        <View style={{ gap: 4 }}>
          <Animated.Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '700' }}>
            Create account
          </Animated.Text>
          <Animated.Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15 }}>
            Sign up to sync your reminders and unlock all features
          </Animated.Text>
        </View>

        {/* Perks row */}
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
          {[
            { icon: 'check-circle' as const, text: 'Free forever' },
            { icon: 'sync' as const, text: 'Cloud sync' },
            { icon: 'devices' as const, text: 'Multi-device' },
          ].map((perk) => (
            <View key={perk.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialIcons name={perk.icon} size={14} color="rgba(255,255,255,0.7)" />
              <Animated.Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                {perk.text}
              </Animated.Text>
            </View>
          ))}
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

          <View style={{ gap: 8 }}>
            <Input
              label="Password"
              placeholder="Create a password"
              secureTextEntry
              autoComplete="new-password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setPasswordError(null);
              }}
              error={passwordError}
            />

            {password.length > 0 && (
              <View style={{ gap: 4 }}>
                <View
                  style={{
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: textSecondary + '20',
                    overflow: 'hidden',
                  }}
                >
                  <Animated.View
                    style={[{ height: '100%', borderRadius: 2 }, strengthBarStyle]}
                  />
                </View>
                <Animated.Text style={[{ fontSize: 12, fontWeight: '500' }, strengthLabelStyle]}>
                  {config.label}
                </Animated.Text>
              </View>
            )}
          </View>

          <Input
            label="Confirm Password"
            placeholder="Confirm your password"
            secureTextEntry
            autoComplete="new-password"
            value={confirmPassword}
            onChangeText={(t) => {
              setConfirmPassword(t);
              setConfirmError(null);
            }}
            error={confirmError}
          />

          <Button
            variant="filled"
            size="lg"
            loading={isLoading}
            onPress={handleSignUp}
            style={{ marginTop: 8 }}
          >
            Create Account
          </Button>
        </View>

        <View style={{ flex: 1 }} />

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 32 }}>
          <Animated.Text style={{ color: textSecondary, fontSize: 14 }}>
            Already have an account?
          </Animated.Text>
          <Pressable onPress={() => router.replace('/(auth)/sign-in')}>
            <Animated.Text style={{ color: primary, fontSize: 14, fontWeight: '600' }}>
              Sign in
            </Animated.Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
