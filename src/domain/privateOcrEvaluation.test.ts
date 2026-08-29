import { describe, expect, it } from 'vitest';

import {
  evaluatePrivateOcrObservations,
  type PrivateOcrFixture,
} from './privateOcrEvaluation';

const fixtures: PrivateOcrFixture[] = [
  {
    id: 'sample-01',
    filename: 'sample-01.png',
    expectedDeadline: { kind: 'explicit', date: '2026-08-30', time: '23:59' },
  },
  {
    id: 'sample-02',
    filename: 'sample-02.png',
    expectedDeadline: { kind: 'manual-review' },
  },
];

describe('private OCR evaluation', () => {
  it('returns only anonymous detection and accuracy signals', () => {
    const sensitiveText = 'Title: Private Student Task\nDue: August 30, 2026 11:59 PM';
    const report = evaluatePrivateOcrObservations(
      fixtures,
      [
        { fixtureId: 'sample-01', recognizedText: sensitiveText, durationMs: 120 },
        { fixtureId: 'sample-02', recognizedText: 'Submit next Tuesday', durationMs: 80 },
      ],
      new Date(2026, 7, 25, 12, 0, 0),
    );

    expect(report.recognition).toEqual({ completed: 2, failed: 0, totalDurationMs: 200 });
    expect(report.deadlineChecks).toEqual({ passed: 1, failed: 0, manualReview: 1 });
    expect(report.fixtures[0]).toMatchObject({
      fixtureId: 'sample-01',
      deadlineCheck: 'passed',
      detected: { title: true, deadline: true },
    });
    expect(JSON.stringify(report)).not.toContain(sensitiveText);
    expect(JSON.stringify(report)).not.toContain('Private Student Task');
  });

  it('does not attempt parsing after recognition fails', () => {
    const report = evaluatePrivateOcrObservations(fixtures.slice(0, 1), [], new Date());
    expect(report.recognition.failed).toBe(1);
    expect(report.fixtures[0]?.deadlineCheck).toBe('not-run');
  });

  it('reports only the kind of deadline mismatch', () => {
    const report = evaluatePrivateOcrObservations(
      fixtures.slice(0, 1),
      [{ fixtureId: 'sample-01', recognizedText: 'No due date shown', durationMs: 10 }],
      new Date(2026, 7, 25, 12, 0, 0),
    );
    expect(report.fixtures[0]).toMatchObject({
      deadlineCheck: 'failed',
      deadlineMismatch: 'missing',
    });
  });
});
