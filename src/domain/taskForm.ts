import { deadlineParts } from './deadline';
import type {
  EstimatedEffortMinutes,
  ReminderMinutes,
  TaskDraft,
  TaskPriority,
  TaskType,
} from './task';

export type TaskFormSnapshot = {
  title: string;
  subjectId: string | null;
  notes: string;
  dueDate: string;
  dueTime: string;
  taskType: TaskType;
  estimatedEffortMinutes: EstimatedEffortMinutes | null;
  priority: TaskPriority;
  reminderMinutesBefore: ReminderMinutes | null;
  pendingSubjectName: string;
};

export function taskFormSnapshotFromDraft(
  draft: TaskDraft,
): TaskFormSnapshot {
  const deadline = deadlineParts(draft.dueAt);
  return {
    title: draft.title,
    subjectId: draft.subjectId,
    notes: draft.notes,
    dueDate: deadline.date,
    dueTime: deadline.time,
    taskType: draft.taskType,
    estimatedEffortMinutes: draft.estimatedEffortMinutes,
    priority: draft.priority,
    reminderMinutesBefore: draft.reminderMinutesBefore,
    pendingSubjectName: '',
  };
}

export function hasUnsavedTaskFormChanges(
  initial: TaskFormSnapshot,
  current: TaskFormSnapshot,
) {
  return (
    initial.title !== current.title ||
    initial.subjectId !== current.subjectId ||
    initial.notes !== current.notes ||
    initial.dueDate !== current.dueDate ||
    initial.dueTime !== current.dueTime ||
    initial.taskType !== current.taskType ||
    initial.estimatedEffortMinutes !== current.estimatedEffortMinutes ||
    initial.priority !== current.priority ||
    initial.reminderMinutesBefore !== current.reminderMinutesBefore ||
    initial.pendingSubjectName !== current.pendingSubjectName
  );
}
