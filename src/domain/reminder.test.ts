import { describe, expect, it } from 'vitest';

import {
  buildReminderPlan,
  desiredReminderForTask,
  parseSavedReminder,
  suggestSmartReminder,
} from './reminder';
import type { Task } from './task';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Submit lab report',
    subjectId: 'subject-chemistry',
    notes: '',
    dueAt: '2026-08-22T12:00:00.000Z',
    taskType: 'assignment',
    estimatedEffortMinutes: null,
    priority: 'high',
    reminderMinutesBefore: 60,
    status: 'open',
    createdAt: '2026-08-20T00:00:00.000Z',
    completedAt: null,
    sourceImageRef: null,
    extractionProvenance: null,
    ...overrides,
  };
}

const now = new Date('2026-08-21T00:00:00.000Z');

describe('task reminders', () => {
  it('recovers from missing, unsupported, or corrupt saved defaults', () => {
    expect(parseSavedReminder(null)).toBeUndefined();
    expect(parseSavedReminder('60')).toBe(60);
    expect(parseSavedReminder('2880')).toBe(2880);
    expect(parseSavedReminder('4320')).toBe(4320);
    expect(parseSavedReminder('7200')).toBe(7200);
    expect(parseSavedReminder('null')).toBeNull();
    expect(parseSavedReminder('30')).toBeUndefined();
    expect(parseSavedReminder('{not-json')).toBeUndefined();
  });

  it('does not suggest a reminder without a deadline or when reminders are disabled', () => {
    expect(suggestSmartReminder(null, 240, 1440, now).value).toBeNull();
    expect(
      suggestSmartReminder('2026-08-30T12:00:00.000Z', 240, null, now).value,
    ).toBeNull();
  });

  it('uses the profile default when workload does not need more lead time', () => {
    const dueAt = '2026-08-30T12:00:00.000Z';
    expect(suggestSmartReminder(dueAt, null, 1440, now)).toEqual({
      value: 1440,
      workloadAdjusted: false,
      timeAdjusted: false,
    });
    expect(suggestSmartReminder(dueAt, 30, 1440, now).value).toBe(1440);
    expect(suggestSmartReminder(dueAt, 60, 1440, now).value).toBe(1440);
  });

  it('suggests more lead time for heavier workloads', () => {
    const dueAt = '2026-08-30T12:00:00.000Z';
    expect(suggestSmartReminder(dueAt, 120, 1440, now).value).toBe(2880);
    expect(suggestSmartReminder(dueAt, 180, 1440, now).value).toBe(4320);
    expect(suggestSmartReminder(dueAt, 240, 1440, now).value).toBe(7200);
  });

  it('falls back to a useful interval when the preferred lead time has passed', () => {
    expect(
      suggestSmartReminder('2026-08-21T01:30:00.000Z', 240, 1440, now),
    ).toEqual({ value: 60, workloadAdjusted: true, timeAdjusted: true });
    expect(
      suggestSmartReminder('2026-08-21T00:30:00.000Z', 240, 1440, now).value,
    ).toBe(15);
    expect(
      suggestSmartReminder('2026-08-21T00:10:00.000Z', 240, 1440, now).value,
    ).toBe(0);
  });

  it('does not suggest a reminder for an invalid or elapsed deadline', () => {
    expect(suggestSmartReminder('not-a-date', 240, 1440, now).value).toBeNull();
    expect(
      suggestSmartReminder('2026-08-20T23:59:00.000Z', 240, 1440, now).value,
    ).toBeNull();
  });

  it('calculates a fixed reminder before the deadline', () => {
    const reminder = desiredReminderForTask(task(), now);
    expect(reminder?.triggerAt.toISOString()).toBe('2026-08-22T11:00:00.000Z');
    expect(reminder?.identifier).toBe('duely-reminder-task-1');
  });

  it('schedules the expanded multi-day reminder intervals', () => {
    const reminder = desiredReminderForTask(
      task({
        dueAt: '2026-08-30T12:00:00.000Z',
        reminderMinutesBefore: 7200,
      }),
      now,
    );
    expect(reminder?.triggerAt.toISOString()).toBe('2026-08-25T12:00:00.000Z');
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

  it('replaces exact schedules during startup recovery', () => {
    const wanted = desiredReminderForTask(task(), now)!;
    const plan = buildReminderPlan(
      [task()],
      [
        {
          identifier: wanted.identifier,
          taskId: wanted.taskId,
          fingerprint: wanted.fingerprint,
        },
      ],
      now,
      true,
    );

    expect(plan).toEqual({
      cancelIdentifiers: [wanted.identifier],
      schedule: [wanted],
    });
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

  it('keeps reminders for different tasks with identical details', () => {
    const firstTask = task({ id: 'task-1' });
    const secondTask = task({ id: 'task-2' });
    const first = desiredReminderForTask(firstTask, now)!;
    const second = desiredReminderForTask(secondTask, now)!;

    const plan = buildReminderPlan(
      [firstTask, secondTask],
      [
        { identifier: first.identifier, taskId: first.taskId, fingerprint: first.fingerprint },
        { identifier: second.identifier, taskId: second.taskId, fingerprint: second.fingerprint },
      ],
      now,
    );

    expect(plan).toEqual({ cancelIdentifiers: [], schedule: [] });
  });
});
