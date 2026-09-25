import { describe, expect, it } from 'vitest';

import { bottomActionBarPadding } from './navigation';
import { spacing } from './tokens';

describe('adaptive Android bottom actions', () => {
  it('keeps a comfortable minimum with gesture navigation', () => {
    expect(bottomActionBarPadding(0)).toBe(spacing.md);
  });

  it('uses the larger system inset with three-button navigation', () => {
    expect(bottomActionBarPadding(48)).toBe(48);
  });
});
