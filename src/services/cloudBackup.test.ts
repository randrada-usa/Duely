import { describe, expect, it, vi } from 'vitest';

import type { LocalTaskData } from '../domain/subject';
import {
  backupLocalTaskData,
  CLOUD_BACKUP_ERROR,
  type CloudBackupGateway,
  type ReminderBackupRow,
  type RemoteSubject,
  type RemoteTask,
  type SubjectBackupRow,
  type TaskBackupRow,
} from './cloudBackup';

const userId = 'user-synthetic';
const localData: LocalTaskData = {
  subjects: [
    {
      id: 'subject_local_math',
      name: 'Math',
      createdAt: '2026-08-20T00:00:00.000Z',
    },
  ],
  tasks: [
    {
      id: 'task_local_1',
      title: 'Synthetic worksheet',
      subjectId: 'subject_local_math',
      notes: 'Synthetic fixture only',
      dueAt: '2026-08-28T04:00:00.000Z',
      taskType: 'assignment',
      estimatedEffortMinutes: 60,
      priority: 'medium',
      reminderMinutesBefore: 15,
      status: 'open',
      createdAt: '2026-08-21T00:00:00.000Z',
      completedAt: null,
      sourceImageRef: 'file:///private/device-only.jpg',
      extractionProvenance: null,
    },
  ],
};

function gateway(seed?: {
  subjects?: RemoteSubject[];
  tasks?: RemoteTask[];
  reminderTaskIds?: string[];
}) {
  const subjects = [...(seed?.subjects ?? [])];
  const tasks = [...(seed?.tasks ?? [])];
  const reminderTaskIds = [...(seed?.reminderTaskIds ?? [])];
  const subjectRows: SubjectBackupRow[] = [];
  const taskRows: TaskBackupRow[] = [];
  const reminderRows: ReminderBackupRow[] = [];

  const fake: CloudBackupGateway = {
    listSubjects: vi.fn(async () => [...subjects]),
    insertSubjects: vi.fn(async (rows: SubjectBackupRow[]) => {
      subjectRows.push(...rows);
      rows.forEach((row, index) =>
        subjects.push({
          id: `remote-subject-${index}`,
          client_id: row.client_id,
          name: row.name,
        }),
      );
    }),
    listTasks: vi.fn(async () => [...tasks]),
    insertTasks: vi.fn(async (rows: TaskBackupRow[]) => {
      taskRows.push(...rows);
      rows.forEach((row, index) =>
        tasks.push({ id: `remote-task-${index}`, client_id: row.client_id }),
      );
    }),
    listReminderTaskIds: vi.fn(async () => [...reminderTaskIds]),
    insertReminders: vi.fn(async (rows: ReminderBackupRow[]) => {
      reminderRows.push(...rows);
      reminderTaskIds.push(...rows.map((row) => row.task_id));
    }),
  };

  return { fake, subjectRows, taskRows, reminderRows };
}

describe('guest task cloud backup', () => {
  it('backs up subjects before tasks and confirms every remote record', async () => {
    const state = gateway();
    await expect(
      backupLocalTaskData(state.fake, userId, localData),
    ).resolves.toEqual({
      subjectsConfirmed: 1,
      tasksConfirmed: 1,
      remindersConfirmed: 1,
    });

    expect(state.subjectRows[0]).toMatchObject({
      user_id: userId,
      client_id: 'subject_local_math',
      created_at: '2026-08-20T00:00:00.000Z',
    });
    expect(state.taskRows[0]).toMatchObject({
      user_id: userId,
      client_id: 'task_local_1',
      subject_id: 'remote-subject-0',
      source_image_path: null,
      created_at: '2026-08-21T00:00:00.000Z',
    });
    expect(state.reminderRows[0]).toEqual({
      user_id: userId,
      task_id: 'remote-task-0',
      minutes_before: 15,
      scheduled_for: '2026-08-28T03:45:00.000Z',
    });
  });

  it('is idempotent when the same local identifiers are already confirmed', async () => {
    const state = gateway({
      subjects: [
        { id: 'remote-subject', client_id: 'subject_local_math', name: 'Math' },
      ],
      tasks: [{ id: 'remote-task', client_id: 'task_local_1' }],
      reminderTaskIds: ['remote-task'],
    });
    await expect(
      backupLocalTaskData(state.fake, userId, localData),
    ).resolves.toMatchObject({ tasksConfirmed: 1 });
    expect(state.fake.insertSubjects).not.toHaveBeenCalled();
    expect(state.fake.insertTasks).not.toHaveBeenCalled();
    expect(state.fake.insertReminders).not.toHaveBeenCalled();
  });

  it('reuses an existing same-name subject without duplicating it', async () => {
    const state = gateway({
      subjects: [
        { id: 'remote-math', client_id: 'another-device-id', name: ' math ' },
      ],
    });
    await backupLocalTaskData(state.fake, userId, localData);
    expect(state.fake.insertSubjects).not.toHaveBeenCalled();
    expect(state.taskRows[0].subject_id).toBe('remote-math');
  });

  it('reports a safe retry error when writes cannot be confirmed', async () => {
    const state = gateway();
    state.fake.insertTasks = vi.fn(async () => {
      throw new Error('sensitive provider failure');
    });
    await expect(
      backupLocalTaskData(state.fake, userId, localData),
    ).rejects.toThrow(CLOUD_BACKUP_ERROR);
  });
});
