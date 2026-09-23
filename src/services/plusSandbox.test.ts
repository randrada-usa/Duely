import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  setLogLevel: vi.fn().mockResolvedValue(undefined),
  isConfigured: vi.fn().mockResolvedValue(false),
  configure: vi.fn(),
  logIn: vi.fn().mockResolvedValue({}),
  invalidateCustomerInfoCache: vi.fn().mockResolvedValue(undefined),
  getOfferings: vi.fn(),
  getCustomerInfo: vi.fn(),
}));
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('react-native-purchases', () => ({ default: sdk, LOG_LEVEL: { ERROR: 'ERROR' } }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv('EXPO_PUBLIC_REVENUECAT_SANDBOX_ENABLED', 'true');
  vi.stubEnv('EXPO_PUBLIC_REVENUECAT_TEST_API_KEY', 'test_fixture');
  vi.stubEnv('EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID', 'plus');
});

describe('RevenueCat sandbox boundary', () => {
  it('does not initialize when disabled', async () => {
    vi.stubEnv('EXPO_PUBLIC_REVENUECAT_SANDBOX_ENABLED', 'false');
    const { getSandbox } = await import('./plusSandbox');
    await expect(getSandbox('user-1')).rejects.toThrow('disabled');
    expect(sdk.configure).not.toHaveBeenCalled();
  });

  it('requires a signed-in account before configuring purchases', async () => {
    const { getSandbox } = await import('./plusSandbox');
    await expect(getSandbox('')).rejects.toThrow('Sign in');
    expect(sdk.configure).not.toHaveBeenCalled();
  });

  it('configures once for concurrent callers with the account ID', async () => {
    const { getSandbox } = await import('./plusSandbox');
    await Promise.all([getSandbox('user-1'), getSandbox('user-1')]);
    expect(sdk.configure).toHaveBeenCalledExactlyOnceWith({ apiKey: 'test_fixture', appUserID: 'user-1' });
    expect(sdk.logIn).not.toHaveBeenCalled();
  });

  it('switches SDK identity when a different account signs in', async () => {
    const { getSandbox } = await import('./plusSandbox');
    await getSandbox('user-1');
    await getSandbox('user-2');
    expect(sdk.logIn).toHaveBeenCalledExactlyOnceWith('user-2');
  });

  it('loads the current monthly package and refreshed customer info', async () => {
    const monthly = { identifier: '$rc_monthly' };
    const info = { entitlements: { active: { plus: { isActive: true } } } };
    sdk.getOfferings.mockResolvedValue({ current: { monthly } });
    sdk.getCustomerInfo.mockResolvedValue(info);
    const { loadSandbox, isSandboxPlus } = await import('./plusSandbox');
    const result = await loadSandbox('user-1');
    expect(result).toEqual({ monthly, info });
    expect(sdk.invalidateCustomerInfoCache).toHaveBeenCalledOnce();
    expect(isSandboxPlus(result.info)).toBe(true);
  });

  it('never substitutes a lifetime or annual package for missing monthly', async () => {
    sdk.getOfferings.mockResolvedValue({ current: { lifetime: { identifier: 'lifetime' } } });
    sdk.getCustomerInfo.mockResolvedValue({ entitlements: { active: {} } });
    const { loadSandbox } = await import('./plusSandbox');
    expect((await loadSandbox('user-1')).monthly).toBeNull();
  });

  it('propagates connection failures without creating an entitlement', async () => {
    sdk.getOfferings.mockRejectedValueOnce(new Error('offline'));
    const { loadSandbox } = await import('./plusSandbox');
    await expect(loadSandbox('user-1')).rejects.toThrow('offline');
  });
});
