export type InitialRouteAction = 'onboarding' | 'tabs' | 'ready';

export function initialRouteAction(
  onboardingCompleted: boolean,
  currentRoot: string | undefined,
): InitialRouteAction {
  if (!onboardingCompleted && currentRoot !== 'onboarding') return 'onboarding';
  if (onboardingCompleted && currentRoot === 'onboarding') return 'tabs';
  return 'ready';
}
