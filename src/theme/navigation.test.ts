import { describe, expect, it } from 'vitest';

import { bottomActionBarPadding } from './navigation';
import { spacing } from './tokens';

describe('adaptive Android bottom actions', () => {
  it('keeps a comfortable minimum with gesture navigation', () => {
    expect(bottomActionBarPadding(0)).toBe(spacing.xl);
  });

  it('keeps breathing room above the system navigation inset', () => {
    expect(bottomActionBarPadding(48)).toBe(48 + spacing.md);
  });
});
