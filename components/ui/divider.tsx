import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useThemeColor } from '@/hooks/use-theme-color';

interface DividerProps {
  text?: string;
}

export function Divider({ text }: DividerProps) {
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');

  if (!text) {
    return <View style={{ height: 1, backgroundColor: borderColor }} />;
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 4 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: borderColor }} />
      <Animated.Text style={{ color: textSecondary, fontSize: 14 }}>{text}</Animated.Text>
      <View style={{ flex: 1, height: 1, backgroundColor: borderColor }} />
    </View>
  );
}
