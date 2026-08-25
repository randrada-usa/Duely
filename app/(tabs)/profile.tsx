import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '../../src/components/ScreenShell';
import { REMINDER_OPTIONS } from '../../src/domain/reminder';
import { useAuth } from '../../src/store/AuthStore';
import { useReminders } from '../../src/store/ReminderStore';
import { colors, minimumTouchTarget, radius, spacing } from '../../src/theme/tokens';

export default function ProfileScreen() {
  const { status, user, error: authError, isSigningOut, retry, signOut } = useAuth();
  const {
    defaultReminder,
    permission,
    schedulingError,
    setDefaultReminder,
    requestPermission,
    openSettings,
  } = useReminders();

  const permissionLabel = permission.granted
    ? 'Notifications enabled'
    : permission.status === 'denied'
      ? permission.canAskAgain
        ? 'Notifications not enabled'
        : 'Notifications blocked'
      : 'Notifications not enabled';
  const profileSubtitle =
    status === 'authenticated'
      ? user?.email ?? 'Signed in'
      : 'Guest · tasks stay on this device';

  function enableNotifications() {
    Alert.alert(
      'Enable task reminders?',
      'Duely uses notifications only for reminders you choose. You can change this anytime in your device settings.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Continue', onPress: () => void requestPermission() },
      ],
    );
  }

  function confirmSignOut() {
    Alert.alert(
      'Sign out of Duely?',
      'Your local tasks will stay on this device. Cloud synchronization is not enabled yet.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          onPress: () =>
            void signOut().then((signedOut) => {
              if (!signedOut) Alert.alert('Could not sign out', authError ?? 'Try again.');
            }),
        },
      ],
    );
  }

  return (
    <ScreenShell scroll>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person-outline" size={30} color={colors.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Your profile</Text>
          <Text style={styles.subtitle}>{profileSubtitle}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeading}>
          <Ionicons name="notifications-outline" size={24} color={colors.primary} />
          <View style={styles.headingCopy}>
            <Text style={styles.cardTitle}>Task notifications</Text>
            <Text style={styles.cardBody}>{permissionLabel}</Text>
          </View>
        </View>
        {!permission.granted && (
          <Pressable
            accessibilityRole="button"
            onPress={permission.canAskAgain ? enableNotifications : () => void openSettings()}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          >
            <Text style={styles.actionText}>
              {permission.canAskAgain ? 'Enable notifications' : 'Open device settings'}
            </Text>
          </Pressable>
        )}
        {permission.status === 'denied' && !permission.canAskAgain && (
          <Text style={styles.recovery}>
            Reminders remain saved with your tasks. Allow notifications in Android settings to receive them.
          </Text>
        )}
        {!!schedulingError && (
          <Text accessibilityRole="alert" style={styles.error}>{schedulingError}</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Default reminder</Text>
        <Text style={styles.cardBody}>
          This is preselected for new tasks with a deadline. You can change it per task.
        </Text>
        <View accessibilityRole="radiogroup" style={styles.options}>
          {REMINDER_OPTIONS.map((option) => {
            const selected = defaultReminder === option.value;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                key={option.label}
                onPress={() => setDefaultReminder(option.value)}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {option.label}
                </Text>
                {selected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <Text style={styles.cardBody}>
          {status === 'unconfigured'
            ? 'Cloud accounts are not configured in this build. Manual tasks and on-device scanning remain available.'
            : status === 'loading'
              ? 'Checking your account session…'
              : status === 'authenticated'
                ? 'You are signed in. Cloud task synchronization is not enabled yet, so local tasks remain unchanged.'
                : status === 'error'
                  ? authError
                  : 'Account services are ready. Google and verified school-email sign-in are the next step.'}
        </Text>
        {status === 'error' && (
          <Pressable
            accessibilityRole="button"
            onPress={retry}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          >
            <Text style={styles.actionText}>Retry account check</Text>
          </Pressable>
        )}
        {status === 'authenticated' && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isSigningOut }}
            disabled={isSigningOut}
            onPress={confirmSignOut}
            style={({ pressed }) => [
              styles.secondaryAction,
              pressed && styles.secondaryActionPressed,
            ]}
          >
            <Text style={styles.secondaryActionText}>
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </Text>
          </Pressable>
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingBottom: spacing.sm },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSubtle },
  headerCopy: { flex: 1, gap: spacing.xs },
  title: { color: colors.text, fontSize: 26, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 16 },
  card: { gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headingCopy: { flex: 1, gap: spacing.xs },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  cardBody: { color: colors.textMuted, fontSize: 16, lineHeight: 23 },
  action: { minHeight: minimumTouchTarget, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.primary },
  actionPressed: { backgroundColor: colors.primaryPressed },
  actionText: { color: colors.surface, fontSize: 16, fontWeight: '800' },
  secondaryAction: { minHeight: minimumTouchTarget, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  secondaryActionPressed: { backgroundColor: colors.surfaceSubtle },
  secondaryActionText: { color: colors.primary, fontSize: 16, fontWeight: '800' },
  recovery: { color: colors.warning, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  options: { gap: spacing.sm },
  option: { minHeight: minimumTouchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceSubtle },
  optionText: { color: colors.text, fontSize: 16 },
  optionTextSelected: { color: colors.primary, fontWeight: '800' },
});
