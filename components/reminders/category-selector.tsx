import { Pressable, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useThemeColor } from '@/hooks/use-theme-color';
import { CATEGORIES } from '@/types/reminder';
import type { Category } from '@/types/reminder';

interface CategorySelectorProps {
  value: Category;
  onChange: (category: Category) => void;
}

export function CategorySelector({ value, onChange }: CategorySelectorProps) {
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {CATEGORIES.map((cat) => {
        const isActive = value === cat.value;
        return (
          <Pressable
            key={cat.value}
            onPress={() => onChange(cat.value)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: isActive ? cat.color + '15' : surface,
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: isActive ? cat.color : border,
            }}
          >
            <MaterialIcons
              name={cat.icon as keyof typeof MaterialIcons.glyphMap}
              size={16}
              color={cat.color}
            />
            <Animated.Text
              style={{
                color: cat.color,
                fontSize: 13,
                fontWeight: isActive ? '600' : '500',
              }}
            >
              {cat.label}
            </Animated.Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
