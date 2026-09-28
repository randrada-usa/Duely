import { describe, expect, it } from 'vitest';

import { initialRouteAction } from './initialRoute';

describe('initial route selection', () => {
  it('sends a first-time user to onboarding before launch finishes', () => {
    expect(initialRouteAction(false, '(tabs)')).toBe('onboarding');
    expect(initialRouteAction(false, undefined)).toBe('onboarding');
  });

  it('releases the loader only after onboarding is the active first-time route', () => {
    expect(initialRouteAction(false, 'onboarding')).toBe('ready');
  });

  it('keeps returning users out of onboarding', () => {
    expect(initialRouteAction(true, 'onboarding')).toBe('tabs');
    expect(initialRouteAction(true, '(tabs)')).toBe('ready');
  });
});
