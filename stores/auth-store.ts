import { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

interface AuthState {
  session: Session | null;
  user: User | null;
  isGuest: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  isBiometricEnabled: boolean;

  setSession: (session: Session | null) => void;
  setGuest: (isGuest: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setInitialized: (isInitialized: boolean) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  signOut: () => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isGuest: false,
  isLoading: true,
  isInitialized: false,
  isBiometricEnabled: false,

  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      isGuest: false,
    }),

  setGuest: (isGuest) =>
    set({
      isGuest,
      session: null,
      user: null,
    }),

  setLoading: (isLoading) => set({ isLoading }),
  setInitialized: (isInitialized) => set({ isInitialized }),
  setBiometricEnabled: (enabled) => set({ isBiometricEnabled: enabled }),

  signOut: () =>
    set({
      session: null,
      user: null,
      isGuest: false,
    }),

  reset: () =>
    set({
      session: null,
      user: null,
      isGuest: false,
      isLoading: true,
      isInitialized: false,
      isBiometricEnabled: false,
    }),
}));
