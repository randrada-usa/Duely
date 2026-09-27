import { describe, expect, it } from 'vitest';
import { resolveScanMode } from './scanMode';

describe('scan processing mode', () => {
  it('keeps OCR available without AI or authentication', () => {
    expect(
      resolveScanMode('ocr', {
        aiAssistEnabled: false,
        authenticated: false,
      }),
    ).toEqual({ mode: 'ocr', blocker: null });
  });

  it('blocks AI when the build does not enable it', () => {
    expect(
      resolveScanMode('ai', {
        aiAssistEnabled: false,
        authenticated: true,
      }),
    ).toEqual({ mode: 'ocr', blocker: 'ai-disabled' });
  });

  it('blocks AI for guests', () => {
    expect(
      resolveScanMode('ai', {
        aiAssistEnabled: true,
        authenticated: false,
      }),
    ).toEqual({ mode: 'ocr', blocker: 'sign-in-required' });
  });

  it('allows AI only when enabled and authenticated', () => {
    expect(
      resolveScanMode('ai', {
        aiAssistEnabled: true,
        authenticated: true,
      }),
    ).toEqual({ mode: 'ai', blocker: null });
  });
});
