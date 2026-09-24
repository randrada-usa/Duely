import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  minimumTouchTarget,
  radius,
  spacing,
  typography,
} from '../theme/tokens';

type TaskEditorHeroProps = {
  description: string;
  eyebrow: string;
  imageUri?: string;
  onBack?: () => void;
  title: string;
  variant?: 'dark' | 'light';
};

export function TaskEditorHero({
  description,
  eyebrow,
  imageUri,
  onBack,
  title,
  variant = 'dark',
}: TaskEditorHeroProps) {
  const light = variant === 'light';

  return (
    <View style={[styles.hero, light && styles.heroLight]}>
      <View style={styles.topRow}>
        {onBack && (
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => [
              styles.backButton,
              light && styles.backButtonLight,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              accessibilityElementsHidden
              color={light ? colors.text : colors.surface}
              name="chevron-back"
              size={22}
            />
          </Pressable>
        )}
        <View style={[styles.badge, light && styles.badgeLight]}>
          <Ionicons
            accessibilityElementsHidden
            color={light ? colors.primary : '#D4D9FF'}
            name={imageUri ? 'camera-outline' : 'create-outline'}
            size={15}
          />
          <Text style={[styles.eyebrow, light && styles.eyebrowLight]}>
            {eyebrow}
          </Text>
        </View>
      </View>

      <View style={styles.titleRow}>
        {imageUri && (
          <Image
            accessibilityLabel="Source assignment image preview"
            resizeMode="cover"
            source={{ uri: imageUri }}
            style={styles.preview}
          />
        )}
        <View style={styles.copy}>
          <Text
            accessibilityRole="header"
            style={[styles.title, light && styles.titleLight]}
          >
            {title}
          </Text>
          <Text style={[styles.description, light && styles.descriptionLight]}>
            {description}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.md,
    padding: spacing.xl,
    overflow: 'hidden',
    borderRadius: radius.xl,
    backgroundColor: colors.navy,
  },
  heroLight: {
    backgroundColor: colors.surface,
  },
  topRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    width: minimumTouchTarget,
    height: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: -7,
    borderRadius: radius.full,
    backgroundColor: '#15172B',
  },
  backButtonLight: { backgroundColor: colors.primarySoft },
  badge: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: '#15172B',
  },
  eyebrow: {
    color: '#D4D9FF',
    fontFamily: typography.bodyBold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  badgeLight: { backgroundColor: colors.primarySoft },
  eyebrowLight: { color: colors.primary },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  preview: {
    width: 66,
    height: 66,
    borderWidth: 1,
    borderColor: '#4B5273',
    borderRadius: radius.md,
    backgroundColor: '#10101F',
  },
  copy: { flex: 1 },
  title: {
    color: colors.surface,
    fontFamily: typography.headingStrong,
    fontSize: 24,
    lineHeight: 30,
  },
  titleLight: { color: colors.text },
  description: {
    marginTop: spacing.xs,
    color: '#CDD3FF',
    fontFamily: typography.body,
    fontSize: 16,
    lineHeight: 23,
  },
  descriptionLight: { color: colors.textMuted },
  pressed: { opacity: 0.7 },
});
