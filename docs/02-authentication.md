# Authentication

## Overview

RemindMe Pro uses Supabase Auth with three sign-in methods:
1. **Email/Password** — traditional sign-up and sign-in
2. **Magic Link** — passwordless email OTP
3. **Google OAuth** — via `expo-auth-session` + `expo-web-browser`
4. **Guest Mode** — local-only, no account required

## Supabase Setup

### Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Client Configuration (`lib/supabase.ts`)

- Uses `@react-native-async-storage/async-storage` for session persistence
- `detectSessionInUrl: false` (required for React Native)
- `autoRefreshToken: true` — automatic token refresh
- `persistSession: true` — session survives app restarts

## Auth Flow

### Cold Start
1. `SplashScreen.preventAutoHideAsync()` keeps splash visible
2. `supabase.auth.getSession()` checks for stored session
3. Biometric preference loaded from AsyncStorage
4. `isInitialized` set to `true`, splash hidden
5. Auth guard in `useProtectedRoute()` redirects:
   - No session → `/(auth)/welcome`
   - Has session → `/(tabs)`

### Sign Up
1. User enters email + password + confirm password
2. Password strength validated in real-time (weak/medium/strong)
3. `supabase.auth.signUp()` called
4. Toast: "Check your email for confirmation"
5. Redirect to sign-in screen

### Sign In (Password)
1. Email + password validated
2. `supabase.auth.signInWithPassword()` called
3. `onAuthStateChange` fires → session stored → auth guard redirects to tabs

### Sign In (Magic Link)
1. User enters email
2. `supabase.auth.signInWithOtp({ email })` called
3. Toast: "Check your email"
4. User taps link → app opens → `onAuthStateChange` fires

### Google OAuth
1. `supabase.auth.signInWithOAuth({ provider: 'google' })` returns URL
2. `WebBrowser.openAuthSessionAsync()` opens browser
3. On callback, tokens extracted from URL
4. `supabase.auth.setSession()` called with tokens

### Guest Mode
1. User taps "Continue as Guest" on welcome screen
2. `isGuest` set to `true` in auth store
3. Auth guard allows access to tabs
4. Guest banner displayed at top of tab screens
5. No data sync — local storage only

## OAuth Configuration (Google)

### Supabase Dashboard
1. Go to Authentication → Providers → Google
2. Enable Google provider
3. Add Client ID and Client Secret from Google Cloud Console
4. Set redirect URL to your Supabase project's callback URL

### Google Cloud Console
1. Create OAuth 2.0 credentials
2. Add authorized redirect URIs:
   - `https://your-project.supabase.co/auth/v1/callback`
3. Enable Google+ API (or People API)

### Expo Config
The app scheme is set to `remindmepro` in `app.json`, which is used by `expo-auth-session` for deep linking.

## Biometric Quick Unlock

### Setup (`lib/biometrics.ts`)
- Checks hardware support via `expo-local-authentication`
- Stores preference in AsyncStorage (`@biometric_enabled`)
- Supports Face ID (iOS) and Fingerprint (Android)

### Flow
1. After first sign-in, check if device supports biometrics
2. If supported, prompt user to enable
3. On subsequent cold starts with valid session:
   - Show biometric prompt screen
   - On success → proceed to tabs
   - On failure → offer password fallback

## File Structure

```
lib/supabase.ts              — Supabase client singleton
lib/validation.ts            — Email/password validators
lib/biometrics.ts            — Biometric auth utilities
stores/auth-store.ts         — Auth state (Zustand)
app/(auth)/_layout.tsx       — Auth stack layout
app/(auth)/welcome.tsx       — Landing screen
app/(auth)/sign-in.tsx       — Sign in screen
app/(auth)/sign-up.tsx       — Sign up screen
app/(auth)/forgot-password.tsx — Password reset
app/(auth)/biometric-prompt.tsx — Biometric unlock screen
```
