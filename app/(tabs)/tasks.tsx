import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  SectionList,
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
import { TaskViewOptionsModal } from '../../src/components/TaskViewOptionsModal';
import { taskTypeLabel } from '../../src/domain/task';
import {
  ALL_SUBJECTS,
  DEFAULT_TASK_QUERY,
  hasActiveTaskFilters,
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
} from '../../src/theme/tokens';

export default function TasksScreen() {
  const { isHydrated, storageError, subjects, tasks } = useTasks();
  const [taskQuery, setTaskQuery] = useState<TaskQuery>(DEFAULT_TASK_QUERY);
  const [showSubjectManager, setShowSubjectManager] = useState(false);
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
  const filtered = hasActiveTaskFilters(taskQuery);

  const sortLabel =
    TASK_SORT_OPTIONS.find((option) => option.value === taskQuery.sort)?.label ??
    'Smart priority';
  const groupingLabel =
    TASK_GROUPING_OPTIONS.find(
      (option) => option.value === taskQuery.grouping,
    )?.label ?? 'None';
  const extraFilterLabels = [
    taskQuery.taskType ? taskTypeLabel(taskQuery.taskType) : null,
    taskQuery.priority
      ? `${taskQuery.priority[0].toLocaleUpperCase()}${taskQuery.priority.slice(1)} priority`
      : null,
  ].filter((label): label is string => label !== null);

  function updateQuery(patch: Partial<TaskQuery>) {
    setTaskQuery((current) => ({ ...current, ...patch }));
  }

  function clearFilters() {
    setTaskQuery((current) => ({
      ...current,
      search: '',
      state: 'all',
      noDeadline: false,
      subject: ALL_SUBJECTS,
      taskType: null,
      priority: null,
    }));
  }

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
          onChangeText={(search) => updateQuery({ search })}
          placeholder="Search title, subject, notes, or type"
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          value={taskQuery.search}
        />

        <PrimaryButton label="Add task" onPress={() => router.push('/task/new')} />

        <Text style={styles.filterLabel}>Quick filters</Text>
        <ScrollView
          contentContainerStyle={styles.chipRow}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroller}
        >
          {TASK_STATE_FILTER_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              onPress={() => updateQuery({ state: option.value })}
              role="radio"
              selected={taskQuery.state === option.value}
            />
          ))}
          <FilterChip
            label="No deadline"
            onPress={() => updateQuery({ noDeadline: !taskQuery.noDeadline })}
            role="checkbox"
            selected={taskQuery.noDeadline}
          />
        </ScrollView>

        <View style={styles.subjectHeader}>
          <Text style={styles.sectionTitle}>Subjects</Text>
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
          contentContainerStyle={styles.chipRow}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroller}
        >
          <FilterChip
            label="All"
            onPress={() => updateQuery({ subject: ALL_SUBJECTS })}
            role="radio"
            selected={taskQuery.subject === ALL_SUBJECTS}
          />
          <FilterChip
            label="Unassigned"
            onPress={() => updateQuery({ subject: UNASSIGNED_SUBJECTS })}
            role="radio"
            selected={taskQuery.subject === UNASSIGNED_SUBJECTS}
          />
          {subjects.map((subject) => (
            <FilterChip
              key={subject.id}
              label={subject.name}
              onPress={() => updateQuery({ subject: subject.id })}
              role="radio"
              selected={taskQuery.subject === subject.id}
            />
          ))}
        </ScrollView>

        <View style={styles.viewBar}>
          <Pressable
            accessibilityLabel={`More filters and view options. Sorted by ${sortLabel}. Grouped by ${groupingLabel}.${
              extraFilterLabels.length > 0
                ? ` Active filters: ${extraFilterLabels.join(', ')}.`
                : ''
            }`}
            accessibilityRole="button"
            onPress={() => setShowViewOptions(true)}
            style={({ pressed }) => [
              styles.viewButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.viewButtonTitle}>More filters & view</Text>
            <Text numberOfLines={2} style={styles.viewButtonSummary}>
              {extraFilterLabels.length > 0
                ? `${extraFilterLabels.join(' · ')}  |  `
                : ''}
              {sortLabel} · {groupingLabel === 'None' ? 'No grouping' : groupingLabel}
            </Text>
          </Pressable>
          {filtered && (
            <Pressable
              accessibilityRole="button"
              onPress={clearFilters}
              style={({ pressed }) => [
                styles.clearButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </Pressable>
          )}
        </View>

        {!isHydrated ? (
          <View accessibilityLabel="Loading tasks" style={styles.loading}>
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

      <SubjectManagerModal
        onClose={() => setShowSubjectManager(false)}
        visible={showSubjectManager}
      />
      <TaskViewOptionsModal
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
  filterLabel: {
    marginTop: spacing.lg,
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  manageButton: {
    minHeight: minimumTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
  },
  manageButtonText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
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
  chipText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  chipTextSelected: { color: colors.surface },
  viewBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  viewButton: {
    minHeight: minimumTouchTarget,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  viewButtonTitle: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  viewButtonSummary: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  clearButton: {
    minWidth: 64,
    minHeight: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
  },
  clearButtonText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
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
  sectionHeaderTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  sectionHeaderCount: {
    minWidth: 24,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
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
