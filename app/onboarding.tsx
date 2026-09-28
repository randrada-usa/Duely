import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type { SvgProps } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DueyScan from '../DuelyMascots/DueyScan.svg';
import DuelyNotify from '../DuelyMascots/DuelyNotify.svg';
import DuelyOrganize from '../DuelyMascots/DuelyOrganize.svg';
import DuelyProfile from '../DuelyMascots/DuelyProfile.svg';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { markOnboardingCompleted } from '../src/services/onboardingStorage';
import { useAuth } from '../src/store/AuthStore';
import { useReminders } from '../src/store/ReminderStore';
import {
  colors,
  minimumTouchTarget,
  radius,
  spacing,
  typography,
} from '../src/theme/tokens';

type IntroSlide = {
  kind: 'intro';
  title: string;
  body: string;
  illustration: ComponentType<SvgProps>;
};

type PermissionSlide = {
  kind: 'permissions';
  title: string;
};

type OnboardingSlide = IntroSlide | PermissionSlide;

const slides: OnboardingSlide[] = [
  {
    kind: 'intro',
    title: 'Capture an assignment',
    body: 'Take a clear photo or choose an assignment image from your gallery.',
    illustration: DueyScan,
  },
  {
    kind: 'intro',
    title: 'Review the important details',
    body: 'Duely finds the title, subject, deadline, and instructions for you to check.',
    illustration: DuelyOrganize,
  },
  {
    kind: 'intro',
    title: 'Stay ahead of deadlines',
    body: 'Organize upcoming work and choose when Duely should remind you.',
    illustration: DuelyNotify,
  },
  {
    kind: 'permissions',
    title: 'Set up helpful access',
  },
];

export default function OnboardingScreen({ authOnly = false }: { authOnly?: boolean } = {}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const listRef = useRef<FlatList<OnboardingSlide>>(null);
  const {
    status,
    authActionError,
    isAuthActionPending,
    startGoogleSignIn,
  } = useAuth();
  const {
    isReady: remindersReady,
    permission,
    requestPermission,
    openSettings,
  } = useReminders();
  const [slideIndex, setSlideIndex] = useState(0);
  const [showAuthChoice, setShowAuthChoice] = useState(authOnly);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
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

  const continueAfterAccountChoice = async () => {
    await finishOnboarding();
  };

  const continueWithGoogle = async () => {
    const signedIn = await startGoogleSignIn();
    if (signedIn) await continueAfterAccountChoice();
  };

  const enableNotifications = async () => {
    if (isRequestingPermission || permission.granted) return;
    if (!permission.canAskAgain) {
      await openSettings();
      return;
    }
    setIsRequestingPermission(true);
    await requestPermission();
    setIsRequestingPermission(false);
  };

  if (showAuthChoice) {
    const isAuthenticated = status === 'authenticated';
    return (
      <ScrollView
        contentContainerStyle={[
          styles.authPage,
          {
            paddingTop: insets.top + spacing.xxl,
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.authIllustration}>
          <View
            accessibilityLabel="Due, the Duely mascot"
            accessibilityRole="image"
            style={styles.authIconRing}
          >
            <DuelyProfile height="100%" width="100%" />
          </View>
        </View>

        <View style={styles.authCopy}>
          <Text accessibilityRole="header" style={styles.title}>
            {isAuthenticated ? 'You are ready to go' : 'Welcome to Duely'}
          </Text>
          <Text style={styles.body}>
            {isAuthenticated
              ? 'Your account is connected. Continue to start organizing your assignments.'
              : 'Sign in to start planning smarter.'}
          </Text>
        </View>

        <View style={styles.authActions}>
          {isAuthenticated ? (
            <PrimaryButton
              disabled={isFinishing}
              label={isFinishing ? 'Opening Duely…' : authOnly ? 'Continue to Duely' : 'Continue'}
              onPress={() => void continueAfterAccountChoice()}
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
                  pressed && styles.googleButtonPressed,
                  (isAuthActionPending || isFinishing) && styles.disabled,
                ]}
              >
                {isAuthActionPending ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <Ionicons
                    accessibilityElementsHidden
                    color={colors.surface}
                    name="logo-google"
                    size={22}
                  />
                )}
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </Pressable>
              <View accessibilityElementsHidden style={styles.orDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.orText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: isAuthActionPending || isFinishing }}
                disabled={isAuthActionPending || isFinishing}
                onPress={() => void continueAfterAccountChoice()}
                style={({ pressed }) => [
                  styles.guestButton,
                  pressed && styles.secondaryPressed,
                  (isAuthActionPending || isFinishing) && styles.disabled,
                ]}
              >
                <Text style={styles.guestButtonText}>Continue without an account</Text>
              </Pressable>
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
          <View style={styles.legalFooter}>
            <Text style={styles.legalAgreement}>
              By continuing, you agree to the Beta Terms and acknowledge the Beta Privacy Notice.
            </Text>
            <View style={styles.legalLinks}>
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push('/legal/terms')}
                style={({ pressed }) => [styles.legalLinkButton, pressed && styles.secondaryPressed]}
              >
                <Text style={styles.legalLink}>Beta Terms</Text>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push('/legal/privacy')}
                style={({ pressed }) => [styles.legalLinkButton, pressed && styles.secondaryPressed]}
              >
                <Text style={styles.legalLink}>Privacy Notice</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  const goToSlide = (index: number) => {
    listRef.current?.scrollToIndex({ animated: true, index });
    setSlideIndex(index);
  };

  const isLastSlide = slideIndex === slides.length - 1;
  const illustrationHeight = Math.min(375, Math.max(260, height * 0.4));
  const notificationAction = permission.granted
    ? 'Enabled'
    : permission.canAskAgain
      ? 'Enable'
      : 'Open settings';

  return (
    <View
      style={[
        styles.page,
        { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg },
      ]}
    >
      <Pressable
        accessibilityLabel="Skip onboarding introduction"
        accessibilityRole="button"
        onPress={() => setShowAuthChoice(true)}
        style={({ pressed }) => [
          styles.skipButton,
          { top: insets.top + spacing.sm },
          pressed && styles.secondaryPressed,
        ]}
      >
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      <FlatList
        accessibilityActions={[
          { name: 'increment', label: 'Next onboarding page' },
          { name: 'decrement', label: 'Previous onboarding page' },
        ]}
        accessibilityLabel={`Onboarding page ${slideIndex + 1} of ${slides.length}`}
        data={slides}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({ index, length: width, offset: width * index })}
        horizontal
        keyExtractor={(item) => item.title}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') {
            goToSlide(Math.min(slides.length - 1, slideIndex + 1));
          } else if (event.nativeEvent.actionName === 'decrement') {
            goToSlide(Math.max(0, slideIndex - 1));
          }
        }}
        onMomentumScrollEnd={(event) => {
          setSlideIndex(Math.round(event.nativeEvent.contentOffset.x / width));
        }}
        pagingEnabled
        ref={listRef}
        renderItem={({ item }) => {
          if (item.kind === 'permissions') {
            return (
              <ScrollView
                contentContainerStyle={styles.permissionSlide}
                showsVerticalScrollIndicator={false}
                style={{ width }}
              >
                <View style={styles.setupIntro}>
                  <Text style={styles.setupEyebrow}>LAST STEP</Text>
                  <Text accessibilityRole="header" style={styles.setupTitle}>
                    Set up helpful access
                  </Text>
                  <Text style={styles.setupBody}>
                    Choose what Duely can use. You can change these choices later in your device settings.
                  </Text>
                </View>

                <View style={styles.permissionList}>
                  <PermissionCard
                    action={notificationAction}
                    actionDisabled={!remindersReady || permission.granted || isRequestingPermission}
                    body="Duely only notifies you about task reminders you choose."
                    icon="notifications-outline"
                    loading={isRequestingPermission}
                    onPress={() => void enableNotifications()}
                    title="Task notifications"
                  />
                  <PermissionCard
                    body="Camera access is requested only when you open Scan to photograph an assignment."
                    icon="camera-outline"
                    title="Camera"
                  />
                </View>

                <View style={styles.privacyNote}>
                  <Ionicons
                    accessibilityElementsHidden
                    color={colors.primary}
                    name="shield-checkmark-outline"
                    size={20}
                  />
                  <Text style={styles.privacyText}>
                    Permissions are optional. Manual task creation will still work.
                  </Text>
                </View>
              </ScrollView>
            );
          }

          const Illustration = item.illustration;
          return (
            <ScrollView
              contentContainerStyle={styles.slide}
              showsVerticalScrollIndicator={false}
              style={{ width }}
            >
              <View
                style={[styles.illustration, { height: illustrationHeight }]}
              >
                <Illustration
                    accessibilityLabel={`${item.title} illustration`}
                    height="100%"
                    preserveAspectRatio="xMidYMid meet"
                    width="100%"
                  />
              </View>
              <View style={styles.slideCopy}>
                <Text accessibilityRole="header" style={styles.title}>
                  {item.title}
                </Text>
                <Text style={styles.body}>{item.body}</Text>
              </View>
            </ScrollView>
          );
        }}
        showsHorizontalScrollIndicator={false}
      />

      <View style={styles.footer}>
        <View
          accessibilityLabel={`Page ${slideIndex + 1} of ${slides.length}`}
          style={styles.progressRow}
        >
          {slides.map((item, index) => (
            <Pressable
              accessibilityLabel={`Go to onboarding page ${index + 1}`}
              accessibilityRole="button"
              accessibilityState={{ selected: index === slideIndex }}
              hitSlop={10}
              key={item.title}
              onPress={() => goToSlide(index)}
              style={styles.progressButton}
            >
              <View
                style={[
                  styles.progressDot,
                  index === slideIndex && styles.progressDotActive,
                ]}
              />
            </Pressable>
          ))}
        </View>
        <PrimaryButton
          label={isLastSlide ? 'Continue' : 'Next'}
          onPress={() => {
            if (isLastSlide) setShowAuthChoice(true);
            else goToSlide(slideIndex + 1);
          }}
        />
      </View>
    </View>
  );
}

function PermissionCard({
  action,
  actionDisabled = false,
  body,
  icon,
  loading = false,
  onPress,
  title,
}: {
  action?: string;
  actionDisabled?: boolean;
  body: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  onPress?: () => void;
  title: string;
}) {
  return (
    <View style={styles.permissionCard}>
      <View style={styles.permissionIcon}>
        <Ionicons
          accessibilityElementsHidden
          color={colors.primary}
          name={icon}
          size={26}
        />
      </View>
      <View style={styles.permissionCopy}>
        <Text style={styles.permissionTitle}>{title}</Text>
        <Text style={styles.permissionBody}>{body}</Text>
      </View>
      {action ? (
        <Pressable
          accessibilityLabel={`${title}: ${action}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: actionDisabled }}
          disabled={actionDisabled}
          onPress={onPress}
          style={({ pressed }) => [
            styles.permissionAction,
            actionDisabled && styles.permissionActionDisabled,
            pressed && !actionDisabled && styles.secondaryPressed,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text style={styles.permissionActionText}>{action}</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.surface },
  skipButton: {
    position: 'absolute',
    right: spacing.xl,
    zIndex: 2,
    minWidth: minimumTouchTarget,
    minHeight: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  skipText: { color: colors.textMuted, fontFamily: typography.bodySemibold, fontSize: 15 },
  slide: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: spacing.xxl + minimumTouchTarget,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  illustration: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  slideCopy: { alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.sm },
  title: {
    maxWidth: 430,
    color: colors.text,
    fontFamily: typography.headingStrong,
    fontSize: 29,
    lineHeight: 35,
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
  footer: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  progressRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  progressButton: { width: 28, height: 32, alignItems: 'center', justifyContent: 'center' },
  progressDot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.borderStrong },
  progressDotActive: { width: 24, backgroundColor: colors.primary },
  authPage: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  authIllustration: { minHeight: 170, alignItems: 'center', justifyContent: 'flex-end' },
  authIconRing: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 52,
    backgroundColor: colors.primarySoft,
  },
  authCopy: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.xxl },
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
    borderColor: colors.primary,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  googleButtonPressed: { backgroundColor: colors.primaryPressed, borderColor: colors.primaryPressed },
  googleButtonText: { color: colors.surface, fontFamily: typography.bodyBold, fontSize: 16 },
  orDivider: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13 },
  guestButton: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  guestButtonText: { color: colors.primary, fontFamily: typography.bodyBold, fontSize: 16 },
  guestExplanation: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  legalFooter: { marginTop: spacing.xxl, gap: spacing.sm },
  legalAgreement: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  legalLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  legalLinkButton: {
    minHeight: minimumTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  legalLink: { color: colors.primary, fontFamily: typography.bodySemibold, textDecorationLine: 'underline' },
  permissionSlide: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: spacing.xxl + minimumTouchTarget,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  setupIntro: { gap: spacing.sm, marginBottom: spacing.xl },
  setupEyebrow: { color: colors.primary, fontFamily: typography.bodyBold, fontSize: 13, letterSpacing: 1.4 },
  setupTitle: { color: colors.text, fontFamily: typography.headingStrong, fontSize: 30, lineHeight: 36 },
  setupBody: { color: colors.textMuted, fontFamily: typography.body, fontSize: 16, lineHeight: 24 },
  permissionList: { gap: spacing.md },
  permissionCard: {
    minHeight: 134,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  permissionIcon: {
    width: minimumTouchTarget,
    height: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primaryFaint,
  },
  permissionCopy: { flex: 1, minWidth: 180, gap: spacing.xs },
  permissionTitle: { color: colors.text, fontFamily: typography.bodyBold, fontSize: 16 },
  permissionBody: { color: colors.textMuted, fontFamily: typography.body, fontSize: 14, lineHeight: 20 },
  permissionAction: {
    minHeight: minimumTouchTarget,
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  permissionActionDisabled: { borderColor: colors.border, backgroundColor: colors.primaryFaint },
  permissionActionText: { color: colors.primary, fontFamily: typography.bodySemibold, fontSize: 13, textAlign: 'center' },
  privacyNote: { marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  privacyText: { flex: 1, color: colors.textMuted, fontFamily: typography.body, fontSize: 13, lineHeight: 19 },
  errorText: { color: colors.danger, fontFamily: typography.bodySemibold, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  disabled: { opacity: 0.5 },
  secondaryPressed: { opacity: 0.72 },
});
