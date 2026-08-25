import { describe, expect, it } from 'vitest';

import { CONTROLLED_SCAN_FIXTURES } from './scanEvaluation.fixtures';
import { evaluateScanExtractionFixtures } from './scanEvaluation';

const evaluationNow = new Date(2026, 7, 25, 12, 0, 0);

describe('controlled scan extraction evaluation', () => {
  const report = evaluateScanExtractionFixtures(
    CONTROLLED_SCAN_FIXTURES,
    evaluationNow,
  );

  it('uses only explicitly synthetic fixtures with stable unique identifiers', () => {
    expect(CONTROLLED_SCAN_FIXTURES.length).toBeGreaterThanOrEqual(20);
    expect(new Set(CONTROLLED_SCAN_FIXTURES.map(({ id }) => id)).size).toBe(
      CONTROLLED_SCAN_FIXTURES.length,
    );
    expect(
      new Set(CONTROLLED_SCAN_FIXTURES.map(({ language }) => language)),
    ).toEqual(new Set(['english', 'filipino', 'mixed']));
  });

  it('has no controlled fixture failures', () => {
    expect(report.failures).toEqual([]);
  });

  for (const [name, result] of Object.entries(report.metrics)) {
    it(`${name}: ${result.passed}/${result.total} (${Math.round(result.rate * 100)}%)`, () => {
      expect(result.meetsThreshold).toBe(true);
    });
  }

  it('keeps each metric denominator visible so small samples are not overstated', () => {
    expect(report.metrics.explicitDeadlineAccuracy.total).toBeGreaterThan(0);
    expect(report.metrics.missingDeadlineAvoidance.total).toBeGreaterThan(0);
    expect(report.metrics.ambiguousDeadlineFlagging.total).toBeGreaterThan(0);
    expect(report.metrics.essentialFieldAccuracy.total).toBe(report.fixtureCount);
  });

  it('reports a deliberately incorrect expectation as a failed gate', () => {
    const negativeControl = evaluateScanExtractionFixtures(
      [
        {
          id: 'negative-control',
          language: 'english',
          ocrText: 'Title: Correct title\nDeadline: August 30, 2026',
          expected: {
            deadline: {
              kind: 'explicit',
              date: '2026-08-31',
              time: '23:59',
            },
            fields: { title: 'Incorrect title' },
          },
        },
      ],
      evaluationNow,
    );

    expect(negativeControl.failures).toEqual([
      {
        fixtureId: 'negative-control',
        checks: [
          'explicit deadline did not match',
          'title did not match',
        ],
      },
    ]);
    expect(
      negativeControl.metrics.explicitDeadlineAccuracy.meetsThreshold,
    ).toBe(false);
    expect(negativeControl.metrics.essentialFieldAccuracy.meetsThreshold).toBe(
      false,
    );
  });
});
