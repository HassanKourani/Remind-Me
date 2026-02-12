import { create } from 'zustand';
import { authService } from '@/services/supabase/auth';
import { supabase } from '@/services/supabase/client';
import { getDatabase } from '@/services/database/sqlite';
import { generateId } from '@/lib/utils';
import NetInfo from '@react-native-community/netinfo';

interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  isPremium: boolean;
  isGuest: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isConnected: boolean;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  linkGuestToAccount: (email: string, password: string, name?: string) => Promise<void>;
  syncPremiumWithRevenueCat: () => Promise<void>;
}

const DEFAULT_CATEGORIES = [
  { name: 'Personal', color: '#3b82f6', icon: 'user', sortOrder: 0 },
  { name: 'Work', color: '#8b5cf6', icon: 'briefcase', sortOrder: 1 },
  { name: 'Shopping', color: '#22c55e', icon: 'shopping-cart', sortOrder: 2 },
  { name: 'Health', color: '#ef4444', icon: 'heart', sortOrder: 3 },
  { name: 'Finance', color: '#f59e0b', icon: 'dollar-sign', sortOrder: 4 },
];

async function seedDefaultCategories(userId: string) {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories WHERE user_id = ?',
    [userId]
  );
  if (existing && existing.count > 0) return;

  for (const cat of DEFAULT_CATEGORIES) {
    await db.runAsync(
      `INSERT INTO categories (id, user_id, name, color, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
      [generateId(), userId, cat.name, cat.color, cat.icon, cat.sortOrder]
    );
  }
}

async function ensureLocalUser(id: string, email: string | null, displayName: string | null, isGuest: boolean) {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ id: string }>('SELECT id FROM users WHERE id = ?', [id]);
  if (!existing) {
    await db.runAsync(
      `INSERT INTO users (id, email, display_name, is_guest) VALUES (?, ?, ?, ?)`,
      [id, email, displayName, isGuest ? 1 : 0]
    );
  } else {
    await db.runAsync(
      `UPDATE users SET email = ?, display_name = ?, updated_at = datetime('now') WHERE id = ?`,
      [email, displayName, id]
    );
  }
  await seedDefaultCategories(id);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isConnected: true,

  initialize: async () => {
    try {
      set({ isLoading: true });

      // Check connectivity
      const netState = await NetInfo.fetch();
      set({ isConnected: netState.isConnected ?? false });

      // Listen for connectivity changes
      NetInfo.addEventListener((state) => {
        set({ isConnected: state.isConnected ?? false });
      });

      // Check for existing Supabase session
      const session = await authService.getSession();
      if (session?.user) {
        const profile = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        const user: User = {
          id: session.user.id,
          email: session.user.email ?? null,
          displayName: profile.data?.display_name ?? session.user.user_metadata?.display_name ?? null,
          isPremium: profile.data?.is_premium ?? false,
          isGuest: false,
        };

        await ensureLocalUser(user.id, user.email, user.displayName, false);
        set({ user, isAuthenticated: true });
        return;
      }

      // Check for local guest user
      const db = await getDatabase();
      const guestUser = await db.getFirstAsync<{ id: string; display_name: string | null }>(
        'SELECT id, display_name FROM users WHERE is_guest = 1 LIMIT 1'
      );

      if (guestUser) {
        set({
          user: {
            id: guestUser.id,
            email: null,
            displayName: guestUser.display_name,
            isPremium: false,
            isGuest: true,
          },
          isAuthenticated: true,
        });
      }
    } catch (error) {
      console.error('[Auth] Initialize error:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  signIn: async (email: string, password: string) => {
    const data = await authService.signIn(email, password);
    if (!data.user) throw new Error('Sign in failed');

    const profile = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    const user: User = {
      id: data.user.id,
      email: data.user.email ?? null,
      displayName: profile.data?.display_name ?? null,
      isPremium: profile.data?.is_premium ?? false,
      isGuest: false,
    };

    await ensureLocalUser(user.id, user.email, user.displayName, false);
    set({ user, isAuthenticated: true });
  },

  signUp: async (email: string, password: string, name?: string) => {
    const data = await authService.signUp(email, password, name);
    if (!data.user) throw new Error('Sign up failed');

    const user: User = {
      id: data.user.id,
      email: data.user.email ?? null,
      displayName: name ?? null,
      isPremium: false,
      isGuest: false,
    };

    await ensureLocalUser(user.id, user.email, user.displayName, false);
    set({ user, isAuthenticated: true });
  },

  signOut: async () => {
    try {
      const { user } = get();
      if (user && !user.isGuest) {
        await authService.signOut();
      }
      if (user?.isGuest) {
        // Clear guest data
        const db = await getDatabase();
        await db.execAsync(`
          DELETE FROM reminders WHERE user_id = '${user.id}';
          DELETE FROM categories WHERE user_id = '${user.id}';
          DELETE FROM users WHERE id = '${user.id}';
        `);
      }
    } catch (error) {
      console.error('[Auth] Sign out error:', error);
    }
    set({ user: null, isAuthenticated: false });
  },

  continueAsGuest: async () => {
    const guestId = `guest_${generateId()}`;
    await ensureLocalUser(guestId, null, 'Guest', true);
    set({
      user: {
        id: guestId,
        email: null,
        displayName: 'Guest',
        isPremium: false,
        isGuest: true,
      },
      isAuthenticated: true,
    });
  },

  linkGuestToAccount: async (email: string, password: string, name?: string) => {
    const { user } = get();
    if (!user?.isGuest) throw new Error('Not a guest user');

    const oldId = user.id;
    const data = await authService.signUp(email, password, name);
    if (!data.user) throw new Error('Account creation failed');

    const newId = data.user.id;
    const db = await getDatabase();

    // Migrate all guest data to the new user
    await db.runAsync('UPDATE reminders SET user_id = ? WHERE user_id = ?', [newId, oldId]);
    await db.runAsync('UPDATE categories SET user_id = ? WHERE user_id = ?', [newId, oldId]);
    await db.runAsync('UPDATE saved_places SET user_id = ? WHERE user_id = ?', [newId, oldId]);
    await db.runAsync('DELETE FROM users WHERE id = ?', [oldId]);

    await ensureLocalUser(newId, email, name ?? null, false);

    set({
      user: {
        id: newId,
        email,
        displayName: name ?? null,
        isPremium: false,
        isGuest: false,
      },
      isAuthenticated: true,
    });
  },

  syncPremiumWithRevenueCat: async () => {
    const { user } = get();
    if (!user || user.isGuest) return;

    try {
      const { checkPremiumStatus } = await import('@/services/purchases/revenueCat');
      const { isPremium } = await checkPremiumStatus();

      // Update local state only (server is updated by webhook)
      const db = await getDatabase();
      await db.runAsync(
        'UPDATE users SET is_premium = ? WHERE id = ?',
        [isPremium ? 1 : 0, user.id]
      );

      set({ user: { ...user, isPremium } });
    } catch (error) {
      console.error('[Auth] Failed to sync premium status:', error);
    }
  },
}));
