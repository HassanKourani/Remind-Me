# UI Components

## Button (`components/ui/button.tsx`)

Animated button with press feedback and loading state.

### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'filled' \| 'outlined' \| 'ghost'` | `'filled'` | Visual style |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Height and font size |
| `loading` | `boolean` | `false` | Shows spinner, disables press |
| `disabled` | `boolean` | `false` | Reduces opacity, disables press |
| `icon` | `ReactNode` | — | Icon rendered before text |
| `children` | `ReactNode` | — | Button label |
| `style` | `ViewStyle` | — | Additional styles |

### Size Dimensions
| Size | Height | Padding | Font |
|------|--------|---------|------|
| `sm` | 40 | 16 | 14 |
| `md` | 48 | 24 | 16 |
| `lg` | 56 | 32 | 18 |

### Example
```tsx
<Button variant="filled" size="lg" loading={isLoading} onPress={handleSubmit}>
  Sign In
</Button>

<Button
  variant="outlined"
  icon={<MaterialIcons name="mail-outline" size={20} color={primary} />}
>
  Send Magic Link
</Button>
```

---

## Input (`components/ui/input.tsx`)

Text input with animated focus border, error shake, and password toggle.

### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | — | Label text above input |
| `error` | `string \| null` | — | Error message (triggers shake) |
| `rightIcon` | `ReactNode` | — | Icon on the right side |
| `secureTextEntry` | `boolean` | `false` | Password mode with Show/Hide toggle |
| `...TextInputProps` | — | — | All React Native TextInput props |

### Example
```tsx
<Input
  label="Email"
  placeholder="you@example.com"
  keyboardType="email-address"
  value={email}
  onChangeText={setEmail}
  error={emailError}
/>

<Input
  label="Password"
  placeholder="Enter your password"
  secureTextEntry
  value={password}
  onChangeText={setPassword}
  error={passwordError}
/>
```

---

## Divider (`components/ui/divider.tsx`)

Horizontal separator with optional centered text.

### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string` | — | Centered text (e.g., "or") |

### Example
```tsx
<Divider />
<Divider text="or" />
```

---

## Toast (`components/ui/toast.tsx`)

Animated toast notification with swipe-to-dismiss.

### Toast Data Shape
```tsx
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number; // default 4000ms
}
```

### Usage (via store)
```tsx
import { useToastStore } from '@/stores/toast-store';

const addToast = useToastStore((s) => s.addToast);
addToast({ type: 'success', title: 'Done!', message: 'Your changes were saved.' });
addToast({ type: 'error', title: 'Failed', message: 'Something went wrong.' });
```

### Behavior
- Slides in from top with spring animation
- Auto-dismisses after `duration` (default 4s)
- Swipe right or up to dismiss manually
- Color-coded left border by type

---

## Toast Provider (`components/providers/toast-provider.tsx`)

Renders active toasts above all content. Mounted once in root layout.

### Usage
Already included in `app/_layout.tsx`:
```tsx
<ToastProvider />
```

---

## Guest Banner (`components/ui/guest-banner.tsx`)

Persistent warning banner for guest users.

### Behavior
- Shown at top of tab layout when `isGuest === true`
- Warning-colored background (15% opacity)
- Cloud-off icon + explanatory text
- "Sign up" link navigates to sign-up screen
- Enters with spring animation

### Usage
Already included in `app/(tabs)/_layout.tsx`:
```tsx
{isGuest && <GuestBanner />}
```
