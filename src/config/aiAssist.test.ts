import { describe, expect, it } from 'vitest';

import { resolveAiAssistEnabled } from './aiAssist';

describe('resolveAiAssistEnabled', () => {
  it('stays off unless explicitly enabled', () => {
    expect(resolveAiAssistEnabled(undefined)).toBe(false);
    expect(resolveAiAssistEnabled('false')).toBe(false);
    expect(resolveAiAssistEnabled(' true ')).toBe(true);
  });
});
