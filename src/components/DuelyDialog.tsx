import { Ionicons } from '@expo/vector-icons';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
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
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  tone?: DuelyDialogTone;
  title: string;
  visible: boolean;
};

export type DuelyDialogTone =
  | 'default'
  | 'destructive'
  | 'info'
  | 'permission';

export type DuelyDialogRequest = {
  cancelLabel?: string;
  confirmLabel?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  message: string;
  onCancel?: () => void;
  onConfirm?: () => void;
  title: string;
  tone?: DuelyDialogTone;
};

export function DuelyDialog({
  cancelLabel = 'Cancel',
  confirmLabel,
  destructive = false,
  icon,
  message,
  onCancel,
  onConfirm,
  tone = destructive ? 'destructive' : 'default',
  title,
  visible,
}: DuelyDialogProps) {
  const isDestructive = destructive || tone === 'destructive';
  const iconName =
    icon ??
    (isDestructive
      ? 'trash-outline'
      : tone === 'permission'
        ? 'shield-checkmark-outline'
        : tone === 'info'
          ? 'information-circle-outline'
          : 'help-circle-outline');

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
              isDestructive ? styles.dangerIcon : styles.primaryIcon,
            ]}
          >
            <Ionicons
              color={isDestructive ? colors.danger : colors.primary}
              name={iconName}
              size={28}
            />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            {!!cancelLabel && (
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
            )}
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.action,
                isDestructive ? styles.dangerAction : styles.primaryAction,
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

type DuelyDialogContextValue = {
  showDialog: (request: DuelyDialogRequest) => void;
};

const DuelyDialogContext = createContext<DuelyDialogContextValue | null>(null);

export function DuelyDialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<DuelyDialogRequest | null>(null);
  const showDialog = useCallback((next: DuelyDialogRequest) => {
    setRequest(next);
  }, []);
  const value = useMemo(() => ({ showDialog }), [showDialog]);

  function cancel() {
    const callback = request?.onCancel;
    setRequest(null);
    callback?.();
  }

  function confirm() {
    const callback = request?.onConfirm;
    setRequest(null);
    callback?.();
  }

  return (
    <DuelyDialogContext.Provider value={value}>
      {children}
      <DuelyDialog
        cancelLabel={request?.cancelLabel ?? ''}
        confirmLabel={request?.confirmLabel ?? 'Got it'}
        icon={request?.icon}
        message={request?.message ?? ''}
        onCancel={cancel}
        onConfirm={confirm}
        title={request?.title ?? ''}
        tone={request?.tone}
        visible={request !== null}
      />
    </DuelyDialogContext.Provider>
  );
}

export function useDuelyDialog() {
  const context = useContext(DuelyDialogContext);
  if (!context) {
    throw new Error('useDuelyDialog must be used within DuelyDialogProvider.');
  }
  return context;
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
