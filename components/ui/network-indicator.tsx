import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useNetworkStore } from '@/stores/network-store';

export function NetworkIndicator() {
  const isOnline = useNetworkStore((s) => s.isOnline);

  if (isOnline) return null;

  return <MaterialIcons name="cloud-off" size={20} color="rgba(255,255,255,0.7)" />;
}
