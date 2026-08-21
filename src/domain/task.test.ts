import { describe, expect, it } from 'vitest';

import {
  effortLabel,
  normalizeTask,
  sortBySmartPriority,
  taskTypeLabel,
  type Task,
} from './task';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Write reflection',
    subjectId: 'subject-english',
    notes: '',
    dueAt: null,
    taskType: 'assignment',
    estimatedEffortMinutes: null,
    priority: 'medium',
    reminderMinutesBefore: null,
    status: 'open',
    createdAt: '2026-08-21T00:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}

describe('task model', () => {
  it('migrates legacy tasks to safe type and effort defaults', () => {
    const legacy = {
      ...task(),
      taskType: undefined,
      estimatedEffortMinutes: undefined,
      reminderMinutesBefore: undefined,
    } as unknown as Task;

    expect(normalizeTask(legacy)).toMatchObject({
      taskType: 'assignment',
      estimatedEffortMinutes: null,
      reminderMinutesBefore: null,
    });
  });

  it('normalizes unsupported stored values', () => {
    const invalid = {
      ...task(),
      taskType: 'essay',
      estimatedEffortMinutes: 75,
    } as unknown as Task;

    expect(normalizeTask(invalid)).toMatchObject({
      taskType: 'assignment',
      estimatedEffortMinutes: null,
    });
  });

  it('provides student-facing labels for metadata', () => {
    expect(taskTypeLabel('project')).toBe('Project');
    expect(effortLabel(120)).toBe('2 hours');
    expect(effortLabel(null)).toBe('Not estimated');
  });

  it('keeps smart-priority ordering deterministic when scores tie', () => {
    const later = task({ id: 'later', createdAt: '2026-08-21T02:00:00.000Z' });
    const earlier = task({ id: 'earlier', createdAt: '2026-08-21T01:00:00.000Z' });
    expect(sortBySmartPriority([later, earlier]).map((item) => item.id)).toEqual([
      'earlier',
      'later',
    ]);
  });

  it('sorts multiple completed tasks without producing an invalid comparison', () => {
    const later = task({
      id: 'later-complete',
      status: 'completed',
      createdAt: '2026-08-21T02:00:00.000Z',
    });
    const earlier = task({
      id: 'earlier-complete',
      status: 'completed',
      createdAt: '2026-08-21T01:00:00.000Z',
    });

    expect(sortBySmartPriority([later, earlier]).map((item) => item.id)).toEqual([
      'earlier-complete',
      'later-complete',
    ]);
  });
});
