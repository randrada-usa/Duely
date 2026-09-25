import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { EmptyState } from '../../src/components/EmptyState';
import { ScreenShell } from '../../src/components/ScreenShell';
import { TaskCard } from '../../src/components/TaskCard';
import { TaskStorageWarning } from '../../src/components/TaskStorageWarning';
import { isOverdue, sortBySmartPriority, type Task } from '../../src/domain/task';
import { useAuth } from '../../src/store/AuthStore';
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

function nextTaskSummary(task: Task | undefined) {
  if (!task) return 'Add or scan an assignment to get started.';
  if (!task.dueAt) return `Next up: “${task.title}”`;
  const due = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(task.dueAt));
  return `Next up: “${task.title}” · ${due}`;
}

export default function HomeScreen() {
  const { fontScale, width } = useWindowDimensions();
  const { user } = useAuth();
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

  return (
    <ScreenShell scroll>
      <View style={styles.header}>
        <View style={styles.avatarFrame}>
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel="Due, the Duely mascot"
            source={require('../../assets/mascot.png')}
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
          {openTasks.some((task) => task.dueAt) && <View style={styles.notificationDot} />}
        </Pressable>
      </View>

      <TaskStorageWarning />

      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <Text style={styles.heroEyebrow}>
          {heroCount > 0 ? `${heroCount} NEED ATTENTION` : 'YOU’RE ON TRACK'}
        </Text>
        <View style={styles.heroTitleRow}>
          <View style={styles.heroMascotFrame}>
            <Image source={require('../../assets/mascot.png')} style={styles.heroMascot} />
          </View>
          <Text style={styles.heroTitle}>
            {heroCount === 0
              ? 'No urgent tasks today'
              : `${heroCount} ${heroCount === 1 ? 'task needs' : 'tasks need'} attention`}
          </Text>
        </View>
        <Text style={styles.heroBody}>
          {nextTaskSummary(recommended)}
        </Text>
      </View>

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
  avatar: { width: 50, height: 50, resizeMode: 'contain' },
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
    minHeight: 192,
    overflow: 'hidden',
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
  },
  heroGlow: {
    position: 'absolute',
    right: -32,
    top: -44,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroEyebrow: {
    marginBottom: spacing.sm,
    color: colors.surface,
    fontFamily: typography.bodyBold,
    fontSize: 12,
    letterSpacing: 1.2,
  },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroMascotFrame: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 16,
    backgroundColor: '#DCE2FF',
  },
  heroMascot: { width: 48, height: 48, resizeMode: 'contain' },
  heroTitle: {
    flex: 1,
    color: colors.surface,
    fontFamily: typography.headingStrong,
    fontSize: 26,
    lineHeight: 32,
  },
  heroBody: {
    marginTop: spacing.lg,
    color: colors.surface,
    fontFamily: typography.body,
    fontSize: 16,
    lineHeight: 24,
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
