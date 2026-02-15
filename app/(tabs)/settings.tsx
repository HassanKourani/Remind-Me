import { Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';

import { PageHeader } from '@/components/ui/page-header';
import { NetworkIndicator } from '@/components/ui/network-indicator';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuthStore } from '@/stores/auth-store';
import { useReminderStore } from '@/stores/reminder-store';
import { supabase } from '@/lib/supabase';
import { clearOwnerData } from '@/lib/reminder-repository';
import { cancelAllNotifications } from '@/lib/notifications';
import { useToastStore } from '@/stores/toast-store';

function SettingsRow({
  icon,
  label,
  onPress,
  color,
  destructive,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress?: () => void;
  color?: string;
  destructive?: boolean;
}) {
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const border = useThemeColor({}, 'border');
  const error = useThemeColor({}, 'error');
  const iconColor = useThemeColor({}, 'icon');

  const labelColor = destructive ? error : text;
  const rowIconColor = color || (destructive ? error : iconColor);

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: surface,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 14,
        borderBottomWidth: 1,
        borderBottomColor: border,
      }}
    >
      <MaterialIcons name={icon} size={22} color={rowIconColor} />
      <Animated.Text style={{ color: labelColor, fontSize: 15, fontWeight: '500', flex: 1 }}>
        {label}
      </Animated.Text>
      <MaterialIcons name="chevron-right" size={20} color={border} />
    </Pressable>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');

  return (
    <View style={{ gap: 6 }}>
      <Animated.Text
        style={{ color: textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 4 }}
      >
        {title}
      </Animated.Text>
      <View style={{ borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: border }}>
        {children}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const primary = useThemeColor({}, 'primary');
  const router = useRouter();

  const isGuest = useAuthStore((s) => s.isGuest);
  const user = useAuthStore((s) => s.user);
  const setGuest = useAuthStore((s) => s.setGuest);
  const addToast = useToastStore((s) => s.addToast);
  const clearAllReminders = useReminderStore((s) => s.clearAll);

  const handleSignOut = async () => {
    const ownerId = isGuest ? 'guest' : user?.id;

    // Wipe local data
    if (ownerId) {
      await clearOwnerData(ownerId);
    }
    clearAllReminders();
    await cancelAllNotifications();

    if (isGuest) {
      setGuest(false);
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      addToast({ type: 'error', title: 'Sign out failed', message: error.message });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <PageHeader>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ gap: 4, flex: 1 }}>
            <Animated.Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '700' }}>
              Settings
            </Animated.Text>
            <Animated.Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
              {isGuest ? 'Guest Mode' : user?.email || 'Manage your account'}
            </Animated.Text>
          </View>
          <NetworkIndicator />
        </View>
      </PageHeader>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: insets.bottom + 100,
          gap: 24,
        }}
      >
        {isGuest && (
          <Pressable
            onPress={() => router.push('/(auth)/sign-in')}
            style={{
              backgroundColor: primary + '12',
              borderRadius: 14,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              borderWidth: 1,
              borderColor: primary + '30',
            }}
          >
            <MaterialIcons name="person-add" size={22} color={primary} />
            <View style={{ flex: 1 }}>
              <Animated.Text style={{ color: primary, fontSize: 15, fontWeight: '600' }}>
                Create an account
              </Animated.Text>
              <Animated.Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                Sign up to sync your reminders across devices
              </Animated.Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={primary} />
          </Pressable>
        )}

        <SettingsSection title="General">
          <SettingsRow icon="notifications" label="Notifications" />
          <SettingsRow icon="dark-mode" label="Appearance" />
          <SettingsRow icon="language" label="Language" />
        </SettingsSection>

        <SettingsSection title="Account">
          <SettingsRow icon="logout" label="Sign Out" onPress={handleSignOut} destructive />
        </SettingsSection>

        <Animated.Text
          style={{ color: textSecondary, fontSize: 12, textAlign: 'center', marginTop: 8 }}
        >
          RemindMe Pro v1.0.0
        </Animated.Text>
      </ScrollView>
    </View>
  );
}
