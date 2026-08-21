import { describe, expect, it } from 'vitest';

import type { Task } from './task';
import {
  completeTask,
  reopenTask,
  undoTaskCompletion,
} from './taskCompletion';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Write reflection',
    subjectId: null,
    notes: '',
    dueAt: null,
    taskType: 'assignment',
    estimatedEffortMinutes: null,
    priority: 'medium',
    reminderMinutesBefore: null,
    status: 'open',
    createdAt: '2026-08-21T00:00:00.000Z',
    completedAt: null,
    sourceImageRef: null,
    extractionProvenance: null,
    ...overrides,
  };
}

describe('task completion', () => {
  it('records completion and reopens a task explicitly', () => {
    const completedAt = '2026-08-21T08:00:00.000Z';
    const completed = completeTask([task()], 'task-1', completedAt);
    expect(completed[0]).toMatchObject({
      status: 'completed',
      completedAt,
    });

    expect(reopenTask(completed, 'task-1')[0]).toMatchObject({
      status: 'open',
      completedAt: null,
    });
  });

  it('undoes only the exact completion represented by the action', () => {
    const firstCompletion = '2026-08-21T08:00:00.000Z';
    const newerCompletion = '2026-08-21T09:00:00.000Z';
    const completed = completeTask([task()], 'task-1', newerCompletion);

    const unchanged = undoTaskCompletion(completed, {
      taskId: 'task-1',
      completedAt: firstCompletion,
    });
    expect(unchanged).toBe(completed);

    const restored = undoTaskCompletion(completed, {
      taskId: 'task-1',
      completedAt: newerCompletion,
    });
    expect(restored[0]).toMatchObject({ status: 'open', completedAt: null });
  });

  it('leaves missing tasks untouched', () => {
    const tasks = [task()];
    expect(reopenTask(tasks, 'missing')).toBe(tasks);
    expect(
      undoTaskCompletion(tasks, {
        taskId: 'missing',
        completedAt: '2026-08-21T08:00:00.000Z',
      }),
    ).toBe(tasks);
  });
});
