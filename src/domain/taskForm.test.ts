import { describe, expect, it } from 'vitest';

import type { TaskDraft } from './task';
import {
  hasUnsavedTaskFormChanges,
  taskFormSnapshotFromDraft,
  type TaskFormSnapshot,
} from './taskForm';

const draft: TaskDraft = {
  title: 'Write reflection',
  subjectId: 'subject-1',
  notes: 'Use two sources',
  dueAt: new Date(2026, 7, 22, 23, 59).toISOString(),
  taskType: 'assignment',
  estimatedEffortMinutes: 60,
  priority: 'medium',
  reminderMinutesBefore: 60,
};

describe('task form changes', () => {
  it('creates a form snapshot from a saved task draft', () => {
    expect(taskFormSnapshotFromDraft(draft)).toEqual({
      title: 'Write reflection',
      subjectId: 'subject-1',
      notes: 'Use two sources',
      dueDate: '2026-08-22',
      dueTime: '23:59',
      taskType: 'assignment',
      estimatedEffortMinutes: 60,
      priority: 'medium',
      reminderMinutesBefore: 60,
      pendingSubjectName: '',
    });
  });

  it('recognizes an unchanged form', () => {
    const initial = taskFormSnapshotFromDraft(draft);
    expect(hasUnsavedTaskFormChanges(initial, { ...initial })).toBe(false);
  });

  it('recognizes every editable field as an unsaved change', () => {
    const initial = taskFormSnapshotFromDraft(draft);
    const changes: Partial<TaskFormSnapshot>[] = [
      { title: 'Write final reflection' },
      { subjectId: null },
      { notes: 'Use three sources' },
      { dueDate: '2026-08-23' },
      { dueTime: '10:00' },
      { taskType: 'exam' },
      { estimatedEffortMinutes: 120 },
      { priority: 'high' },
      { reminderMinutesBefore: 1_440 },
      { pendingSubjectName: 'Biology' },
    ];

    changes.forEach((change) => {
      expect(
        hasUnsavedTaskFormChanges(initial, { ...initial, ...change }),
      ).toBe(true);
    });
  });

  it('preserves exact text edits until the student chooses to discard them', () => {
    const initial = taskFormSnapshotFromDraft(draft);
    expect(
      hasUnsavedTaskFormChanges(initial, {
        ...initial,
        title: `${initial.title} `,
      }),
    ).toBe(true);
  });
});
