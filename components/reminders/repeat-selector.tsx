import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useThemeColor } from '@/hooks/use-theme-color';
import { WeekdayPicker } from './weekday-picker';
import type { RepeatType } from '@/types/reminder';

interface RepeatConfig {
  type: RepeatType;
  interval: number | null;
  unit: 'days' | 'weeks' | null;
  days: number[] | null;
}

interface RepeatSelectorProps {
  value: RepeatConfig;
  onChange: (config: RepeatConfig) => void;
}

const REPEAT_OPTIONS: { value: RepeatType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
];

export function RepeatSelector({ value, onChange }: RepeatSelectorProps) {
  const primary = useThemeColor({}, 'primary');
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const border = useThemeColor({}, 'border');

  const [expanded, setExpanded] = useState(value.type !== 'none');

  const handleTypeChange = (type: RepeatType) => {
    if (type === 'none') {
      onChange({ type: 'none', interval: null, unit: null, days: null });
    } else if (type === 'daily') {
      onChange({ type: 'daily', interval: null, unit: null, days: null });
    } else if (type === 'weekly') {
      onChange({ type: 'weekly', interval: null, unit: null, days: value.days ?? [] });
    } else if (type === 'monthly') {
      onChange({ type: 'monthly', interval: null, unit: null, days: null });
    } else if (type === 'custom') {
      onChange({ type: 'custom', interval: value.interval ?? 2, unit: value.unit ?? 'days', days: null });
    }
    setExpanded(type !== 'none');
  };

  return (
    <View style={{ gap: 12 }}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Animated.Text style={{ color: textSecondary, fontSize: 14, fontWeight: '500' }}>
          Repeat
        </Animated.Text>
        <Animated.Text style={{ color: primary, fontSize: 14, fontWeight: '500' }}>
          {REPEAT_OPTIONS.find((o) => o.value === value.type)?.label ?? 'None'}
        </Animated.Text>
      </Pressable>

      {expanded && (
        <View style={{ gap: 12 }}>
          {/* Repeat type pills */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {REPEAT_OPTIONS.map((option) => {
              const isActive = value.type === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => handleTypeChange(option.value)}
                  style={{
                    backgroundColor: isActive ? primary + '15' : surface,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderWidth: 1,
                    borderColor: isActive ? primary : border,
                  }}
                >
                  <Animated.Text
                    style={{
                      color: isActive ? primary : text,
                      fontSize: 13,
                      fontWeight: isActive ? '600' : '500',
                    }}
                  >
                    {option.label}
                  </Animated.Text>
                </Pressable>
              );
            })}
          </View>

          {/* Weekly: weekday picker */}
          {value.type === 'weekly' && (
            <WeekdayPicker
              value={value.days ?? []}
              onChange={(days) => onChange({ ...value, days })}
            />
          )}

          {/* Custom: interval + unit */}
          {value.type === 'custom' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Animated.Text style={{ color: textSecondary, fontSize: 14 }}>Every</Animated.Text>
              <TextInput
                value={String(value.interval ?? '')}
                onChangeText={(t) => {
                  const n = parseInt(t, 10);
                  onChange({ ...value, interval: isNaN(n) ? null : n });
                }}
                keyboardType="number-pad"
                style={{
                  backgroundColor: surface,
                  borderWidth: 1,
                  borderColor: border,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  width: 60,
                  textAlign: 'center',
                  color: text,
                  fontSize: 15,
                }}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['days', 'weeks'] as const).map((unit) => {
                  const isActive = value.unit === unit;
                  return (
                    <Pressable
                      key={unit}
                      onPress={() => onChange({ ...value, unit })}
                      style={{
                        backgroundColor: isActive ? primary + '15' : surface,
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderWidth: 1,
                        borderColor: isActive ? primary : border,
                      }}
                    >
                      <Animated.Text
                        style={{
                          color: isActive ? primary : text,
                          fontSize: 13,
                          fontWeight: isActive ? '600' : '500',
                        }}
                      >
                        {unit}
                      </Animated.Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
