import { describe, expect, it } from 'vitest';

import {
  pickedImageError,
  scanImageQualityWarning,
  scanImageResize,
} from './scanImage';

describe('scan image intake rules', () => {
  it('accepts exactly one image and rejects documents or multiple files', () => {
    const image = {
      type: 'image',
      mimeType: 'image/jpeg',
      width: 1_600,
      height: 2_000,
    };

    expect(pickedImageError([image])).toBeNull();
    expect(pickedImageError([])).toBe('Choose exactly one assignment image.');
    expect(pickedImageError([image, image])).toBe(
      'Choose exactly one assignment image.',
    );
    expect(
      pickedImageError([
        { ...image, type: null, mimeType: 'application/pdf' },
      ]),
    ).toBe('Choose an image file. PDFs and documents are not supported.');
  });

  it('reduces only the longest oversized edge while preserving aspect ratio', () => {
    expect(scanImageResize(4_000, 3_000)).toEqual({ width: 2_400 });
    expect(scanImageResize(2_000, 4_000)).toEqual({ height: 2_400 });
    expect(scanImageResize(2_400, 1_800)).toBeNull();
    expect(scanImageResize(0, 0)).toBeNull();
  });

  it('guides users when an image is too small or unusually narrow', () => {
    expect(scanImageQualityWarning(800, 1_200)).toContain('too small');
    expect(scanImageQualityWarning(1_000, 3_200)).toContain('unusually narrow');
    expect(scanImageQualityWarning(1_600, 2_000)).toBeNull();
  });
});
