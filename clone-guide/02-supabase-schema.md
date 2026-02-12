# 02 - Supabase Schema & Migration Workflow

## Schema Management

The database schema is managed via **Supabase CLI migrations** in `supabase/migrations/`. Never edit the remote database directly in the SQL Editor — all changes go through migration files.

## Current Migration

The initial schema lives at `supabase/migrations/20260211000000_initial_schema.sql` and creates:

| Table | Purpose |
|---|---|
| `profiles` | Extends auth.users with display_name, premium status |
| `categories` | User-defined reminder categories with color + icon |
| `saved_places` | Frequently used locations for location reminders |
| `reminders` | Main reminder records (time + location based) |

### Key Schema Features

- **`updated_at` on ALL tables** with auto-update triggers — required for incremental sync
- **Composite index** `(user_id, is_deleted, is_active)` on reminders — optimizes the most common query
- **RLS on all tables** — users can only access their own data
- **Premium lockdown** — the `profiles` UPDATE policy prevents users from writing `is_premium` or `premium_expires_at` directly. Only a Supabase Edge Function or service_role key (via RevenueCat webhook) can set these
- **Auto-create profile on signup** — trigger on `auth.users` INSERT creates a profile row

### Tables at a Glance

**profiles**
```
id (UUID PK → auth.users), email, display_name,
is_premium (server-write only), premium_expires_at (server-write only),
created_at, updated_at
```

**categories**
```
id (TEXT PK), user_id (UUID → auth.users), name, color, icon, sort_order,
created_at, updated_at
```

**saved_places**
```
id (TEXT PK), user_id (UUID → auth.users), name, address, latitude, longitude, icon,
created_at, updated_at
```

**reminders**
```
id (TEXT PK), user_id (UUID → auth.users), title, notes, type (time|location),
trigger_at, recurrence_rule,
latitude, longitude, radius, location_name, trigger_on (enter|exit|both), is_recurring_location,
delivery_method (notification|alarm|share), alarm_sound, share_contact_name, share_contact_phone, share_message_template,
category_id (→ categories), priority (low|medium|high),
is_completed, is_active, completed_at,
is_deleted, created_at, updated_at
```

## Pushing Schema Changes

```bash
# Create a new migration
supabase migration new descriptive_name
# → creates supabase/migrations/<timestamp>_descriptive_name.sql

# Edit the file with your SQL changes

# Push to remote
supabase db push

# Verify
supabase migration list
```

## First-Time Setup (Fresh Clone)

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Link to the project
supabase link --project-ref fdohvyojhokbkxroahmb

# Push all migrations
supabase db push --include-all
```

## Supabase Dashboard Settings

After pushing the schema, configure in the dashboard:

### Authentication
1. Go to **Authentication > Providers**
2. Enable **Email** provider (email/password sign in)
3. Under **Email**, optionally disable "Confirm email" for easier dev testing

### URL Configuration (for password reset deep links)
1. Go to **Authentication > URL Configuration**
2. Set **Site URL** to: `remindme://`
3. Add **Redirect URLs**: `remindme://reset-password`

### Premium Status (Server-Side Only)

The `is_premium` and `premium_expires_at` columns on `profiles` are **locked from client writes** via RLS. To update premium status, use one of:

1. **RevenueCat webhook** → Supabase Edge Function that uses `service_role` key to update the profile
2. **Manual** via Supabase Dashboard > Table Editor (for testing)

Example Edge Function (`supabase/functions/revenucat-webhook/index.ts`):
```typescript
// This function receives RevenueCat webhook events and updates premium status
// Deploy with: supabase functions deploy revenucat-webhook
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!  // service_role bypasses RLS
);

Deno.serve(async (req) => {
  const { event, app_user_id, expiration_at_ms } = await req.json();

  if (event.type === 'INITIAL_PURCHASE' || event.type === 'RENEWAL') {
    await supabase.from('profiles').update({
      is_premium: true,
      premium_expires_at: new Date(expiration_at_ms).toISOString(),
    }).eq('id', app_user_id);
  }

  if (event.type === 'EXPIRATION' || event.type === 'CANCELLATION') {
    await supabase.from('profiles').update({
      is_premium: false,
    }).eq('id', app_user_id);
  }

  return new Response('ok');
});
```

## Supabase Client Connection

```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

## Supabase TypeScript Types

These types match the schema. Regenerate with `supabase gen types typescript --linked > src/types/supabase.ts`.

```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          is_premium: boolean;
          premium_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          is_premium?: boolean;
          premium_expires_at?: string | null;
        };
        Update: {
          email?: string | null;
          display_name?: string | null;
          // is_premium and premium_expires_at are server-write only (RLS blocked)
        };
      };
      reminders: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          notes: string | null;
          type: 'time' | 'location';
          trigger_at: string | null;
          recurrence_rule: string | null;
          latitude: number | null;
          longitude: number | null;
          radius: number;
          location_name: string | null;
          trigger_on: 'enter' | 'exit' | 'both' | null;
          is_recurring_location: boolean;
          delivery_method: 'notification' | 'alarm' | 'share';
          alarm_sound: string | null;
          share_contact_name: string | null;
          share_contact_phone: string | null;
          share_message_template: string | null;
          category_id: string | null;
          priority: 'low' | 'medium' | 'high';
          is_completed: boolean;
          is_active: boolean;
          completed_at: string | null;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['reminders']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['reminders']['Insert']>;
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          icon: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      saved_places: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          address: string | null;
          latitude: number;
          longitude: number;
          icon: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['saved_places']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['saved_places']['Insert']>;
      };
    };
  };
}
```
