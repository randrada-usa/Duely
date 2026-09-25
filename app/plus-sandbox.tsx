import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { ScreenShell } from '../src/components/ScreenShell';
import { purchaseWasCancelled } from '../src/domain/plus';
import { getSandbox, isSandboxPlus, loadSandbox, sandboxSetupError } from '../src/services/plusSandbox';
import { useAuth } from '../src/store/AuthStore';
import { colors, minimumTouchTarget, radius, spacing, surfaces, typography } from '../src/theme/tokens';

export default function PlusSandboxScreen() {
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
    <ScreenShell scroll safeTop={false}>
      <Stack.Screen options={{ title: 'Duely Plus' }} />
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.brandPill}>
            <Ionicons name="sparkles" size={16} color={colors.surface} accessibilityElementsHidden />
            <Text style={styles.brand}>DUELY PLUS</Text>
          </View>
          <Image source={require('../assets/mascot.png')} style={styles.mascot} accessibilityLabel="Due, the Duely mascot" />
        </View>
        <Text accessibilityRole="header" style={styles.heroTitle}>More room for your assignments.</Text>
        <Text style={styles.heroBody}>A little extra help turning assignment text into tasks you can review and make your own.</Text>
      </View>

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>A little more, with Plus</Text>
        <View style={styles.benefit}>
          <View style={styles.icon}><Ionicons name="scan-outline" size={24} color={colors.primary} accessibilityElementsHidden /></View>
          <View style={styles.copy}>
            <Text style={styles.benefitTitle}>20 AI-assisted scans per month</Text>
            <Text style={styles.secondary}>More room than the free plan’s 5 monthly AI-assisted scans.</Text>
          </View>
        </View>
        <View style={styles.benefit}>
          <View style={styles.icon}><Ionicons name="create-outline" size={24} color={colors.primary} accessibilityElementsHidden /></View>
          <View style={styles.copy}>
            <Text style={styles.benefitTitle}>Your review comes first</Text>
            <Text style={styles.secondary}>AI suggests the details. You edit and confirm before saving.</Text>
          </View>
        </View>
        <Text style={styles.freeNote}>Manual tasks and on-device scanning stay free. You always review extracted details, on either plan.</Text>
      </View>

      <View style={styles.planCard}>
        <View style={styles.planHeading}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Duely Plus</Text>
          {active === true && <Text style={styles.activeBadge}>✓ Active</Text>}
        </View>
        <Text style={styles.billingLabel}>Planned monthly price</Text>
        <Text style={styles.price}>US$5<Text style={styles.period}> / month</Text></Text>
        {monthly ? (
          <Text style={styles.secondary}>Preview checkout price: {monthly.product.priceString} / month</Text>
        ) : (
          <Text style={styles.secondary}>{busy ? 'Loading plan details…' : userId ? 'Plan details are currently unavailable.' : 'Sign in to see your plan and pricing.'}</Text>
        )}
        <Text style={styles.previewNote}>Preview checkout · Purchases are simulated. No real money is charged.</Text>
        {!userId && <Text style={styles.secondary}>{status === 'loading' ? 'Checking your account…' : 'Connect your Google account to keep Plus linked to you.'}</Text>}
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
        {!!(setupError || message) && <Text style={styles.feedback} accessibilityLiveRegion="polite">{setupError ? 'Duely Plus is unavailable in this build. You can still use free features.' : message}</Text>}
      </View>
      <Text style={styles.footer}>Optional cloud AI processes recognized text, not your assignment image. Your permission is always required.</Text>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: { padding: spacing.xl, gap: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.primary },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  brandPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.14)' },
  brand: { fontFamily: typography.bodyBold, fontSize: 12, letterSpacing: 1, color: colors.surface },
  mascot: { width: 64, height: 64, resizeMode: 'contain' },
  heroTitle: { fontFamily: typography.headingStrong, fontSize: 30, lineHeight: 37, color: colors.surface },
  heroBody: { fontFamily: typography.body, fontSize: 16, lineHeight: 24, color: colors.surface },
  card: { ...surfaces.card, padding: spacing.xl, gap: spacing.xl },
  sectionTitle: { fontFamily: typography.headingStrong, fontSize: 22, color: colors.text, flexShrink: 1 },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  icon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  copy: { flex: 1, gap: spacing.xs },
  benefitTitle: { fontFamily: typography.bodySemibold, fontSize: 16, lineHeight: 24, color: colors.text },
  secondary: { fontFamily: typography.body, fontSize: 15, lineHeight: 23, color: colors.textMuted },
  freeNote: { fontFamily: typography.body, fontSize: 14, lineHeight: 21, color: colors.textMuted },
  planCard: { ...surfaces.card, borderColor: colors.primary, padding: spacing.xl, gap: spacing.lg },
  planHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  activeBadge: { fontFamily: typography.bodySemibold, fontSize: 14, color: colors.primary, backgroundColor: colors.primarySoft, padding: spacing.sm, borderRadius: radius.full },
  billingLabel: { fontFamily: typography.bodySemibold, fontSize: 16, color: colors.text },
  price: { fontFamily: typography.headingStrong, fontSize: 32, color: colors.text },
  period: { fontFamily: typography.body, fontSize: 16, color: colors.textMuted },
  previewNote: { fontFamily: typography.body, fontSize: 13, lineHeight: 20, color: colors.textMuted },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  link: { minHeight: minimumTouchTarget, justifyContent: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  linkText: { fontFamily: typography.bodySemibold, fontSize: 14, color: colors.primary },
  feedback: { fontFamily: typography.body, fontSize: 15, lineHeight: 23, color: colors.text },
  footer: { fontFamily: typography.body, fontSize: 13, lineHeight: 20, color: colors.textMuted, textAlign: 'center' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
});
