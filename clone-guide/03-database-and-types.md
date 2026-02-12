# 03 - Local Database (SQLite) & TypeScript Types

## SQLite Schema

The local SQLite database (`remindme.db`) is the **source of truth**. It mirrors the Supabase schema with SQLite-specific types (INTEGER for booleans, TEXT for dates).

### Database Initialization

```typescript
// src/services/database/sqlite.ts
import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('remindme.db');
    await runMigrations(db);
  }
  return db;
}

export async function closeDatabase() {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}

export async function initializeDatabase(): Promise<void> {
  await getDatabase();
}
```

### Migrations

```typescript
// src/services/database/migrations.ts
import * as SQLite from 'expo-sqlite';

const CURRENT_VERSION = 2;

export async function runMigrations(db: SQLite.SQLiteDatabase) {
  const result = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  const userVersion = result?.user_version ?? 0;

  if (userVersion < 1) {
    await migration001(db);
  }

  if (userVersion < 2) {
    await migration002(db);
  }

  await db.execAsync(`PRAGMA user_version = ${CURRENT_VERSION}`);
}

async function migration001(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      display_name TEXT,
      is_premium INTEGER DEFAULT 0,
      premium_expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Categories table (updated_at included for sync)
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#0ea5e9',
      icon TEXT DEFAULT 'tag',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Saved places table (updated_at included for sync)
    CREATE TABLE IF NOT EXISTS saved_places (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      icon TEXT DEFAULT 'map-pin',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Reminders table
    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      type TEXT NOT NULL CHECK(type IN ('time', 'location')),

      -- Time-based fields
      trigger_at TEXT,
      recurrence_rule TEXT,
      next_trigger_at TEXT,

      -- Location-based fields
      latitude REAL,
      longitude REAL,
      radius INTEGER DEFAULT 200,
      location_name TEXT,
      trigger_on TEXT CHECK(trigger_on IN ('enter', 'exit', 'both')),
      is_recurring_location INTEGER DEFAULT 0,

      -- Delivery options
      delivery_method TEXT DEFAULT 'notification' CHECK(delivery_method IN ('notification', 'alarm', 'share')),
      alarm_sound TEXT,
      share_contact_name TEXT,
      share_contact_phone TEXT,
      share_message_template TEXT,

      -- Organization
      category_id TEXT,
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),

      -- Status
      is_completed INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      completed_at TEXT,

      -- System fields
      notification_id TEXT,
      geofence_id TEXT,

      -- Sync fields
      synced_at TEXT,
      is_deleted INTEGER DEFAULT 0,

      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),

      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    -- Reminder history table
    CREATE TABLE IF NOT EXISTS reminder_history (
      id TEXT PRIMARY KEY,
      reminder_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      triggered_at TEXT NOT NULL DEFAULT (datetime('now')),
      trigger_type TEXT CHECK(trigger_type IN ('scheduled', 'location_enter', 'location_exit', 'manual')),
      delivery_status TEXT CHECK(delivery_status IN ('delivered', 'failed', 'dismissed', 'actioned')),
      action_taken TEXT,
      FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE
    );

    -- Sync queue table
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL CHECK(operation IN ('create', 'update', 'delete')),
      payload TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'failed')),
      attempts INTEGER DEFAULT 0,
      last_attempt_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Settings table
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_type ON reminders(type);
    CREATE INDEX IF NOT EXISTS idx_reminders_trigger_at ON reminders(trigger_at);
    CREATE INDEX IF NOT EXISTS idx_reminders_user_active ON reminders(user_id, is_deleted, is_active);
    CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
    CREATE INDEX IF NOT EXISTS idx_saved_places_user_id ON saved_places(user_id);
    CREATE INDEX IF NOT EXISTS idx_reminder_history_reminder_id ON reminder_history(reminder_id);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON sync_queue(created_at);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
    CREATE INDEX IF NOT EXISTS idx_reminders_title ON reminders(title);
  `);
}

// Migration 002: Add guest user support
async function migration002(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    ALTER TABLE users ADD COLUMN is_guest INTEGER DEFAULT 0;
    ALTER TABLE sync_queue ADD COLUMN user_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_sync_queue_user_id ON sync_queue(user_id);
  `);
}
```

## TypeScript Type Definitions

```typescript
// src/types/database.ts

export interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  isPremium: boolean;
  premiumExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SavedPlace {
  id: string;
  userId: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

export type ReminderType = 'time' | 'location';
export type TriggerOn = 'enter' | 'exit' | 'both';
export type DeliveryMethod = 'notification' | 'alarm' | 'share';
export type Priority = 'low' | 'medium' | 'high';

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  notes: string | null;
  type: ReminderType;

  // Time-based
  triggerAt: string | null;
  recurrenceRule: string | null;
  nextTriggerAt: string | null;

  // Location-based
  latitude: number | null;
  longitude: number | null;
  radius: number;
  locationName: string | null;
  triggerOn: TriggerOn | null;
  isRecurringLocation: boolean;

  // Delivery
  deliveryMethod: DeliveryMethod;
  alarmSound: string | null;
  shareContactName: string | null;
  shareContactPhone: string | null;
  shareMessageTemplate: string | null;

  // Organization
  categoryId: string | null;
  priority: Priority;

  // Status
  isCompleted: boolean;
  isActive: boolean;
  completedAt: string | null;

  // System
  notificationId: string | null;
  geofenceId: string | null;

  // Sync
  syncedAt: string | null;
  isDeleted: boolean;

  createdAt: string;
  updatedAt: string;
}

export type TriggerType = 'scheduled' | 'location_enter' | 'location_exit' | 'manual';
export type DeliveryStatus = 'delivered' | 'failed' | 'dismissed' | 'actioned';

export interface ReminderHistory {
  id: string;
  reminderId: string;
  userId: string;
  triggeredAt: string;
  triggerType: TriggerType;
  deliveryStatus: DeliveryStatus;
  actionTaken: string | null;
}

// Input types for creating/updating
export interface CreateReminderInput {
  title: string;
  notes?: string;
  type: ReminderType;
  triggerAt?: string;
  recurrenceRule?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  locationName?: string;
  triggerOn?: TriggerOn;
  isRecurringLocation?: boolean;
  deliveryMethod?: DeliveryMethod;
  alarmSound?: string;
  shareContactName?: string;
  shareContactPhone?: string;
  shareMessageTemplate?: string;
  categoryId?: string;
  priority?: Priority;
}

export interface UpdateReminderInput extends Partial<CreateReminderInput> {
  isCompleted?: boolean;
  isActive?: boolean;
  completedAt?: string | null;
}
```

## Data Mappers (SQLite <-> TypeScript)

SQLite uses snake_case + integers for booleans. The app uses camelCase + real booleans. These mappers convert between the two.

**Important**: Uses `?? null` (nullish coalescing) instead of `|| null` to correctly handle falsy values like `0` (valid latitude/longitude).

```typescript
// src/lib/mappers.ts
import { Reminder } from '@/types/database';

// SQLite row (snake_case) -> TypeScript (camelCase)
export function mapReminderFromDb(row: Record<string, unknown>): Reminder {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    notes: (row.notes as string) ?? null,
    type: row.type as Reminder['type'],
    triggerAt: (row.trigger_at as string) ?? null,
    recurrenceRule: (row.recurrence_rule as string) ?? null,
    nextTriggerAt: (row.next_trigger_at as string) ?? null,
    latitude: (row.latitude as number) ?? null,
    longitude: (row.longitude as number) ?? null,
    radius: (row.radius as number) ?? 200,
    locationName: (row.location_name as string) ?? null,
    triggerOn: (row.trigger_on as Reminder['triggerOn']) ?? null,
    isRecurringLocation: Boolean(row.is_recurring_location),
    deliveryMethod: (row.delivery_method as Reminder['deliveryMethod']) ?? 'notification',
    alarmSound: (row.alarm_sound as string) ?? null,
    shareContactName: (row.share_contact_name as string) ?? null,
    shareContactPhone: (row.share_contact_phone as string) ?? null,
    shareMessageTemplate: (row.share_message_template as string) ?? null,
    categoryId: (row.category_id as string) ?? null,
    priority: (row.priority as Reminder['priority']) ?? 'medium',
    isCompleted: Boolean(row.is_completed),
    isActive: Boolean(row.is_active),
    completedAt: (row.completed_at as string) ?? null,
    notificationId: (row.notification_id as string) ?? null,
    geofenceId: (row.geofence_id as string) ?? null,
    syncedAt: (row.synced_at as string) ?? null,
    isDeleted: Boolean(row.is_deleted),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// TypeScript (camelCase) -> SQLite (snake_case)
export function mapReminderToDb(reminder: Partial<Reminder>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (reminder.id !== undefined) result.id = reminder.id;
  if (reminder.userId !== undefined) result.user_id = reminder.userId;
  if (reminder.title !== undefined) result.title = reminder.title;
  if (reminder.notes !== undefined) result.notes = reminder.notes;
  if (reminder.type !== undefined) result.type = reminder.type;
  if (reminder.triggerAt !== undefined) result.trigger_at = reminder.triggerAt;
  if (reminder.recurrenceRule !== undefined) result.recurrence_rule = reminder.recurrenceRule;
  if (reminder.nextTriggerAt !== undefined) result.next_trigger_at = reminder.nextTriggerAt;
  if (reminder.latitude !== undefined) result.latitude = reminder.latitude;
  if (reminder.longitude !== undefined) result.longitude = reminder.longitude;
  if (reminder.radius !== undefined) result.radius = reminder.radius;
  if (reminder.locationName !== undefined) result.location_name = reminder.locationName;
  if (reminder.triggerOn !== undefined) result.trigger_on = reminder.triggerOn;
  if (reminder.isRecurringLocation !== undefined) result.is_recurring_location = reminder.isRecurringLocation ? 1 : 0;
  if (reminder.deliveryMethod !== undefined) result.delivery_method = reminder.deliveryMethod;
  if (reminder.alarmSound !== undefined) result.alarm_sound = reminder.alarmSound;
  if (reminder.shareContactName !== undefined) result.share_contact_name = reminder.shareContactName;
  if (reminder.shareContactPhone !== undefined) result.share_contact_phone = reminder.shareContactPhone;
  if (reminder.shareMessageTemplate !== undefined) result.share_message_template = reminder.shareMessageTemplate;
  if (reminder.categoryId !== undefined) result.category_id = reminder.categoryId;
  if (reminder.priority !== undefined) result.priority = reminder.priority;
  if (reminder.isCompleted !== undefined) result.is_completed = reminder.isCompleted ? 1 : 0;
  if (reminder.isActive !== undefined) result.is_active = reminder.isActive ? 1 : 0;
  if (reminder.completedAt !== undefined) result.completed_at = reminder.completedAt;
  if (reminder.notificationId !== undefined) result.notification_id = reminder.notificationId;
  if (reminder.geofenceId !== undefined) result.geofence_id = reminder.geofenceId;
  if (reminder.syncedAt !== undefined) result.synced_at = reminder.syncedAt;
  if (reminder.isDeleted !== undefined) result.is_deleted = reminder.isDeleted ? 1 : 0;
  if (reminder.createdAt !== undefined) result.created_at = reminder.createdAt;
  if (reminder.updatedAt !== undefined) result.updated_at = reminder.updatedAt;

  return result;
}
```

## Utility Functions

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { v4 as uuidv4 } from 'uuid';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Uses the uuid package for cryptographically random IDs (not Math.random)
export function generateId(): string {
  return uuidv4();
}

export function formatAddress(address: {
  streetNumber?: string;
  street?: string;
  city?: string;
  region?: string;
}): string {
  const parts = [
    address.streetNumber,
    address.street,
    address.city,
    address.region,
  ].filter(Boolean);
  return parts.join(', ');
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

## SQLite vs Supabase Schema Differences

| Aspect | SQLite (local) | Supabase (cloud) |
|---|---|---|
| User table name | `users` | `profiles` |
| ID type | `TEXT` | `UUID` (references auth.users) |
| Boolean type | `INTEGER` (0/1) | `BOOLEAN` |
| Date type | `TEXT` (ISO string) | `TIMESTAMPTZ` |
| Coordinate type | `REAL` | `DOUBLE PRECISION` |
| `updated_at` | On ALL tables | On ALL tables |
| Local-only tables | `reminder_history`, `sync_queue`, `settings` | Not synced to cloud |
| Local-only columns | `notification_id`, `geofence_id`, `next_trigger_at`, `synced_at` | Not in cloud schema |
