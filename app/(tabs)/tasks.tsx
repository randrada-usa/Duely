import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { EmptyState } from '../../src/components/EmptyState';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { ScreenShell } from '../../src/components/ScreenShell';
import { TaskCard } from '../../src/components/TaskCard';
import { sortBySmartPriority } from '../../src/domain/task';
import { useTasks } from '../../src/store/TaskStore';
import { colors, minimumTouchTarget, radius, spacing } from '../../src/theme/tokens';

export default function TasksScreen() {
  const { tasks } = useTasks(); const [query, setQuery] = useState('');
  const visibleTasks = useMemo(() => { const normalized = query.trim().toLocaleLowerCase(); return sortBySmartPriority(tasks).filter((task) => [task.title, task.subject, task.notes].some((value) => value.toLocaleLowerCase().includes(normalized))); }, [query, tasks]);
  return <ScreenShell>
    <Text style={styles.title}>Tasks</Text><Text style={styles.subtitle}>Everything you need, easy to find.</Text>
    <TextInput accessibilityLabel="Search tasks" autoCapitalize="none" onChangeText={setQuery} placeholder="Search title, subject, or notes" placeholderTextColor={colors.textMuted} style={styles.search} value={query} />
    <PrimaryButton label="Add task" onPress={() => router.push('/task/new')} />
    {visibleTasks.length === 0 ? <EmptyState title={tasks.length === 0 ? 'No tasks yet' : 'No matching tasks'} description={tasks.length === 0 ? 'Create your first task or scan an assignment.' : 'Try a different word or clear your search.'} /> : <FlatList contentContainerStyle={styles.list} data={visibleTasks} ItemSeparatorComponent={() => <View style={styles.separator} />} keyExtractor={(task) => task.id} keyboardShouldPersistTaps="handled" renderItem={({ item }) => <TaskCard task={item} />} />}
  </ScreenShell>;
}
const styles = StyleSheet.create({ title: { color: colors.text, fontSize: 30, fontWeight: '800' }, subtitle: { color: colors.textMuted, fontSize: 16, marginTop: spacing.xs }, search: { minHeight: minimumTouchTarget, marginVertical: spacing.lg, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, color: colors.text, fontSize: 16 }, list: { paddingTop: spacing.lg, paddingBottom: spacing.xxl }, separator: { height: spacing.md } });
