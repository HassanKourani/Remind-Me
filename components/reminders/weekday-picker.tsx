import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useThemeColor } from '@/hooks/use-theme-color';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface WeekdayPickerProps {
  value: number[];
  onChange: (days: number[]) => void;
}

export function WeekdayPicker({ value, onChange }: WeekdayPickerProps) {
  const primary = useThemeColor({}, 'primary');
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const border = useThemeColor({}, 'border');

  const toggleDay = (dayIndex: number) => {
    if (value.includes(dayIndex)) {
      onChange(value.filter((d) => d !== dayIndex));
    } else {
      onChange([...value, dayIndex].sort());
    }
  };

  return (
    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
      {DAYS.map((day, index) => {
        const isActive = value.includes(index);
        return (
          <Pressable
            key={index}
            onPress={() => toggleDay(index)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: isActive ? primary : surface,
              borderWidth: 1,
              borderColor: isActive ? primary : border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Animated.Text
              style={{
                color: isActive ? '#FFFFFF' : text,
                fontSize: 14,
                fontWeight: '600',
              }}
            >
              {day}
            </Animated.Text>
          </Pressable>
        );
      })}
    </View>
  );
}
