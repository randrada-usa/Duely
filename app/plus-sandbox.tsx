import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { ScreenShell } from '../src/components/ScreenShell';
import { purchaseWasCancelled } from '../src/domain/plus';
import { getSandbox, isSandboxPlus, loadSandbox, sandboxSetupError } from '../src/services/plusSandbox';
import { useAuth } from '../src/store/AuthStore';
import { colors, minimumTouchTarget, radius, spacing, surfaces, typography } from '../src/theme/tokens';

export default function PlusSandboxScreen() {
  const { height, fontScale } = useWindowDimensions();
  const { user, status, startGoogleSignIn, isAuthActionPending, authActionError } = useAuth();
  const userId = user?.id;
  const [monthly, setMonthly] = useState<PurchasesPackage | null>(null);
  const [active, setActive] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const mounted = useRef(false);
  const currentUserId = useRef(userId);
  currentUserId.current = userId;
  const locked = useRef(false);
  const setupError = sandboxSetupError();
  const compact = height < 760 || fontScale > 1.1;

  async function run(action: 'refresh' | 'purchase' | 'restore') {
    if (locked.current || setupError || !userId) return;
    locked.current = true;
    setBusy(true);
    setMessage('');
    try {
      if (action === 'refresh') {
        const result = await loadSandbox(userId);
        if (mounted.current && currentUserId.current === userId) {
          setMonthly(result.monthly);
          setActive(isSandboxPlus(result.info));
          if (!result.monthly) setMessage('The monthly plan is unavailable right now. Please try again later.');
        }
      } else {
        const sdk = await getSandbox(userId);
        if (action === 'purchase' && !monthly) return;
        const info = action === 'restore'
          ? await sdk.restorePurchases()
          : (await sdk.purchasePackage(monthly!)).customerInfo;
        if (mounted.current && currentUserId.current === userId) {
          const unlocked = isSandboxPlus(info);
          setActive(unlocked);
          setMessage(unlocked ? 'You’re on Duely Plus. Your scan allowance is checked securely when you use cloud AI.' : 'No active Duely Plus plan was found for this account.');
        }
      }
    } catch (error) {
      if (mounted.current && currentUserId.current === userId) {
        if (action === 'refresh') { setMonthly(null); setActive(null); }
        setMessage(purchaseWasCancelled(error) ? 'Purchase cancelled. You can try again whenever you’re ready.' : 'We couldn’t check your plan. Check your connection and try again.');
      }
    } finally {
      locked.current = false;
      if (mounted.current && currentUserId.current === userId) setBusy(false);
    }
  }

  useEffect(() => {
    mounted.current = true;
    setBusy(false);
    let unsubscribe: (() => void) | undefined;
    const listener = (info: CustomerInfo) => { if (mounted.current && currentUserId.current === userId) setActive(isSandboxPlus(info)); };
    if (!setupError && userId) {
      void getSandbox(userId).then(sdk => {
        if (!mounted.current || currentUserId.current !== userId) return;
        sdk.addCustomerInfoUpdateListener(listener);
        unsubscribe = () => { sdk.removeCustomerInfoUpdateListener(listener); };
      }).catch(() => {});
      void run('refresh');
    } else {
      setActive(null);
      setMonthly(null);
      setMessage('');
    }
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void run('refresh');
    });
    return () => { mounted.current = false; unsubscribe?.(); subscription.remove(); };
  }, [userId]);

  return (
    <ScreenShell safeTop={false}>
      <Stack.Screen options={{ title: 'Duely Plus' }} />
      <View style={[styles.page, compact && styles.pageCompact]}>
        <View style={[styles.intro, compact && styles.introCompact]}>
          <View style={styles.brandPill}>
            <Ionicons name="sparkles" size={15} color={colors.primary} accessibilityElementsHidden />
            <Text style={styles.brand}>DUELY PLUS</Text>
          </View>
          <Text accessibilityRole="header" style={[styles.heroTitle, compact && styles.heroTitleCompact]}>Unlock more with Duely Plus</Text>
          <Text style={styles.heroBody}>More AI-assisted scans, with every suggested detail still yours to review.</Text>
        </View>

        <View style={[styles.planCard, compact && styles.planCardCompact]}>
          <View style={styles.planHeading}>
            <View>
              <Text style={styles.billingLabel}>Planned monthly price</Text>
              <Text style={styles.price}>US$5<Text style={styles.period}> / month</Text></Text>
            </View>
            {active === true && <Text style={styles.activeBadge}>✓ Active</Text>}
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.included}>Included</Text>
            <View style={styles.divider} />
          </View>

          <View style={[styles.features, compact && styles.featuresCompact]}>
            <Feature text="20 AI-assisted scans each month" />
            <Feature text="Review and edit every suggested detail" />
            <Feature text="Manual tasks and on-device scanning stay free" />
          </View>

          <View style={styles.checkoutInfo}>
            {monthly ? (
              <Text style={styles.checkoutText}>Preview checkout price: {monthly.product.priceString} / month</Text>
            ) : (
              <Text style={styles.checkoutText}>{busy ? 'Loading plan details…' : userId ? 'Plan details are currently unavailable.' : 'Sign in to see checkout details.'}</Text>
            )}
            <Text style={styles.previewNote}>Preview only · Purchases are simulated. No real money is charged.</Text>
          </View>
        </View>

        <View style={styles.actions}>
          {!userId ? (
            <PrimaryButton label={isAuthActionPending ? 'Signing in…' : 'Continue with Google'} disabled={isAuthActionPending || status === 'loading' || status === 'unconfigured'} onPress={() => void startGoogleSignIn()} />
          ) : (
            <PrimaryButton label={busy ? 'Please wait…' : active === true ? 'Duely Plus is active' : 'Get Duely Plus'} disabled={busy || !!setupError || !monthly || active === true} onPress={() => void run('purchase')} />
          )}
          {!!authActionError && <Text style={styles.feedback} accessibilityLiveRegion="polite">{authActionError}</Text>}
          <View style={styles.links}>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || !!setupError || !userId }} disabled={busy || !!setupError || !userId} onPress={() => void run('restore')} style={({ pressed }) => [styles.link, (busy || !!setupError || !userId) && styles.disabled, pressed && styles.pressed]}>
              <Text style={styles.linkText}>Restore purchases</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || !!setupError || !userId }} disabled={busy || !!setupError || !userId} onPress={() => void run('refresh')} style={({ pressed }) => [styles.link, (busy || !!setupError || !userId) && styles.disabled, pressed && styles.pressed]}>
              <Text style={styles.linkText}>Refresh plan</Text>
            </Pressable>
          </View>
          {!!(setupError || message) && <Text numberOfLines={2} style={styles.feedback} accessibilityLiveRegion="polite">{setupError ? 'Duely Plus is unavailable in this build. You can still use free features.' : message}</Text>}
        </View>
      </View>
    </ScreenShell>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <View style={styles.feature}>
      <Ionicons name="checkmark-circle-outline" size={22} color={colors.primary} accessibilityElementsHidden />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'space-between', gap: spacing.lg, paddingBottom: spacing.md },
  pageCompact: { gap: spacing.md, paddingBottom: spacing.sm },
  intro: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  introCompact: { gap: spacing.xs },
  brandPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.primarySoft },
  brand: { fontFamily: typography.bodyBold, fontSize: 12, letterSpacing: 1, color: colors.primary },
  heroTitle: { maxWidth: 360, fontFamily: typography.headingStrong, fontSize: 30, lineHeight: 36, color: colors.text, textAlign: 'center' },
  heroTitleCompact: { fontSize: 26, lineHeight: 31 },
  heroBody: { maxWidth: 360, fontFamily: typography.body, fontSize: 15, lineHeight: 21, color: colors.textMuted, textAlign: 'center' },
  planCard: { ...surfaces.card, borderWidth: 2, borderColor: colors.primarySoft, padding: spacing.xl, gap: spacing.lg },
  planCardCompact: { padding: spacing.lg, gap: spacing.md },
  planHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  activeBadge: { fontFamily: typography.bodySemibold, fontSize: 14, color: colors.primary, backgroundColor: colors.primarySoft, padding: spacing.sm, borderRadius: radius.full },
  billingLabel: { fontFamily: typography.bodySemibold, fontSize: 14, color: colors.textMuted },
  price: { fontFamily: typography.headingStrong, fontSize: 32, color: colors.text },
  period: { fontFamily: typography.body, fontSize: 16, color: colors.textMuted },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  included: { fontFamily: typography.bodySemibold, fontSize: 14, color: colors.textMuted },
  features: { gap: spacing.md },
  featuresCompact: { gap: spacing.sm },
  feature: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureText: { flex: 1, fontFamily: typography.bodyMedium, fontSize: 15, lineHeight: 21, color: colors.text },
  checkoutInfo: { gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  checkoutText: { fontFamily: typography.bodySemibold, fontSize: 13, lineHeight: 18, color: colors.text },
  previewNote: { fontFamily: typography.body, fontSize: 13, lineHeight: 20, color: colors.textMuted },
  actions: { gap: spacing.xs },
  links: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
  link: { minHeight: minimumTouchTarget, justifyContent: 'center', paddingHorizontal: spacing.sm },
  linkText: { fontFamily: typography.bodySemibold, fontSize: 14, color: colors.primary },
  feedback: { fontFamily: typography.body, fontSize: 13, lineHeight: 18, color: colors.text, textAlign: 'center' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
});
