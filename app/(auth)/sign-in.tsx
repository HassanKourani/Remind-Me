import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Divider } from '@/components/ui/divider';
import { PageHeader } from '@/components/ui/page-header';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';
import { validateEmail, validatePassword } from '@/lib/validation';
import { useToastStore } from '@/stores/toast-store';

WebBrowser.maybeCompleteAuthSession();

const redirectTo = AuthSession.makeRedirectUri();

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addToast = useToastStore((s) => s.addToast);

  const textSecondary = useThemeColor({}, 'textSecondary');
  const backgroundColor = useThemeColor({}, 'background');
  const primary = useThemeColor({}, 'primary');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSignIn = async () => {
    const eError = validateEmail(email);
    const pError = validatePassword(password);
    setEmailError(eError);
    setPasswordError(pError);
    if (eError || pError) return;

    setIsSigningIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsSigningIn(false);

    if (error) {
      addToast({ type: 'error', title: 'Sign in failed', message: error.message });
      return;
    }
    addToast({ type: 'success', title: 'Successfully signed in' });
  };

  const handleMagicLink = async () => {
    const eError = validateEmail(email);
    setEmailError(eError);
    if (eError) return;

    setIsSendingMagicLink(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    setIsSendingMagicLink(false);

    if (error) {
      addToast({ type: 'error', title: 'Magic link failed', message: error.message });
      return;
    }
    addToast({ type: 'success', title: 'Check your email', message: 'We sent you a magic link to sign in.' });
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });

    if (error) {
      setIsGoogleLoading(false);
      addToast({ type: 'error', title: 'Google sign in failed', message: error.message });
      return;
    }

    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success') {
        const url = result.url;
        const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1] || '');
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }
      }
    }
    setIsGoogleLoading(false);
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
            Welcome back
          </Animated.Text>
          <Animated.Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15 }}>
            Sign in to access your reminders across all your devices
          </Animated.Text>
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

          <Input
            label="Password"
            placeholder="Enter your password"
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setPasswordError(null);
            }}
            error={passwordError}
          />

          <Pressable
            onPress={() => router.push('/(auth)/forgot-password')}
            style={{ alignSelf: 'flex-end' }}
          >
            <Animated.Text style={{ color: primary, fontSize: 14, fontWeight: '500' }}>
              Forgot password?
            </Animated.Text>
          </Pressable>

          <Button variant="filled" size="lg" loading={isSigningIn} onPress={handleSignIn}>
            Sign In
          </Button>

          <Divider text="or" />

          <Button
            variant="outlined"
            size="md"
            loading={isSendingMagicLink}
            onPress={handleMagicLink}
            icon={<MaterialIcons name="mail-outline" size={20} color={primary} />}
          >
            Send Magic Link
          </Button>

          <Button
            variant="outlined"
            size="md"
            loading={isGoogleLoading}
            onPress={handleGoogleSignIn}
            icon={<MaterialIcons name="language" size={20} color={primary} />}
          >
            Sign in with Google
          </Button>
        </View>

        <View style={{ flex: 1, minHeight: 32 }} />

        {/* Trust indicators */}
        <View style={{ alignItems: 'center', gap: 16, marginTop: 24, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            {[
              { icon: 'lock-outline' as const, label: 'Encrypted' },
              { icon: 'cloud-done' as const, label: 'Cloud Sync' },
              { icon: 'devices' as const, label: 'Multi-Device' },
            ].map((item) => (
              <View key={item.label} style={{ alignItems: 'center', gap: 4 }}>
                <MaterialIcons name={item.icon} size={18} color={textSecondary} />
                <Animated.Text style={{ color: textSecondary, fontSize: 11 }}>
                  {item.label}
                </Animated.Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
          <Animated.Text style={{ color: textSecondary, fontSize: 14 }}>
            Don't have an account?
          </Animated.Text>
          <Pressable onPress={() => router.replace('/(auth)/sign-up')}>
            <Animated.Text style={{ color: primary, fontSize: 14, fontWeight: '600' }}>
              Sign up
            </Animated.Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
