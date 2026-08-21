import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EmptyState } from '../../src/components/EmptyState';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { ScreenShell } from '../../src/components/ScreenShell';
import { SubjectManagerModal } from '../../src/components/SubjectManagerModal';
import { TaskCard } from '../../src/components/TaskCard';
import { subjectNameForId } from '../../src/domain/subject';
import { sortBySmartPriority, taskTypeLabel } from '../../src/domain/task';
import { useTasks } from '../../src/store/TaskStore';
import {
  colors,
  minimumTouchTarget,
  radius,
  spacing,
} from '../../src/theme/tokens';

const ALL_SUBJECTS = 'all';
const UNASSIGNED_SUBJECTS = 'unassigned';

export default function TasksScreen() {
  const { isHydrated, storageError, subjects, tasks } = useTasks();
  const [query, setQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState(ALL_SUBJECTS);
  const [showSubjectManager, setShowSubjectManager] = useState(false);

  useEffect(() => {
    if (
      subjectFilter !== ALL_SUBJECTS &&
      subjectFilter !== UNASSIGNED_SUBJECTS &&
      !subjects.some((subject) => subject.id === subjectFilter)
    ) {
      setSubjectFilter(ALL_SUBJECTS);
    }
  }, [subjectFilter, subjects]);

  const visibleTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return sortBySmartPriority(tasks).filter((task) => {
      const matchesSubject =
        subjectFilter === ALL_SUBJECTS ||
        (subjectFilter === UNASSIGNED_SUBJECTS
          ? task.subjectId === null
          : task.subjectId === subjectFilter);
      if (!matchesSubject) return false;

      const subjectName = subjectNameForId(subjects, task.subjectId);
      return [task.title, subjectName, task.notes, taskTypeLabel(task.taskType)].some(
        (value) => value.toLocaleLowerCase().includes(normalizedQuery),
      );
    });
  }, [query, subjectFilter, subjects, tasks]);

  const filtered = query.trim().length > 0 || subjectFilter !== ALL_SUBJECTS;

  return (
    <>
      <ScreenShell>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Tasks
          </Text>
          <Text style={styles.subtitle}>Everything you need, easy to find.</Text>
        </View>

        {!!storageError && (
          <View accessibilityRole="alert" style={styles.storageWarning}>
            <Text style={styles.storageWarningTitle}>Local storage needs attention</Text>
            <Text style={styles.storageWarningText}>{storageError}</Text>
          </View>
        )}

        <TextInput
          accessibilityLabel="Search tasks"
          autoCapitalize="none"
          onChangeText={setQuery}
          placeholder="Search title, subject, notes, or type"
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          value={query}
        />

        <PrimaryButton label="Add task" onPress={() => router.push('/task/new')} />

        <View style={styles.subjectHeader}>
          <View style={styles.subjectHeaderCopy}>
            <Text style={styles.sectionTitle}>Subjects</Text>
            <Text style={styles.sectionDescription}>
              Filter tasks by one collection.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowSubjectManager(true)}
            style={({ pressed }) => [
              styles.manageButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.manageButtonText}>Manage</Text>
          </Pressable>
        </View>

        <ScrollView
          accessibilityRole="radiogroup"
          contentContainerStyle={styles.subjectFilters}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.subjectFilterScroller}
        >
          <SubjectFilterChip
            label="All"
            onPress={() => setSubjectFilter(ALL_SUBJECTS)}
            selected={subjectFilter === ALL_SUBJECTS}
          />
          <SubjectFilterChip
            label="Unassigned"
            onPress={() => setSubjectFilter(UNASSIGNED_SUBJECTS)}
            selected={subjectFilter === UNASSIGNED_SUBJECTS}
          />
          {subjects.map((subject) => (
            <SubjectFilterChip
              key={subject.id}
              label={subject.name}
              onPress={() => setSubjectFilter(subject.id)}
              selected={subjectFilter === subject.id}
            />
          ))}
        </ScrollView>

        {!isHydrated ? (
          <View accessibilityLabel="Loading tasks" style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading tasks…</Text>
          </View>
        ) : visibleTasks.length === 0 ? (
          <EmptyState
            description={
              tasks.length === 0
                ? 'Create your first task or scan an assignment.'
                : 'Try another search or subject.'
            }
            title={
              tasks.length === 0
                ? 'No tasks yet'
                : filtered
                  ? 'No matching tasks'
                  : 'No tasks yet'
            }
          />
        ) : (
          <FlatList
            contentContainerStyle={styles.list}
            data={visibleTasks}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            keyExtractor={(task) => task.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => <TaskCard task={item} />}
          />
        )}
      </ScreenShell>

      <SubjectManagerModal
        onClose={() => setShowSubjectManager(false)}
        visible={showSubjectManager}
      />
    </>
  );
}

type SubjectFilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function SubjectFilterChip({
  label,
  selected,
  onPress,
}: SubjectFilterChipProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.subjectChip, selected && styles.subjectChipSelected]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.subjectChipText,
          selected && styles.subjectChipTextSelected,
        ]}
      >
        {selected ? '✓ ' : ''}
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: spacing.md },
  title: { color: colors.text, fontSize: 30, fontWeight: '800' },
  subtitle: { marginTop: spacing.xs, color: colors.textMuted, fontSize: 16 },
  storageWarning: {
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  storageWarningTitle: { color: colors.danger, fontSize: 14, fontWeight: '800' },
  storageWarningText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  search: {
    minHeight: minimumTouchTarget,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 16,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  subjectHeaderCopy: { flex: 1 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  sectionDescription: { marginTop: 2, color: colors.textMuted, fontSize: 13 },
  manageButton: {
    minHeight: minimumTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
  },
  manageButtonText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  subjectFilters: { gap: spacing.sm, paddingVertical: spacing.md },
  subjectFilterScroller: { flexGrow: 0 },
  subjectChip: {
    minHeight: minimumTouchTarget,
    maxWidth: 220,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  subjectChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  subjectChipText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  subjectChipTextSelected: { color: colors.surface },
  list: { paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  separator: { height: spacing.md },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: { color: colors.textMuted, fontSize: 16 },
  pressed: { opacity: 0.65 },
});
