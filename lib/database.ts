import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function initDatabase(): Promise<void> {
  db = await SQLite.openDatabaseAsync('remindme.db');

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'time',
      title TEXT NOT NULL,
      notes TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      category TEXT NOT NULL DEFAULT 'personal',
      is_completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,

      date_time TEXT,
      repeat_type TEXT NOT NULL DEFAULT 'none',
      repeat_interval INTEGER,
      repeat_unit TEXT,
      repeat_days TEXT,

      location_lat REAL,
      location_lng REAL,
      location_address TEXT,
      location_radius REAL,
      location_trigger TEXT,
      location_notify TEXT,

      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      sync_status TEXT NOT NULL DEFAULT 'synced'
    );

    CREATE INDEX IF NOT EXISTS idx_reminders_owner_id ON reminders(owner_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_date_time ON reminders(date_time);
    CREATE INDEX IF NOT EXISTS idx_reminders_sync_status ON reminders(sync_status);
    CREATE INDEX IF NOT EXISTS idx_reminders_is_completed ON reminders(is_completed);
  `);
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}
