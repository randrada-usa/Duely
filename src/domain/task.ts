export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'open' | 'completed';
export type ReminderMinutes = 0 | 15 | 60 | 1440;

export type Task = {
  id: string;
  title: string;
  subject: string;
  notes: string;
  dueAt: string | null;
  priority: TaskPriority;
  reminderMinutesBefore: ReminderMinutes | null;
  status: TaskStatus;
  createdAt: string;
  completedAt: string | null;
};

export type TaskDraft = Pick<
  Task,
  'title' | 'subject' | 'notes' | 'dueAt' | 'priority' | 'reminderMinutesBefore'
>;

export function isOverdue(task: Task, now = new Date()) {
  return (
    task.status === 'open' &&
    task.dueAt !== null &&
    new Date(task.dueAt).getTime() < now.getTime()
  );
}

export function smartPriorityScore(task: Task, now = new Date()) {
  if (task.status === 'completed') return Number.NEGATIVE_INFINITY;

  const priorityWeight = { low: 0, medium: 10, high: 20 }[task.priority];
  if (!task.dueAt) return priorityWeight;

  const hoursUntilDue =
    (new Date(task.dueAt).getTime() - now.getTime()) / (60 * 60 * 1000);
  const urgency = hoursUntilDue <= 0 ? 100 : Math.max(0, 72 - hoursUntilDue);
  return priorityWeight + urgency;
}

export function sortBySmartPriority(tasks: Task[], now = new Date()) {
  return [...tasks].sort((a, b) => {
    const scoreDifference =
      smartPriorityScore(b, now) - smartPriorityScore(a, now);
    if (scoreDifference !== 0) return scoreDifference;
    return a.createdAt.localeCompare(b.createdAt);
  });
}
