import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { ScreenShell } from '../src/components/ScreenShell';
import { purchaseWasCancelled } from '../src/domain/plus';
import { getSandbox, isSandboxPlus, loadSandbox, sandboxSetupError } from '../src/services/plusSandbox';
import { useAuth } from '../src/store/AuthStore';
import { colors, spacing, surfaces, typography } from '../src/theme/tokens';

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
          if (!result.monthly) setMessage('No monthly package found. Add a monthly package to the current offering in RevenueCat.');
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
          setMessage(unlocked ? 'Duely Plus test entitlement found. The server verifies it separately when you request an AI-assisted scan.' : 'No active Duely Plus entitlement returned. Check the product’s entitlement attachment and identifier.');
        }
      }
    } catch (error) {
      if (mounted.current && currentUserId.current === userId) {
        if (action === 'refresh') { setMonthly(null); setActive(null); }
        setMessage(purchaseWasCancelled(error) ? 'Purchase cancelled. You can try again whenever you’re ready.' : 'Could not verify purchases. Check your connection and RevenueCat setup, then retry. A native Android rebuild is required after installing the SDK.');
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
    <ScreenShell scroll>
      <Stack.Screen options={{ title: 'Duely Plus sandbox' }} />
      <Text style={styles.title}>Duely Plus</Text>
      <Text style={styles.body}>TEST STORE · No real money is charged.</Text>
      <View style={styles.card}>
        <Text style={styles.body}>Test limits: 5 free or 20 Plus AI-assisted scans per month. Only a server-verified entitlement changes your allowance. Manual tasks and on-device scanning remain free.</Text>
        <Text style={styles.body} accessibilityLiveRegion="polite">{active === null ? 'Entitlement: not verified' : active ? 'Entitlement: Plus active (test)' : 'Entitlement: Free'}</Text>
        {!userId && <Text style={styles.body}>{status === 'loading' ? 'Checking your account…' : 'Sign in with Google before testing a purchase so Plus can belong to your Duely account.'}</Text>}
        {!userId && <PrimaryButton style={styles.button} label={isAuthActionPending ? 'Signing in…' : 'Sign in with Google'} disabled={isAuthActionPending || status === 'loading' || status === 'unconfigured'} onPress={() => void startGoogleSignIn()} />}
        {!!authActionError && <Text style={styles.body}>{authActionError}</Text>}
        {monthly && <Text style={styles.body}>Monthly · {monthly.product.priceString}</Text>}
        <PrimaryButton style={styles.button} label={busy ? 'Please wait…' : 'Test monthly purchase'} disabled={busy || !!setupError || !userId || !monthly || active === true} onPress={() => void run('purchase')} />
        <PrimaryButton style={styles.button} label="Restore test purchases" disabled={busy || !!setupError || !userId} onPress={() => void run('restore')} />
        <PrimaryButton style={styles.button} label="Refresh / retry" disabled={busy || !!setupError || !userId} onPress={() => void run('refresh')} />
        {!!(setupError || message) && <Text style={styles.body} accessibilityLiveRegion="polite">{setupError || message}</Text>}
      </View>
      <Text style={styles.body}>Test purchases use your signed-in Duely account ID. An earlier anonymous test purchase may need restoration. This is not a production subscription screen.</Text>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: typography.headingStrong, fontSize: 28, color: colors.text },
  body: { fontFamily: typography.body, fontSize: 16, lineHeight: 24, color: colors.text },
  card: { ...surfaces.card, padding: spacing.xl, gap: spacing.lg },
  button: { paddingVertical: spacing.md },
});
