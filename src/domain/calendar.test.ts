import { describe, expect, it } from 'vitest';

import type { Task } from './task';
import {
  calendarMonthCells,
  dueAtForLocalDate,
  moveLocalMonth,
  parseLocalDateKey,
  tasksByLocalDate,
  toLocalDateKey,
} from './calendar';

function task(id: string, title: string, dueAt: string | null): Task {
  return {
    id,
    title,
    subject: 'Synthetic course',
    notes: '',
    dueAt,
    taskType: 'assignment',
    estimatedEffortMinutes: null,
    priority: 'medium',
    reminderMinutesBefore: null,
    status: 'open',
    createdAt: '2026-08-01T00:00:00.000Z',
    completedAt: null,
  };
}

describe('local calendar dates', () => {
  it('round-trips a valid local date key', () => {
    const date = parseLocalDateKey('2026-08-21');
    expect(date).not.toBeNull();
    expect(toLocalDateKey(date!)).toBe('2026-08-21');
  });

  it('rejects impossible and malformed dates', () => {
    expect(parseLocalDateKey('2026-02-29')).toBeNull();
    expect(parseLocalDateKey('08/21/2026')).toBeNull();
  });

  it('prefills a selected date at the local end of day', () => {
    const dueAt = dueAtForLocalDate('2026-08-21');
    expect(dueAt).not.toBeNull();
    const date = new Date(dueAt!);
    expect(toLocalDateKey(date)).toBe('2026-08-21');
    expect([date.getHours(), date.getMinutes()]).toEqual([23, 59]);
  });
});

describe('calendar month layout', () => {
  it('renders August 2026 in six complete weeks', () => {
    const cells = calendarMonthCells(new Date(2026, 7, 1));
    expect(cells).toHaveLength(42);
    expect(cells.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(cells[6]?.getDate()).toBe(1);
    expect(cells[36]?.getDate()).toBe(31);
  });

  it('moves safely across year boundaries', () => {
    const january = moveLocalMonth(new Date(2026, 11, 1), 1);
    expect([january.getFullYear(), january.getMonth(), january.getDate()]).toEqual([
      2027,
      0,
      1,
    ]);
  });
});

describe('task grouping', () => {
  it('groups valid deadlines by local date and ignores missing deadlines', () => {
    const morning = new Date(2026, 7, 21, 8, 0).toISOString();
    const evening = new Date(2026, 7, 21, 17, 0).toISOString();
    const grouped = tasksByLocalDate([
      task('2', 'Evening task', evening),
      task('1', 'Morning task', morning),
      task('3', 'No deadline', null),
    ]);

    expect(grouped.get('2026-08-21')?.map(({ id }) => id)).toEqual(['1', '2']);
    expect(grouped.size).toBe(1);
  });
});
