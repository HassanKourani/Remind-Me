# 05 - Screens, Navigation & Components

## Navigation Structure

### Root Layout (`app/_layout.tsx`)

Initializes `Sentry.init()` first (DSN from env), then wraps the entire app in:
1. `Sentry.ErrorBoundary` (automatic crash reporting for all screens)
2. `GestureHandlerRootView` (for gestures/bottom sheets)
3. `QueryClientProvider` (React Query with 5min stale time)

All screens are wrapped with Sentry's error boundary so unhandled exceptions are automatically captured and reported.

Renders a `Stack` navigator with:
- `(auth)` - Auth screens (stack)
- `(tabs)` - Main app (tab bar)
- `reminder/create` - Modal presentation
- `reminder/[id]` - Slide from right
- `premium/index` - Modal presentation

### Auth Flow (`app/(auth)/`)

**Layout**: Stack navigator. Redirects to `(tabs)` if already authenticated.

| Screen | Route | Description |
|---|---|---|
| Welcome | `/(auth)/welcome` | Landing with feature cards, 3 CTAs: Get Started, Sign In, Continue as Guest |
| Login | `/(auth)/login` | Email + password, show/hide toggle, forgot password link |
| Register | `/(auth)/register` | Name + email + password + confirm, strength indicator |
| Forgot Password | `/(auth)/forgot-password` | Email input, sends reset via Supabase |
| Reset Password | `/(auth)/reset-password` | New password + confirm, reached via deep link |

### Main App (`app/(tabs)/`)

**Layout**: Tab bar with 3 tabs using Expo Router `Tabs` component.

| Tab | Route | Icon | Description |
|---|---|---|---|
| Today | `/(tabs)/` | `calendar-check` | Today's reminders with stats dashboard |
| Reminders | `/(tabs)/reminders` | `bell` | All reminders list with filters, search, and pagination |
| Settings | `/(tabs)/settings` | `settings` | Account, premium, permissions, sync |

### Other Screens

| Screen | Route | Presentation |
|---|---|---|
| Create Reminder | `/reminder/create` | Modal |
| Reminder Detail | `/reminder/[id]` | Push (slide right) |
| Premium | `/premium/index` | Modal |
| Terms | `/legal/terms` | Push |
| Privacy | `/legal/privacy` | Push |

---

## Screen Details

### Today Screen (`app/(tabs)/index.tsx`)

**Features:**
- Dynamic greeting based on time of day ("Good morning", "Good afternoon", "Good evening")
- Stats cards: Total reminders, Completed today, Pending
- Progress bar with completion percentage
- Guest mode banner: "Sign up to enable cloud sync"
- Connection status indicator
- Reminder list using `ReminderCard` component
- Pull-to-refresh via `RefreshControl` (calls React Query `refetch()`; if the user is authenticated and not a guest, also triggers `processSyncQueue()` + `pullFromCloud()` to sync with the server)
- FAB (floating action button) linking to `/reminder/create`
- Empty state with illustration text
- Snackbar appears at the bottom when a reminder is completed or deleted (see Snackbar component below)

**Data:** Uses `useTodayReminders()` hook

**Error handling:** Wrapped in `ErrorBoundary` component (see UI components below)

### Reminders Screen (`app/(tabs)/reminders.tsx`)

**Features:**
- Search bar at the top that filters reminders by title and notes. Uses debounced input (300ms delay) via the `useSearch` hook from `src/hooks/useSearch.ts`. The hook accepts the full reminder list and a query string, returning filtered results.
- All reminders list displayed in a `FlatList` with `onEndReached` for infinite scroll pagination. Loads 50 reminders at a time via the paginated repository method. As the user scrolls near the bottom, the next page is fetched automatically.
- Filter by: All, Active, Completed
- Sort by date
- Swipe actions (complete, delete) -- both show a Snackbar with an "Undo" button (see Snackbar component)
- Long-press a reminder to enter **multi-select mode**. When active, tapping reminders toggles their selection (with a checkbox indicator). A toolbar appears at the bottom of the screen with "Complete All" and "Delete All" buttons. Tapping outside or pressing a "Cancel" button exits multi-select mode. Batch operations also show an undo Snackbar.
- Pull-to-refresh via `RefreshControl` (same behavior as Today screen: calls `refetch()`; if authenticated, also triggers `processSyncQueue()` + `pullFromCloud()`)
- FAB for create

**Data:** Uses `useReminders()` or `useActiveReminders()` with pagination support

**Error handling:** Wrapped in `ErrorBoundary` component

### Settings Screen (`app/(tabs)/settings.tsx`)

**Sections:**
1. **Profile Header** - Avatar, name, email, premium badge (gradient background)
2. **Connection Status** - Online/offline indicator
3. **Account** - Edit profile, change password (or "Create Account" for guests)
4. **Premium** - Upgrade button, current plan display
5. **Notifications** - Permission status, request button
6. **Location** - Foreground + background permission status
7. **Cloud & Sync** - Manual sync button, pending sync count, last sync time
8. **Privacy & Data**:
   - **Export Data**: Exports all reminders and categories as a JSON file. Uses `expo-file-system` to write the data to a temporary file (`FileSystem.documentDirectory + 'remindme-export.json'`), then uses `expo-sharing` (`Sharing.shareAsync()`) to present the system share sheet so the user can save or send the file.
   - **Delete Account**: Required by Google Play Store policy. Flow:
     1. User taps "Delete Account"
     2. Confirmation dialog appears: "This will permanently delete your account and all data. This action cannot be undone."
     3. If confirmed, calls a Supabase Edge Function (`delete-user`) which internally calls `supabase.auth.admin.deleteUser(userId)` and deletes all user data from cloud tables
     4. On success, clears all local SQLite data (`db.execAsync('DELETE FROM reminders; DELETE FROM categories; DELETE FROM sync_queue;')`)
     5. Signs out via `supabase.auth.signOut()`
     6. Navigates to the welcome screen (`router.replace('/(auth)/welcome')`)
     7. If any step fails, shows an error alert and does not proceed with subsequent steps
9. **About** - Version, terms, privacy

**Data:** Uses `useAuthStore()` for user + connectivity

**Error handling:** Wrapped in `ErrorBoundary` component

### Create Reminder (`app/reminder/create.tsx`)

**Form fields:**
1. **Title** (required, text input)
2. **Notes** (optional, multiline)
3. **Type selector** - Time-based or Location-based (toggles form sections)
4. **Time section:**
   - Date picker (Android modal via `@react-native-community/datetimepicker`)
   - Time picker
   - Recurrence rule selector (none, daily, weekly, monthly, yearly, custom)
5. **Location section:** (premium only)
   - `LocationPicker` component (map + search)
   - Trigger mode: Arrive / Leave / Both
   - Radius slider (100m - 2km)
   - Recurring toggle
6. **Category** - 5 predefined with color dots: Personal, Work, Shopping, Health, Finance
7. **Priority** - Low / Medium / High with color indicators
8. **Delivery method** - Notification / Alarm
   - **Notification**: Standard push notification via the `reminders` channel (HIGH importance)
   - **Alarm**: Uses Android's full-screen intent to display an alarm-style screen even when the device is locked. Uses the `alarms` notification channel (MAX importance, bypasses Do Not Disturb). Plays a looping alarm sound until the user dismisses or snoozes. Requires `USE_FULL_SCREEN_INTENT` permission on Android 14+ (declared in `app.json` and requested at runtime).
9. **Submit button** - On successful submission, triggers `Haptics.impactAsync(ImpactFeedbackStyle.Light)` via `expo-haptics` for tactile confirmation

**Validation:** Zod schema via `@hookform/resolvers` (see Form Validation section below for full schema with refinements)

**Premium gate:** Location reminders show upgrade prompt for free users

**Ads:** Interstitial ad shown after creation for non-premium users

**Error handling:** Wrapped in `ErrorBoundary` component

### Reminder Detail (`app/reminder/[id].tsx`)

**Features:**
- Full reminder info display
- Complete/uncomplete toggle (triggers haptic feedback and shows Snackbar with undo)
- Edit (navigates to create with pre-filled data)
- Delete with confirmation (triggers haptic feedback and shows Snackbar with undo)
- Time/location display
- Category + priority badges
- **Snooze**: When tapped, opens a bottom sheet with configurable duration options: 5, 10, 15, 30, or 60 minutes. The selected duration is added to the current time and a new notification is scheduled for that time.

**Error handling:** Wrapped in `ErrorBoundary` component

### Premium Screen (`app/premium/index.tsx`)

**Features:**
- Feature list with icons
- RevenueCat package display (monthly/yearly/lifetime)
- Purchase flow with loading states
- Restore purchases button
- Fallback UI if offerings fail to load
- Terms + Privacy links

---

## Reusable Components

### Button (`src/components/ui/Button.tsx`)

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}
```

### Input (`src/components/ui/Input.tsx`)

```typescript
interface InputProps {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  // ...TextInput props
}
```

### Card (`src/components/ui/Card.tsx`)

```typescript
interface CardProps {
  onPress?: () => void;
  children: React.ReactNode;
}
// Simple wrapper with shadow, border-radius
// Light mode: white background
// Dark mode: Slate 800 (#1e293b) background
```

### Badge (`src/components/ui/Badge.tsx`)

```typescript
interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
}
```

### Snackbar (`src/components/ui/Snackbar.tsx`)

A transient notification bar shown at the bottom of the screen to confirm actions and offer undo.

```typescript
interface SnackbarProps {
  message: string;
  actionLabel?: string;       // e.g. "Undo"
  onAction?: () => void;      // called when the action button is tapped
  duration?: number;           // auto-dismiss timeout in ms (default: 5000)
  visible: boolean;
  onDismiss: () => void;       // called when the snackbar is dismissed (by timeout or swipe)
}
```

**Behavior:**
- Slides up from the bottom of the screen with a short animation (e.g., `Animated.timing`, 200ms)
- Displays a message on the left and an optional action button (styled as text) on the right
- Auto-dismisses after `duration` ms (default 5 seconds)
- If the user taps the action button (e.g., "Undo"), calls `onAction` which reverses the operation (uncompletes the reminder, restores a deleted reminder, etc.) and then dismisses the snackbar
- Positioned above the tab bar so it does not obscure navigation
- Dark background (`#1e293b`) with white text for contrast in both light and dark modes

**Usage in screens:**
- **Completing a reminder**: Shows "Reminder completed" with an "Undo" button. Undo reverts the reminder's `isCompleted` status.
- **Deleting a reminder**: The reminder is soft-deleted (marked as deleted in SQLite but not yet purged). Shows "Reminder deleted" with an "Undo" button. Undo restores the reminder. If the snackbar times out without undo, the deletion is finalized.
- **Batch operations**: Shows "X reminders completed" or "X reminders deleted" with undo support.

### ErrorBoundary (`src/components/ui/ErrorBoundary.tsx`)

A React class component that catches JavaScript errors in its child component tree.

```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;  // optional custom fallback
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}
```

**Implementation:**
- Uses React's class component pattern with `static getDerivedStateFromError()` and `componentDidCatch()`
- `componentDidCatch` logs the error to Sentry (`Sentry.captureException(error)`)
- Default fallback UI shows:
  - A centered container with a warning icon
  - "Something went wrong" heading
  - The error message (in development mode only)
  - A "Try Again" button that resets the error state (`this.setState({ hasError: false, error: null })`)
- Each route/screen is wrapped with `<ErrorBoundary>` in its layout or directly in the screen file
- Prevents the entire app from crashing when a single screen encounters an error

### ReminderCard (`src/components/reminders/ReminderCard.tsx`)

Displays a single reminder with:
- Priority color strip on left edge (green/yellow/red)
- Checkbox for completion (with strikethrough on title when done). Completing triggers `Haptics.impactAsync(ImpactFeedbackStyle.Light)` via `expo-haptics`.
- Title + notes preview
- Time badge (formatted date) or location badge (place name)
- Overdue indicator (red text for past-due active reminders)
- Delivery method icon (bell/alarm)
- Recurring indicator
- Pressable -> navigates to detail
- Long-press -> enters multi-select mode on the Reminders screen
- Swipe-to-delete triggers `Haptics.impactAsync(ImpactFeedbackStyle.Light)` via `expo-haptics`

### LocationPicker (`src/components/location/LocationPicker.tsx`)

Full location selection component:
- Search bar with autocomplete via Google Places API (`placesApi.searchPlaces(query)` -- calls the Google Places Autocomplete endpoint)
- Interactive `MapView` from `react-native-maps`
- Marker at selected location
- Circle overlay showing geofence radius
- Current location button
- Radius adjustment controls (100m, 200m, 500m, 1km, 2km)
- Reverse geocoding on map tap via Google Geocoding API (`placesApi.reverseGeocode(lat, lng)`)
- Error boundary for map failures

The `placesApi` service (`src/services/placesApi.ts`) wraps the Google Places API and Google Geocoding API. The API key is stored in environment variables (`EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`). No third-party geocoding service is needed.

---

## Notification Setup

### Android Notification Channels

Configured in `src/services/notificationService.ts` at app startup via `Notifications.setNotificationChannelAsync()`:

| Channel ID | Name | Importance | Description |
|---|---|---|---|
| `reminders` | Reminders | HIGH (`AndroidImportance.HIGH`) | Standard reminder notifications. Shows in the notification shade with sound and vibration. |
| `alarms` | Alarms | MAX (`AndroidImportance.MAX`) | Alarm-style reminders. Bypasses Do Not Disturb, plays a looping alarm sound, and uses full-screen intent to wake the screen. |

### Snooze Actions

When a notification or alarm fires, the user can snooze. Tapping "Snooze" opens a bottom sheet (in-app) or reschedules for a default of 10 minutes (from the notification action). Configurable snooze durations: 5, 10, 15, 30, or 60 minutes. The snooze bottom sheet is shown when the user interacts with the snooze option from the Reminder Detail screen.

---

## Design System

### Colors (Light Mode)

| Usage | Hex | Name |
|---|---|---|
| Primary / Brand | `#0ea5e9` | Sky blue |
| Background | `#ffffff` | White |
| Surface / Cards | `#f8fafc` | Slate 50 |
| Text Primary | `#1e293b` | Slate 800 |
| Text Secondary | `#64748b` | Slate 500 |
| Border | `#e2e8f0` | Slate 200 |
| Success | `#22c55e` | Green 500 |
| Warning | `#f59e0b` | Amber 500 |
| Danger | `#ef4444` | Red 500 |
| Info | `#3b82f6` | Blue 500 |

### Colors (Dark Mode)

The app uses `userInterfaceStyle: "automatic"` in `app.json`, so it follows the system theme. NativeWind's `dark:` variant prefix is used throughout for dark mode styling.

| Usage | Hex | Name |
|---|---|---|
| Primary / Brand | `#0ea5e9` | Sky blue (same) |
| Background | `#0f172a` | Slate 900 |
| Surface / Cards | `#1e293b` | Slate 800 |
| Text Primary | `#f1f5f9` | Slate 100 |
| Text Secondary | `#94a3b8` | Slate 400 |
| Border | `#334155` | Slate 700 |
| Success | `#22c55e` | Green 500 (same) |
| Warning | `#f59e0b` | Amber 500 (same) |
| Danger | `#ef4444` | Red 500 (same) |
| Info | `#3b82f6` | Blue 500 (same) |

**NativeWind usage example:**

```tsx
<View className="bg-white dark:bg-slate-900">
  <Text className="text-slate-800 dark:text-slate-100">Hello</Text>
  <Text className="text-slate-500 dark:text-slate-400">Subtitle</Text>
</View>
```

Ensure `darkMode: 'class'` is set in `tailwind.config.js` and the `nativewind` preset is applied. NativeWind automatically maps the system appearance to the appropriate class.

### Priority Colors

| Priority | Color |
|---|---|
| Low | `#22c55e` (green) |
| Medium | `#f59e0b` (amber) |
| High | `#ef4444` (red) |

### Default Categories

| Name | Color | Icon |
|---|---|---|
| Personal | `#3b82f6` | `user` |
| Work | `#8b5cf6` | `briefcase` |
| Shopping | `#22c55e` | `shopping-cart` |
| Health | `#ef4444` | `heart` |
| Finance | `#f59e0b` | `dollar-sign` |

### Typography

Uses React Native default fonts. Key sizes:
- Screen titles: 28-32px, bold
- Section headers: 18-20px, semibold
- Body text: 16px, regular
- Captions/badges: 12-14px

### Gradients

Used in headers via `expo-linear-gradient`:
- Auth screens: `['#0ea5e9', '#0284c7']` (sky blue gradient)
- Profile header: `['#0ea5e9', '#0369a1']`
- Premium screen: `['#7c3aed', '#4f46e5']` (purple gradient)

---

## Form Validation (Zod)

Reminder validation schema with conditional refinements:

```typescript
import { z } from 'zod';

const createReminderSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  notes: z.string().max(1000).optional(),
  type: z.enum(['time', 'location']),
  triggerAt: z.string().optional(),    // ISO date string
  recurrenceRule: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radius: z.number().min(100).max(2000).optional(),
  locationName: z.string().optional(),
  triggerOn: z.enum(['enter', 'exit', 'both']).optional(),
  isRecurringLocation: z.boolean().optional(),
  deliveryMethod: z.enum(['notification', 'alarm']).optional(),
  categoryId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
}).refine(
  (data) => {
    if (data.type === 'time') {
      if (!data.triggerAt) return false;
      return new Date(data.triggerAt) > new Date();
    }
    return true;
  },
  {
    message: 'A future date and time must be provided for time-based reminders',
    path: ['triggerAt'],
  }
).refine(
  (data) => {
    if (data.type === 'location') {
      return data.latitude !== undefined && data.longitude !== undefined;
    }
    return true;
  },
  {
    message: 'A location must be selected for location-based reminders',
    path: ['latitude'],
  }
);
```

---

## Android Widget (Post-Launch)

An Android home screen widget that shows today's upcoming reminders is planned as a post-launch feature.

**Implementation approach:**
- Use `@bittingz/expo-widgets` or a custom Expo Config Plugin
- The config plugin generates a native Android `AppWidgetProvider` class along with the widget layout XML
- The widget reads reminder data from the local SQLite database (shared via a `ContentProvider` or by reading the DB file directly)
- Displays a scrollable list of today's pending reminders with their titles and trigger times
- Tapping a reminder opens the app to the Reminder Detail screen
- A refresh button re-queries the database

**Why post-launch:** Android widgets require native code that is outside the Expo managed workflow. This needs either ejecting to a dev client build or using a config plugin, and should be tackled once the core app is stable.

---

## Implementation Order Recommendation

1. **Project scaffold** - Expo + TypeScript + NativeWind (with dark mode) + Router
2. **Sentry setup** - Initialize crash reporting in root layout
3. **SQLite + migrations** - Database service
4. **Types + mappers + utils** - Foundation code
5. **Supabase client** - Connection to cloud
6. **Auth store + auth service** - Login/signup/guest
7. **Auth screens** - Welcome, login, register
8. **ErrorBoundary component** - Wrap all screens for crash resilience
9. **Repository + hooks** - Reminder CRUD with pagination
10. **Tab navigation** - Today + Reminders + Settings shells
11. **Create reminder screen** - Form with Zod validation (including refinements), haptic feedback on submit
12. **ReminderCard component** - Display reminders with haptic feedback on complete/delete
13. **Snackbar component** - Undo support for complete and delete actions
14. **Today screen** - Wire up hooks, pull-to-refresh, snackbar
15. **Reminders screen** - Wire up hooks, search with `useSearch`, pagination, pull-to-refresh, multi-select batch operations, snackbar
16. **Dark mode pass** - Apply `dark:` variants to all components using the dark color palette
17. **Notification service** - Android channels (reminders + alarms), alarm delivery with full-screen intent
18. **Configurable snooze** - Bottom sheet with 5/10/15/30/60 minute options
19. **Sync service** - Offline queue + cloud sync
20. **Settings screen** - All settings sections including data export and account deletion
21. **Location picker + geofencing** - Map + Google Places API + background tasks
22. **Premium screen + RevenueCat** - IAP
23. **Ads service** - Google Mobile Ads
24. **Detail screen + edit flow** - Reminder detail with snooze bottom sheet
25. **Polish** - Empty states, loading states, error handling, final dark mode review
26. **Android widget** - Post-launch feature (config plugin / native module)
