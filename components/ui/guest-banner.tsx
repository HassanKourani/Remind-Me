import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useThemeColor } from '@/hooks/use-theme-color';
import { Button } from '@/components/ui/button';

export function GuestBanner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const primary = useThemeColor({}, 'primary');
  const primaryLight = useThemeColor({}, 'primaryLight');

  const translateY = useSharedValue(-200);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 22, stiffness: 180 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          backgroundColor: primary,
          paddingTop: insets.top + 12,
          paddingBottom: 24,
          paddingHorizontal: 24,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          gap: 16,
          // Card shadow
          shadowColor: primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 12,
        },
        animatedStyle,
      ]}
    >
      {/* Header row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name="cloud-off" size={20} color="#FFFFFF" />
        </View>
        <Animated.Text
          style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700', flex: 1 }}
        >
          You're in Guest Mode
        </Animated.Text>
      </View>

      {/* Description */}
      <Animated.Text
        style={{
          color: 'rgba(255,255,255,0.85)',
          fontSize: 14,
          lineHeight: 20,
        }}
      >
        Your reminders are stored locally on this device only. Create an account to sync across
        devices and never lose your data.
      </Animated.Text>

      {/* CTA Button */}
      <Pressable
        onPress={() => router.push('/(auth)/sign-up' as any)}
        style={{
          backgroundColor: '#FFFFFF',
          height: 44,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
        }}
      >
        <MaterialIcons name="person-add" size={18} color={primary} />
        <Animated.Text style={{ color: primary, fontSize: 15, fontWeight: '700' }}>
          Create Free Account
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}
