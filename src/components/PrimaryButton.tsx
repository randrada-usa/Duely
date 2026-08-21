import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, minimumTouchTarget, radius, spacing } from '../theme/tokens';

type PrimaryButtonProps = ComponentProps<typeof Pressable> & { label: string };

export function PrimaryButton({ label, disabled, style, ...props }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
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
    minHeight: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  pressed: { backgroundColor: colors.primaryPressed },
  disabled: { opacity: 0.45 },
  label: { color: colors.surface, fontSize: 16, fontWeight: '700' },
});
