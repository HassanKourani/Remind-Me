import { useState } from 'react';
import { Pressable, TextInput, type TextInputProps, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

import { useThemeColor } from '@/hooks/use-theme-color';

const AnimatedView = Animated.createAnimatedComponent(View);

interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  rightIcon?: React.ReactNode;
}

export function Input({ label, error, rightIcon, secureTextEntry, multiline, style, ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry ?? false);

  const primary = useThemeColor({}, 'primary');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surface = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');
  const errorColor = useThemeColor({}, 'error');

  const focusProgress = useSharedValue(0);
  const shakeX = useSharedValue(0);

  const containerStyle = useAnimatedStyle(() => {
    const animatedBorder = interpolateColor(
      focusProgress.value,
      [0, 1],
      [error ? errorColor : borderColor, error ? errorColor : primary],
    );
    return {
      borderColor: animatedBorder,
      transform: [{ translateX: shakeX.value }],
    };
  });

  const triggerShake = () => {
    shakeX.value = withSequence(
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  };

  // Trigger shake when error appears
  if (error && shakeX.value === 0) {
    triggerShake();
  }

  return (
    <View style={{ gap: 6 }}>
      {label && (
        <Animated.Text style={{ color: textSecondary, fontSize: 14, fontWeight: '500' }}>
          {label}
        </Animated.Text>
      )}
      <AnimatedView
        style={[
          {
            flexDirection: 'row',
            ...(multiline ? {} : { alignItems: 'center' }),
            backgroundColor: surface,
            borderWidth: 1.5,
            borderRadius: 12,
            paddingHorizontal: 16,
            ...(multiline
              ? { minHeight: 100, paddingVertical: 12 }
              : { height: 48 }),
          },
          containerStyle,
        ]}
      >
        <TextInput
          placeholderTextColor={textSecondary + '80'}
          secureTextEntry={isSecure}
          multiline={multiline}
          onFocus={() => {
            setIsFocused(true);
            focusProgress.value = withTiming(1, { duration: 200 });
          }}
          onBlur={() => {
            setIsFocused(false);
            focusProgress.value = withTiming(0, { duration: 200 });
          }}
          style={[
            {
              flex: 1,
              color: textColor,
              fontSize: 16,
              ...(multiline
                ? { textAlignVertical: 'top' }
                : { height: '100%' }),
            },
            style,
          ]}
          {...props}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setIsSecure(!isSecure)} hitSlop={8}>
            <Animated.Text style={{ color: textSecondary, fontSize: 14 }}>
              {isSecure ? 'Show' : 'Hide'}
            </Animated.Text>
          </Pressable>
        )}
        {rightIcon && !secureTextEntry && rightIcon}
      </AnimatedView>
      {error && (
        <Animated.Text style={{ color: errorColor, fontSize: 13, marginLeft: 4 }}>
          {error}
        </Animated.Text>
      )}
    </View>
  );
}
