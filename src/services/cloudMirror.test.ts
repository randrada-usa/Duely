import { describe, expect, it, vi } from 'vitest';

import type { LocalTaskData } from '../domain/subject';
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
    dueAt: null,
    taskType: 'assignment',
    estimatedEffortMinutes: null,
    priority: 'medium',
    reminderMinutesBefore: null,
    status: 'open',
    createdAt: '2026-08-01T00:00:00Z',
    completedAt: null,
    sourceImageRef: 'file:///device-only.jpg',
    extractionProvenance: null,
  }],
};
const receipt: CloudBackupReceipt = {
  userId,
  subjectIds: ['subject-local'],
  taskIds: ['task-local', 'task-deleted'],
  confirmedAt: '2026-08-02T00:00:00Z',
};

describe('phone-authoritative cloud mirror', () => {
  it('updates phone records, removes confirmed local deletions, and preserves unknown remote rows', async () => {
    const subjects = [{ id: 'remote-subject', client_id: 'subject-local', name: 'Old Math' }];
    const tasks = [
      { id: 'remote-task', client_id: 'task-local' },
      { id: 'remote-deleted', client_id: 'task-deleted' },
      { id: 'remote-unknown', client_id: 'another-install' },
    ];
    const gateway: CloudMirrorGateway = {
      listSubjects: vi.fn(async () => [...subjects]),
      insertSubjects: vi.fn(async () => undefined),
      listTasks: vi.fn(async () => [...tasks]),
      insertTasks: vi.fn(async () => undefined),
      listReminderTaskIds: vi.fn(async () => []),
      insertReminders: vi.fn(async () => undefined),
      updateSubject: vi.fn(async (_userId, _id, name) => { subjects[0].name = name; }),
      updateTask: vi.fn(async () => undefined),
      replaceReminder: vi.fn(async () => undefined),
      deleteTasks: vi.fn(async (_userId, ids: string[]) => {
        ids.forEach((id) => {
          const index = tasks.findIndex((task) => task.id === id);
          if (index >= 0) tasks.splice(index, 1);
        });
      }),
      deleteSubjects: vi.fn(async () => undefined),
    };

    await mirrorLocalTaskData(gateway, userId, data, receipt);
    expect(gateway.updateTask).toHaveBeenCalledWith(
      userId,
      'remote-task',
      expect.objectContaining({ title: 'Phone title wins', source_image_path: null }),
    );
    expect(gateway.deleteTasks).toHaveBeenCalledWith(userId, ['remote-deleted']);
    expect(tasks.map((task) => task.client_id)).toContain('another-install');
  });
});
