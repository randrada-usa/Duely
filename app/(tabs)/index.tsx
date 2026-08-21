import { router } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../src/components/EmptyState';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { ScreenShell } from '../../src/components/ScreenShell';
import { TaskCard } from '../../src/components/TaskCard';
import { sortBySmartPriority } from '../../src/domain/task';
import { useTasks } from '../../src/store/TaskStore';
import { colors, spacing } from '../../src/theme/tokens';

export default function HomeScreen() {
  const { tasks } = useTasks();
  const openTasks = sortBySmartPriority(tasks).filter((task) => task.status === 'open');
  return <ScreenShell>
    <View style={styles.header}><View><Text style={styles.title}>Good day!</Text><Text style={styles.subtitle}>What needs your attention today?</Text></View><PrimaryButton label="Add task" onPress={() => router.push('/task/new')} /></View>
    {openTasks.length === 0 ? <EmptyState title="You're all caught up" description="Add a task manually or scan an assignment to let Duely organize it." /> : <FlatList contentContainerStyle={styles.list} data={openTasks.slice(0, 5)} ItemSeparatorComponent={() => <View style={styles.separator} />} keyExtractor={(task) => task.id} ListHeaderComponent={<Text style={styles.sectionTitle}>Recommended next</Text>} renderItem={({ item }) => <TaskCard task={item} />} />}
  </ScreenShell>;
}
const styles = StyleSheet.create({ header: { gap: spacing.lg }, title: { color: colors.text, fontSize: 30, fontWeight: '800' }, subtitle: { color: colors.textMuted, fontSize: 16, marginTop: spacing.xs }, list: { paddingTop: spacing.xl, paddingBottom: spacing.xxl }, separator: { height: spacing.md }, sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: spacing.lg } });
