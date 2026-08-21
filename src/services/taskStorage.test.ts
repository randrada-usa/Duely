import { describe, expect, it, vi } from 'vitest';

import {
  decodeLocalTaskData,
  LEGACY_TASK_STORAGE_KEY,
  loadLocalTaskData,
  resetLocalTaskData,
  TASK_STORAGE_KEY,
  TASK_STORAGE_KEYS,
  type TaskStorageAdapter,
} from './taskStorage';

const legacyTask = {
  id: 'task-1',
  title: 'Write reflection',
  subject: 'English',
  notes: '',
  dueAt: null,
  priority: 'medium',
  status: 'open',
  createdAt: '2026-08-21T00:00:00.000Z',
  completedAt: null,
};

function storage(values: Record<string, string | null> = {}) {
  return {
    getItem: vi.fn(async (key: string) => values[key] ?? null),
    setItem: vi.fn(async () => undefined),
    multiRemove: vi.fn(async () => undefined),
  } satisfies TaskStorageAdapter;
}

describe('local task storage', () => {
  it('loads an empty collection when no local data exists', () => {
    expect(decodeLocalTaskData(null, null)).toEqual({
      status: 'ready',
      data: { tasks: [], subjects: [] },
    });
  });

  it('loads current data without consulting stale legacy contents', () => {
    const current = JSON.stringify({ version: 2, tasks: [], subjects: [] });
    expect(decodeLocalTaskData(current, 'not-json')).toEqual({
      status: 'ready',
      data: { tasks: [], subjects: [] },
    });
  });

  it('marks malformed current and legacy payloads as corrupt', () => {
    expect(decodeLocalTaskData('{broken', null)).toEqual({ status: 'corrupt' });
    expect(
      decodeLocalTaskData(JSON.stringify({ tasks: [] }), null),
    ).toEqual({ status: 'corrupt' });
    expect(decodeLocalTaskData(null, '{}')).toEqual({ status: 'corrupt' });
    expect(
      decodeLocalTaskData(
        JSON.stringify({ tasks: [{}], subjects: [] }),
        null,
      ),
    ).toEqual({ status: 'corrupt' });
    expect(
      decodeLocalTaskData(
        JSON.stringify({ tasks: [legacyTask, legacyTask], subjects: [] }),
        null,
      ),
    ).toEqual({ status: 'corrupt' });
    expect(
      decodeLocalTaskData(
        JSON.stringify({
          tasks: [],
          subjects: [
            { id: 'same', name: 'Math' },
            { id: 'same', name: 'English' },
          ],
        }),
        null,
      ),
    ).toEqual({ status: 'corrupt' });
  });

  it('still migrates valid tasks saved by the legacy schema', () => {
    const result = decodeLocalTaskData(null, JSON.stringify([legacyTask]));
    expect(result.status).toBe('ready');
    if (result.status === 'ready') {
      expect(result.data.tasks[0]).toMatchObject({
        id: 'task-1',
        title: 'Write reflection',
        taskType: 'assignment',
        reminderMinutesBefore: null,
      });
      expect(result.data.subjects[0].name).toBe('English');
    }
  });

  it('does not overwrite or remove corrupt data while loading it', async () => {
    const adapter = storage({
      [TASK_STORAGE_KEY]: '{broken',
      [LEGACY_TASK_STORAGE_KEY]: JSON.stringify([]),
    });

    await expect(loadLocalTaskData(adapter)).resolves.toEqual({
      status: 'corrupt',
    });
    expect(adapter.setItem).not.toHaveBeenCalled();
    expect(adapter.multiRemove).not.toHaveBeenCalled();
  });

  it('removes current and legacy data only through explicit reset', async () => {
    const adapter = storage();
    await resetLocalTaskData(adapter);
    expect(adapter.multiRemove).toHaveBeenCalledOnce();
    expect(adapter.multiRemove).toHaveBeenCalledWith(TASK_STORAGE_KEYS);
  });
});
