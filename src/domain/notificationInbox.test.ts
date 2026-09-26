import { describe, expect, it } from 'vitest';

import {
  decodeNotificationReadKeys,
  notificationReadKey,
} from './notificationInbox';

const notice = {
  id: 'task-1',
  title: 'Submit report',
  dueAt: '2026-09-27T08:00:00.000Z',
  reminderMinutesBefore: 60 as const,
};

describe('notification inbox read state', () => {
  it('changes the read key when notification-relevant task details change', () => {
    const original = notificationReadKey(notice);
    expect(notificationReadKey({ ...notice, title: 'Submit final report' })).not.toBe(original);
    expect(notificationReadKey({ ...notice, dueAt: '2026-09-28T08:00:00.000Z' })).not.toBe(original);
    expect(notificationReadKey({ ...notice, reminderMinutesBefore: 1440 })).not.toBe(original);
  });

  it('restores valid saved keys and recovers from invalid storage', () => {
    expect([...decodeNotificationReadKeys('["first","second"]')]).toEqual([
      'first',
      'second',
    ]);
    expect([...decodeNotificationReadKeys('{broken')]).toEqual([]);
    expect([...decodeNotificationReadKeys('["valid",42]')]).toEqual([]);
  });
});
