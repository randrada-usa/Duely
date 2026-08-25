import { describe, expect, it } from 'vitest';

import { NATIVE_OCR_IMAGE_FIXTURES } from './nativeOcrImageFixtures';

describe('native OCR rendered image fixture manifest', () => {
  it('uses a bounded synthetic pack with stable unique identifiers and files', () => {
    expect(NATIVE_OCR_IMAGE_FIXTURES).toHaveLength(12);
    expect(
      new Set(NATIVE_OCR_IMAGE_FIXTURES.map((fixture) => fixture.id)).size,
    ).toBe(NATIVE_OCR_IMAGE_FIXTURES.length);
    expect(
      new Set(NATIVE_OCR_IMAGE_FIXTURES.map((fixture) => fixture.filename)).size,
    ).toBe(NATIVE_OCR_IMAGE_FIXTURES.length);
  });

  it('covers every language and deadline behavior used by the first Android run', () => {
    expect(
      new Set(NATIVE_OCR_IMAGE_FIXTURES.map((fixture) => fixture.language)),
    ).toEqual(new Set(['english', 'filipino', 'mixed']));
    expect(
      new Set(
        NATIVE_OCR_IMAGE_FIXTURES.map((fixture) => fixture.expected.deadline.kind),
      ),
    ).toEqual(new Set(['explicit', 'missing', 'ambiguous']));
  });

  it('contains only synthetic assignment text and no retained participant data', () => {
    expect(
      NATIVE_OCR_IMAGE_FIXTURES.every((fixture) =>
        /title|pamagat/i.test(fixture.ocrText),
      ),
    ).toBe(true);
  });
});
