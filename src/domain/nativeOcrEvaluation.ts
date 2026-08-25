import type { ScanEvaluationFixture, ScanEvaluationReport } from './scanEvaluation';
import { evaluateScanExtractionFixtures } from './scanEvaluation';

export type NativeOcrObservation = {
  fixtureId: string;
  recognizedText: string | null;
  durationMs: number;
  error?: string;
};

export type NativeOcrFixtureResult = {
  fixtureId: string;
  recognitionSucceeded: boolean;
  tokenAccuracy: number;
  durationMs: number;
};

export type NativeOcrEvaluationReport = {
  fixtureCount: number;
  recognition: {
    completed: number;
    failed: number;
    exactTokenSequenceMatches: number;
    tokenAccuracy: number;
    totalDurationMs: number;
  };
  parser: ScanEvaluationReport;
  fixtures: NativeOcrFixtureResult[];
  recognitionFailureIds: string[];
};

function normalizedTokens(text: string) {
  return text
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}:/.-]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function editDistance(first: readonly string[], second: readonly string[]) {
  const previous = Array.from({ length: second.length + 1 }, (_, index) => index);
  const current = new Array<number>(second.length + 1);

  for (let firstIndex = 1; firstIndex <= first.length; firstIndex += 1) {
    current[0] = firstIndex;
    for (let secondIndex = 1; secondIndex <= second.length; secondIndex += 1) {
      const substitution =
        previous[secondIndex - 1] +
        (first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1);
      current[secondIndex] = Math.min(
        previous[secondIndex] + 1,
        current[secondIndex - 1] + 1,
        substitution,
      );
    }
    for (let index = 0; index < current.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[second.length];
}

export function recognizedTokenAccuracy(expected: string, recognized: string) {
  const expectedTokens = normalizedTokens(expected);
  const recognizedTokens = normalizedTokens(recognized);
  if (expectedTokens.length === 0) return recognizedTokens.length === 0 ? 1 : 0;
  return Math.max(
    0,
    1 - editDistance(expectedTokens, recognizedTokens) / expectedTokens.length,
  );
}

export function evaluateNativeOcrObservations(
  fixtures: readonly ScanEvaluationFixture[],
  observations: readonly NativeOcrObservation[],
  now = new Date(),
): NativeOcrEvaluationReport {
  const observationsById = new Map(
    observations.map((observation) => [observation.fixtureId, observation]),
  );
  let completed = 0;
  let exactTokenSequenceMatches = 0;
  let weightedCorrectTokens = 0;
  let totalExpectedTokens = 0;
  let totalDurationMs = 0;
  const recognitionFailureIds: string[] = [];
  const fixtureResults: NativeOcrFixtureResult[] = [];
  const recognizedFixtures: ScanEvaluationFixture[] = [];

  for (const fixture of fixtures) {
    const observation = observationsById.get(fixture.id);
    const recognizedText = observation?.recognizedText ?? '';
    const recognitionSucceeded = !!observation?.recognizedText && !observation.error;
    const tokenCount = normalizedTokens(fixture.ocrText).length;
    const tokenAccuracy = recognitionSucceeded
      ? recognizedTokenAccuracy(fixture.ocrText, recognizedText)
      : 0;

    totalExpectedTokens += tokenCount;
    weightedCorrectTokens += tokenAccuracy * tokenCount;
    totalDurationMs += observation?.durationMs ?? 0;
    if (recognitionSucceeded) {
      completed += 1;
      if (normalizedTokens(fixture.ocrText).join(' ') === normalizedTokens(recognizedText).join(' ')) {
        exactTokenSequenceMatches += 1;
      }
    } else {
      recognitionFailureIds.push(fixture.id);
    }

    fixtureResults.push({
      fixtureId: fixture.id,
      recognitionSucceeded,
      tokenAccuracy,
      durationMs: observation?.durationMs ?? 0,
    });
    recognizedFixtures.push({ ...fixture, ocrText: recognizedText });
  }

  return {
    fixtureCount: fixtures.length,
    recognition: {
      completed,
      failed: fixtures.length - completed,
      exactTokenSequenceMatches,
      tokenAccuracy:
        totalExpectedTokens === 0 ? 0 : weightedCorrectTokens / totalExpectedTokens,
      totalDurationMs,
    },
    parser: evaluateScanExtractionFixtures(recognizedFixtures, now),
    fixtures: fixtureResults,
    recognitionFailureIds,
  };
}
