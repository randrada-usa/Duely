import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_STORAGE_KEY = '@duely/onboarding/v1';

export type OnboardingStorageAdapter = Pick<
  typeof AsyncStorage,
  'getItem' | 'setItem'
>;

export function decodeOnboardingCompleted(value: string | null) {
  return value === 'completed';
}

export async function loadOnboardingCompleted(
  storage: OnboardingStorageAdapter = AsyncStorage,
) {
  const value = await storage.getItem(ONBOARDING_STORAGE_KEY);
  return decodeOnboardingCompleted(value);
}

export async function markOnboardingCompleted(
  storage: OnboardingStorageAdapter = AsyncStorage,
) {
  await storage.setItem(ONBOARDING_STORAGE_KEY, 'completed');
}
