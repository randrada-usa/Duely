import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import {
  colors,
  minimumTouchTarget,
  radius,
  spacing,
  typography,
} from '../theme/tokens';

type PrimaryButtonProps = ComponentProps<typeof Pressable> & { label: string };

export function PrimaryButton({
  accessibilityState,
  label,
  disabled,
  style,
  ...props
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ ...accessibilityState, disabled: Boolean(disabled) }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style({ pressed }) : style,
      ]}
      {...props}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: Math.max(56, minimumTouchTarget),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    elevation: 2,
  },
  pressed: { backgroundColor: colors.primaryPressed },
  disabled: { opacity: 0.45 },
  label: { color: colors.surface, fontFamily: typography.bodyBold, fontSize: 16, textAlign: 'center' },
});
