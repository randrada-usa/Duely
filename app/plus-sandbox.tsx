import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { ScreenShell } from '../src/components/ScreenShell';
import { purchaseWasCancelled } from '../src/domain/plus';
import { getSandbox, isSandboxPlus, loadSandbox, sandboxSetupError } from '../src/services/plusSandbox';
import { colors, spacing, typography } from '../src/theme/tokens';

export default function PlusSandboxScreen() {
  const [monthly, setMonthly] = useState<PurchasesPackage | null>(null);
  const [active, setActive] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const mounted = useRef(false);
  const locked = useRef(false);
  const setupError = sandboxSetupError();

  async function run(action: 'refresh' | 'purchase' | 'restore') {
    if (locked.current || setupError) return;
    locked.current = true;
    setBusy(true);
    setMessage('');
    try {
      if (action === 'refresh') {
        const result = await loadSandbox();
        if (mounted.current) {
          setMonthly(result.monthly);
          setActive(isSandboxPlus(result.info));
          if (!result.monthly) setMessage('No monthly package found. Add a monthly package to the current offering in RevenueCat.');
        }
      } else {
        const sdk = await getSandbox();
        if (action === 'purchase' && !monthly) return;
        const info = action === 'restore'
          ? await sdk.restorePurchases()
          : (await sdk.purchasePackage(monthly!)).customerInfo;
        if (mounted.current) {
          const unlocked = isSandboxPlus(info);
          setActive(unlocked);
          setMessage(unlocked ? 'Duely Plus test entitlement verified.' : 'No active Duely Plus entitlement returned. Check the product’s entitlement attachment and identifier.');
        }
      }
    } catch (error) {
      if (mounted.current) {
        if (action === 'refresh') { setMonthly(null); setActive(null); }
        setMessage(purchaseWasCancelled(error) ? 'Purchase cancelled. You can try again whenever you’re ready.' : 'Could not verify purchases. Check your connection and RevenueCat setup, then retry. A native Android rebuild is required after installing the SDK.');
      }
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  useEffect(() => {
    mounted.current = true;
    let unsubscribe: (() => void) | undefined;
    const listener = (info: CustomerInfo) => { if (mounted.current) setActive(isSandboxPlus(info)); };
    if (!setupError) {
      void getSandbox().then(sdk => {
        if (!mounted.current) return;
        sdk.addCustomerInfoUpdateListener(listener);
        unsubscribe = () => { sdk.removeCustomerInfoUpdateListener(listener); };
      }).catch(() => {});
      void run('refresh');
    }
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void run('refresh');
    });
    return () => { mounted.current = false; unsubscribe?.(); subscription.remove(); };
  }, []);

  return (
    <ScreenShell scroll>
      <Stack.Screen options={{ title: 'Duely Plus sandbox' }} />
      <Text style={styles.title}>Duely Plus</Text>
      <Text style={styles.body}>TEST STORE · No real money is charged.</Text>
      <View style={styles.card}>
        <Text style={styles.body}>This verifies a test subscription only. Your AI-scan allowance is unchanged. Manual tasks and on-device scanning remain free.</Text>
        <Text style={styles.body} accessibilityLiveRegion="polite">{active === null ? 'Entitlement: not verified' : active ? 'Entitlement: Plus active (test)' : 'Entitlement: Free'}</Text>
        {monthly && <Text style={styles.body}>Monthly · {monthly.product.priceString}</Text>}
        <PrimaryButton style={styles.button} label={busy ? 'Please wait…' : 'Test monthly purchase'} disabled={busy || !!setupError || !monthly || active === true} onPress={() => void run('purchase')} />
        <PrimaryButton style={styles.button} label="Restore test purchases" disabled={busy || !!setupError} onPress={() => void run('restore')} />
        <PrimaryButton style={styles.button} label="Refresh / retry" disabled={busy || !!setupError} onPress={() => void run('refresh')} />
        {!!(setupError || message) && <Text style={styles.body} accessibilityLiveRegion="polite">{setupError || message}</Text>}
      </View>
      <Text style={styles.body}>Test purchases use an anonymous RevenueCat customer on this installation, not your Duely account. Restore does not promise cross-device access. This is not a production subscription screen.</Text>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: typography.headingStrong, fontSize: 28, color: colors.text },
  body: { fontFamily: typography.body, fontSize: 16, lineHeight: 24, color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: spacing.lg, gap: spacing.lg },
  button: { paddingVertical: spacing.md },
});
