import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useThemeColor } from '@/hooks/use-theme-color';
import type { ReminderType } from '@/types/reminder';

interface TypeSelectorProps {
  value: ReminderType;
  onChange: (type: ReminderType) => void;
}

const TYPES: { value: ReminderType; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { value: 'time', label: 'Time', icon: 'schedule' },
  { value: 'location', label: 'Location', icon: 'location-on' },
];

export function TypeSelector({ value, onChange }: TypeSelectorProps) {
  const primary = useThemeColor({}, 'primary');
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const border = useThemeColor({}, 'border');

  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {TYPES.map((type) => {
        const isActive = value === type.value;
        return (
          <Pressable
            key={type.value}
            onPress={() => onChange(type.value)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: isActive ? primary + '15' : surface,
              borderRadius: 12,
              paddingVertical: 12,
              borderWidth: 1.5,
              borderColor: isActive ? primary : border,
            }}
          >
            <MaterialIcons
              name={type.icon}
              size={20}
              color={isActive ? primary : text}
            />
            <Animated.Text
              style={{
                color: isActive ? primary : text,
                fontSize: 15,
                fontWeight: '600',
              }}
            >
              {type.label}
            </Animated.Text>
          </Pressable>
        );
      })}
    </View>
  );
}
