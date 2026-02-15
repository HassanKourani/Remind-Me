import { useEffect, useState } from 'react';
import { Keyboard, Pressable, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';

import { useThemeColor } from '@/hooks/use-theme-color';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function KeyboardDismissButton() {
  const primary = useThemeColor({}, 'primary');
  const [visible, setVisible] = useState(false);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setVisible(true);
      opacity.value = withTiming(1, { duration: 200 });
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      opacity.value = withTiming(0, { duration: 150 });
      setTimeout(() => setVisible(false), 150);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <AnimatedPressable
      onPress={() => Keyboard.dismiss()}
      style={[
        {
          position: 'absolute',
          bottom: 20,
          right: 20,
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: primary + 'E6',
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          zIndex: 100,
        },
        animatedStyle,
      ]}
      hitSlop={8}
    >
      <MaterialIcons name="keyboard-hide" size={24} color="#FFFFFF" />
    </AnimatedPressable>
  );
}
