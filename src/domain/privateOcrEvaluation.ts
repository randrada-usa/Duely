import { deadlineParts } from './deadline';
import { extractTaskFromOcr } from './scanExtraction';

export type PrivateOcrExpectedDeadline =
  | { kind: 'explicit'; date: string; time: string }
  | { kind: 'missing' }
  | { kind: 'manual-review' };

export type PrivateOcrFixture = {
  id: string;
  filename: string;
  expectedDeadline: PrivateOcrExpectedDeadline;
};

export type PrivateOcrObservation = {
  fixtureId: string;
  recognizedText: string | null;
  durationMs: number;
  error?: string;
};

export type PrivateOcrFixtureResult = {
  fixtureId: string;
  recognitionSucceeded: boolean;
  durationMs: number;
  detected: {
    title: boolean;
    subject: boolean;
    deadline: boolean;
    taskType: boolean;
    notes: boolean;
    multipleAssignments: boolean;
  };
  deadlineCheck: 'passed' | 'failed' | 'manual-review' | 'not-run';
  deadlineMismatch?: 'missing' | 'unexpected' | 'date' | 'time' | 'date-and-time';
};

export type PrivateOcrEvaluationReport = {
  privacy: 'no-images-or-recognized-text-retained';
  fixtureCount: number;
  recognition: {
    completed: number;
    failed: number;
    totalDurationMs: number;
  };
  deadlineChecks: {
    passed: number;
    failed: number;
    manualReview: number;
  };
  fixtures: PrivateOcrFixtureResult[];
};

function deadlineResult(
  expected: PrivateOcrExpectedDeadline,
  dueAt: string | null,
): Pick<PrivateOcrFixtureResult, 'deadlineCheck' | 'deadlineMismatch'> {
  if (expected.kind === 'manual-review') return { deadlineCheck: 'manual-review' };
  if (expected.kind === 'missing') {
    return dueAt === null
      ? { deadlineCheck: 'passed' }
      : { deadlineCheck: 'failed', deadlineMismatch: 'unexpected' };
  }
  if (!dueAt) return { deadlineCheck: 'failed', deadlineMismatch: 'missing' };
  const actual = deadlineParts(dueAt);
  const dateMatches = actual.date === expected.date;
  const timeMatches = actual.time === expected.time;
  if (dateMatches && timeMatches) return { deadlineCheck: 'passed' };
  return {
    deadlineCheck: 'failed',
    deadlineMismatch: dateMatches
      ? 'time'
      : timeMatches
        ? 'date'
        : 'date-and-time',
  };
}

export function evaluatePrivateOcrObservations(
  fixtures: readonly PrivateOcrFixture[],
  observations: readonly PrivateOcrObservation[],
  now = new Date(),
): PrivateOcrEvaluationReport {
  const byId = new Map(observations.map((item) => [item.fixtureId, item]));
  let completed = 0;
  let totalDurationMs = 0;
  let passed = 0;
  let failed = 0;
  let manualReview = 0;

  const results = fixtures.map((fixture): PrivateOcrFixtureResult => {
    const observation = byId.get(fixture.id);
    const recognitionSucceeded = Boolean(observation?.recognizedText) && !observation?.error;
    totalDurationMs += observation?.durationMs ?? 0;
    if (!recognitionSucceeded) {
      return {
        fixtureId: fixture.id,
        recognitionSucceeded: false,
        durationMs: observation?.durationMs ?? 0,
        detected: {
          title: false,
          subject: false,
          deadline: false,
          taskType: false,
          notes: false,
          multipleAssignments: false,
        },
        deadlineCheck: 'not-run',
      };
    }

    completed += 1;
    const extraction = extractTaskFromOcr(observation?.recognizedText ?? '', now);
    const deadline = deadlineResult(
      fixture.expectedDeadline,
      extraction.fields.dueAt?.value ?? null,
    );
    const check = deadline.deadlineCheck;
    if (check === 'passed') passed += 1;
    else if (check === 'failed') failed += 1;
    else manualReview += 1;

    return {
      fixtureId: fixture.id,
      recognitionSucceeded: true,
      durationMs: observation?.durationMs ?? 0,
      detected: {
        title: extraction.fields.title !== null,
        subject: extraction.fields.subject !== null,
        deadline: extraction.fields.dueAt !== null,
        taskType: extraction.fields.taskType !== null,
        notes: extraction.fields.notes !== null,
        multipleAssignments: extraction.hasMultipleAssignments,
      },
      deadlineCheck: check,
      deadlineMismatch: deadline.deadlineMismatch,
    };
  });

  return {
    privacy: 'no-images-or-recognized-text-retained',
    fixtureCount: fixtures.length,
    recognition: {
      completed,
      failed: fixtures.length - completed,
      totalDurationMs,
    },
    deadlineChecks: { passed, failed, manualReview },
    fixtures: results,
  };
}
