# State Management

## Overview

RemindMe Pro uses [Zustand](https://github.com/pmndrs/zustand) for global state management. Zustand was chosen for its minimal API, TypeScript support, and lack of boilerplate.

## Auth Store (`stores/auth-store.ts`)

Manages authentication state for the entire app.

### State
| Field | Type | Description |
|-------|------|-------------|
| `session` | `Session \| null` | Supabase session object |
| `user` | `User \| null` | Derived from session |
| `isGuest` | `boolean` | Guest mode active |
| `isLoading` | `boolean` | Auth operation in progress |
| `isInitialized` | `boolean` | Initial session check complete |
| `isBiometricEnabled` | `boolean` | Biometric unlock preference |

### Actions
| Action | Description |
|--------|-------------|
| `setSession(session)` | Sets session + user, clears guest |
| `setGuest(isGuest)` | Enables guest mode, clears session |
| `setLoading(isLoading)` | Toggles loading state |
| `setInitialized(isInitialized)` | Marks init complete |
| `setBiometricEnabled(enabled)` | Updates biometric preference |
| `signOut()` | Clears session, user, and guest |
| `reset()` | Resets all state to defaults |

### Usage
```tsx
import { useAuthStore } from '@/stores/auth-store';

// In components (selective subscription)
const session = useAuthStore((s) => s.session);
const isGuest = useAuthStore((s) => s.isGuest);
const setGuest = useAuthStore((s) => s.setGuest);

// Outside React
const { session } = useAuthStore.getState();
```

### Design Decisions
- **No persistence middleware**: Supabase handles session persistence via AsyncStorage automatically. The store is rehydrated from Supabase on cold start.
- **Selective subscriptions**: Always use selector functions `(s) => s.field` to avoid unnecessary re-renders.

---

## Toast Store (`stores/toast-store.ts`)

Manages the queue of toast notifications displayed to the user.

### State
| Field | Type | Description |
|-------|------|-------------|
| `toasts` | `Toast[]` | Active toast queue |

### Actions
| Action | Description |
|--------|-------------|
| `addToast(toast)` | Adds a toast (auto-generates `id`) |
| `removeToast(id)` | Removes a toast by ID |

### Toast Shape
```tsx
interface Toast {
  id: string;          // Auto-generated
  type: ToastType;     // 'success' | 'error' | 'warning' | 'info'
  title: string;       // Bold heading
  message?: string;    // Optional body text
  duration?: number;   // Auto-dismiss ms (default 4000)
}
```

### Usage
```tsx
import { useToastStore } from '@/stores/toast-store';

const addToast = useToastStore((s) => s.addToast);

// Success
addToast({ type: 'success', title: 'Saved!', message: 'Your reminder was created.' });

// Error (replaces native alerts)
addToast({ type: 'error', title: 'Sign in failed', message: error.message });

// Custom duration
addToast({ type: 'info', title: 'Tip', message: 'Swipe to dismiss', duration: 6000 });
```

## Patterns

### Selector Pattern
Always use selectors to minimize re-renders:
```tsx
// Good — only re-renders when isGuest changes
const isGuest = useAuthStore((s) => s.isGuest);

// Bad — re-renders on ANY state change
const store = useAuthStore();
```

### Accessing State Outside React
```tsx
// Useful in async functions, services, etc.
const { session } = useAuthStore.getState();
useToastStore.getState().addToast({ type: 'error', title: 'Error' });
```
