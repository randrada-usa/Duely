import { describe, expect, it } from 'vitest';

import { deadlineParts } from './deadline';
import { isTaskExtractionProvenance } from './task';
import {
  buildMlKitProvenance,
  detectsMultipleAssignments,
  extractTaskFromOcr,
  scanReviewValues,
} from './scanExtraction';

const now = new Date(2026, 7, 21, 12, 0, 0);

describe('scan extraction', () => {
  it('extracts explicit assignment fields without creating an overall score', () => {
    const extraction = extractTaskFromOcr(
      [
        'Assignment Title: Dynamic Programming Problem Set #4',
        'Subject & Course: CS 301 · Algorithms',
        'Deadline: August 22, 2026 11:59 PM',
        'Type: Assignment',
        'Priority: High',
        'Estimated workload: 2 hours',
        'Instructions: Complete questions 1 to 6.',
        'Show all work and submit through the course portal.',
      ].join('\n'),
      now,
    );

    expect(extraction.fields.title).toEqual({
      value: 'Dynamic Programming Problem Set #4',
      confidence: 'high',
    });
    expect(extraction.fields.subject?.value).toBe('CS 301 · Algorithms');
    expect(deadlineParts(extraction.fields.dueAt?.value ?? null)).toEqual({
      date: '2026-08-22',
      time: '23:59',
    });
    expect(extraction.fields.taskType?.value).toBe('assignment');
    expect(extraction.fields.priority?.value).toBe('high');
    expect(extraction.fields.estimatedEffortMinutes?.value).toBe(120);
    expect(extraction.fields.notes?.value).toContain('Complete questions 1 to 6.');
    expect(extraction.issues.title).toBeUndefined();
    expect(extraction).not.toHaveProperty('confidence');
  });

  it('does not guess a selected workload from a row of visual choices', () => {
    const extraction = extractTaskFromOcr(
      [
        'Assignment Title',
        'Dynamic Programming Problem Set #4',
        'Estimated workload',
        '30 min',
        '1 hour',
        '2 hours',
        '3 hours',
        '4+ hours',
      ].join('\n'),
      now,
    );

    expect(extraction.fields.estimatedEffortMinutes).toBeNull();
    expect(extraction.issues.estimatedEffortMinutes).toBe(
      'Workload was not stated. Not estimated is selected by default.',
    );
  });

  it('does not guess selected task type or priority from option rows', () => {
    const extraction = extractTaskFromOcr(
      [
        'Assignment Title: Problem Set #4',
        'Task type',
        'Assignment Quiz Exam Project Reading Other',
        'Priority',
        'Low Medium High',
      ].join('\n'),
      now,
    );

    expect(extraction.fields.taskType).toEqual({
      value: 'assignment',
      confidence: 'medium',
    });
    expect(extraction.fields.priority).toBeNull();
    expect(extraction.issues.taskType).toContain('inferred from the title');
    expect(extraction.issues.priority).toContain('not stated');
  });

  it('marks cautious fallback values as uncertain and never invents a deadline', () => {
    const extraction = extractTaskFromOcr(
      ['Biology Lab Report', 'BIO 201', 'Explain the observed cell structures.'].join('\n'),
      now,
    );

    expect(extraction.fields.title).toEqual({
      value: 'Biology Lab Report',
      confidence: 'low',
    });
    expect(extraction.fields.subject).toEqual({
      value: 'BIO 201',
      confidence: 'medium',
    });
    expect(extraction.fields.dueAt).toBeNull();
    expect(extraction.issues.title).toContain('likely heading');
    expect(extraction.issues.dueAt).toContain('No deadline');
  });

  it('flags an inferred year and defaults a missing time to the end of day', () => {
    const extraction = extractTaskFromOcr('Title: Reflection Paper\nDue: August 30', now);

    expect(deadlineParts(extraction.fields.dueAt?.value ?? null)).toEqual({
      date: '2026-08-30',
      time: '23:59',
    });
    expect(extraction.fields.dueAt?.confidence).toBe('low');
    expect(extraction.issues.dueAt).toContain('year was not shown');
  });

  it('does not choose between ambiguous numeric date conventions', () => {
    const extraction = extractTaskFromOcr('Title: Essay\nDeadline: 08/09/2026', now);

    expect(extraction.fields.dueAt).toBeNull();
    expect(extraction.issues.dueAt).toContain('day/month or month/day');
  });

  it('accepts an unambiguous numeric date', () => {
    const extraction = extractTaskFromOcr('Title: Essay\nDeadline: 22/08/2026 14:30', now);

    expect(deadlineParts(extraction.fields.dueAt?.value ?? null)).toEqual({
      date: '2026-08-22',
      time: '14:30',
    });
  });

  it('reads a day-first named deadline and time placed below its label', () => {
    const extraction = extractTaskFromOcr(
      'Title: Essay\nDeadline\n22 August 2026\n2:30 PM\nInstructions\nSubmit online.',
      now,
    );

    expect(deadlineParts(extraction.fields.dueAt?.value ?? null)).toEqual({
      date: '2026-08-22',
      time: '14:30',
    });
    expect(extraction.fields.dueAt?.confidence).toBe('high');
  });

  it('reads conservative Filipino field labels and month names', () => {
    const extraction = extractTaskFromOcr(
      [
        'Pamagat: Repleksyon sa Kasaysayan',
        'Asignatura: KAS 101',
        'Takdang petsa: Agosto 30, 2026 4:00 PM',
        'Uri ng gawain: Takdang-aralin',
        'Prayoridad: Mataas',
        'Tinatayang oras: Dalawang oras',
        'Panuto: Sumulat ng limang talata.',
      ].join('\n'),
      now,
    );

    expect(extraction.fields.title?.value).toBe('Repleksyon sa Kasaysayan');
    expect(extraction.fields.subject?.value).toBe('KAS 101');
    expect(deadlineParts(extraction.fields.dueAt?.value ?? null)).toEqual({
      date: '2026-08-30',
      time: '16:00',
    });
    expect(extraction.fields.taskType?.value).toBe('assignment');
    expect(extraction.fields.priority?.value).toBe('high');
    expect(extraction.fields.estimatedEffortMinutes?.value).toBe(120);
    expect(extraction.fields.notes?.value).toBe('Sumulat ng limang talata.');
  });

  it('does not force a generic Filipino pagsusulit into quiz or exam', () => {
    const extraction = extractTaskFromOcr(
      'Pamagat: Pagsusulit sa Aralin 4\nUri ng gawain: Pagsusulit',
      now,
    );

    expect(extraction.fields.taskType).toBeNull();
    expect(extraction.issues.taskType).toContain('not stated');
  });

  it('detects multiple numbered assignments conservatively', () => {
    expect(detectsMultipleAssignments(['Assignment 1', 'Assignment 2'])).toBe(true);
    expect(detectsMultipleAssignments(['Assignment Title', 'Assignment 1'])).toBe(false);
    expect(
      extractTaskFromOcr('Assignment 1\nRead chapter 2\nAssignment 2\nSolve quiz', now)
        .hasMultipleAssignments,
    ).toBe(true);
    expect(detectsMultipleAssignments(['Gawain 1', 'Gawain 2'])).toBe(true);
  });

  it('keeps raw OCR in the transient extraction result only', () => {
    const extraction = extractTaskFromOcr('Title: Private fixture note', now);
    const review = scanReviewValues(extraction);
    const provenance = buildMlKitProvenance(
      extraction,
      { ...review, title: 'Edited title' },
      '2026-08-21T04:00:00.000Z',
    );

    expect(extraction.rawText).toBe('Title: Private fixture note');
    expect(provenance.title).toEqual({
      sources: ['ml-kit'],
      confidenceBySource: { 'ml-kit': 'high' },
      comparison: 'not-compared',
      userAction: 'edited',
      confirmedAt: '2026-08-21T04:00:00.000Z',
    });
    expect(isTaskExtractionProvenance(provenance)).toBe(true);
    expect(JSON.stringify(provenance)).not.toContain('Private fixture note');
  });

  it('records user-entered and cleared values separately from ML Kit', () => {
    const extraction = extractTaskFromOcr('', now);
    const provenance = buildMlKitProvenance(
      extraction,
      {
        title: 'Entered manually',
        subject: '',
        dueAt: null,
        taskType: 'assignment',
        priority: 'medium',
        estimatedEffortMinutes: null,
        notes: '',
      },
      '2026-08-21T04:00:00.000Z',
    );

    expect(provenance.title?.sources).toEqual([]);
    expect(provenance.title?.userAction).toBe('entered');
    expect(provenance.subject?.userAction).toBe('cleared');
    expect(provenance.dueAt?.userAction).toBe('cleared');
  });
});
