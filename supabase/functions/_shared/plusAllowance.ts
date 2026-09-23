export const FREE_AI_SCAN_LIMIT = 5;
export const PLUS_AI_SCAN_LIMIT = 20;

type Entitlement = { expires_date?: unknown };

export function hasActivePlusEntitlement(payload: unknown, identifier: string, now: Date): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const subscriber = (payload as { subscriber?: { entitlements?: Record<string, Entitlement> } }).subscriber;
  const entitlement = subscriber?.entitlements?.[identifier];
  if (!entitlement) return false;
  if (entitlement.expires_date === null) return true;
  if (typeof entitlement.expires_date !== 'string') return false;
  const expiresAt = Date.parse(entitlement.expires_date);
  return Number.isFinite(expiresAt) && expiresAt > now.getTime();
}

export async function verifiedAiScanLimit(
  userId: string,
  secretKey: string | undefined,
  entitlementId: string,
  fetcher: typeof fetch = fetch,
  now = new Date(),
): Promise<number> {
  if (!secretKey) return FREE_AI_SCAN_LIMIT;
  const response = await fetcher(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
    {
      headers: { Authorization: `Bearer ${secretKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    },
  );
  // A user who has never opened the purchase screen may not exist in RevenueCat.
  if (response.status === 404) return FREE_AI_SCAN_LIMIT;
  if (!response.ok) throw new Error('RevenueCat verification unavailable.');
  const payload = await response.json();
  return hasActivePlusEntitlement(payload, entitlementId, now)
    ? PLUS_AI_SCAN_LIMIT
    : FREE_AI_SCAN_LIMIT;
}
