import manifest from '../../evaluation/ocr-image-fixtures/manifest.json';

import { CONTROLLED_SCAN_FIXTURES } from './scanEvaluation.fixtures';
import type { ScanEvaluationFixture } from './scanEvaluation';

export type NativeOcrImageFixture = ScanEvaluationFixture & {
  filename: string;
};

export const NATIVE_OCR_IMAGE_FIXTURES: readonly NativeOcrImageFixture[] = manifest.map(
  ({ id, filename, lines }) => {
    const controlledFixture = CONTROLLED_SCAN_FIXTURES.find(
      (fixture) => fixture.id === id,
    );
    if (!controlledFixture) {
      throw new Error(`Native OCR image fixture ${id} has no controlled expectation.`);
    }
    if (controlledFixture.ocrText !== lines.join('\n')) {
      throw new Error(`Native OCR image fixture ${id} does not match its controlled text.`);
    }
    return { ...controlledFixture, filename };
  },
);
