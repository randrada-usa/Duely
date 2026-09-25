import type { PropsWithChildren } from 'react';
import { useSegments } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme/tokens';

type ScreenShellProps = PropsWithChildren<{ scroll?: boolean; safeBottom?: boolean; safeTop?: boolean }>;

export function ScreenShell({ children, scroll = false, safeBottom = false, safeTop = true }: ScreenShellProps) {
  const segments = useSegments();
  const inTabs = segments[0] === '(tabs)';
  return (
    <SafeAreaView edges={[...(safeTop ? ['top' as const] : []), 'left', 'right', ...(!inTabs || safeBottom ? ['bottom' as const] : [])]} style={styles.safeArea}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.content}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
});
