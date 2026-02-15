import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { PageHeader } from '@/components/ui/page-header';
import { useThemeColor } from '@/hooks/use-theme-color';

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
  color: string;
}) {
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const border = useThemeColor({}, 'border');

  return (
    <View
      style={{
        backgroundColor: surface,
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        borderWidth: 1,
        borderColor: border,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: color + '18',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialIcons name={icon} size={24} color={color} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Animated.Text style={{ color: text, fontSize: 15, fontWeight: '600' }}>
          {title}
        </Animated.Text>
        <Animated.Text style={{ color: textSecondary, fontSize: 13, lineHeight: 18 }}>
          {description}
        </Animated.Text>
      </View>
    </View>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');
  const primary = useThemeColor({}, 'primary');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');
  const accent = useThemeColor({}, 'accent');
  const error = useThemeColor({}, 'error');

  return (
    <View style={{ flex: 1, backgroundColor }}>
      {/* Primary header card */}
      <PageHeader>
        <View style={{ gap: 4 }}>
          <Animated.Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '700' }}>
            Explore
          </Animated.Text>
          <Animated.Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
            Discover what RemindMe Pro can do for you
          </Animated.Text>
        </View>
      </PageHeader>

      {/* Features list below */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: insets.bottom + 100,
          gap: 12,
        }}
      >
        <Animated.Text style={{ color: text, fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
          Features
        </Animated.Text>

        <FeatureCard
          icon="location-on"
          title="Location Reminders"
          description="Get notified when you arrive at or leave a specific place."
          color={primary}
        />
        <FeatureCard
          icon="schedule"
          title="Smart Scheduling"
          description="Set one-time or recurring reminders with flexible repeat options."
          color={success}
        />
        <FeatureCard
          icon="category"
          title="Categories & Tags"
          description="Organize your reminders with custom categories and color-coded tags."
          color={warning}
        />
        <FeatureCard
          icon="notifications-active"
          title="Priority Alerts"
          description="Mark important reminders as high priority for persistent notifications."
          color={error}
        />
        <FeatureCard
          icon="cloud-sync"
          title="Cross-Device Sync"
          description="Access your reminders from any device with real-time cloud sync."
          color={accent}
        />
        <FeatureCard
          icon="dark-mode"
          title="Dark Mode"
          description="Easy on the eyes with full dark mode support across every screen."
          color={primary}
        />
      </ScrollView>
    </View>
  );
}
