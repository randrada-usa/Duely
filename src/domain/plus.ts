export function sandboxConfigurationError(
  enabled: boolean,
  key: string,
  entitlement: string,
  testStoreAllowed = true,
): string | null {
  if (!enabled) return 'The purchase sandbox is disabled in this build.';
  if (!testStoreAllowed) return 'RevenueCat Test Store is available only in development builds.';
  if (!key.startsWith('test_')) return 'A RevenueCat Test Store key is required.';
  if (!entitlement.trim()) return 'Set the exact Duely Plus entitlement identifier before testing.';
  return null;
}

export function hasPlusEntitlement(active: Record<string, { isActive: boolean }>, identifier: string): boolean {
  return Boolean(identifier && active[identifier]?.isActive);
}

export function purchaseWasCancelled(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'userCancelled' in error && error.userCancelled === true;
}
