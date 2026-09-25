import { describe, expect, it, vi } from 'vitest';

import { signOutToChoice } from './signOutFlow';

describe('explicit sign-out navigation', () => {
  it('waits for successful sign-out before showing the account choice', async () => {
    let finish!: (value: boolean) => void;
    const choice = vi.fn();
    const error = vi.fn();
    const pending = signOutToChoice(
      () => new Promise<boolean>((resolve) => { finish = resolve; }),
      choice,
      error,
    );
    expect(choice).not.toHaveBeenCalled();
    finish(true);
    await pending;
    expect(choice).toHaveBeenCalledOnce();
    expect(error).not.toHaveBeenCalled();
  });

  it('keeps the current screen on a failed sign-out', async () => {
    const choice = vi.fn();
    const error = vi.fn();
    await signOutToChoice(async () => false, choice, error);
    expect(choice).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledOnce();
  });

  it('handles unexpected sign-out errors without navigating', async () => {
    const choice = vi.fn();
    const error = vi.fn();
    await signOutToChoice(async () => { throw new Error('offline'); }, choice, error);
    expect(choice).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledOnce();
  });
});
