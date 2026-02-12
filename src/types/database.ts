export interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  isPremium: boolean;
  premiumExpiresAt: string | null;
  isGuest?: boolean;
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

export interface SyncQueueItem {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: 'create' | 'update' | 'delete';
  payload: string;
  status: 'pending' | 'in_progress' | 'failed';
  attempts: number;
  last_attempt_at: string | null;
  user_id: string | null;
  created_at: string;
}
