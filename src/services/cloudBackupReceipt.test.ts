import { describe, expect, it, vi } from 'vitest';

import type { LocalTaskData } from '../domain/subject';
import {
  cloudBackupReceiptKey,
  decodeCloudBackupReceipt,
  loadCloudBackupReceipt,
  pendingCloudBackupCounts,
  saveCloudBackupReceipt,
} from './cloudBackupReceipt';

const userId = 'user-synthetic';
const data = {
  tasks: [{ id: 'task-1' }, { id: 'task-2' }],
  subjects: [{ id: 'subject-1' }],
} as LocalTaskData;

describe('cloud backup receipts', () => {
  it('rejects malformed or cross-account receipts', () => {
    expect(decodeCloudBackupReceipt('{broken', userId)).toBeNull();
    expect(
      decodeCloudBackupReceipt(
        JSON.stringify({
          userId: 'another-user',
          taskIds: [],
          subjectIds: [],
          confirmedAt: '2026-08-25T00:00:00.000Z',
        }),
        userId,
      ),
    ).toBeNull();
  });

  it('saves and reloads confirmation for only the matching account', async () => {
    let saved: string | null = null;
    const storage = {
      getItem: vi.fn(async () => saved),
      setItem: vi.fn(async (_key: string, value: string) => {
        saved = value;
      }),
    };
    const confirmedAt = '2026-08-25T00:00:00.000Z';
    await saveCloudBackupReceipt(storage, userId, data, confirmedAt);
    expect(storage.setItem).toHaveBeenCalledWith(
      cloudBackupReceiptKey(userId),
      expect.any(String),
    );
    await expect(loadCloudBackupReceipt(storage, userId)).resolves.toMatchObject({
      userId,
      taskIds: ['task-1', 'task-2'],
      subjectIds: ['subject-1'],
      confirmedAt,
    });
  });

  it('counts records added after the last confirmed backup', () => {
    expect(
      pendingCloudBackupCounts(data, {
        userId,
        taskIds: ['task-1'],
        subjectIds: [],
        confirmedAt: '2026-08-25T00:00:00.000Z',
      }),
    ).toEqual({ tasks: 1, subjects: 1 });
  });
});
