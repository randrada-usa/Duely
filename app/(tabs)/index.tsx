import { router } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '../../src/components/EmptyState';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { ScreenShell } from '../../src/components/ScreenShell';
import { TaskCard } from '../../src/components/TaskCard';
import { TaskStorageWarning } from '../../src/components/TaskStorageWarning';
import { sortBySmartPriority } from '../../src/domain/task';
import { useTasks } from '../../src/store/TaskStore';
import { colors, spacing } from '../../src/theme/tokens';

export default function HomeScreen() {
  const { canEditTasks, isHydrated, tasks } = useTasks();
  const openTasks = sortBySmartPriority(tasks).filter(
    (task) => task.status === 'open',
  );

  return (
    <ScreenShell>
      <View style={styles.header}>
        <View>
          <Text accessibilityRole="header" style={styles.title}>
            Good day!
          </Text>
          <Text style={styles.subtitle}>What needs your attention today?</Text>
        </View>
        <PrimaryButton
          disabled={!canEditTasks}
          label="Add task"
          onPress={() => router.push('/task/new')}
        />
      </View>

      <TaskStorageWarning />

      {!isHydrated ? (
        <View accessibilityLabel="Loading tasks" style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading tasks…</Text>
        </View>
      ) : !canEditTasks ? null : openTasks.length === 0 ? (
        <EmptyState
          description="Add a task manually or scan an assignment to let Duely organize it."
          title="You're all caught up"
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={openTasks.slice(0, 5)}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyExtractor={(task) => task.id}
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>Recommended next</Text>
          }
          renderItem={({ item }) => <TaskCard task={item} />}
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.lg, marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 30, fontWeight: '800' },
  subtitle: { marginTop: spacing.xs, color: colors.textMuted, fontSize: 16 },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: { color: colors.textMuted, fontSize: 16 },
  list: { paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  separator: { height: spacing.md },
  sectionTitle: {
    marginBottom: spacing.lg,
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
});
