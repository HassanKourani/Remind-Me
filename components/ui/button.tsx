import { forwardRef } from 'react';
import { Pressable, type PressableProps, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useThemeColor } from '@/hooks/use-theme-color';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Variant = 'filled' | 'outlined' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
}

const sizeStyles: Record<Size, { height: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { height: 40, paddingHorizontal: 16, fontSize: 14 },
  md: { height: 48, paddingHorizontal: 24, fontSize: 16 },
  lg: { height: 56, paddingHorizontal: 32, fontSize: 18 },
};

export const Button = forwardRef<typeof Pressable, ButtonProps>(function Button(
  { variant = 'filled', size = 'md', loading = false, disabled, icon, children, style, ...props },
  _ref,
) {
  const primary = useThemeColor({}, 'primary');
  const text = useThemeColor({}, 'text');
  const border = useThemeColor({}, 'border');

  const scale = useSharedValue(1);
  const spinRotation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinRotation.value}deg` }],
  }));

  if (loading && spinRotation.value === 0) {
    spinRotation.value = withRepeat(withTiming(360, { duration: 800 }), -1, false);
  }

  const sizeConfig = sizeStyles[size];
  const isDisabled = disabled || loading;

  const getBackgroundColor = () => {
    if (variant === 'filled') return primary;
    return 'transparent';
  };

  const getBorderColor = () => {
    if (variant === 'outlined') return primary;
    return 'transparent';
  };

  const getTextColor = () => {
    if (variant === 'filled') return '#FFFFFF';
    return primary;
  };

  return (
    <AnimatedPressable
      disabled={isDisabled}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      style={[
        {
          height: sizeConfig.height,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outlined' ? 1.5 : 0,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: isDisabled ? 0.5 : 1,
        },
        animatedStyle,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <Animated.View
          style={[
            {
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: 2.5,
              borderColor: variant === 'filled' ? 'rgba(255,255,255,0.3)' : `${primary}33`,
              borderTopColor: variant === 'filled' ? '#FFFFFF' : primary,
            },
            spinnerStyle,
          ]}
        />
      ) : (
        <>
          {icon}
          <Animated.Text
            style={{
              color: getTextColor(),
              fontSize: sizeConfig.fontSize,
              fontWeight: '600',
            }}
          >
            {children}
          </Animated.Text>
        </>
      )}
    </AnimatedPressable>
  );
});
