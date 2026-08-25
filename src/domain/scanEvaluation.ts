import { deadlineParts } from './deadline';
import {
  extractTaskFromOcr,
  type ScanExtraction,
  type ScanReviewValues,
} from './scanExtraction';

export type ScanEvaluationLanguage = 'english' | 'filipino' | 'mixed';

export type ExpectedDeadline =
  | { kind: 'explicit'; date: string; time: string }
  | { kind: 'missing' }
  | { kind: 'ambiguous' };

export type ScanEvaluationFixture = {
  id: string;
  language: ScanEvaluationLanguage;
  ocrText: string;
  expected: {
    deadline: ExpectedDeadline;
    fields?: Partial<Omit<ScanReviewValues, 'dueAt'>>;
    hasMultipleAssignments?: boolean;
  };
};

export type ScanEvaluationMetric = {
  passed: number;
  total: number;
  rate: number;
  threshold: number;
  meetsThreshold: boolean;
};

export type ScanEvaluationFailure = {
  fixtureId: string;
  checks: string[];
};

export type ScanEvaluationReport = {
  fixtureCount: number;
  metrics: {
    explicitDeadlineAccuracy: ScanEvaluationMetric;
    missingDeadlineAvoidance: ScanEvaluationMetric;
    ambiguousDeadlineFlagging: ScanEvaluationMetric;
    essentialFieldAccuracy: ScanEvaluationMetric;
  };
  failures: ScanEvaluationFailure[];
};

const thresholds = {
  explicitDeadlineAccuracy: 0.95,
  missingDeadlineAvoidance: 0.99,
  ambiguousDeadlineFlagging: 1,
  essentialFieldAccuracy: 0.8,
} as const;

function normalizedText(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
}

function valuesMatch(actual: unknown, expected: unknown) {
  if (typeof actual === 'string' && typeof expected === 'string') {
    return normalizedText(actual) === normalizedText(expected);
  }
  return actual === expected;
}

function deadlineMatches(
  extraction: ScanExtraction,
  expected: Extract<ExpectedDeadline, { kind: 'explicit' }>,
) {
  const actual = deadlineParts(extraction.fields.dueAt?.value ?? null);
  return actual.date === expected.date && actual.time === expected.time;
}

function metric(passed: number, total: number, threshold: number) {
  const rate = total === 0 ? 0 : passed / total;
  return {
    passed,
    total,
    rate,
    threshold,
    meetsThreshold: total > 0 && rate >= threshold,
  } satisfies ScanEvaluationMetric;
}

function evaluateFixture(
  fixture: ScanEvaluationFixture,
  now: Date,
): {
  extraction: ScanExtraction;
  deadlinePassed: boolean;
  essentialPassed: boolean;
  failures: string[];
} {
  const extraction = extractTaskFromOcr(fixture.ocrText, now);
  const failures: string[] = [];
  const expectedDeadline = fixture.expected.deadline;
  let deadlinePassed = false;

  if (expectedDeadline.kind === 'explicit') {
    deadlinePassed = deadlineMatches(extraction, expectedDeadline);
    if (!deadlinePassed) failures.push('explicit deadline did not match');
  } else if (expectedDeadline.kind === 'missing') {
    deadlinePassed = extraction.fields.dueAt === null;
    if (!deadlinePassed) failures.push('invented a missing deadline');
  } else {
    deadlinePassed =
      extraction.fields.dueAt === null &&
      /day\/month|month\/day/i.test(extraction.issues.dueAt ?? '');
    if (!deadlinePassed) failures.push('ambiguous deadline was not flagged');
  }

  for (const [field, expected] of Object.entries(
    fixture.expected.fields ?? {},
  ) as Array<
    [keyof Omit<ScanReviewValues, 'dueAt'>, ScanReviewValues[keyof ScanReviewValues]]
  >) {
    const actual = extraction.fields[field]?.value ?? null;
    if (!valuesMatch(actual, expected)) failures.push(`${field} did not match`);
  }

  if (
    fixture.expected.hasMultipleAssignments !== undefined &&
    extraction.hasMultipleAssignments !== fixture.expected.hasMultipleAssignments
  ) {
    failures.push('multiple-assignment detection did not match');
  }

  return {
    extraction,
    deadlinePassed,
    essentialPassed: failures.length === 0,
    failures,
  };
}

export function evaluateScanExtractionFixtures(
  fixtures: readonly ScanEvaluationFixture[],
  now = new Date(),
): ScanEvaluationReport {
  let explicitTotal = 0;
  let explicitPassed = 0;
  let missingTotal = 0;
  let missingPassed = 0;
  let ambiguousTotal = 0;
  let ambiguousPassed = 0;
  let essentialPassed = 0;
  const failures: ScanEvaluationFailure[] = [];

  for (const fixture of fixtures) {
    const result = evaluateFixture(fixture, now);
    if (fixture.expected.deadline.kind === 'explicit') {
      explicitTotal += 1;
      if (result.deadlinePassed) explicitPassed += 1;
    } else if (fixture.expected.deadline.kind === 'missing') {
      missingTotal += 1;
      if (result.deadlinePassed) missingPassed += 1;
    } else {
      ambiguousTotal += 1;
      if (result.deadlinePassed) ambiguousPassed += 1;
    }

    if (result.essentialPassed) essentialPassed += 1;
    else failures.push({ fixtureId: fixture.id, checks: result.failures });
  }

  return {
    fixtureCount: fixtures.length,
    metrics: {
      explicitDeadlineAccuracy: metric(
        explicitPassed,
        explicitTotal,
        thresholds.explicitDeadlineAccuracy,
      ),
      missingDeadlineAvoidance: metric(
        missingPassed,
        missingTotal,
        thresholds.missingDeadlineAvoidance,
      ),
      ambiguousDeadlineFlagging: metric(
        ambiguousPassed,
        ambiguousTotal,
        thresholds.ambiguousDeadlineFlagging,
      ),
      essentialFieldAccuracy: metric(
        essentialPassed,
        fixtures.length,
        thresholds.essentialFieldAccuracy,
      ),
    },
    failures,
  };
}
