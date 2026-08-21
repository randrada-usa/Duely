import { describe, expect, it } from 'vitest';

import {
  effortLabel,
  isSourceImageReference,
  isTaskExtractionProvenance,
  isOverdue,
  normalizeTask,
  sortBySmartPriority,
  taskTypeLabel,
  type Task,
  type TaskExtractionProvenance,
} from './task';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Write reflection',
    subjectId: 'subject-english',
    notes: '',
    dueAt: null,
    taskType: 'assignment',
    estimatedEffortMinutes: null,
    priority: 'medium',
    reminderMinutesBefore: null,
    status: 'open',
    createdAt: '2026-08-21T00:00:00.000Z',
    completedAt: null,
    sourceImageRef: null,
    extractionProvenance: null,
    ...overrides,
  };
}

describe('task model', () => {
  it('becomes overdue only after an open task deadline passes', () => {
    const dueAt = '2026-08-21T12:00:00.000Z';
    const dueTask = task({ dueAt });

    expect(isOverdue(dueTask, new Date(dueAt))).toBe(false);
    expect(isOverdue(dueTask, new Date('2026-08-21T12:00:00.001Z'))).toBe(
      true,
    );
    expect(
      isOverdue(
        task({ dueAt, status: 'completed', completedAt: dueAt }),
        new Date('2026-08-22T12:00:00.000Z'),
      ),
    ).toBe(false);
  });

  it('migrates legacy tasks to safe type and effort defaults', () => {
    const legacy = {
      ...task(),
      taskType: undefined,
      estimatedEffortMinutes: undefined,
      reminderMinutesBefore: undefined,
      sourceImageRef: undefined,
      extractionProvenance: undefined,
    } as unknown as Task;

    expect(normalizeTask(legacy)).toMatchObject({
      taskType: 'assignment',
      estimatedEffortMinutes: null,
      reminderMinutesBefore: null,
      sourceImageRef: null,
      extractionProvenance: null,
    });
  });

  it('keeps provider-distinct field provenance without raw OCR values', () => {
    const extractionProvenance: TaskExtractionProvenance = {
      title: {
        sources: ['ml-kit', 'gemini'],
        confidenceBySource: { 'ml-kit': 'high', gemini: 'medium' },
        comparison: 'disagree',
        userAction: 'edited',
        confirmedAt: '2026-08-21T10:00:00.000Z',
      },
    };

    expect(isTaskExtractionProvenance(extractionProvenance)).toBe(true);
    expect(
      normalizeTask(
        task({
          sourceImageRef: 'scan-source-1',
          extractionProvenance,
        }),
      ),
    ).toMatchObject({ sourceImageRef: 'scan-source-1', extractionProvenance });
  });

  it('accepts bounded image references but rejects inline image payloads', () => {
    expect(isSourceImageReference(' scan-source-1 ')).toBe(true);
    expect(isSourceImageReference('data:image/png;base64,private-image')).toBe(
      false,
    );
    expect(isSourceImageReference('x'.repeat(2_049))).toBe(false);
    expect(
      normalizeTask(task({ sourceImageRef: ' scan-source-1 ' })),
    ).toMatchObject({ sourceImageRef: 'scan-source-1' });
  });

  it('rejects ambiguous, incomplete, or raw-value provenance records', () => {
    const base = {
      confidenceBySource: { 'ml-kit': 'high' },
      comparison: 'not-compared',
      userAction: 'accepted',
      confirmedAt: '2026-08-21T10:00:00.000Z',
    };

    expect(
      isTaskExtractionProvenance({
        title: { ...base, sources: ['ml-kit', 'ml-kit'] },
      }),
    ).toBe(false);
    expect(
      isTaskExtractionProvenance({
        title: {
          ...base,
          sources: ['ml-kit', 'gemini'],
          confidenceBySource: { 'ml-kit': 'high', gemini: 'medium' },
          comparison: 'not-compared',
        },
      }),
    ).toBe(false);
    expect(
      isTaskExtractionProvenance({
        title: { ...base, sources: ['ml-kit'], rawValue: 'private OCR text' },
      }),
    ).toBe(false);
  });

  it('normalizes unsupported stored values', () => {
    const invalid = {
      ...task(),
      taskType: 'essay',
      estimatedEffortMinutes: 75,
    } as unknown as Task;

    expect(normalizeTask(invalid)).toMatchObject({
      taskType: 'assignment',
      estimatedEffortMinutes: null,
    });
  });

  it('provides student-facing labels for metadata', () => {
    expect(taskTypeLabel('project')).toBe('Project');
    expect(effortLabel(120)).toBe('2 hours');
    expect(effortLabel(null)).toBe('Not estimated');
  });

  it('keeps smart-priority ordering deterministic when scores tie', () => {
    const later = task({ id: 'later', createdAt: '2026-08-21T02:00:00.000Z' });
    const earlier = task({ id: 'earlier', createdAt: '2026-08-21T01:00:00.000Z' });
    expect(sortBySmartPriority([later, earlier]).map((item) => item.id)).toEqual([
      'earlier',
      'later',
    ]);
  });

  it('sorts multiple completed tasks without producing an invalid comparison', () => {
    const later = task({
      id: 'later-complete',
      status: 'completed',
      createdAt: '2026-08-21T02:00:00.000Z',
    });
    const earlier = task({
      id: 'earlier-complete',
      status: 'completed',
      createdAt: '2026-08-21T01:00:00.000Z',
    });

    expect(sortBySmartPriority([later, earlier]).map((item) => item.id)).toEqual([
      'earlier-complete',
      'later-complete',
    ]);
  });
});
