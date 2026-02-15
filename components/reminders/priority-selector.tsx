import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useThemeColor } from '@/hooks/use-theme-color';
import { PRIORITIES } from '@/types/reminder';
import type { Priority } from '@/types/reminder';

interface PrioritySelectorProps {
  value: Priority;
  onChange: (priority: Priority) => void;
}

export function PrioritySelector({ value, onChange }: PrioritySelectorProps) {
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');

  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {PRIORITIES.map((p) => {
        const isActive = value === p.value;
        return (
          <Pressable
            key={p.value}
            onPress={() => onChange(p.value)}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isActive ? p.color + '15' : surface,
              borderRadius: 12,
              paddingVertical: 10,
              borderWidth: 1.5,
              borderColor: isActive ? p.color : border,
            }}
          >
            <Animated.Text
              style={{
                color: p.color,
                fontSize: 14,
                fontWeight: '600',
              }}
            >
              {p.label}
            </Animated.Text>
          </Pressable>
        );
      })}
    </View>
  );
}
