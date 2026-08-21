import { describe, expect, it } from 'vitest';

import { buildReminderPlan, desiredReminderForTask } from './reminder';
import type { Task } from './task';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Submit lab report',
    subject: 'Chemistry',
    notes: '',
    dueAt: '2026-08-22T12:00:00.000Z',
    taskType: 'assignment',
    estimatedEffortMinutes: null,
    priority: 'high',
    reminderMinutesBefore: 60,
    status: 'open',
    createdAt: '2026-08-20T00:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}

const now = new Date('2026-08-21T00:00:00.000Z');

describe('task reminders', () => {
  it('calculates a fixed reminder before the deadline', () => {
    const reminder = desiredReminderForTask(task(), now);
    expect(reminder?.triggerAt.toISOString()).toBe('2026-08-22T11:00:00.000Z');
    expect(reminder?.identifier).toBe('duely-reminder-task-1');
  });

  it('does not schedule completed, undated, disabled, or elapsed reminders', () => {
    expect(desiredReminderForTask(task({ status: 'completed' }), now)).toBeNull();
    expect(desiredReminderForTask(task({ dueAt: null }), now)).toBeNull();
    expect(desiredReminderForTask(task({ reminderMinutesBefore: null }), now)).toBeNull();
    expect(desiredReminderForTask(task({ dueAt: '2026-08-20T00:00:00.000Z' }), now)).toBeNull();
  });

  it('keeps an exact existing schedule without creating a duplicate', () => {
    const wanted = desiredReminderForTask(task(), now)!;
    const plan = buildReminderPlan(
      [task()],
      [{ identifier: wanted.identifier, taskId: wanted.taskId, fingerprint: wanted.fingerprint }],
      now,
    );
    expect(plan).toEqual({ cancelIdentifiers: [], schedule: [] });
  });

  it('cancels stale and duplicate schedules before replacing them', () => {
    const wanted = desiredReminderForTask(task(), now)!;
    const plan = buildReminderPlan(
      [task()],
      [
        { identifier: wanted.identifier, taskId: wanted.taskId, fingerprint: 'old deadline' },
        { identifier: 'duplicate', taskId: wanted.taskId, fingerprint: wanted.fingerprint },
      ],
      now,
    );
    expect(plan.cancelIdentifiers).toEqual([wanted.identifier, 'duplicate']);
    expect(plan.schedule).toEqual([wanted]);
  });

  it('cancels reminders after completion or deletion', () => {
    const existing = {
      identifier: 'duely-reminder-task-1',
      taskId: 'task-1',
      fingerprint: 'existing',
    };
    expect(buildReminderPlan([], [existing], now).cancelIdentifiers).toEqual([existing.identifier]);
    expect(
      buildReminderPlan([task({ status: 'completed' })], [existing], now).cancelIdentifiers,
    ).toEqual([existing.identifier]);
  });
});
