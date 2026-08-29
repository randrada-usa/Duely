import { Ionicons } from '@expo/vector-icons';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '../../src/components/ScreenShell';
import { REMINDER_OPTIONS } from '../../src/domain/reminder';
import { useAuth } from '../../src/store/AuthStore';
import { useCloudBackup } from '../../src/store/CloudBackupStore';
import { useReminders } from '../../src/store/ReminderStore';
import {
  colors,
  minimumTouchTarget,
  radius,
  spacing,
  typography,
} from '../../src/theme/tokens';

export default function ProfileScreen() {
  const {
    status,
    user,
    error: authError,
    isSigningOut,
    isAuthActionPending,
    authActionError,
    retry,
    startGoogleSignIn,
    signOut,
  } = useAuth();
  const {
    defaultReminder,
    permission,
    schedulingError,
    setDefaultReminder,
    requestPermission,
    openSettings,
  } = useReminders();
  const {
    isBackingUp,
    isSyncing,
    isRestoring,
    pendingTaskCount,
    pendingSubjectCount,
    shouldOfferBackup,
    shouldOfferRestore,
    restoreTaskCount,
    backupError,
    syncError,
    lastSyncedAt,
    lastBackupResult,
    backUpLocalData,
    dismissBackupPrompt,
    clearBackupResult,
    retrySync,
    restoreFromCloud,
  } = useCloudBackup();

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
  const profileName =
    status === 'authenticated' &&
    typeof user?.user_metadata.full_name === 'string' &&
    user.user_metadata.full_name.trim().length > 0
      ? user.user_metadata.full_name.trim()
      : 'Your profile';

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
      'This signs out only this phone. Your local tasks will stay on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          onPress: () =>
            void signOut().then((signedOut) => {
              if (!signedOut) {
                Alert.alert(
                  'Could not sign out',
                  'Check your connection and try again.',
                );
              }
            }),
        },
      ],
    );
  }

  return (
    <ScreenShell scroll>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Image
            accessibilityLabel="Due, the Duely mascot"
            source={require('../../assets/mascot.png')}
            style={styles.avatarImage}
          />
        </View>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.title}>{profileName}</Text>
          <Text style={styles.subtitle}>{profileSubtitle}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.eyebrow}>NOTIFICATIONS</Text>
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
        <Text style={styles.eyebrow}>DEFAULT SCHEDULE</Text>
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
        <Text style={styles.eyebrow}>ACCOUNT &amp; BACKUP</Text>
        <Text style={styles.cardTitle}>Account</Text>
        <Text style={styles.cardBody}>
          {status === 'unconfigured'
            ? 'Cloud accounts are not configured in this build. Manual tasks and on-device scanning remain available.'
            : status === 'loading'
              ? 'Checking your account session…'
              : status === 'authenticated'
                ? 'You are signed in. After your first backup, this phone remains the source of truth and confirmed changes are mirrored to your account.'
                : status === 'error'
                  ? authError
                  : 'Continue with Google, or keep using Duely as a guest. Signing in keeps your local tasks on this device.'}
        </Text>
        {status === 'guest' && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isAuthActionPending }}
            disabled={isAuthActionPending}
            onPress={() => void startGoogleSignIn()}
            style={({ pressed }) => [
              styles.googleAction,
              pressed && styles.secondaryActionPressed,
              isAuthActionPending && styles.actionDisabled,
            ]}
          >
            <Ionicons name="logo-google" size={22} color={colors.text} />
            <Text style={styles.googleActionText}>
              {isAuthActionPending ? 'Please wait…' : 'Continue with Google'}
            </Text>
          </Pressable>
        )}
        {!!authActionError && (
          <Text accessibilityRole="alert" style={styles.error}>
            {authActionError}
          </Text>
        )}
        {status === 'error' && (
          <Pressable
            accessibilityRole="button"
            onPress={retry}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          >
            <Text style={styles.actionText}>Retry account check</Text>
          </Pressable>
        )}
        {status === 'authenticated' && shouldOfferBackup && (
          <View style={styles.backupPanel}>
            <View style={styles.cardHeading}>
              <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
              <View style={styles.headingCopy}>
                <Text style={styles.successTitle}>Back up local tasks?</Text>
                <Text style={styles.cardBody}>
                  {pendingTaskCount > 0
                    ? `${pendingTaskCount} ${pendingTaskCount === 1 ? 'task' : 'tasks'} will be copied to your Duely account.`
                    : `${pendingSubjectCount} ${pendingSubjectCount === 1 ? 'subject' : 'subjects'} will be copied to your Duely account.`}
                  {' '}Your copies stay on this device until the cloud confirms every record.
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isBackingUp }}
              disabled={isBackingUp}
              onPress={() => void backUpLocalData()}
              style={({ pressed }) => [
                styles.action,
                pressed && styles.actionPressed,
                isBackingUp && styles.actionDisabled,
              ]}
            >
              <Text style={styles.actionText}>
                {isBackingUp ? 'Confirming backup…' : 'Back up to my account'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isBackingUp }}
              disabled={isBackingUp}
              onPress={dismissBackupPrompt}
              style={({ pressed }) => [
                styles.secondaryAction,
                pressed && styles.secondaryActionPressed,
                isBackingUp && styles.actionDisabled,
              ]}
            >
              <Text style={styles.secondaryActionText}>Not now</Text>
            </Pressable>
          </View>
        )}
        {status === 'authenticated' && shouldOfferRestore && (
          <View style={styles.backupPanel}>
            <View style={styles.cardHeading}>
              <Ionicons name="cloud-download-outline" size={24} color={colors.primary} />
              <View style={styles.headingCopy}>
                <Text style={styles.successTitle}>Restore cloud backup?</Text>
                <Text style={styles.cardBody}>
                  This phone has no local tasks. Restore {restoreTaskCount}{' '}
                  {restoreTaskCount === 1 ? 'task' : 'tasks'} from your Duely account?
                  Nothing is restored without your confirmation.
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isRestoring }}
              disabled={isRestoring}
              onPress={() => void restoreFromCloud()}
              style={({ pressed }) => [
                styles.action,
                pressed && styles.actionPressed,
                isRestoring && styles.actionDisabled,
              ]}
            >
              <Text style={styles.actionText}>
                {isRestoring ? 'Restoring…' : 'Restore to this phone'}
              </Text>
            </Pressable>
          </View>
        )}
        {status === 'authenticated' && !!backupError && (
          <Text accessibilityRole="alert" style={styles.error}>
            {backupError}
          </Text>
        )}
        {status === 'authenticated' && !!lastBackupResult && (
          <View accessibilityLiveRegion="polite" style={styles.successPanel}>
            <Text style={styles.successTitle}>Backup confirmed</Text>
            <Text style={styles.cardBody}>
              {lastBackupResult.tasksConfirmed}{' '}
              {lastBackupResult.tasksConfirmed === 1 ? 'task is' : 'tasks are'} backed up.{' '}
              Your local copies are still available on this device.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={clearBackupResult}
              style={({ pressed }) => [
                styles.secondaryAction,
                pressed && styles.secondaryActionPressed,
              ]}
            >
              <Text style={styles.secondaryActionText}>Done</Text>
            </Pressable>
          </View>
        )}
        {status === 'authenticated' && !!lastSyncedAt && !lastBackupResult && (
          <View accessibilityLiveRegion="polite" style={styles.successPanel}>
            <Text style={styles.successTitle}>
              {isSyncing ? 'Updating cloud backup…' : 'Cloud backup active'}
            </Text>
            <Text style={styles.cardBody}>
              This phone is the source of truth. Cloud changes never replace local tasks silently.
            </Text>
            {!!syncError && (
              <>
                <Text accessibilityRole="alert" style={styles.error}>{syncError}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={retrySync}
                  style={({ pressed }) => [
                    styles.secondaryAction,
                    pressed && styles.secondaryActionPressed,
                  ]}
                >
                  <Text style={styles.secondaryActionText}>Retry cloud backup</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
        {status === 'authenticated' && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isSigningOut }}
            disabled={isSigningOut}
            onPress={confirmSignOut}
            style={({ pressed }) => [
              styles.secondaryAction,
              styles.signOutAction,
              pressed && styles.secondaryActionPressed,
            ]}
          >
            <Text style={styles.signOutActionText}>
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </Text>
          </Pressable>
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primarySoft,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  avatarImage: { width: 58, height: 58, resizeMode: 'contain' },
  headerCopy: { flex: 1, gap: spacing.xs },
  title: {
    color: colors.text,
    fontFamily: typography.headingStrong,
    fontSize: 22,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    elevation: 1,
  },
  eyebrow: {
    color: colors.textMuted,
    fontFamily: typography.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headingCopy: { flex: 1, gap: spacing.xs },
  cardTitle: {
    color: colors.text,
    fontFamily: typography.bodyBold,
    fontSize: 17,
  },
  cardBody: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 22,
  },
  action: { minHeight: minimumTouchTarget, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.primary },
  actionPressed: { backgroundColor: colors.primaryPressed },
  actionDisabled: { opacity: 0.6 },
  actionText: { color: colors.surface, fontFamily: typography.bodyBold, fontSize: 16 },
  secondaryAction: { minHeight: minimumTouchTarget, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  secondaryActionPressed: { backgroundColor: colors.surfaceSubtle },
  secondaryActionText: { color: colors.primary, fontFamily: typography.bodyBold, fontSize: 16 },
  signOutAction: {
    borderColor: colors.dangerSoft,
    backgroundColor: colors.dangerSoft,
  },
  signOutActionText: {
    color: colors.danger,
    fontFamily: typography.bodyBold,
    fontSize: 16,
  },
  googleAction: { minHeight: minimumTouchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  googleActionText: { color: colors.text, fontFamily: typography.bodyBold, fontSize: 16 },
  successPanel: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceSubtle },
  backupPanel: { gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceSubtle },
  successTitle: { color: colors.text, fontFamily: typography.bodyBold, fontSize: 17 },
  recovery: { color: colors.warning, fontFamily: typography.body, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontFamily: typography.body, fontSize: 14, lineHeight: 20 },
  options: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  option: {
    minHeight: minimumTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceSubtle },
  optionText: { color: colors.text, fontFamily: typography.body, fontSize: 15 },
  optionTextSelected: { color: colors.primary, fontFamily: typography.bodySemibold },
});
