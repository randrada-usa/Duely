import { describe, expect, it, vi } from 'vitest';

import {
  createSessionBootstrapCoordinator,
  CURRENT_SESSION_SIGN_OUT_OPTIONS,
} from './authSessionBootstrap';

describe('current-device sign out', () => {
  it('uses local scope so other signed-in devices remain active', () => {
    expect(CURRENT_SESSION_SIGN_OUT_OPTIONS).toEqual({ scope: 'local' });
  });
});

describe('session bootstrap coordinator', () => {
  it('applies the initial session check when no auth event arrived', () => {
    const onSession = vi.fn();
    const coordinator = createSessionBootstrapCoordinator({
      onSession,
      onError: vi.fn(),
    });

    coordinator.applySessionCheck('initial-session', false);

    expect(onSession).toHaveBeenCalledWith('initial-session');
  });

  it('does not let a late session check overwrite a newer auth event', () => {
    const onSession = vi.fn();
    const coordinator = createSessionBootstrapCoordinator({
      onSession,
      onError: vi.fn(),
    });

    coordinator.applyAuthEvent('new-session');
    coordinator.applySessionCheck('stale-session', false);

    expect(onSession).toHaveBeenCalledTimes(1);
    expect(onSession).toHaveBeenCalledWith('new-session');
  });

  it('reports an initial check failure without retaining a session', () => {
    const onSession = vi.fn();
    const onError = vi.fn();
    const coordinator = createSessionBootstrapCoordinator({
      onSession,
      onError,
    });

    coordinator.applySessionCheck(null, true);

    expect(onSession).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
  });

  it('ignores callbacks after cleanup', () => {
    const onSession = vi.fn();
    const onError = vi.fn();
    const coordinator = createSessionBootstrapCoordinator({
      onSession,
      onError,
    });

    coordinator.stop();
    coordinator.applyAuthEvent('session');
    coordinator.applySessionCheck(null, true);

    expect(onSession).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});
