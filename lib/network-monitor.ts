import NetInfo, { type NetInfoSubscription } from '@react-native-community/netinfo';

import { useNetworkStore } from '@/stores/network-store';

let subscription: NetInfoSubscription | null = null;
let onReconnectCallback: (() => void) | null = null;

export function startNetworkMonitor(onReconnect?: () => void): void {
  if (subscription) return;

  onReconnectCallback = onReconnect ?? null;
  let wasOffline = false;

  subscription = NetInfo.addEventListener((state) => {
    const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
    const prevOnline = useNetworkStore.getState().isOnline;

    useNetworkStore.getState().setOnline(isOnline);

    if (isOnline && !prevOnline && wasOffline && onReconnectCallback) {
      onReconnectCallback();
    }

    if (!isOnline) {
      wasOffline = true;
    }
  });
}

export function stopNetworkMonitor(): void {
  subscription?.();
  subscription = null;
  onReconnectCallback = null;
}
