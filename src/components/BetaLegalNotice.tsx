import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '../theme/tokens';

export type LegalSection = {
  heading: string;
  body: string;
};

export function BetaLegalNotice({
  introduction,
  sections,
  title,
}: {
  introduction: string;
  sections: LegalSection[];
  title: string;
}) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.draftBadge}>
        <Text style={styles.draftBadgeText}>BETA DRAFT</Text>
      </View>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.updated}>Last updated September 28, 2026</Text>
      <Text style={styles.introduction}>{introduction}</Text>

      {sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text accessibilityRole="header" style={styles.heading}>{section.heading}</Text>
          <Text style={styles.body}>{section.body}</Text>
        </View>
      ))}

      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          This is a plain-language notice for the Duely beta and competition demo. It will be reviewed and replaced with final published terms before a public release.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, backgroundColor: colors.background },
  draftBadge: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  draftBadgeText: { color: colors.primary, fontFamily: typography.bodyBold, fontSize: 12, letterSpacing: 1 },
  title: { color: colors.text, fontFamily: typography.headingStrong, fontSize: 30, lineHeight: 36 },
  updated: { marginTop: spacing.xs, color: colors.textMuted, fontFamily: typography.body, fontSize: 13 },
  introduction: { marginTop: spacing.xl, color: colors.text, fontFamily: typography.body, fontSize: 16, lineHeight: 24 },
  section: { marginTop: spacing.xl, gap: spacing.sm },
  heading: { color: colors.text, fontFamily: typography.heading, fontSize: 19, lineHeight: 25 },
  body: { color: colors.textMuted, fontFamily: typography.body, fontSize: 16, lineHeight: 25 },
  notice: { marginTop: spacing.xxl, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  noticeText: { color: colors.text, fontFamily: typography.bodyMedium, fontSize: 14, lineHeight: 21 },
});
