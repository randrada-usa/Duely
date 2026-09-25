import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '../src/components/PrimaryButton';
import { markOnboardingCompleted } from '../src/services/onboardingStorage';
import { useAuth } from '../src/store/AuthStore';
import {
  colors,
  minimumTouchTarget,
  radius,
  spacing,
  typography,
} from '../src/theme/tokens';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const slides: Array<{
  title: string;
  body: string;
  icon: IconName;
  detail: string;
}> = [
  {
    title: 'Capture an assignment',
    body: 'Take a clear photo or choose an assignment image from your gallery.',
    icon: 'camera-outline',
    detail: 'One image becomes one task.',
  },
  {
    title: 'Review the important details',
    body: 'Duely finds the title, subject, deadline, and instructions for you to check.',
    icon: 'document-text-outline',
    detail: 'You always confirm before saving.',
  },
  {
    title: 'Stay ahead of deadlines',
    body: 'Organize upcoming work and choose when Duely should remind you.',
    icon: 'calendar-outline',
    detail: 'See what needs attention next.',
  },
];

export default function OnboardingScreen({ authOnly = false }: { authOnly?: boolean } = {}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    status,
    authActionError,
    isAuthActionPending,
    startGoogleSignIn,
  } = useAuth();
  const [slideIndex, setSlideIndex] = useState(0);
  const [showAuthChoice, setShowAuthChoice] = useState(authOnly);
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const finishOnboarding = async () => {
    if (isFinishing) return;
    setIsFinishing(true);
    setFinishError(null);
    try {
      await markOnboardingCompleted();
      router.replace('/(tabs)');
    } catch {
      setFinishError(
        'Duely could not save your choice on this device. Please try again.',
      );
    } finally {
      setIsFinishing(false);
    }
  };

  const continueWithGoogle = async () => {
    const signedIn = await startGoogleSignIn();
    if (signedIn) await finishOnboarding();
  };

  if (showAuthChoice) {
    const isAuthenticated = status === 'authenticated';
    return (
      <ScrollView
        contentContainerStyle={[
          styles.authPage,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandRow}>
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel="Due, the Duely mascot"
            source={require('../assets/mascot.png')}
            style={styles.brandMascot}
          />
          <Text style={styles.brandName}>Duely</Text>
        </View>

        <View style={styles.authIllustration}>
          <View style={styles.authIconRing}>
            <Ionicons
              accessibilityElementsHidden
              color={colors.primary}
              name="school-outline"
              size={54}
            />
          </View>
        </View>

        <View style={styles.authCopy}>
          <Text accessibilityRole="header" style={styles.title}>
            {isAuthenticated ? 'You are ready to go' : 'Choose how to continue'}
          </Text>
          <Text style={styles.body}>
            {isAuthenticated
              ? 'Your account is connected. Continue to start organizing your assignments.'
              : 'Manual tasks and on-device scanning work without an account.'}
          </Text>
        </View>

        <View style={styles.authActions}>
          {isAuthenticated ? (
            <PrimaryButton
              disabled={isFinishing}
              label={isFinishing ? 'Opening Duely…' : 'Continue to Duely'}
              onPress={() => void finishOnboarding()}
            />
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: isAuthActionPending || isFinishing }}
                disabled={isAuthActionPending || isFinishing}
                onPress={() => void continueWithGoogle()}
                style={({ pressed }) => [
                  styles.googleButton,
                  pressed && styles.secondaryPressed,
                  (isAuthActionPending || isFinishing) && styles.disabled,
                ]}
              >
                {isAuthActionPending ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Ionicons
                    accessibilityElementsHidden
                    color={colors.primary}
                    name="logo-google"
                    size={22}
                  />
                )}
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </Pressable>
              <PrimaryButton
                disabled={isAuthActionPending || isFinishing}
                label={isFinishing ? 'Opening Duely…' : 'Continue without an account'}
                onPress={() => void finishOnboarding()}
              />
            </>
          )}
          {!isAuthenticated ? (
            <Text style={styles.guestExplanation}>
              Sign in to use optional AI-assisted scans. On-device text recognition stays available as a guest.
            </Text>
          ) : null}
          {authActionError ? (
            <Text accessibilityLiveRegion="polite" style={styles.errorText}>
              {authActionError}
            </Text>
          ) : null}
          {finishError ? (
            <Text accessibilityLiveRegion="polite" style={styles.errorText}>
              {finishError}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    );
  }

  const slide = slides[slideIndex];
  const isLastSlide = slideIndex === slides.length - 1;

  return (
    <View
      style={[
        styles.page,
        { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg },
      ]}
    >
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel="Due, the Duely mascot"
            source={require('../assets/mascot.png')}
            style={styles.brandMascot}
          />
          <Text style={styles.brandName}>Duely</Text>
        </View>
        <Pressable
          accessibilityLabel="Skip onboarding"
          accessibilityRole="button"
          onPress={() => setShowAuthChoice(true)}
          style={({ pressed }) => [styles.skipButton, pressed && styles.secondaryPressed]}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.slideContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.illustrationCard}>
          <View style={styles.orbitLarge} />
          <View style={styles.orbitSmall} />
          <View style={styles.iconTile}>
            <Ionicons
              accessibilityElementsHidden
              color={colors.surface}
              name={slide.icon}
              size={64}
            />
          </View>
          <View style={[styles.sparkle, styles.sparkleTop]} />
          <View style={[styles.sparkle, styles.sparkleBottom]} />
        </View>

        <View style={styles.slideCopy}>
          <Text accessibilityRole="header" style={styles.title}>
            {slide.title}
          </Text>
          <Text style={styles.body}>{slide.body}</Text>
          <View style={styles.detailPill}>
            <Ionicons
              accessibilityElementsHidden
              color={colors.primary}
              name="checkmark-circle"
              size={20}
            />
            <Text style={styles.detailText}>{slide.detail}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View
          accessibilityLabel={`Step ${slideIndex + 1} of ${slides.length}`}
          accessibilityRole="progressbar"
          style={styles.progressRow}
        >
          {slides.map((item, index) => (
            <View
              key={item.title}
              style={[styles.progressDot, index === slideIndex && styles.progressDotActive]}
            />
          ))}
        </View>

        <View style={styles.navigationRow}>
          {slideIndex > 0 ? (
            <Pressable
              accessibilityLabel="Previous onboarding step"
              accessibilityRole="button"
              onPress={() => setSlideIndex((index) => Math.max(0, index - 1))}
              style={({ pressed }) => [styles.backButton, pressed && styles.secondaryPressed]}
            >
              <Ionicons
                accessibilityElementsHidden
                color={colors.primary}
                name="arrow-back"
                size={22}
              />
            </Pressable>
          ) : (
            <View style={styles.backButtonPlaceholder} />
          )}
          <PrimaryButton
            label={isLastSlide ? 'Get started' : 'Next'}
            onPress={() => {
              if (isLastSlide) setShowAuthChoice(true);
              else setSlideIndex((index) => Math.min(slides.length - 1, index + 1));
            }}
            style={styles.nextButton}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  authPage: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  topBar: {
    minHeight: minimumTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandMascot: { width: 40, height: 40, borderRadius: radius.full },
  brandName: {
    color: colors.text,
    fontFamily: typography.headingStrong,
    fontSize: 20,
  },
  skipButton: {
    minWidth: minimumTouchTarget,
    minHeight: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  skipText: {
    color: colors.primary,
    fontFamily: typography.bodySemibold,
    fontSize: 15,
  },
  slideContent: { flexGrow: 1, justifyContent: 'center', gap: spacing.xxl, paddingVertical: spacing.xl },
  illustrationCard: {
    minHeight: 270,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
  },
  orbitLarge: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderWidth: 2,
    borderColor: colors.primarySoft,
    borderRadius: 115,
  },
  orbitSmall: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderWidth: 2,
    borderColor: '#CBD1FF',
    borderRadius: 85,
  },
  iconTile: {
    width: 116,
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
    backgroundColor: colors.primary,
    elevation: 8,
  },
  sparkle: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.warningSoft,
    borderWidth: 2,
    borderColor: '#F4BD59',
  },
  sparkleTop: { top: 42, right: 46 },
  sparkleBottom: { bottom: 42, left: 48 },
  slideCopy: { alignItems: 'center', gap: spacing.md },
  title: {
    color: colors.text,
    fontFamily: typography.headingStrong,
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
  },
  body: {
    maxWidth: 430,
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  detailPill: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  detailText: {
    flexShrink: 1,
    color: colors.primary,
    fontFamily: typography.bodySemibold,
    fontSize: 14,
  },
  footer: { gap: spacing.xl },
  progressRow: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  progressDot: {
    width: 9,
    height: 9,
    borderRadius: radius.full,
    backgroundColor: colors.borderStrong,
  },
  progressDotActive: { width: 28, backgroundColor: colors.primary },
  navigationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  backButton: {
    width: minimumTouchTarget,
    height: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  backButtonPlaceholder: { width: minimumTouchTarget, height: minimumTouchTarget },
  nextButton: { flex: 1 },
  authIllustration: {
    flex: 1,
    minHeight: 230,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authIconRing: {
    width: 138,
    height: 138,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 18,
    borderColor: colors.primarySoft,
    borderRadius: 69,
    backgroundColor: colors.surface,
  },
  authCopy: { alignItems: 'center', gap: spacing.md, marginBottom: spacing.xxl },
  authActions: { gap: spacing.md },
  googleButton: {
    minHeight: 56,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  googleButtonText: {
    flexShrink: 1,
    color: colors.text,
    fontFamily: typography.bodyBold,
    fontSize: 16,
  },
  guestExplanation: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  errorText: {
    color: colors.danger,
    fontFamily: typography.bodySemibold,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  disabled: { opacity: 0.5 },
  secondaryPressed: { backgroundColor: colors.primaryFaint },
});
