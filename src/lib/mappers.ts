import { Reminder } from '@/types/database';

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
