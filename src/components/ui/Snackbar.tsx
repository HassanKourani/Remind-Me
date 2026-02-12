import { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';

interface SnackbarProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
  visible: boolean;
  onDismiss: () => void;
}

export function Snackbar({
  message,
  actionLabel,
  onAction,
  duration = 5000,
  visible,
  onDismiss,
}: SnackbarProps) {
  const translateY = useRef(new Animated.Value(100)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();

      timerRef.current = setTimeout(() => {
        dismiss();
      }, duration);
    } else {
      Animated.timing(translateY, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  const dismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.timing(translateY, {
      toValue: 100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onDismiss());
  };

  const handleAction = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onAction?.();
    dismiss();
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={{ transform: [{ translateY }] }}
      className="absolute bottom-20 left-4 right-4 z-50 flex-row items-center justify-between rounded-xl bg-slate-800 px-4 py-3.5 shadow-lg"
    >
      <Text className="mr-3 flex-1 text-sm text-white" numberOfLines={2}>
        {message}
      </Text>
      {actionLabel && onAction && (
        <Pressable onPress={handleAction} hitSlop={8}>
          <Text className="text-sm font-bold text-sky-400">{actionLabel}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}
