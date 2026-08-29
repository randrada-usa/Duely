import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme/tokens';

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <View
      accessibilityLabel={`${title}. ${description}`}
      accessibilityRole="summary"
      style={styles.container}
    >
      <Image
        accessibilityIgnoresInvertColors
        accessibilityElementsHidden
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
    fontFamily: typography.heading,
    fontSize: 24,
    textAlign: 'center',
  },
  description: {
    maxWidth: 300,
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
});
