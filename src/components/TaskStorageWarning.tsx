import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTasks } from '../store/TaskStore';
import { colors, minimumTouchTarget, radius, spacing } from '../theme/tokens';

export function TaskStorageWarning() {
  const {
    canResetLocalData,
    isResettingLocalData,
    resetLocalData,
    storageError,
  } = useTasks();

  if (!storageError) return null;

  function confirmReset() {
    Alert.alert(
      'Reset local data?',
      'This permanently deletes all tasks and subjects stored on this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            void resetLocalData();
          },
        },
      ],
    );
  }

  return (
    <View style={styles.warning}>
      <Text
        accessibilityLabel={`Local storage needs attention. ${storageError}`}
        accessibilityRole="alert"
        style={styles.title}
      >
        Local storage needs attention
      </Text>
      <Text style={styles.message}>{storageError}</Text>
      {canResetLocalData && (
        <>
          <Text style={styles.recoveryNote}>
            Reset only if you accept permanently deleting the unreadable local
            task data from this device.
          </Text>
          <Pressable
            accessibilityHint="Permanently deletes local tasks and subjects after confirmation"
            accessibilityRole="button"
            accessibilityState={{ disabled: isResettingLocalData }}
            disabled={isResettingLocalData}
            onPress={confirmReset}
            style={({ pressed }) => [
              styles.resetButton,
              pressed && styles.pressed,
              isResettingLocalData && styles.disabled,
            ]}
          >
            <Text style={styles.resetText}>
              {isResettingLocalData ? 'Resetting…' : 'Reset local data'}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  warning: {
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  title: { color: colors.danger, fontSize: 16, fontWeight: '800' },
  message: { color: colors.text, fontSize: 15, lineHeight: 21 },
  recoveryNote: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  resetButton: {
    minHeight: minimumTouchTarget,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  resetText: { color: colors.danger, fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.45 },
});
