import { describe, expect, it, vi } from 'vitest';
import { hasActivePlusEntitlement, verifiedAiScanLimit } from './plusAllowance';

const now = new Date('2026-09-23T00:00:00Z');
const payload = (expiry: string | null) => ({
  subscriber: { entitlements: { duely_plus: { expires_date: expiry } } },
});

describe('server-verified Plus allowance', () => {
  it('requires the exact active entitlement and rejects expiry', () => {
    expect(hasActivePlusEntitlement(payload('2026-09-24T00:00:00Z'), 'duely_plus', now)).toBe(true);
    expect(hasActivePlusEntitlement(payload('2026-09-22T00:00:00Z'), 'duely_plus', now)).toBe(false);
    expect(hasActivePlusEntitlement(payload(null), 'duely_plus', now)).toBe(true);
    expect(hasActivePlusEntitlement(payload('2026-09-24T00:00:00Z'), 'wrong', now)).toBe(false);
    expect(hasActivePlusEntitlement({}, 'duely_plus', now)).toBe(false);
  });

  it('keeps the free limit without a server secret', async () => {
    const fetcher = vi.fn();
    expect(await verifiedAiScanLimit('user-1', undefined, 'duely_plus', fetcher, now)).toBe(5);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('uses server credentials and authenticated user ID only', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => payload('2026-09-24T00:00:00Z') });
    expect(await verifiedAiScanLimit('user-1', 'secret-fixture', 'duely_plus', fetcher, now)).toBe(20);
    expect(fetcher.mock.calls[0][0]).toBe('https://api.revenuecat.com/v1/subscribers/user-1');
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer secret-fixture');
  });

  it('does not silently downgrade when verification fails', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false });
    await expect(verifiedAiScanLimit('user-1', 'secret-fixture', 'duely_plus', fetcher, now)).rejects.toThrow();
  });

  it('keeps a customer absent from RevenueCat on the free tier', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    expect(await verifiedAiScanLimit('new-user', 'secret-fixture', 'duely_plus', fetcher, now)).toBe(5);
  });
});
