import { describe, expect, it, vi } from 'vitest';

import type { LocalTaskData } from '../domain/subject';
import type { ReminderBackupRow } from './cloudBackup';
import type { CloudBackupReceipt } from './cloudBackupReceipt';
import { mirrorLocalTaskData, type CloudMirrorGateway } from './cloudMirror';

const userId = 'user-synthetic';
const data: LocalTaskData = {
  subjects: [{ id: 'subject-local', name: 'Math', createdAt: '2026-08-01T00:00:00Z' }],
  tasks: [{
    id: 'task-local',
    title: 'Phone title wins',
    subjectId: 'subject-local',
    notes: '',
    dueAt: '2026-08-30T10:00:00Z',
    taskType: 'assignment',
    estimatedEffortMinutes: null,
    priority: 'medium',
    reminderMinutesBefore: 60,
    status: 'open',
    createdAt: '2026-08-01T00:00:00Z',
    completedAt: null,
    sourceImageRef: 'file:///device-only.jpg',
    extractionProvenance: null,
  }],
};
const receipt: CloudBackupReceipt = {
  userId,
  subjectIds: ['subject-local', 'subject-deleted'],
  taskIds: ['task-local', 'task-deleted'],
  confirmedAt: '2026-08-02T00:00:00Z',
};

describe('phone-authoritative cloud mirror', () => {
  it('mirrors subject and reminder changes, removes confirmed local deletions, and preserves unknown remote rows', async () => {
    const subjects = [
      { id: 'remote-subject', client_id: 'subject-local', name: 'Old Math' },
      { id: 'remote-subject-deleted', client_id: 'subject-deleted', name: 'Old Science' },
    ];
    const tasks = [
      { id: 'remote-task', client_id: 'task-local' },
      { id: 'remote-deleted', client_id: 'task-deleted' },
      { id: 'remote-unknown', client_id: 'another-install' },
    ];
    const reminderTaskIds = new Set<string>();
    const gateway: CloudMirrorGateway = {
      listSubjects: vi.fn(async () => [...subjects]),
      insertSubjects: vi.fn(async () => undefined),
      listTasks: vi.fn(async () => [...tasks]),
      insertTasks: vi.fn(async () => undefined),
      listReminderTaskIds: vi.fn(async () => [...reminderTaskIds]),
      insertReminders: vi.fn(async (rows: ReminderBackupRow[]) => {
        rows.forEach((row) => reminderTaskIds.add(row.task_id));
      }),
      updateSubject: vi.fn(async (_userId, _id, name) => { subjects[0].name = name; }),
      updateTask: vi.fn(async () => undefined),
      replaceReminder: vi.fn(async () => undefined),
      deleteTasks: vi.fn(async (_userId, ids: string[]) => {
        ids.forEach((id) => {
          const index = tasks.findIndex((task) => task.id === id);
          if (index >= 0) tasks.splice(index, 1);
        });
      }),
      deleteSubjects: vi.fn(async (_userId, ids: string[]) => {
        ids.forEach((id) => {
          const index = subjects.findIndex((subject) => subject.id === id);
          if (index >= 0) subjects.splice(index, 1);
        });
      }),
    };

    await mirrorLocalTaskData(gateway, userId, data, receipt);
    expect(gateway.updateSubject).toHaveBeenCalledWith(
      userId,
      'remote-subject',
      'Math',
    );
    expect(gateway.updateTask).toHaveBeenCalledWith(
      userId,
      'remote-task',
      expect.objectContaining({ title: 'Phone title wins', source_image_path: null }),
    );
    expect(gateway.replaceReminder).toHaveBeenCalledWith(
      userId,
      'remote-task',
      60,
      '2026-08-30T09:00:00.000Z',
    );
    expect(gateway.deleteTasks).toHaveBeenCalledWith(userId, ['remote-deleted']);
    expect(gateway.deleteSubjects).toHaveBeenCalledWith(userId, [
      'remote-subject-deleted',
    ]);
    expect(tasks.map((task) => task.client_id)).toContain('another-install');
  });

  it('removes a cloud reminder when the phone no longer has one', async () => {
    const gateway: CloudMirrorGateway = {
      listSubjects: vi.fn(async () => [
        { id: 'remote-subject', client_id: 'subject-local', name: 'Math' },
      ]),
      insertSubjects: vi.fn(async () => undefined),
      listTasks: vi.fn(async () => [
        { id: 'remote-task', client_id: 'task-local' },
      ]),
      insertTasks: vi.fn(async () => undefined),
      listReminderTaskIds: vi.fn(async () => ['remote-task']),
      insertReminders: vi.fn(async () => undefined),
      updateSubject: vi.fn(async () => undefined),
      updateTask: vi.fn(async () => undefined),
      replaceReminder: vi.fn(async () => undefined),
      deleteTasks: vi.fn(async () => undefined),
      deleteSubjects: vi.fn(async () => undefined),
    };

    await mirrorLocalTaskData(
      gateway,
      userId,
      {
        ...data,
        tasks: data.tasks.map((task) => ({
          ...task,
          reminderMinutesBefore: null,
        })),
      },
      { ...receipt, subjectIds: ['subject-local'], taskIds: ['task-local'] },
    );

    expect(gateway.replaceReminder).toHaveBeenCalledWith(
      userId,
      'remote-task',
      null,
      null,
    );
  });
});
