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

    -- Categories table
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

    -- Saved places table
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

async function migration002(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    ALTER TABLE users ADD COLUMN is_guest INTEGER DEFAULT 0;
    ALTER TABLE sync_queue ADD COLUMN user_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_sync_queue_user_id ON sync_queue(user_id);
  `);
}
