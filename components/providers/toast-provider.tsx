import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';

import { ToastItem } from '@/components/ui/toast';
import { useToastStore } from '@/stores/toast-store';

export function ToastProvider() {
  const insets = useSafeAreaInsets();
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: insets.top,
        left: 0,
        right: 0,
        zIndex: 9999,
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </View>
  );
}
