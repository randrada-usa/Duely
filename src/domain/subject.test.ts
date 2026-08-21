import { describe, expect, it } from 'vitest';

import {
  deleteSubjectFromData,
  migrateLocalTaskData,
  normalizeSubjectName,
  subjectNameError,
  subjectNameForId,
  type Subject,
} from './subject';
import type { Task } from './task';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Write reflection',
    subjectId: null,
    notes: '',
    dueAt: null,
    taskType: 'assignment',
    estimatedEffortMinutes: null,
    priority: 'medium',
    reminderMinutesBefore: null,
    status: 'open',
    createdAt: '2026-08-21T00:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}

const subjects: Subject[] = [
  {
    id: 'subject-cs',
    name: 'CS 301 · Algorithms',
    createdAt: '2026-08-21T00:00:00.000Z',
  },
];

describe('subject names', () => {
  it('normalizes whitespace and rejects case-insensitive duplicates', () => {
    expect(normalizeSubjectName('  CS 301   · Algorithms  ')).toBe(
      'CS 301 · Algorithms',
    );
    expect(subjectNameError(subjects, ' unassigned ')).toContain('reserved');
    expect(subjectNameError(subjects, 'cs 301 · algorithms')).toBeTruthy();
    expect(subjectNameError(subjects, 'English')).toBeNull();
  });

  it('uses Unassigned for missing or stale subject references', () => {
    expect(subjectNameForId(subjects, null)).toBe('Unassigned');
    expect(subjectNameForId(subjects, 'missing')).toBe('Unassigned');
  });
});

describe('local subject migration', () => {
  it('turns legacy subject strings into one stable subject', () => {
    const first = { ...task({ id: 'first' }), subjectId: undefined, subject: 'Chemistry' };
    const second = { ...task({ id: 'second' }), subjectId: undefined, subject: ' chemistry ' };

    const migrated = migrateLocalTaskData([first, second], []);

    expect(migrated.subjects).toHaveLength(1);
    expect(migrated.subjects[0].name).toBe('Chemistry');
    expect(migrated.tasks.map((item) => item.subjectId)).toEqual([
      migrated.subjects[0].id,
      migrated.subjects[0].id,
    ]);
    expect('subject' in migrated.tasks[0]).toBe(false);
  });

  it('merges duplicate stored subjects and repairs their task references', () => {
    const migrated = migrateLocalTaskData(
      [task({ subjectId: 'duplicate-id' })],
      [
        ...subjects,
        {
          id: 'duplicate-id',
          name: ' cs 301 · algorithms ',
          createdAt: '2026-08-22T00:00:00.000Z',
        },
      ],
    );

    expect(migrated.subjects).toEqual(subjects);
    expect(migrated.tasks[0].subjectId).toBe('subject-cs');
  });

  it('moves tasks to Unassigned when their subject is deleted', () => {
    const updated = deleteSubjectFromData(
      { subjects, tasks: [task({ subjectId: 'subject-cs' })] },
      'subject-cs',
    );

    expect(updated.subjects).toEqual([]);
    expect(updated.tasks[0].subjectId).toBeNull();
  });
});
