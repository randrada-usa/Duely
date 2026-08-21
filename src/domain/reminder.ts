import type { ReminderMinutes, Task } from './task';

export const REMINDER_OPTIONS: ReadonlyArray<{
  label: string;
  value: ReminderMinutes | null;
}> = [
  { label: 'No reminder', value: null },
  { label: 'At due time', value: 0 },
  { label: '15 minutes before', value: 15 },
  { label: '1 hour before', value: 60 },
  { label: '1 day before', value: 1440 },
];

export type DesiredReminder = {
  identifier: string;
  taskId: string;
  fingerprint: string;
  triggerAt: Date;
  title: string;
};

export type ScheduledReminder = Pick<
  DesiredReminder,
  'identifier' | 'taskId' | 'fingerprint'
>;

export type ReminderPlan = {
  cancelIdentifiers: string[];
  schedule: DesiredReminder[];
};

export function reminderIdentifier(taskId: string) {
  return `duely-reminder-${taskId}`;
}

export function reminderTriggerAt(
  dueAt: string,
  minutesBefore: ReminderMinutes,
) {
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return null;
  return new Date(due.getTime() - minutesBefore * 60_000);
}

export function desiredReminderForTask(task: Task, now = new Date()) {
  const minutesBefore = task.reminderMinutesBefore;
  if (
    task.status !== 'open' ||
    !task.dueAt ||
    minutesBefore === null ||
    minutesBefore === undefined
  ) {
    return null;
  }

  const triggerAt = reminderTriggerAt(task.dueAt, minutesBefore);
  if (!triggerAt || triggerAt.getTime() <= now.getTime()) return null;

  return {
    identifier: reminderIdentifier(task.id),
    taskId: task.id,
    fingerprint: `${task.dueAt}|${minutesBefore}|${task.title}`,
    triggerAt,
    title: task.title,
  } satisfies DesiredReminder;
}

export function buildReminderPlan(
  tasks: Task[],
  scheduled: ScheduledReminder[],
  now = new Date(),
): ReminderPlan {
  const desired = tasks
    .map((task) => desiredReminderForTask(task, now))
    .filter((reminder): reminder is DesiredReminder => reminder !== null);
  const desiredByTask = new Map(desired.map((reminder) => [reminder.taskId, reminder]));
  const currentFingerprints = new Set<string>();
  const cancelIdentifiers: string[] = [];

  for (const existing of scheduled) {
    const wanted = desiredByTask.get(existing.taskId);
    const isExact =
      wanted &&
      existing.identifier === wanted.identifier &&
      existing.fingerprint === wanted.fingerprint &&
      !currentFingerprints.has(existing.fingerprint);

    if (isExact) currentFingerprints.add(existing.fingerprint);
    else cancelIdentifiers.push(existing.identifier);
  }

  return {
    cancelIdentifiers,
    schedule: desired.filter(
      (reminder) => !currentFingerprints.has(reminder.fingerprint),
    ),
  };
}
