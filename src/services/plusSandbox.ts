import { Platform } from 'react-native';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { hasPlusEntitlement, sandboxConfigurationError } from '../domain/plus';

export const plusSandboxEnabled = process.env.EXPO_PUBLIC_REVENUECAT_SANDBOX_ENABLED === 'true';
const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY ?? '';
const entitlement = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ?? '';
let initialization: Promise<typeof import('react-native-purchases').default> | undefined;

export function getSandbox() {
  const error = sandboxConfigurationError(plusSandboxEnabled, apiKey, entitlement);
  if (error) return Promise.reject(new Error(error));
  if (Platform.OS !== 'android') return Promise.reject(new Error('Use an Android native build to test purchases.'));
  if (!initialization) {
    initialization = import('react-native-purchases').then(async ({ default: purchases, LOG_LEVEL }) => {
      await purchases.setLogLevel(LOG_LEVEL.ERROR);
      if (!(await purchases.isConfigured())) purchases.configure({ apiKey });
      return purchases;
    }).catch(() => {
      initialization = undefined;
      throw new Error('Purchases could not start. Rebuild the native Android app with the RevenueCat SDK.');
    });
  }
  return initialization;
}

export function sandboxSetupError() {
  return sandboxConfigurationError(plusSandboxEnabled, apiKey, entitlement);
}

export function isSandboxPlus(info: CustomerInfo) {
  return hasPlusEntitlement(info.entitlements.active, entitlement);
}

export async function loadSandbox(): Promise<{ monthly: PurchasesPackage | null; info: CustomerInfo }> {
  const purchases = await getSandbox();
  await purchases.invalidateCustomerInfoCache();
  const [offerings, info] = await Promise.all([purchases.getOfferings(), purchases.getCustomerInfo()]);
  return { monthly: offerings.current?.monthly ?? null, info };
}
