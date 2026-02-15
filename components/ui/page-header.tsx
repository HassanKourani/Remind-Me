import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useThemeColor } from '@/hooks/use-theme-color';

interface PageHeaderProps {
  children: ReactNode;
  onBack?: () => void;
}

export function PageHeader({ children, onBack }: PageHeaderProps) {
  const insets = useSafeAreaInsets();
  const primary = useThemeColor({}, 'primary');

  return (
    <View
      style={{
        backgroundColor: primary,
        paddingTop: insets.top + 16,
        paddingBottom: 28,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        gap: 16,
        shadowColor: primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 12,
      }}
    >
      {onBack && (
        <Pressable onPress={onBack} hitSlop={12} style={{ alignSelf: 'flex-start' }}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
      )}
      {children}
    </View>
  );
}
