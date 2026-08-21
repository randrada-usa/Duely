export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'open' | 'completed';
export type ReminderMinutes = 0 | 15 | 60 | 1440;
export type TaskType = 'assignment' | 'quiz' | 'exam' | 'project' | 'reading' | 'other';
export type EstimatedEffortMinutes = 30 | 60 | 120 | 180 | 240;

export const TASK_TYPE_OPTIONS: ReadonlyArray<{ label: string; value: TaskType }> = [
  { label: 'Assignment', value: 'assignment' },
  { label: 'Quiz', value: 'quiz' },
  { label: 'Exam', value: 'exam' },
  { label: 'Project', value: 'project' },
  { label: 'Reading', value: 'reading' },
  { label: 'Other', value: 'other' },
];

export const EFFORT_OPTIONS: ReadonlyArray<{
  label: string;
  value: EstimatedEffortMinutes | null;
}> = [
  { label: 'Not estimated', value: null },
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '3 hours', value: 180 },
  { label: '4+ hours', value: 240 },
];

export type Task = {
  id: string;
  title: string;
  subjectId: string | null;
  notes: string;
  dueAt: string | null;
  taskType: TaskType;
  estimatedEffortMinutes: EstimatedEffortMinutes | null;
  priority: TaskPriority;
  reminderMinutesBefore: ReminderMinutes | null;
  status: TaskStatus;
  createdAt: string;
  completedAt: string | null;
};

export type TaskDraft = Pick<
  Task,
  | 'title'
  | 'subjectId'
  | 'notes'
  | 'dueAt'
  | 'taskType'
  | 'estimatedEffortMinutes'
  | 'priority'
  | 'reminderMinutesBefore'
>;

export function taskTypeLabel(value: TaskType) {
  return TASK_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? 'Other';
}

export function effortLabel(value: EstimatedEffortMinutes | null) {
  return EFFORT_OPTIONS.find((option) => option.value === value)?.label ?? 'Not estimated';
}

export function normalizeTask(task: Task): Task {
  const taskType = TASK_TYPE_OPTIONS.some((option) => option.value === task.taskType)
    ? task.taskType
    : 'assignment';
  const estimatedEffortMinutes = EFFORT_OPTIONS.some(
    (option) => option.value === task.estimatedEffortMinutes,
  )
    ? (task.estimatedEffortMinutes ?? null)
    : null;

  return {
    id: task.id,
    title: task.title,
    subjectId: typeof task.subjectId === 'string' ? task.subjectId : null,
    notes: task.notes,
    dueAt: task.dueAt,
    taskType,
    estimatedEffortMinutes,
    priority: task.priority,
    reminderMinutesBefore: task.reminderMinutesBefore ?? null,
    status: task.status,
    createdAt: task.createdAt,
    completedAt: task.completedAt,
  };
}

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
