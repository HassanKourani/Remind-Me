export type ReminderType = 'time' | 'location';
export type Priority = 'low' | 'medium' | 'high';
export type Category = 'personal' | 'work' | 'health' | 'shopping' | 'finance' | 'travel' | 'education' | 'other';
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
export type LocationTrigger = 'enter' | 'leave' | 'both';
export type LocationNotify = 'once' | 'every_time';
export type SyncStatus = 'synced' | 'pending_create' | 'pending_update' | 'pending_delete';

export interface Reminder {
  id: string;
  owner_id: string;
  type: ReminderType;
  title: string;
  notes: string | null;
  priority: Priority;
  category: Category;
  is_completed: boolean;
  completed_at: string | null;

  // Time-based fields
  date_time: string | null;
  repeat_type: RepeatType;
  repeat_interval: number | null;
  repeat_unit: 'days' | 'weeks' | null;
  repeat_days: number[] | null; // 0=Sun, 1=Mon, ..., 6=Sat

  // Location-based fields
  location_lat: number | null;
  location_lng: number | null;
  location_address: string | null;
  location_radius: number | null;
  location_trigger: LocationTrigger | null;
  location_notify: LocationNotify | null;

  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}

export type ReminderInsert = Omit<Reminder, 'id' | 'created_at' | 'updated_at' | 'sync_status' | 'is_completed' | 'completed_at'>;

export interface CategoryInfo {
  value: Category;
  label: string;
  icon: string;
  color: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { value: 'personal', label: 'Personal', icon: 'person', color: '#6366F1' },
  { value: 'work', label: 'Work', icon: 'work', color: '#F59E0B' },
  { value: 'health', label: 'Health', icon: 'favorite', color: '#EF4444' },
  { value: 'shopping', label: 'Shopping', icon: 'shopping-cart', color: '#10B981' },
  { value: 'finance', label: 'Finance', icon: 'account-balance', color: '#8B5CF6' },
  { value: 'travel', label: 'Travel', icon: 'flight', color: '#06B6D4' },
  { value: 'education', label: 'Education', icon: 'school', color: '#EC4899' },
  { value: 'other', label: 'Other', icon: 'more-horiz', color: '#6B7280' },
];

export interface PriorityInfo {
  value: Priority;
  label: string;
  color: string;
}

export const PRIORITIES: PriorityInfo[] = [
  { value: 'low', label: 'Low', color: '#10B981' },
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'high', label: 'High', color: '#EF4444' },
];
