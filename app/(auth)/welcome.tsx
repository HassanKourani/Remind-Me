import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuthStore } from '@/stores/auth-store';

function FeatureChip({
  icon,
  title,
  subtitle,
  color,
  surface,
  text,
  textSecondary,
  border,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string;
  color: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: surface,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: border,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: color + '15',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialIcons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Animated.Text style={{ color: text, fontSize: 14, fontWeight: '600' }}>
          {title}
        </Animated.Text>
        <Animated.Text style={{ color: textSecondary, fontSize: 12 }}>
          {subtitle}
        </Animated.Text>
      </View>
    </View>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const backgroundColor = useThemeColor({}, 'background');
  const primary = useThemeColor({}, 'primary');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const success = useThemeColor({}, 'success');
  const setGuest = useAuthStore((s) => s.setGuest);

  // Animation values
  const headerOpacity = useSharedValue(0);
  const btn1Opacity = useSharedValue(0);
  const btn1TranslateY = useSharedValue(20);
  const btn2Opacity = useSharedValue(0);
  const btn2TranslateY = useSharedValue(20);
  const btn3Opacity = useSharedValue(0);
  const btn3TranslateY = useSharedValue(20);
  const midOpacity = useSharedValue(0);
  const midTranslateY = useSharedValue(16);

  useEffect(() => {
    const easing = Easing.out(Easing.cubic);

    headerOpacity.value = withTiming(1, { duration: 800, easing });

    midOpacity.value = withDelay(300, withTiming(1, { duration: 600, easing }));
    midTranslateY.value = withDelay(300, withTiming(0, { duration: 600, easing }));

    btn1Opacity.value = withDelay(500, withTiming(1, { duration: 500, easing }));
    btn1TranslateY.value = withDelay(500, withTiming(0, { duration: 500, easing }));
    btn2Opacity.value = withDelay(600, withTiming(1, { duration: 500, easing }));
    btn2TranslateY.value = withDelay(600, withTiming(0, { duration: 500, easing }));
    btn3Opacity.value = withDelay(700, withTiming(1, { duration: 500, easing }));
    btn3TranslateY.value = withDelay(700, withTiming(0, { duration: 500, easing }));
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const btn1Style = useAnimatedStyle(() => ({
    opacity: btn1Opacity.value,
    transform: [{ translateY: btn1TranslateY.value }],
  }));

  const btn2Style = useAnimatedStyle(() => ({
    opacity: btn2Opacity.value,
    transform: [{ translateY: btn2TranslateY.value }],
  }));

  const btn3Style = useAnimatedStyle(() => ({
    opacity: btn3Opacity.value,
    transform: [{ translateY: btn3TranslateY.value }],
  }));

  const midStyle = useAnimatedStyle(() => ({
    opacity: midOpacity.value,
    transform: [{ translateY: midTranslateY.value }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor }}>
      {/* Primary header card */}
      <Animated.View style={headerStyle}>
        <PageHeader>
          {/* Logo + Title */}
          <View style={{ alignItems: 'center', gap: 10, marginBottom: 8 }}>
            {/* Icon-based logo */}
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 22,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: 'rgba(255,255,255,0.3)',
              }}
            >
              <MaterialIcons name="notifications-active" size={36} color="#FFFFFF" />
            </View>
            {/* Stylised app name */}
            <View style={{ alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Animated.Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '300', letterSpacing: -0.5 }}>
                  remind
                </Animated.Text>
                <Animated.Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 }}>
                  me
                </Animated.Text>
                <Animated.Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600', marginLeft: 4 }}>
                  PRO
                </Animated.Text>
              </View>
            </View>
            <Animated.Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
              Never forget what matters most
            </Animated.Text>
          </View>

        </PageHeader>
      </Animated.View>

      {/* Feature highlights */}
      <Animated.View
        style={[
          midStyle,
          {
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
            gap: 10,
          },
        ]}
      >
        <FeatureChip
          icon="notifications-active"
          title="Smart Reminders"
          subtitle="Time-based alerts that keep you on track"
          color={primary}
          surface={surface}
          text={textColor}
          textSecondary={textSecondary}
          border={border}
        />
        <FeatureChip
          icon="location-on"
          title="Location Reminders"
          subtitle="Get alerted when you arrive or leave a place"
          color={success}
          surface={surface}
          text={textColor}
          textSecondary={textSecondary}
          border={border}
        />
        <FeatureChip
          icon="sync"
          title="Cloud Sync"
          subtitle="Access your reminders on any device"
          color={primary}
          surface={surface}
          text={textColor}
          textSecondary={textSecondary}
          border={border}
        />
      </Animated.View>

      {/* Bottom section — buttons */}
      <View
        style={{
          paddingHorizontal: 32,
          paddingBottom: insets.bottom + 24,
          gap: 12,
        }}
      >
        <Animated.View style={btn1Style}>
          <Button
            variant="filled"
            size="lg"
            onPress={() => router.push('/(auth)/sign-in')}
            style={{ width: '100%' }}
          >
            Sign In
          </Button>
        </Animated.View>

        <Animated.View style={btn2Style}>
          <Button
            variant="outlined"
            size="lg"
            onPress={() => router.push('/(auth)/sign-up')}
            style={{ width: '100%' }}
          >
            Create Account
          </Button>
        </Animated.View>

        <Animated.View style={btn3Style}>
          <Button
            variant="ghost"
            size="lg"
            onPress={() => setGuest(true)}
            style={{ width: '100%' }}
          >
            Continue as Guest
          </Button>
        </Animated.View>
      </View>
    </View>
  );
}
