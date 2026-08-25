import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme/tokens';

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <View accessibilityRole="summary" style={styles.container}>
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel="Duely mascot"
        source={require('../../assets/mascot.png')}
        style={styles.mascot}
      />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingBottom: 80,
  },
  mascot: {
    width: 112,
    height: 112,
    resizeMode: 'contain',
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    maxWidth: 300,
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
});
