import { Platform } from 'react-native';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { hasPlusEntitlement, sandboxConfigurationError } from '../domain/plus';

export const plusSandboxEnabled = process.env.EXPO_PUBLIC_REVENUECAT_SANDBOX_ENABLED === 'true';
const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY ?? '';
const entitlement = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ?? '';
let initialization: Promise<typeof import('react-native-purchases').default> | undefined;
let identifiedUserId: string | undefined;
let identityChange: Promise<void> = Promise.resolve();

export async function getSandbox(userId: string) {
  const error = sandboxConfigurationError(plusSandboxEnabled, apiKey, entitlement);
  if (error) throw new Error(error);
  if (!userId) throw new Error('Sign in before testing a Duely Plus purchase.');
  if (Platform.OS !== 'android') throw new Error('Use an Android native build to test purchases.');
  if (!initialization) {
    initialization = import('react-native-purchases').then(async ({ default: purchases, LOG_LEVEL }) => {
      await purchases.setLogLevel(LOG_LEVEL.ERROR);
      if (!(await purchases.isConfigured())) {
        purchases.configure({ apiKey, appUserID: userId });
        identifiedUserId = userId;
      }
      return purchases;
    }).catch(() => {
      initialization = undefined;
      throw new Error('Purchases could not start. Rebuild the native Android app with the RevenueCat SDK.');
    });
  }
  const purchases = await initialization;
  const next = identityChange.catch(() => {}).then(async () => {
    if (identifiedUserId !== userId) {
      await purchases.logIn(userId);
      identifiedUserId = userId;
    }
  });
  identityChange = next;
  await next;
  return purchases;
}

export function sandboxSetupError() {
  return sandboxConfigurationError(plusSandboxEnabled, apiKey, entitlement);
}

export function isSandboxPlus(info: CustomerInfo) {
  return hasPlusEntitlement(info.entitlements.active, entitlement);
}

export async function loadSandbox(userId: string): Promise<{ monthly: PurchasesPackage | null; info: CustomerInfo }> {
  const purchases = await getSandbox(userId);
  await purchases.invalidateCustomerInfoCache();
  const [offerings, info] = await Promise.all([purchases.getOfferings(), purchases.getCustomerInfo()]);
  return { monthly: offerings.current?.monthly ?? null, info };
}
