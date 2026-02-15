import { useEffect } from 'react';
import { Dimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Toast as ToastData, ToastType } from '@/stores/toast-store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const typeColors: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: '#ECFDF5', border: '#10B981', icon: '#059669' },
  error: { bg: '#FEF2F2', border: '#EF4444', icon: '#DC2626' },
  warning: { bg: '#FFFBEB', border: '#F59E0B', icon: '#D97706' },
  info: { bg: '#EFF6FF', border: '#3B82F6', icon: '#2563EB' },
};

const typeIcons: Record<ToastType, string> = {
  success: '\u2713',
  error: '\u2717',
  warning: '!',
  info: 'i',
};

interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

export function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const translateY = useSharedValue(-100);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const colors = typeColors[toast.type];

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    opacity.value = withTiming(1, { duration: 200 });

    const timeout = setTimeout(() => {
      dismiss();
    }, toast.duration ?? 4000);

    return () => clearTimeout(timeout);
  }, []);

  const dismiss = () => {
    translateY.value = withTiming(-100, { duration: 250 });
    opacity.value = withTiming(0, { duration: 250 }, () => {
      runOnJS(onDismiss)(toast.id);
    });
  };

  const swipeGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationX > 0) {
        translateX.value = event.translationX;
      }
      if (event.translationY < 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationX > SCREEN_WIDTH * 0.3 || event.translationY < -50) {
        translateX.value = withTiming(SCREEN_WIDTH, { duration: 200 });
        opacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(onDismiss)(toast.id);
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={swipeGesture}>
      <Animated.View
        style={[
          {
            marginHorizontal: 16,
            marginTop: 8,
            padding: 16,
            borderRadius: 12,
            backgroundColor: colors.bg,
            borderLeftWidth: 4,
            borderLeftColor: colors.border,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          },
          animatedStyle,
        ]}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Animated.Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
            {typeIcons[toast.type]}
          </Animated.Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Animated.Text style={{ color: '#1F2937', fontSize: 15, fontWeight: '600' }}>
            {toast.title}
          </Animated.Text>
          {toast.message && (
            <Animated.Text style={{ color: '#4B5563', fontSize: 13 }}>
              {toast.message}
            </Animated.Text>
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
