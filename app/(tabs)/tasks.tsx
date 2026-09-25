import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EmptyState } from '../../src/components/EmptyState';
import { ScreenShell } from '../../src/components/ScreenShell';
import { TaskCard } from '../../src/components/TaskCard';
import { TaskStorageWarning } from '../../src/components/TaskStorageWarning';
import { TaskViewOptionsModal } from '../../src/components/TaskViewOptionsModal';
import {
  ALL_SUBJECTS,
  DEFAULT_TASK_QUERY,
  TASK_GROUPING_OPTIONS,
  TASK_SORT_OPTIONS,
  TASK_STATE_FILTER_OPTIONS,
  taskSections,
  UNASSIGNED_SUBJECTS,
  type TaskQuery,
} from '../../src/domain/taskQuery';
import { useTasks } from '../../src/store/TaskStore';
import {
  colors,
  minimumTouchTarget,
  radius,
  spacing,
  typography,
} from '../../src/theme/tokens';

export default function TasksScreen() {
  const { canEditTasks, isHydrated, subjects, tasks } = useTasks();
  const [taskQuery, setTaskQuery] = useState<TaskQuery>(DEFAULT_TASK_QUERY);
  const [showViewOptions, setShowViewOptions] = useState(false);

  useEffect(() => {
    if (
      taskQuery.subject !== ALL_SUBJECTS &&
      taskQuery.subject !== UNASSIGNED_SUBJECTS &&
      !subjects.some((subject) => subject.id === taskQuery.subject)
    ) {
      setTaskQuery((current) => ({ ...current, subject: ALL_SUBJECTS }));
    }
  }, [subjects, taskQuery.subject]);

  const sections = useMemo(
    () => taskSections(tasks, subjects, taskQuery),
    [subjects, taskQuery, tasks],
  );
  const visibleTaskCount = useMemo(
    () => sections.reduce((count, section) => count + section.data.length, 0),
    [sections],
  );
  const activeOptionCount = Number(taskQuery.state === 'overdue') +
    Number(taskQuery.noDeadline) + Number(taskQuery.subject !== ALL_SUBJECTS) +
    Number(taskQuery.taskType !== null) + Number(taskQuery.priority !== null) +
    Number(taskQuery.sort !== 'smart') + Number(taskQuery.grouping !== 'none');

  const sortLabel =
    TASK_SORT_OPTIONS.find((option) => option.value === taskQuery.sort)?.label ??
    'Smart priority';
  const groupingLabel =
    TASK_GROUPING_OPTIONS.find(
      (option) => option.value === taskQuery.grouping,
    )?.label ?? 'None';
  function updateQuery(patch: Partial<TaskQuery>) {
    setTaskQuery((current) => ({ ...current, ...patch }));
  }


  return (
    <>
      <ScreenShell>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Tasks
          </Text>
          <Pressable
            accessibilityLabel="Add task"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canEditTasks }}
            disabled={!canEditTasks}
            onPress={() => router.push('/task/new')}
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.pressed,
              !canEditTasks && styles.disabled,
            ]}
          >
            <Ionicons
              accessibilityElementsHidden
              name="add"
              size={19}
              color={colors.surface}
            />
            <Text style={styles.addButtonText}>Add task</Text>
          </Pressable>
        </View>

        <TaskStorageWarning />

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons
              accessibilityElementsHidden
              name="search-outline"
              size={20}
              color={colors.textMuted}
            />
            <TextInput
              accessibilityLabel="Search tasks"
              autoCapitalize="none"
              onChangeText={(search) => updateQuery({ search })}
              placeholder="Search tasks"
              placeholderTextColor={colors.textSubtle}
              style={styles.search}
              value={taskQuery.search}
            />
          </View>
          <Pressable
            accessibilityLabel={`Filters and view options. ${activeOptionCount} active options. Sorted by ${sortLabel}. Grouped by ${groupingLabel}.`}
            accessibilityRole="button"
            onPress={() => { Keyboard.dismiss(); setShowViewOptions(true); }}
            style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}
          >
            <Ionicons name="options-outline" size={21} color={colors.primary} />
            {activeOptionCount > 0 && (
              <View style={styles.filterIndicator}><Text style={styles.filterCount}>{activeOptionCount}</Text></View>
            )}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.chipRow}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroller}
        >
          {TASK_STATE_FILTER_OPTIONS.filter((option) => option.value !== 'overdue').map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              onPress={() => updateQuery({ state: option.value })}
              role="radio"
              selected={taskQuery.state === option.value}
            />
          ))}
        </ScrollView>

        {!isHydrated ? (
          <View
            accessibilityLabel="Loading tasks"
            accessibilityRole="progressbar"
            style={styles.loading}
          >
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading tasks…</Text>
          </View>
        ) : visibleTaskCount === 0 ? (
          <EmptyState
            description={
              tasks.length === 0
                ? 'Create your first task or scan an assignment.'
                : 'Try clearing or changing your filters.'
            }
            title={tasks.length === 0 ? 'No tasks yet' : 'No matching tasks'}
          />
        ) : (
          <SectionList
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(task) => task.id}
            renderItem={({ item }) => <TaskCard task={item} />}
            renderSectionHeader={({ section }) =>
              section.title ? (
                <View style={styles.sectionHeader}>
                  <Text accessibilityRole="header" style={styles.sectionHeaderTitle}>
                    {section.title}
                  </Text>
                  <Text style={styles.sectionHeaderCount}>{section.data.length}</Text>
                </View>
              ) : null
            }
            sections={sections}
            stickySectionHeadersEnabled={false}
            style={styles.listContainer}
          />
        )}
      </ScreenShell>

      <TaskViewOptionsModal
        subjects={subjects}
        onChange={updateQuery}
        onClose={() => setShowViewOptions(false)}
        value={taskQuery}
        visible={showViewOptions}
      />
    </>
  );
}

type FilterChipProps = {
  label: string;
  selected: boolean;
  role: 'radio' | 'checkbox';
  onPress: () => void;
};

function FilterChip({ label, selected, role, onPress }: FilterChipProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole={role}
      accessibilityState={
        role === 'checkbox' ? { checked: selected } : { selected }
      }
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[styles.chipText, selected && styles.chipTextSelected]}
      >
        {selected ? '✓ ' : ''}
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.xl,
    minHeight: minimumTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: { color: colors.text, fontFamily: typography.headingStrong, fontSize: 30 },
  addButton: {
    minHeight: minimumTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    elevation: 2,
  },
  addButtonText: { color: colors.surface, fontFamily: typography.bodyBold, fontSize: 14 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  searchBox: {
    minHeight: 56,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  search: {
    minHeight: minimumTouchTarget,
    flex: 1,
    paddingVertical: 0,
    color: colors.text,
    fontFamily: typography.body,
    fontSize: 16,
  },
  filterButton: {
    width: minimumTouchTarget,
    height: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  filterIndicator: {
    position: 'absolute',
    right: -4,
    top: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: colors.primary,
  },
  filterCount: { color: colors.surface, fontSize: 10, fontFamily: typography.bodyBold },
  chipRow: { gap: spacing.sm, paddingVertical: spacing.sm },
  chipScroller: { flexGrow: 0 },
  chip: {
    minHeight: minimumTouchTarget,
    maxWidth: 220,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: { color: colors.text, fontFamily: typography.bodySemibold, fontSize: 14 },
  chipTextSelected: { color: colors.surface },
  listContainer: { flex: 1 },
  list: { paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  sectionHeaderTitle: { color: colors.text, fontFamily: typography.heading, fontSize: 17 },
  sectionHeaderCount: {
    minWidth: 24,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
    color: colors.primary,
    fontFamily: typography.bodyBold,
    fontSize: 12,
    textAlign: 'center',
  },
  separator: { height: spacing.md },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 16 },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.45 },
});
