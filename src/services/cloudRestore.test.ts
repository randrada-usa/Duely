import { describe, expect, it } from 'vitest';

import { loadCloudTaskData } from './cloudRestore';

describe('explicit cloud restore', () => {
  it('rebuilds local identifiers and reminders without restoring image paths', async () => {
    const restored = await loadCloudTaskData(
      {
        subjects: async () => [{
          id: 'remote-subject', client_id: 'subject-local', name: 'Math', created_at: '2026-08-01T00:00:00Z',
        }],
        tasks: async () => [{
          id: 'remote-task', client_id: 'task-local', subject_id: 'remote-subject',
          title: 'Restored task', notes: '', due_at: '2026-09-01T00:00:00Z',
          task_type: 'assignment', priority: 'medium', estimated_effort_minutes: 60,
          status: 'open', completed_at: null, extraction_provenance: null,
          created_at: '2026-08-02T00:00:00Z',
        }],
        reminders: async () => [{ task_id: 'remote-task', minutes_before: 15 }],
      },
      'user-synthetic',
    );
    expect(restored.tasks[0]).toMatchObject({
      id: 'task-local',
      subjectId: 'subject-local',
      reminderMinutesBefore: 15,
      sourceImageRef: null,
    });
  });
});
