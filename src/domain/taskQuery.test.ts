import { describe, expect, it } from 'vitest';

import type { Subject } from './subject';
import type { Task } from './task';
import {
  DEFAULT_TASK_QUERY,
  filterTasks,
  groupTasks,
  hasActiveTaskFilters,
  sortTasks,
  taskSections,
  type TaskQuery,
} from './taskQuery';

const now = new Date(2026, 7, 21, 12, 0, 0, 0);
const at = (day: number, hour: number) =>
  new Date(2026, 7, day, hour, 0, 0, 0).toISOString();

const subjects: Subject[] = [
  { id: 'english', name: 'English', createdAt: at(1, 8) },
  { id: 'physics', name: 'Physics', createdAt: at(1, 9) },
];

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-default',
    title: 'Default task',
    subjectId: null,
    notes: '',
    dueAt: at(22, 12),
    taskType: 'assignment',
    estimatedEffortMinutes: null,
    priority: 'medium',
    reminderMinutesBefore: null,
    status: 'open',
    createdAt: at(20, 8),
    completedAt: null,
    sourceImageRef: null,
    extractionProvenance: null,
    ...overrides,
  };
}

const tasks = [
  task({
    id: 'overdue',
    title: 'Late lab',
    subjectId: 'physics',
    dueAt: at(21, 10),
    priority: 'high',
  }),
  task({
    id: 'today',
    title: 'Quiz review',
    subjectId: 'physics',
    dueAt: at(21, 18),
    taskType: 'quiz',
  }),
  task({
    id: 'tomorrow',
    title: 'Essay outline',
    subjectId: 'english',
    dueAt: at(22, 12),
    priority: 'low',
    createdAt: at(21, 9),
  }),
  task({
    id: 'completed',
    title: 'Finished reading',
    dueAt: at(21, 9),
    taskType: 'reading',
    status: 'completed',
    completedAt: at(21, 10),
  }),
  task({
    id: 'undated',
    title: 'Plan project',
    dueAt: null,
    taskType: 'project',
    priority: 'high',
    createdAt: at(21, 11),
  }),
];

function query(overrides: Partial<TaskQuery> = {}): TaskQuery {
  return { ...DEFAULT_TASK_QUERY, ...overrides };
}

describe('task filtering', () => {
  it('treats open, overdue, and completed as distinct visible states', () => {
    expect(
      filterTasks(tasks, subjects, query({ state: 'open' }), now).map(
        (item) => item.id,
      ),
    ).toEqual(['today', 'tomorrow', 'undated']);
    expect(
      filterTasks(tasks, subjects, query({ state: 'overdue' }), now).map(
        (item) => item.id,
      ),
    ).toEqual(['overdue']);
    expect(
      filterTasks(tasks, subjects, query({ state: 'completed' }), now).map(
        (item) => item.id,
      ),
    ).toEqual(['completed']);
  });

  it('combines deadline, subject, task type, priority, and search filters', () => {
    expect(
      filterTasks(
        tasks,
        subjects,
        query({ subject: 'physics', taskType: 'quiz', search: 'review' }),
        now,
      ).map((item) => item.id),
    ).toEqual(['today']);
    expect(
      filterTasks(
        tasks,
        subjects,
        query({ noDeadline: true, priority: 'high' }),
        now,
      ).map((item) => item.id),
    ).toEqual(['undated']);
  });

  it('reports only filtering choices as active', () => {
    expect(hasActiveTaskFilters(DEFAULT_TASK_QUERY)).toBe(false);
    expect(hasActiveTaskFilters(query({ grouping: 'status' }))).toBe(false);
    expect(hasActiveTaskFilters(query({ state: 'open' }))).toBe(true);
  });
});

describe('task sorting', () => {
  it('sorts due dates chronologically and keeps undated tasks last', () => {
    expect(sortTasks(tasks, 'due', now).map((item) => item.id)).toEqual([
      'completed',
      'overdue',
      'today',
      'tomorrow',
      'undated',
    ]);
  });

  it('sorts newest-created first or titles alphabetically', () => {
    expect(sortTasks(tasks, 'created', now)[0].id).toBe('undated');
    expect(sortTasks(tasks, 'title', now).map((item) => item.title)).toEqual([
      'Essay outline',
      'Finished reading',
      'Late lab',
      'Plan project',
      'Quiz review',
    ]);
  });

  it('keeps smart-priority ordering deterministic for completed tasks', () => {
    const first = task({
      id: 'first-complete',
      status: 'completed',
      createdAt: at(20, 7),
    });
    const second = task({
      id: 'second-complete',
      status: 'completed',
      createdAt: at(20, 8),
    });
    expect(sortTasks([second, first], 'smart', now).map((item) => item.id)).toEqual([
      'first-complete',
      'second-complete',
    ]);
  });
});

describe('task grouping', () => {
  it('groups task states in urgency order', () => {
    expect(groupTasks(tasks, 'status', subjects, now).map((section) => section.title)).toEqual([
      'Overdue',
      'Open',
      'Completed',
    ]);
  });

  it('groups subjects alphabetically with Unassigned last', () => {
    expect(groupTasks(tasks, 'subject', subjects, now).map((section) => section.title)).toEqual([
      'English',
      'Physics',
      'Unassigned',
    ]);
  });

  it('groups deadlines into useful local-date sections', () => {
    expect(groupTasks(tasks, 'deadline', subjects, now).map((section) => section.title)).toEqual([
      'Overdue',
      'Today',
      'Tomorrow',
      'No deadline',
    ]);
  });

  it('builds filtered, sorted sections in one deterministic query', () => {
    const sections = taskSections(
      tasks,
      subjects,
      query({ state: 'open', grouping: 'subject', sort: 'title' }),
      now,
    );
    expect(sections.map((section) => section.data.map((item) => item.id))).toEqual([
      ['tomorrow'],
      ['today'],
      ['undated'],
    ]);
  });
});
