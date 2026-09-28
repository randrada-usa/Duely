import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  colors,
  minimumTouchTarget,
  radius,
  spacing,
  typography,
} from '../theme/tokens';

type DuelyDialogProps = {
  cancelLabel?: string;
  confirmLabel: string;
  destructive?: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  visible: boolean;
};

export function DuelyDialog({
  cancelLabel = 'Cancel',
  confirmLabel,
  destructive = false,
  message,
  onCancel,
  onConfirm,
  title,
  visible,
}: DuelyDialogProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <SafeAreaView style={styles.overlay}>
        <View
          accessibilityViewIsModal
          accessible
          style={styles.dialog}
        >
          <View
            accessibilityElementsHidden
            style={[
              styles.icon,
              destructive ? styles.dangerIcon : styles.primaryIcon,
            ]}
          >
            <Ionicons
              color={destructive ? colors.danger : colors.primary}
              name={destructive ? 'trash-outline' : 'help-circle-outline'}
              size={28}
            />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [
                styles.action,
                styles.cancel,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.action,
                destructive ? styles.dangerAction : styles.primaryAction,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: 'rgba(30, 32, 54, 0.48)',
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    elevation: 12,
  },
  icon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  primaryIcon: { backgroundColor: colors.primarySoft },
  dangerIcon: { backgroundColor: colors.dangerSoft },
  title: {
    color: colors.text,
    fontFamily: typography.headingStrong,
    fontSize: 22,
    textAlign: 'center',
  },
  message: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  action: {
    flex: 1,
    minHeight: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  cancel: { backgroundColor: colors.surfaceSubtle },
  primaryAction: { backgroundColor: colors.primary },
  dangerAction: { backgroundColor: colors.danger },
  cancelText: {
    color: colors.primary,
    fontFamily: typography.bodyBold,
    fontSize: 15,
    textAlign: 'center',
  },
  confirmText: {
    color: colors.surface,
    fontFamily: typography.bodyBold,
    fontSize: 15,
    textAlign: 'center',
  },
  pressed: { opacity: 0.7 },
});
