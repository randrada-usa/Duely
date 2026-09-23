import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '../../src/components/ScreenShell';
import { SubjectManagerModal } from '../../src/components/SubjectManagerModal';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { plusSandboxEnabled } from '../../src/services/plusSandbox';
import { REMINDER_OPTIONS } from '../../src/domain/reminder';
import { useAiPrivacy } from '../../src/store/AiPrivacyStore';
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
  const [showSubjectManager, setShowSubjectManager] = useState(false);
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
    featureEnabled: aiAssistEnabled,
    snapshot: aiPrivacy,
    isLoading: isAiPrivacyLoading,
    isSaving: isAiPrivacySaving,
    error: aiPrivacyError,
    refresh: retryAiPrivacy,
    setAiProcessingDecision,
    withdrawModelImprovement,
  } = useAiPrivacy();
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
      ? user.user_metadata.full_name
          .trim()
          .split(/\s+/)
          .map((part: string) => `${part.charAt(0).toLocaleUpperCase()}${part.slice(1).toLocaleLowerCase()}`)
          .join(' ')
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

  function explainAndEnableAiProcessing() {
    Alert.alert(
      'Allow optional cloud AI?',
      'Only the recognized OCR text—not the assignment image—is sent to Google Gemini to suggest task fields. Duely does not save that raw text. You still review every field, and on-device extraction keeps working if you decline.',
      [
        { text: 'Keep it on-device', style: 'cancel' },
        {
          text: 'Allow OCR text',
          onPress: () => void setAiProcessingDecision('granted'),
        },
      ],
    );
  }

  function confirmDisableAiProcessing() {
    Alert.alert(
      'Turn off cloud AI?',
      'Future scans will stay on this phone and use on-device text extraction.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Turn off',
          style: 'destructive',
          onPress: () => void setAiProcessingDecision('withdrawn'),
        },
      ],
    );
  }

  return (
    <>
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

      {status !== 'authenticated' && status !== 'loading' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Duely account</Text>
          {status === 'guest' ? (
            <>
              <Text style={styles.cardBody}>Sign in to use Duely Plus and optional cloud backup. Your local tasks stay on this phone until you choose to back them up.</Text>
              <Pressable
                accessibilityLabel={isAuthActionPending ? 'Google sign-in in progress' : 'Sign in with Google'}
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
                <Ionicons accessibilityElementsHidden name="logo-google" size={22} color={colors.text} />
                <Text style={styles.googleActionText}>{isAuthActionPending ? 'Please wait…' : 'Sign in with Google'}</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.cardBody} accessibilityRole="alert">
              {status === 'unconfigured'
                ? 'Account sign-in is unavailable in this build. Cloud configuration is missing; ask the Duely beta team for an updated build.'
                : authError}
            </Text>
          )}
          {!!authActionError && <Text accessibilityRole="alert" style={styles.error}>{authActionError}</Text>}
          {status === 'error' && (
            <PrimaryButton label="Retry account check" onPress={retry} />
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

      {plusSandboxEnabled && (
        <PrimaryButton label="Duely Plus · Test Store" onPress={() => router.push('/plus-sandbox')} />
      )}

      <View style={styles.card}>
        <Text style={styles.eyebrow}>NOTIFICATIONS</Text>
        <View style={styles.cardHeading}>
          <Ionicons name="notifications-outline" size={24} color={colors.primary} />
          <View style={styles.headingCopy}>
            <Text style={styles.cardTitle}>Default reminder schedule</Text>
            <Text style={styles.cardBody}>{permissionLabel}</Text>
          </View>
          {!permission.granted && (
            <Pressable
              accessibilityRole="button"
              onPress={permission.canAskAgain ? enableNotifications : () => void openSettings()}
              style={({ pressed }) => [styles.permissionAction, pressed && styles.secondaryActionPressed]}
            >
              <Text style={styles.permissionActionText}>
                {permission.canAskAgain ? 'Enable' : 'Settings'}
              </Text>
            </Pressable>
          )}
        </View>
        {permission.status === 'denied' && !permission.canAskAgain && (
          <Text style={styles.recovery}>
            Reminders remain saved with your tasks. Allow notifications in Android settings to receive them.
          </Text>
        )}
        {!!schedulingError && (
          <Text accessibilityRole="alert" style={styles.error}>{schedulingError}</Text>
        )}
        <Text style={styles.scheduleHint}>
          This is preselected for new tasks with a deadline. You can change it per task.
        </Text>
        <View accessibilityRole="radiogroup" style={styles.options}>
          {REMINDER_OPTIONS.map((option) => {
            const selected = defaultReminder === option.value;
            return (
              <Pressable
                accessibilityLabel={option.label}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                key={option.label}
                onPress={() => setDefaultReminder(option.value)}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {option.label}
                </Text>
                {selected && (
                  <Ionicons
                    accessibilityElementsHidden
                    name="checkmark-circle"
                    size={22}
                    color={colors.primary}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.eyebrow}>AI &amp; PRIVACY</Text>
        <View style={styles.cardHeading}>
          <Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} />
          <View style={styles.headingCopy}>
            <Text style={styles.cardTitle}>Optional AI extraction</Text>
            <Text style={styles.cardBody}>
              On-device text extraction is always available. Cloud AI is optional and never receives the assignment image.
            </Text>
          </View>
        </View>
        {!aiAssistEnabled && (
          <Text style={styles.recovery}>
            Cloud AI is disabled in this build while its billing and privacy configuration is reviewed.
          </Text>
        )}
        {aiAssistEnabled && status !== 'authenticated' && (
          <Text style={styles.cardBody}>Sign in with Google before choosing cloud AI.</Text>
        )}
        {aiAssistEnabled && status === 'authenticated' && !isAiPrivacyLoading && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isAiPrivacySaving }}
            disabled={isAiPrivacySaving}
            onPress={
              aiPrivacy.aiProcessing === 'granted'
                ? confirmDisableAiProcessing
                : explainAndEnableAiProcessing
            }
            style={({ pressed }) => [
              aiPrivacy.aiProcessing === 'granted'
                ? styles.secondaryAction
                : styles.action,
              pressed &&
                (aiPrivacy.aiProcessing === 'granted'
                  ? styles.secondaryActionPressed
                  : styles.actionPressed),
              isAiPrivacySaving && styles.actionDisabled,
            ]}
          >
            <Text
              style={
                aiPrivacy.aiProcessing === 'granted'
                  ? styles.secondaryActionText
                  : styles.actionText
              }
            >
              {isAiPrivacySaving
                ? 'Saving choice…'
                : aiPrivacy.aiProcessing === 'granted'
                  ? 'Turn off cloud AI'
                  : 'Review and allow cloud AI'}
            </Text>
          </Pressable>
        )}
        {!!aiPrivacyError && (
          <>
            <Text accessibilityRole="alert" style={styles.error}>{aiPrivacyError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={retryAiPrivacy}
              style={({ pressed }) => [styles.secondaryAction, pressed && styles.secondaryActionPressed]}
            >
              <Text style={styles.secondaryActionText}>Retry privacy check</Text>
            </Pressable>
          </>
        )}
        <View style={styles.privacyPanel}>
          <Text style={styles.successTitle}>Model-improvement contributions are off</Text>
          <Text style={styles.cardBody}>
            Duely is not collecting assignment images, OCR text, or corrections for a training dataset. Using AI extraction does not opt you in.
          </Text>
          {aiPrivacy.modelImprovement === 'granted' && (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isAiPrivacySaving }}
              disabled={isAiPrivacySaving}
              onPress={() => void withdrawModelImprovement()}
              style={({ pressed }) => [styles.secondaryAction, pressed && styles.secondaryActionPressed]}
            >
              <Text style={styles.secondaryActionText}>Withdraw old contribution consent</Text>
            </Pressable>
          )}
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
                  : 'Sign in with Google above, or keep using Duely as a guest. Signing in keeps your local tasks on this device.'}
        </Text>
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
      </View>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>APP SETTINGS</Text>
        <SettingRow
          icon="library-outline"
          label="Manage subjects"
          onPress={() => setShowSubjectManager(true)}
          value="Create, rename, or remove subjects"
        />
        <View style={styles.settingDivider} />
        <SettingRow
          icon="language-outline"
          label="Language"
          value="English (Philippines)"
        />
        <View style={styles.settingDivider} />
        <SettingRow
          icon="help-circle-outline"
          label="Help & feedback"
          onPress={() =>
            Alert.alert(
              'Help & feedback',
              'For this internal preview, share the screen and steps that caused the issue with the Duely beta team. Do not include assignment images or personal information.',
            )
          }
          value="Report a problem safely"
        />
        <View style={styles.settingDivider} />
        <SettingRow
          icon="information-circle-outline"
          label="Duely version"
          value={Constants.expoConfig?.version ?? 'Internal preview'}
        />
      </View>
      </ScreenShell>
      <SubjectManagerModal
        onClose={() => setShowSubjectManager(false)}
        visible={showSubjectManager}
      />
    </>
  );
}

type SettingRowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  onPress?: () => void;
};

function SettingRow({ icon, label, value, onPress }: SettingRowProps) {
  const content = (
    <>
      <View style={styles.settingIcon}>
        <Ionicons
          accessibilityElementsHidden
          color={colors.primary}
          name={icon}
          size={21}
        />
      </View>
      <View style={styles.settingCopy}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingValue}>{value}</Text>
      </View>
      {onPress && (
        <Ionicons
          accessibilityElementsHidden
          color={colors.textMuted}
          name="chevron-forward"
          size={20}
        />
      )}
    </>
  );

  if (!onPress) return <View style={styles.settingRow}>{content}</View>;
  return (
    <Pressable
      accessibilityLabel={`${label}. ${value}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingRow,
        pressed && styles.secondaryActionPressed,
      ]}
    >
      {content}
    </Pressable>
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
  headerCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
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
  scheduleHint: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 19,
  },
  action: { minHeight: minimumTouchTarget, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.primary },
  actionPressed: { backgroundColor: colors.primaryPressed },
  actionDisabled: { opacity: 0.6 },
  actionText: { color: colors.surface, fontFamily: typography.bodyBold, fontSize: 16 },
  secondaryAction: { minHeight: minimumTouchTarget, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  secondaryActionPressed: { backgroundColor: colors.surfaceSubtle },
  secondaryActionText: { color: colors.primary, fontFamily: typography.bodyBold, fontSize: 16 },
  permissionAction: {
    minWidth: 68,
    minHeight: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
  },
  permissionActionText: {
    color: colors.primary,
    fontFamily: typography.bodyBold,
    fontSize: 13,
  },
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
  privacyPanel: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceSubtle },
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
  settingRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  settingIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  settingCopy: { flex: 1, minWidth: 0 },
  settingLabel: {
    color: colors.text,
    fontFamily: typography.bodySemibold,
    fontSize: 16,
  },
  settingValue: {
    marginTop: 2,
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
  },
  settingDivider: { height: 1, backgroundColor: colors.border },
});
