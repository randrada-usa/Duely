import { describe, expect, it } from 'vitest';
import { hasPlusEntitlement, purchaseWasCancelled, sandboxConfigurationError } from './plus';

describe('Plus sandbox safeguards', () => {
  it('requires explicit opt-in, a test key and an exact entitlement ID', () => {
    expect(sandboxConfigurationError(false, 'test_example', 'plus')).toBeTruthy();
    expect(sandboxConfigurationError(true, 'goog_example', 'plus')).toBeTruthy();
    expect(sandboxConfigurationError(true, 'test_example', '')).toBeTruthy();
    expect(sandboxConfigurationError(true, 'test_example', 'plus')).toBeNull();
  });
  it('does not grant Plus for another entitlement or inactive access', () => {
    expect(hasPlusEntitlement({ pro: { isActive: true } }, 'plus')).toBe(false);
    expect(hasPlusEntitlement({ plus: { isActive: false } }, 'plus')).toBe(false);
    expect(hasPlusEntitlement({ plus: { isActive: true } }, 'plus')).toBe(true);
    expect(hasPlusEntitlement({}, '')).toBe(false);
  });
  it('distinguishes user cancellation from errors', () => {
    expect(purchaseWasCancelled({ userCancelled: true })).toBe(true);
    expect(purchaseWasCancelled(new Error('failure'))).toBe(false);
    expect(purchaseWasCancelled(null)).toBe(false);
  });
});
