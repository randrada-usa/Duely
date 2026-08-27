import { describe, expect, it } from 'vitest';

import { CONTROLLED_SCAN_FIXTURES } from './scanEvaluation.fixtures';
import {
  evaluateNativeOcrObservations,
  recognizedTokenAccuracy,
} from './nativeOcrEvaluation';

const fixture = CONTROLLED_SCAN_FIXTURES[0];

describe('native OCR evaluation', () => {
  it('measures recognition separately from downstream parsing', () => {
    const report = evaluateNativeOcrObservations(
      [fixture],
      [
        {
          fixtureId: fixture.id,
          recognizedText: fixture.ocrText.replace('Cellular', 'Cellu1ar'),
          durationMs: 450,
        },
      ],
      new Date(2026, 7, 25, 12, 0, 0),
    );

    expect(report.recognition.completed).toBe(1);
    expect(report.recognition.exactTokenSequenceMatches).toBe(0);
    expect(report.recognition.tokenAccuracy).toBeLessThan(1);
    expect(report.recognition.totalDurationMs).toBe(450);
    expect(report.parser.failures[0]?.fixtureId).toBe(fixture.id);
  });

  it('counts missing or failed native observations without retaining OCR text', () => {
    const report = evaluateNativeOcrObservations([fixture], [], new Date());

    expect(report.recognition).toMatchObject({ completed: 0, failed: 1 });
    expect(report.recognitionFailureIds).toEqual([fixture.id]);
    expect(JSON.stringify(report)).not.toContain(fixture.ocrText);
  });

  it('keeps the known Auqust recognition miss parser-ready and reviewable', () => {
    const report = evaluateNativeOcrObservations(
      [fixture],
      [
        {
          fixtureId: fixture.id,
          recognizedText: fixture.ocrText.replace('August', 'Auqust'),
          durationMs: 450,
        },
      ],
      new Date(2026, 7, 25, 12, 0, 0),
    );

    expect(report.recognition.tokenAccuracy).toBeLessThan(1);
    expect(report.parser.failures).toEqual([]);
    expect(report.parser.metrics.explicitDeadlineAccuracy.passed).toBe(1);
  });

  it('tolerates whitespace changes but detects token substitutions', () => {
    expect(recognizedTokenAccuracy('Title: Sample\nDue: Friday', 'Title:  Sample Due: Friday')).toBe(1);
    expect(recognizedTokenAccuracy('Title: Sample', 'Title: Sarnple')).toBe(0.5);
  });
});
