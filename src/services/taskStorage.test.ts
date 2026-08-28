import { describe, expect, it, vi } from 'vitest';

import type { LocalTaskData } from '../domain/subject';
import {
  createTaskPersistenceQueue,
  decodeLocalTaskData,
  LEGACY_TASK_STORAGE_KEY,
  loadLocalTaskData,
  persistGuardedRestore,
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

const extractedTask = {
  ...legacyTask,
  taskType: 'assignment',
  estimatedEffortMinutes: null,
  reminderMinutesBefore: null,
  sourceImageRef: 'scan-source-1',
  extractionProvenance: {
    title: {
      sources: ['ml-kit'],
      confidenceBySource: { 'ml-kit': 'high' },
      comparison: 'not-compared',
      userAction: 'accepted',
      confirmedAt: '2026-08-21T10:00:00.000Z',
    },
  },
};

function storage(values: Record<string, string | null> = {}) {
  return {
    getItem: vi.fn(async (key: string) => values[key] ?? null),
    setItem: vi.fn(
      async (_key: string, _value: string): Promise<void> => undefined,
    ),
    multiRemove: vi.fn(
      async (_keys: readonly string[]): Promise<void> => undefined,
    ),
  } satisfies TaskStorageAdapter;
}

const emptyData: LocalTaskData = { tasks: [], subjects: [] };
const dataWithSubject: LocalTaskData = {
  tasks: [],
  subjects: [
    {
      id: 'subject-english',
      name: 'English',
      createdAt: '2026-08-21T00:00:00.000Z',
    },
  ],
};

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

  it('loads opaque image references and validated field provenance', () => {
    const result = decodeLocalTaskData(
      JSON.stringify({ version: 2, tasks: [extractedTask], subjects: [] }),
      null,
    );
    expect(result.status).toBe('ready');
    if (result.status === 'ready') {
      expect(result.data.tasks[0]).toMatchObject({
        sourceImageRef: 'scan-source-1',
        extractionProvenance: extractedTask.extractionProvenance,
      });
    }
  });

  it('preserves storage instead of accepting raw OCR values as provenance', () => {
    const unsafe = {
      ...extractedTask,
      extractionProvenance: {
        title: {
          ...extractedTask.extractionProvenance.title,
          rawValue: 'private OCR text',
        },
      },
    };
    expect(
      decodeLocalTaskData(
        JSON.stringify({ version: 2, tasks: [unsafe], subjects: [] }),
        null,
      ),
    ).toEqual({ status: 'corrupt' });
  });

  it('preserves storage instead of accepting inline source image bytes', () => {
    expect(
      decodeLocalTaskData(
        JSON.stringify({
          version: 2,
          tasks: [
            {
              ...extractedTask,
              sourceImageRef: 'data:image/png;base64,private-image',
            },
          ],
          subjects: [],
        }),
        null,
      ),
    ).toEqual({ status: 'corrupt' });
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

  it('serializes persistence writes in the order they were requested', async () => {
    const adapter = storage();
    let releaseFirstWrite = () => {};
    adapter.setItem.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseFirstWrite = resolve;
        }),
    );
    const queue = createTaskPersistenceQueue(adapter, {
      onWriteSuccess: vi.fn(),
      onWriteError: vi.fn(),
    });

    const firstWrite = queue.enqueue(emptyData);
    const secondWrite = queue.enqueue(dataWithSubject);
    await Promise.resolve();
    await Promise.resolve();
    expect(adapter.setItem).toHaveBeenCalledTimes(1);

    releaseFirstWrite();
    await Promise.all([firstWrite, secondWrite]);
    expect(adapter.setItem).toHaveBeenCalledTimes(2);
    expect(JSON.parse(adapter.setItem.mock.calls[0][1])).toMatchObject(
      emptyData,
    );
    expect(JSON.parse(adapter.setItem.mock.calls[1][1])).toMatchObject(
      dataWithSubject,
    );
  });

  it('continues queued persistence after a failed write', async () => {
    const adapter = storage();
    adapter.setItem
      .mockRejectedValueOnce(new Error('storage unavailable'))
      .mockResolvedValueOnce(undefined);
    const onWriteSuccess = vi.fn();
    const onWriteError = vi.fn();
    const queue = createTaskPersistenceQueue(adapter, {
      onWriteSuccess,
      onWriteError,
    });

    await queue.enqueue(emptyData);
    await queue.enqueue(dataWithSubject);

    expect(adapter.setItem).toHaveBeenCalledTimes(2);
    expect(onWriteError).toHaveBeenCalledOnce();
    expect(onWriteSuccess).toHaveBeenCalledOnce();
  });

  it('applies a restore only while the account and phone data remain unchanged', async () => {
    const adapter = storage();
    const restored = dataWithSubject;

    await expect(
      persistGuardedRestore(adapter, restored, () => emptyData, () => true),
    ).resolves.toBe(true);
    expect(JSON.parse(adapter.setItem.mock.calls[0][1])).toMatchObject(restored);
  });

  it('does not start a restore after the account becomes inactive', async () => {
    const adapter = storage();

    await expect(
      persistGuardedRestore(adapter, dataWithSubject, () => emptyData, () => false),
    ).resolves.toBe(false);
    expect(adapter.setItem).not.toHaveBeenCalled();
  });

  it('restores current phone data when the account changes during a write', async () => {
    const adapter = storage();
    let active = true;
    let releaseWrite = () => {};
    adapter.setItem.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseWrite = resolve;
        }),
    );

    const pending = persistGuardedRestore(
      adapter,
      dataWithSubject,
      () => emptyData,
      () => active,
    );
    await Promise.resolve();
    active = false;
    releaseWrite();

    await expect(pending).resolves.toBe(false);
    expect(adapter.setItem).toHaveBeenCalledTimes(2);
    expect(JSON.parse(adapter.setItem.mock.calls[1][1])).toMatchObject(emptyData);
  });

  it('preserves phone edits made while a restore write is pending', async () => {
    const adapter = storage();
    let current = emptyData;
    let releaseWrite = () => {};
    adapter.setItem.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseWrite = resolve;
        }),
    );

    const pending = persistGuardedRestore(
      adapter,
      dataWithSubject,
      () => current,
      () => true,
    );
    await Promise.resolve();
    current = {
      tasks: [],
      subjects: [
        {
          id: 'subject-math',
          name: 'Math',
          createdAt: '2026-08-21T01:00:00.000Z',
        },
      ],
    };
    releaseWrite();

    await expect(pending).resolves.toBe(false);
    expect(JSON.parse(adapter.setItem.mock.calls[1][1])).toMatchObject(current);
  });

  it('rejects a restore after a phone edit even if the collection is empty again', async () => {
    const adapter = storage();
    let current = emptyData;
    let releaseWrite = () => {};
    adapter.setItem.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseWrite = resolve;
        }),
    );

    const pending = persistGuardedRestore(
      adapter,
      dataWithSubject,
      () => current,
      () => true,
    );
    await Promise.resolve();
    current = { tasks: [], subjects: [] };
    releaseWrite();

    await expect(pending).resolves.toBe(false);
    expect(adapter.setItem).toHaveBeenCalledTimes(2);
  });
});
