import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../src/components/PrimaryButton';
import { ScreenShell } from '../../src/components/ScreenShell';
import { useAuth } from '../../src/store/AuthStore';
import { colors, spacing } from '../../src/theme/tokens';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { status, isAuthActionPending, authActionError } = useAuth();

  useEffect(() => {
    if (status === 'authenticated') router.replace('/(tabs)/profile');
  }, [router, status]);

  return (
    <ScreenShell>
      <View style={styles.content}>
        {!authActionError && (
          <ActivityIndicator accessibilityLabel="Completing sign-in" color={colors.primary} />
        )}
        <Text style={styles.title}>
          {authActionError ? 'Sign-in link did not work' : 'Completing sign-in…'}
        </Text>
        <Text accessibilityRole={authActionError ? 'alert' : undefined} style={styles.body}>
          {authActionError ??
            (isAuthActionPending
              ? 'Duely is securely saving your session.'
              : 'This should only take a moment.')}
        </Text>
        {!!authActionError && (
          <PrimaryButton
            label="Back to Profile"
            onPress={() => router.replace('/(tabs)/profile')}
          />
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  body: { color: colors.textMuted, fontSize: 16, lineHeight: 23, textAlign: 'center' },
});
