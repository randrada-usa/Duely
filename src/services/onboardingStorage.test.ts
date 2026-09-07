import { describe, expect, it, vi } from 'vitest';

import {
  decodeOnboardingCompleted,
  loadOnboardingCompleted,
  markOnboardingCompleted,
  ONBOARDING_STORAGE_KEY,
  type OnboardingStorageAdapter,
} from './onboardingStorage';

function storage(value: string | null = null) {
  return {
    getItem: vi.fn(async () => value),
    setItem: vi.fn(async () => undefined),
  } satisfies OnboardingStorageAdapter;
}

describe('onboarding storage', () => {
  it('only accepts the current completion marker', () => {
    expect(decodeOnboardingCompleted('completed')).toBe(true);
    expect(decodeOnboardingCompleted(null)).toBe(false);
    expect(decodeOnboardingCompleted('true')).toBe(false);
  });

  it('loads the first-launch state from the expected key', async () => {
    const adapter = storage('completed');
    await expect(loadOnboardingCompleted(adapter)).resolves.toBe(true);
    expect(adapter.getItem).toHaveBeenCalledWith(ONBOARDING_STORAGE_KEY);
  });

  it('persists completion using the versioned marker', async () => {
    const adapter = storage();
    await markOnboardingCompleted(adapter);
    expect(adapter.setItem).toHaveBeenCalledWith(
      ONBOARDING_STORAGE_KEY,
      'completed',
    );
  });
});
