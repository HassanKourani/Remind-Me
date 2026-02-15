import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { useThemeColor } from '@/hooks/use-theme-color';
import { authenticateWithBiometrics, getBiometricType } from '@/lib/biometrics';
import { useAuthStore } from '@/stores/auth-store';
import { useToastStore } from '@/stores/toast-store';

export default function BiometricPromptScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addToast = useToastStore((s) => s.addToast);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const backgroundColor = useThemeColor({}, 'background');

  const [biometricLabel, setBiometricLabel] = useState('Biometrics');

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });

    (async () => {
      const type = await getBiometricType();
      setBiometricLabel(type);
      promptBiometric();
    })();
  }, []);

  const promptBiometric = async () => {
    const success = await authenticateWithBiometrics();
    if (success) {
      setInitialized(true);
    }
  };

  const handleFallback = () => {
    // Sign out and go to sign-in screen
    router.replace('/(auth)/sign-in');
  };

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  return (
    <View
      style={{
        flex: 1,
        backgroundColor,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingHorizontal: 32,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 24,
      }}
    >
      <Animated.View style={[{ alignItems: 'center' }, logoStyle]}>
        <Image
          source={require('@/assets/images/remdinme-pro-logo.png')}
          style={{ width: 100, height: 100, borderRadius: 24 }}
          contentFit="contain"
        />
      </Animated.View>

      <Animated.Text style={{ color: textColor, fontSize: 22, fontWeight: '600' }}>
        Unlock RemindMe Pro
      </Animated.Text>

      <Animated.Text
        style={{ color: textSecondary, fontSize: 15, textAlign: 'center' }}
      >
        Use {biometricLabel} to unlock your app
      </Animated.Text>

      <View style={{ width: '100%', gap: 12, marginTop: 16 }}>
        <Button variant="filled" size="lg" onPress={promptBiometric} style={{ width: '100%' }}>
          Try {biometricLabel} Again
        </Button>
        <Button variant="ghost" size="md" onPress={handleFallback} style={{ width: '100%' }}>
          Use password instead
        </Button>
      </View>
    </View>
  );
}
