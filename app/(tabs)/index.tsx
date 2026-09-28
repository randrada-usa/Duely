import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AccountAvatar } from '../../src/components/AccountAvatar';
import { EmptyState } from '../../src/components/EmptyState';
import { ScreenShell } from '../../src/components/ScreenShell';
import { TaskCard } from '../../src/components/TaskCard';
import { TaskStorageWarning } from '../../src/components/TaskStorageWarning';
import {
  homeHeroDeadline,
  homeHeroEmptyMessage,
  homeHeroEyebrow,
  homeHeroTitle,
} from '../../src/domain/homeHero';
import { isOverdue, sortBySmartPriority, type Task } from '../../src/domain/task';
import { useAuth } from '../../src/store/AuthStore';
import { useNotificationStore } from '../../src/store/NotificationStore';
import { useTasks } from '../../src/store/TaskStore';
import {
  colors,
  minimumTouchTarget,
  radius,
  spacing,
  surfaces,
  typography,
} from '../../src/theme/tokens';

type HomeView = 'today' | 'upcoming';

function isSameLocalDay(value: string, reference: Date) {
  const date = new Date(value);
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

function displayName(metadata: Record<string, unknown> | undefined) {
  const candidate = metadata?.full_name ?? metadata?.name;
  if (typeof candidate !== 'string' || !candidate.trim()) return null;
  return candidate
    .trim()
    .split(/\s+/)
    .map((part) => `${part.charAt(0).toLocaleUpperCase()}${part.slice(1).toLocaleLowerCase()}`)
    .join(' ');
}

function nextTaskSummary(task: Task | undefined, hasTaskHistory: boolean) {
  if (!task) return homeHeroEmptyMessage(hasTaskHistory);
  return `Next up: “${task.title}”. ${homeHeroDeadline(task.dueAt)}`;
}

export default function HomeScreen() {
  const { fontScale, width } = useWindowDimensions();
  const { user } = useAuth();
  const { isReady: notificationsReady, isUnread } = useNotificationStore();
  const { canEditTasks, isHydrated, tasks } = useTasks();
  const [view, setView] = useState<HomeView>('today');
  const now = new Date();
  const name = displayName(user?.user_metadata);
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(now);
  const openTasks = sortBySmartPriority(tasks).filter((task) => task.status === 'open');
  const overdueTasks = openTasks.filter((task) => isOverdue(task, now));
  const todayTasks = openTasks.filter(
    (task) => task.dueAt && isSameLocalDay(task.dueAt, now) && !isOverdue(task, now),
  );
  const upcomingTasks = openTasks.filter(
    (task) => task.dueAt && !isSameLocalDay(task.dueAt, now) && !isOverdue(task, now),
  );

  const visibleTasks = view === 'today' ? [...overdueTasks, ...todayTasks] : upcomingTasks;
  const recommended = openTasks[0];
  const heroCount = overdueTasks.length + todayTasks.length;
  const heroTitle = homeHeroTitle(overdueTasks.length, todayTasks.length);
  const compactHero = fontScale >= 1.15 || width < 380;
  const hasUnreadNotices =
    notificationsReady &&
    openTasks.some((task) => task.dueAt && isUnread(task));

  return (
    <ScreenShell scroll>
      <View style={styles.header}>
        <View style={styles.avatarFrame}>
          <AccountAvatar
            displayName={name}
            metadata={user?.user_metadata}
            signedIn={!!user}
            style={styles.avatar}
          />
        </View>
        <View style={styles.greeting}>
          <Text style={styles.eyebrow}>WELCOME BACK · {dateLabel.toUpperCase()}</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {name ?? 'Good day!'}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Notifications"
          accessibilityRole="button"
          onPress={() => router.push('/(tabs)/notifications')}
          style={({ pressed }) => [
            styles.headerAction,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
          {hasUnreadNotices && <View style={styles.notificationDot} />}
        </Pressable>
      </View>

      <TaskStorageWarning />

      <Pressable
        accessibilityHint={recommended ? 'Opens your next task' : undefined}
        accessibilityLabel={`${heroTitle}. ${nextTaskSummary(recommended, tasks.length > 0)}`}
        accessibilityRole={recommended ? 'button' : undefined}
        disabled={!recommended}
        onPress={recommended ? () => router.push(`/task/${recommended.id}`) : undefined}
        style={({ pressed }) => [styles.hero, pressed && styles.heroPressed]}
      >
        <ImageBackground
          imageStyle={styles.heroImage}
          resizeMode="cover"
          source={require('../../assets/home-attention-banner.png')}
          style={styles.heroBackground}
        >
          <View style={[styles.heroCopy, compactHero && styles.heroCopyCompact]}>
            <View style={styles.heroEyebrowPill}>
              <Ionicons
                accessibilityElementsHidden
                color={colors.surface}
                name={heroCount > 0 ? 'alert-circle' : 'checkmark-circle'}
                size={14}
              />
              <Text style={styles.heroEyebrow}>
                {homeHeroEyebrow(heroCount)}
              </Text>
            </View>
            <Text style={[styles.heroTitle, compactHero && styles.heroTitleCompact]}>
              {heroTitle}
            </Text>
          </View>
          <View style={[styles.heroFooter, compactHero && styles.heroFooterCompact]}>
            <View style={styles.heroDetails}>
              {recommended ? (
                <>
                  <Text ellipsizeMode="tail" numberOfLines={2} style={styles.heroTaskTitle}>
                    Next up: “{recommended.title}”
                  </Text>
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                    numberOfLines={1}
                    style={styles.heroDeadline}
                  >
                    {homeHeroDeadline(recommended.dueAt)}
                  </Text>
                </>
              ) : (
                <Text style={styles.heroEmptyMessage}>
                  {homeHeroEmptyMessage(tasks.length > 0)}
                </Text>
              )}
            </View>
            {recommended && (
              <View style={styles.heroLink}>
                <Text style={styles.heroLinkText}>View task</Text>
                <Ionicons
                  accessibilityElementsHidden
                  color={colors.surface}
                  name="arrow-forward"
                  size={14}
                />
              </View>
            )}
          </View>
        </ImageBackground>
      </Pressable>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Active tasks</Text>
          <Text style={styles.statValue}>{openTasks.length}</Text>
          <Text style={styles.statHint}>Across all subjects</Text>
        </View>
        <View style={[styles.statCard, overdueTasks.length > 0 && styles.alertStatCard]}>
          <Text style={styles.statLabel}>Overdue</Text>
          <Text style={[styles.statValue, overdueTasks.length > 0 && styles.alertStatValue]}>
            {overdueTasks.length}
          </Text>
          <Text style={styles.statHint}>
            {overdueTasks.length > 0 ? 'Review these first' : 'Nothing missed'}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityHint="Opens the camera and gallery scan options"
        accessibilityLabel="Scan an assignment"
        accessibilityRole="button"
        onPress={() => router.push('/(tabs)/scan')}
        style={({ pressed }) => [styles.scanCard, pressed && styles.pressed]}
      >
        <View style={styles.scanIcon}>
          <Ionicons
            accessibilityElementsHidden
            name="camera-outline"
            size={24}
            color={colors.surface}
          />
        </View>
        <View style={styles.scanCopy}>
          <Text style={styles.scanTitle}>Scan an assignment</Text>
          <Text style={styles.scanBody}>Turn one clear image into an editable task.</Text>
        </View>
        <Ionicons
          accessibilityElementsHidden
          name="chevron-forward"
          size={20}
          color={colors.primary}
        />
      </Pressable>

      <View
        style={[
          styles.sectionHeader,
          (fontScale >= 1.2 || width < 430) && styles.sectionHeaderLargeText,
        ]}
      >
        <Text style={styles.sectionTitle}>Today's schedule</Text>
        <View accessibilityRole="tablist" style={styles.segmentedControl}>
          {(['today', 'upcoming'] as const).map((option) => {
            const selected = view === option;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                key={option}
                onPress={() => setView(option)}
                style={[
                  styles.segment,
                  (fontScale >= 1.2 || width < 430) && styles.segmentLargeText,
                  selected && styles.segmentSelected,
                ]}
              >
                <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                  {option === 'today' ? 'Today' : 'Upcoming'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {!isHydrated ? (
        <View
          accessibilityLabel="Loading tasks"
          accessibilityRole="progressbar"
          style={styles.loading}
        >
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading tasks…</Text>
        </View>
      ) : !canEditTasks ? null : visibleTasks.length === 0 ? (
        <EmptyState
          description={
            view === 'today'
              ? 'Nothing needs attention today. Check Upcoming or add a task.'
              : 'Tasks with future deadlines will appear here.'
          }
          title={view === 'today' ? "You're all caught up" : 'No upcoming tasks'}
        />
      ) : (
        <View style={styles.list}>
          {visibleTasks.slice(0, 5).map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatarFrame: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 28,
    backgroundColor: colors.primaryFaint,
  },
  avatar: { width: 56, height: 56 },
  greeting: { flex: 1, minWidth: 0 },
  eyebrow: {
    color: colors.textMuted,
    fontFamily: typography.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  title: { color: colors.text, fontFamily: typography.headingStrong, fontSize: 24 },
  headerAction: {
    width: minimumTouchTarget,
    height: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: minimumTouchTarget / 2,
    backgroundColor: colors.surface,
    elevation: 2,
  },
  notificationDot: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 8,
    height: 8,
    borderWidth: 1,
    borderColor: colors.surface,
    borderRadius: 4,
    backgroundColor: colors.warning,
  },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.45 },
  hero: {
    minHeight: 208,
    overflow: 'hidden',
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    elevation: 3,
  },
  heroPressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
  heroBackground: { minHeight: 208 },
  heroImage: { borderRadius: radius.xl },
  heroCopy: {
    width: '60%',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingTop: spacing.lg,
  },
  heroCopyCompact: { width: '62%', paddingLeft: spacing.md },
  heroEyebrowPill: {
    alignSelf: 'flex-start',
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: 'rgba(10, 20, 91, 0.58)',
  },
  heroEyebrow: {
    color: colors.surface,
    fontFamily: typography.bodyBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: colors.surface,
    fontFamily: typography.headingStrong,
    fontSize: 24,
    lineHeight: 28,
    textShadowColor: 'rgba(2, 10, 54, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroTitleCompact: { fontSize: 21, lineHeight: 25 },
  heroFooter: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    left: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heroFooterCompact: { right: spacing.md, bottom: spacing.md, left: spacing.md },
  heroDetails: {
    flex: 1,
    maxWidth: '62%',
    gap: spacing.xs,
  },
  heroTaskTitle: {
    color: colors.surface,
    fontFamily: typography.bodyMedium,
    fontSize: 15,
    lineHeight: 19,
    textShadowColor: 'rgba(2, 10, 54, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroDeadline: {
    color: '#F0F2FF',
    fontFamily: typography.bodySemibold,
    fontSize: 14,
    lineHeight: 18,
    textShadowColor: 'rgba(2, 10, 54, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroEmptyMessage: {
    color: '#F0F2FF',
    fontFamily: typography.bodyMedium,
    fontSize: 15,
    lineHeight: 20,
    textShadowColor: 'rgba(2, 10, 54, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroLink: {
    flexShrink: 0,
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: 'rgba(8, 15, 70, 0.4)',
  },
  heroLinkText: {
    color: colors.surface,
    fontFamily: typography.bodyBold,
    fontSize: 14,
  },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statCard: {
    ...surfaces.card,
    flex: 1,
    minHeight: 112,
    padding: spacing.lg,
  },
  alertStatCard: { borderColor: '#FFD4D8', backgroundColor: '#FFF9F9' },
  statLabel: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13 },
  statValue: {
    marginTop: 2,
    color: colors.primary,
    fontFamily: typography.headingStrong,
    fontSize: 31,
    lineHeight: 36,
  },
  alertStatValue: { color: colors.danger },
  statHint: { color: colors.textMuted, fontFamily: typography.body, fontSize: 12 },
  scanCard: {
    ...surfaces.card,
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  scanIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.primary,
  },
  scanCopy: { flex: 1, gap: 2 },
  scanTitle: { color: colors.text, fontFamily: typography.bodyBold, fontSize: 16 },
  scanBody: { color: colors.textMuted, fontFamily: typography.body, fontSize: 14, lineHeight: 21 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionHeaderLargeText: {
    alignItems: 'stretch',
    flexDirection: 'column',
  },
  sectionTitle: { color: colors.text, fontFamily: typography.headingStrong, fontSize: 20 },
  segmentedControl: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
  },
  segment: {
    minHeight: minimumTouchTarget,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  segmentLargeText: { flex: 1 },
  segmentSelected: { backgroundColor: colors.primary },
  segmentText: { color: colors.textMuted, fontFamily: typography.bodySemibold, fontSize: 14 },
  segmentTextSelected: { color: colors.surface },
  loading: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 15 },
  list: { gap: spacing.md, paddingBottom: spacing.lg },
});
