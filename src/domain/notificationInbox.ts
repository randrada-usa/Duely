import type { Task } from './task';

export const NOTIFICATION_READ_STORAGE_KEY = 'duely.read-notifications.v1';

export function notificationReadKey(
  task: Pick<Task, 'id' | 'title' | 'dueAt' | 'reminderMinutesBefore'>,
) {
  return [
    task.id,
    task.title,
    task.dueAt ?? '',
    task.reminderMinutesBefore ?? '',
  ].join('|');
}

export function decodeNotificationReadKeys(value: string | null) {
  if (!value) return new Set<string>();

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
      return new Set<string>();
    }
    return new Set(parsed);
  } catch {
    return new Set<string>();
  }
}
