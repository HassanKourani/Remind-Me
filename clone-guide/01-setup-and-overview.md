# 01 - Project Setup & Overview

## What This App Is

RemindMe Pro is an offline-first reminder app (Android) built with React Native + Expo. It supports time-based and location-based reminders, guest mode, cloud sync via Supabase, premium subscriptions via RevenueCat, and ads via Google Mobile Ads.

## Tech Stack

| Layer           | Technology                          | Version |
| --------------- | ----------------------------------- | ------- |
| Framework       | React Native + Expo                 | current |
| Language        | TypeScript                          | latest  |
| UI State        | Zustand                             | latest  |
| Server State    | React Query (@tanstack/react-query) | latest  |
| Local DB        | SQLite (expo-sqlite)                | latest  |
| Cloud DB        | Supabase (PostgreSQL)               | latest  |
| DB Migrations   | Supabase CLI                        | latest  |
| Styling         | NativeWind (Tailwind CSS for RN)    | -       |
| Navigation      | Expo Router (file-based)            | latest  |
| Forms           | React Hook Form + Zod               | latest  |
| Notifications   | expo-notifications                  | latest  |
| Geofencing      | expo-location + expo-task-manager   | -       |
| Maps            | react-native-maps                   | latest  |
| Places/Geocoding| Google Places API + Geocoding API   | -       |
| IAP             | RevenueCat (react-native-purchases) | latest  |
| Ads             | react-native-google-mobile-ads      | latest  |
| Icons           | lucide-react-native                 | latest  |
| Bottom Sheet    | @gorhom/bottom-sheet                | latest  |
| Gradients       | expo-linear-gradient                | latest  |
| SMS             | expo-sms                            | latest  |
| Crash Reporting | Sentry (@sentry/react-native)       | latest  |
| Haptics         | expo-haptics                        | latest  |

## Full package.json Dependencies

```json
{
  "dependencies": {
    "@gorhom/bottom-sheet": "^5.2.8",
    "@hookform/resolvers": "^5.2.2",
    "@react-native-async-storage/async-storage": "^2.2.0",
    "@react-native-community/datetimepicker": "^8.6.0",
    "@react-native-community/netinfo": "11.4.1",
    "@react-navigation/native": "^7.1.8",
    "@sentry/react-native": "^6.0.0",
    "@supabase/supabase-js": "^2.93.3",
    "@tanstack/react-query": "^5.90.20",
    "babel-preset-expo": "^54.0.10",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "expo": "~54.0.32",
    "expo-dev-client": "~6.0.20",
    "expo-haptics": "~14.0.0",
    "expo-linear-gradient": "^15.0.8",
    "expo-linking": "^8.0.11",
    "expo-location": "~19.0.8",
    "expo-notifications": "^0.32.16",
    "expo-router": "~6.0.22",
    "expo-secure-store": "^15.0.8",
    "expo-sms": "^14.0.8",
    "expo-splash-screen": "~31.0.13",
    "expo-sqlite": "~16.0.10",
    "expo-status-bar": "~3.0.9",
    "expo-task-manager": "~14.0.9",
    "expo-updates": "~29.0.16",
    "lucide-react-native": "^0.563.0",
    "react": "19.1.0",
    "react-hook-form": "^7.71.1",
    "react-native": "0.81.5",
    "react-native-gesture-handler": "~2.28.0",
    "react-native-google-mobile-ads": "^16.0.3",
    "react-native-maps": "^1.27.1",
    "react-native-purchases": "^9.7.5",
    "react-native-reanimated": "~4.1.1",
    "react-native-safe-area-context": "~5.6.0",
    "react-native-screens": "~4.16.0",
    "react-native-svg": "^15.15.1",
    "react-native-worklets": "^0.7.2",
    "rrule": "^2.8.1",
    "tailwind-merge": "^3.4.0",
    "uuid": "^13.0.0",
    "zod": "^4.3.6",
    "zustand": "^5.0.10"
  },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "@types/react": "~19.1.0",
    "@types/uuid": "^10.0.0",
    "jest": "^29.7.0",
    "jest-expo": "~54.0.0",
    "typescript": "~5.9.2"
  }
}
```

## Environment Variables (.env)

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# RevenueCat (Android only)
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_your_android_key

# Google Maps (maps, place autocomplete, reverse geocoding)
# Enable in Google Cloud Console: Maps SDK for Android, Places API (New), Geocoding API
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Sentry (crash reporting)
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn

# Environment
EXPO_PUBLIC_ENV=development
```

## app.json (Expo Config) — Android Only

```json
{
  "expo": {
    "name": "RemindMe Pro",
    "slug": "remindme-pro",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "remindme",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#0ea5e9"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0ea5e9"
      },
      "package": "com.remindmepro.app",
      "permissions": [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE",
        "WAKE_LOCK",
        "BILLING",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_LOCATION"
      ]
    },
    "plugins": [
      "expo-router",
      "expo-sqlite",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow RemindMe Pro to use your location for location-based reminders.",
          "isAndroidBackgroundLocationEnabled": true
        }
      ],
      ["expo-notifications", { "color": "#0ea5e9" }],
      [
        "react-native-maps",
        {
          "androidApiKey": "YOUR_GOOGLE_MAPS_KEY"
        }
      ],
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-XXXX~YYYY"
        }
      ],
      "@sentry/react-native/expo"
    ],
    "experiments": { "typedRoutes": true }
  }
}
```

## tsconfig.json

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@hooks/*": ["src/hooks/*"],
      "@stores/*": ["src/stores/*"],
      "@services/*": ["src/services/*"],
      "@lib/*": ["src/lib/*"],
      "@types/*": ["src/types/*"],
      "@config/*": ["src/config/*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts",
    "nativewind-env.d.ts"
  ]
}
```

## babel.config.js

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-reanimated/plugin"],
  };
};
```

## Directory Structure

```
supabase/
├── config.toml                  # Supabase CLI project config
└── migrations/
    └── 20260211000000_initial_schema.sql

app/
├── _layout.tsx                  # Root layout - init DB, auth, notifications, ads, geofencing
├── (auth)/
│   ├── _layout.tsx              # Auth guard - redirects if authenticated
│   ├── welcome.tsx              # Landing screen with feature cards + CTAs
│   ├── login.tsx                # Email/password sign in
│   ├── register.tsx             # Sign up with password strength
│   ├── forgot-password.tsx      # Request password reset
│   └── reset-password.tsx       # Set new password (via deep link)
├── (tabs)/
│   ├── _layout.tsx              # Tab bar: Today, Reminders, Settings
│   ├── index.tsx                # Today dashboard with stats + reminder list
│   ├── reminders.tsx            # All reminders list with search
│   └── settings.tsx             # Settings, premium, permissions, sync
├── reminder/
│   ├── create.tsx               # Create/edit reminder (modal)
│   └── [id].tsx                 # Reminder detail screen
├── premium/
│   └── index.tsx                # Premium upgrade screen (modal)
└── legal/
    ├── terms.tsx
    └── privacy.tsx

src/
├── components/
│   ├── ui/
│   │   ├── Button.tsx           # Variants: primary, secondary, outline, ghost, danger
│   │   ├── Input.tsx            # Label, icon, error state
│   │   ├── Card.tsx             # Pressable card wrapper
│   │   ├── Badge.tsx            # Color-coded status badges
│   │   ├── Snackbar.tsx         # Toast with undo action
│   │   ├── ErrorBoundary.tsx    # Per-route crash boundary
│   │   └── index.ts             # Barrel export
│   ├── reminders/
│   │   └── ReminderCard.tsx     # Reminder display with priority strip, checkbox, badges
│   └── location/
│       └── LocationPicker.tsx   # Google Maps + Places autocomplete + radius adjustment
├── hooks/
│   ├── useReminders.ts          # React Query hooks for CRUD + sync
│   └── useSearch.ts             # Full-text search hook for reminders
├── stores/
│   └── authStore.ts             # Zustand: user, auth, premium, guest, connectivity
├── services/
│   ├── database/
│   │   ├── sqlite.ts            # Singleton DB connection + init
│   │   └── migrations.ts        # Version-based schema migrations
│   ├── supabase/
│   │   ├── client.ts            # Supabase client (AsyncStorage sessions)
│   │   └── auth.ts              # Auth API wrapper
│   ├── sync/
│   │   └── syncService.ts       # Offline queue + incremental push/pull cloud sync
│   ├── notifications/
│   │   ├── setup.ts             # Permission + Android channels
│   │   ├── scheduler.ts         # Schedule/cancel/snooze notifications
│   │   ├── handlers.ts          # Foreground + tap action handlers
│   │   └── bootReceiver.ts      # Re-register notifications after device reboot
│   ├── location/
│   │   ├── geofencing.ts        # Background geofence task + register/unregister (max 100 limit)
│   │   ├── permissions.ts       # Foreground/background location permissions
│   │   └── placesApi.ts         # Google Places autocomplete + Geocoding API wrapper
│   ├── purchases/
│   │   └── revenueCat.ts        # RevenueCat SDK wrapper (Android only)
│   └── ads/
│       └── adService.ts         # Google Mobile Ads init
├── repositories/
│   └── reminderRepository.ts    # SQLite CRUD abstraction (paginated)
├── lib/
│   ├── mappers.ts               # snake_case <-> camelCase conversion
│   └── utils.ts                 # cn(), formatAddress(), sleep()
└── types/
    ├── database.ts              # Core TS interfaces + enums
    └── supabase.ts              # Auto-generated Supabase DB types
```

## Initialization Order (app/\_layout.tsx)

1. `Sentry.init()` - Crash reporting (must be first)
2. `defineGeofencingTask()` - Register background task (must be top-level)
3. `initializeDatabase()` - Open SQLite + run migrations
4. `initialize()` (auth store) - Check Supabase session or local user
5. `initializeRevenueCat()` - Setup IAP SDK (Android key only)
6. `syncPremiumWithRevenueCat()` - Validate subscription status
7. `setupNotifications()` - Request permissions + create Android channels
8. `setupNotificationHandlers()` - Attach listeners
9. `rescheduleAllOnBoot()` - Re-register notifications if app was killed
10. `initializeAds()` - Google Mobile Ads
11. `SplashScreen.hideAsync()` - Show app

## Feature Tiers

| Feature                     | Free | Premium   |
| --------------------------- | ---- | --------- |
| Time reminders              | Yes  | Yes       |
| Active reminder limit       | 5    | Unlimited |
| Push notifications          | Yes  | Yes       |
| Basic categories            | Yes  | Yes       |
| Cloud sync                  | Yes  | Yes       |
| Search                      | Yes  | Yes       |
| Location reminders          | No   | Yes       |
| Custom alarm sounds         | No   | Yes       |
| Share to WhatsApp/SMS       | No   | Yes       |
| Recurring location triggers | No   | Yes       |
| Widgets                     | No   | Yes       |
| Ads                         | Yes  | No        |

**Premium pricing**: $4.99/mo, yearly, or $29.99 lifetime (configured in RevenueCat)
