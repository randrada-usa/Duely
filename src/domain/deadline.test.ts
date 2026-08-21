import { describe, expect, it } from 'vitest';

import { deadlineParts, parseLocalDeadline } from './deadline';

describe('local deadlines', () => {
  it('uses end of day when a date has no explicit time', () => {
    const result = parseLocalDeadline('2026-08-22', '');
    expect(deadlineParts(result.dueAt)).toEqual({ date: '2026-08-22', time: '23:59' });
  });

  it('round trips valid local date and time parts', () => {
    const result = parseLocalDeadline('2026-08-22', '14:30');
    expect(result.error).toBeNull();
    expect(deadlineParts(result.dueAt)).toEqual({ date: '2026-08-22', time: '14:30' });
  });

  it('rejects rolled-over calendar dates and invalid clock times', () => {
    expect(parseLocalDeadline('2026-02-30', '12:00').error).toBeTruthy();
    expect(parseLocalDeadline('2026-08-22', '24:00').error).toBeTruthy();
    expect(parseLocalDeadline('08/22/2026', '2:30 PM').error).toBeTruthy();
  });

  it('allows a task without a deadline', () => {
    expect(parseLocalDeadline('', '')).toEqual({ dueAt: null, error: null });
  });
});
