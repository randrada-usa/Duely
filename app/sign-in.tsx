import OnboardingScreen from './onboarding';

// Reuse the Google/Guest choice without replaying onboarding after sign-out.
export default function SignInScreen() {
  return <OnboardingScreen authOnly />;
}
