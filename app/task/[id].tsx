import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCompletionUndo } from '../../src/components/CompletionUndoProvider';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { ScreenShell } from '../../src/components/ScreenShell';
import { TaskEditorHero } from '../../src/components/TaskEditorHero';
import { TaskForm } from '../../src/components/TaskForm';
import { effortLabel, taskTypeLabel } from '../../src/domain/task';
import { useUnsavedChangesGuard } from '../../src/hooks/useUnsavedChangesGuard';
import { useTasks } from '../../src/store/TaskStore';
import { priorityColors } from '../../src/theme/priority';
import { colors, minimumTouchTarget, radius, spacing, typography } from '../../src/theme/tokens';

function formatDeadline(value: string | null) {
  if (!value) return 'No deadline';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function reminderLabel(value: number | null) {
  if (value === null) return 'No reminder';
  if (value === 0) return 'At due time';
  if (value === 1440) return '1 day before';
  return `${value} minutes before`;
}

export default function TaskDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { deleteTask, getSubjectName, getTask, updateTask } = useTasks();
  const { toggleTaskCompletion } = useCompletionUndo();
  const [isEditing, setIsEditing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const allowNavigation = useUnsavedChangesGuard(hasUnsavedChanges);
  const task = getTask(id);

  if (!task) {
    return (
      <View style={styles.missing}>
        <Text accessibilityRole="header" style={styles.missingTitle}>Task not found</Text>
        <PrimaryButton label="Go back" onPress={() => router.back()} />
      </View>
    );
  }
  const taskId = task.id;

  function confirmDelete() {
    Alert.alert('Delete task?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        allowNavigation();
        deleteTask(taskId);
        router.replace('/tasks');
      } },
    ]);
  }

  function cancelEditing() {
    if (!hasUnsavedChanges) {
      setIsEditing(false);
      return;
    }
    Alert.alert('Discard task changes?', 'Your unsaved edits will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      {
        text: 'Discard changes',
        style: 'destructive',
        onPress: () => {
          setHasUnsavedChanges(false);
          setIsEditing(false);
        },
      },
    ]);
  }

  if (isEditing) {
    return (
      <SafeAreaView style={styles.screen}>
        <TaskForm
          footer={
            <Pressable
              accessibilityRole="button"
              onPress={cancelEditing}
              style={({ pressed }) => [styles.cancelEdit, pressed && styles.pressed]}
            >
              <Text style={styles.cancelEditText}>Cancel editing</Text>
            </Pressable>
          }
          header={
            <TaskEditorHero
              description="Update the assignment details, deadline, priority, and reminder."
              eyebrow="Task details"
              onBack={cancelEditing}
              title="Edit task"
            />
          }
          initial={task}
          onDirtyChange={setHasUnsavedChanges}
          submitLabel="Save changes"
          onSubmit={(draft) => {
            updateTask(taskId, draft);
            setHasUnsavedChanges(false);
            setIsEditing(false);
          }}
        />
      </SafeAreaView>
    );
  }

  const subjectName = getSubjectName(task.subjectId);
  const completed = task.status === 'completed';
  const priority = `${task.priority[0].toUpperCase()}${task.priority.slice(1)} priority`;
  const priorityPalette = priorityColors[task.priority];

  return (
    <ScreenShell scroll>
      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroLeading}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.heroIconButton, pressed && styles.pressed]}
            >
              <Ionicons
                accessibilityElementsHidden
                name="chevron-back"
                size={22}
                color={colors.surface}
              />
            </Pressable>
            <View style={styles.typeBadge}>
              <Ionicons
                accessibilityElementsHidden
                name="document-text-outline"
                size={16}
                color={colors.surface}
              />
              <Text style={styles.typeBadgeText}>{taskTypeLabel(task.taskType)}</Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel="Delete task"
            accessibilityRole="button"
            onPress={confirmDelete}
            style={({ pressed }) => [styles.heroIconButton, pressed && styles.pressed]}
          >
            <Ionicons
              accessibilityElementsHidden
              name="trash-outline"
              size={20}
              color={colors.surface}
            />
          </Pressable>
        </View>
        <Text style={styles.heroSubject}>{subjectName}</Text>
        <Text accessibilityRole="header" style={styles.heroTitle}>{task.title}</Text>
        <Text
          style={[
            styles.heroStatus,
            completed
              ? styles.completedStatus
              : {
                  backgroundColor: priorityPalette.background,
                  color: priorityPalette.foreground,
                },
          ]}
        >
          {completed ? 'Completed' : priority}
        </Text>
      </View>

      <View style={styles.detailsGrid}>
        <Detail label="Deadline" value={formatDeadline(task.dueAt)} />
        <Detail label="Task type" value={taskTypeLabel(task.taskType)} />
        <Detail
          label="Priority"
          value={priority}
          valueColor={priorityPalette.foreground}
        />
        <Detail label="Estimated workload" value={effortLabel(task.estimatedEffortMinutes)} />
        <Detail label="Reminder" value={reminderLabel(task.reminderMinutesBefore)} />
      </View>

      <View style={styles.notesCard}>
        <Text style={styles.label}>Instructions &amp; notes</Text>
        <Text style={styles.notes}>{task.notes.trim() || 'No instructions or notes.'}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel="Edit task"
          accessibilityRole="button"
          onPress={() => setIsEditing(true)}
          style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
        >
          <Ionicons
            accessibilityElementsHidden
            name="create-outline"
            size={19}
            color={colors.primary}
          />
          <Text style={styles.editButtonText}>Edit</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={completed ? 'Mark task as open' : 'Mark task as done'}
          accessibilityRole="button"
          onPress={() => toggleTaskCompletion(task)}
          style={({ pressed }) => [styles.completeButton, pressed && styles.pressed]}
        >
          <Ionicons
            accessibilityElementsHidden
            name={completed ? 'refresh-outline' : 'checkmark'}
            size={20}
            color={colors.surface}
          />
          <Text style={styles.completeButtonText}>{completed ? 'Mark as open' : 'Mark as done'}</Text>
        </Pressable>
      </View>
    </ScreenShell>
  );
}

function Detail({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.detailCard}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.detailValue, valueColor ? { color: valueColor } : undefined]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  missing: { flex: 1, justifyContent: 'center', gap: spacing.xl, padding: spacing.xl, backgroundColor: colors.background },
  missingTitle: { color: colors.text, fontFamily: typography.headingStrong, fontSize: 24, textAlign: 'center' },
  hero: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.xl, backgroundColor: colors.navy },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  heroLeading: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  typeBadge: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: '#15172B' },
  typeBadgeText: { color: colors.surface, fontFamily: typography.bodyBold, fontSize: 12 },
  heroIconButton: { width: minimumTouchTarget, height: minimumTouchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: '#15172B' },
  heroSubject: { color: '#C9D0FF', fontFamily: typography.bodyBold, fontSize: 12, textTransform: 'uppercase' },
  heroTitle: { color: colors.surface, fontFamily: typography.headingStrong, fontSize: 22, lineHeight: 27 },
  heroStatus: { alignSelf: 'flex-start', overflow: 'hidden', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, fontFamily: typography.bodySemibold, fontSize: 12, textTransform: 'capitalize' },
  completedStatus: { color: priorityColors.low.foreground, backgroundColor: priorityColors.low.background },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  detailCard: { minHeight: 76, flexBasis: '47%', flexGrow: 1, gap: spacing.xs, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, elevation: 1 },
  label: { color: colors.textMuted, fontFamily: typography.bodyBold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  detailValue: { color: colors.text, fontFamily: typography.bodySemibold, fontSize: 15, lineHeight: 21 },
  notesCard: { minHeight: 96, gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, elevation: 1 },
  notes: { color: colors.text, fontFamily: typography.body, fontSize: 16, lineHeight: 24 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  editButton: { minWidth: 96, minHeight: minimumTouchTarget, flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface },
  editButtonText: { color: colors.primary, fontFamily: typography.bodyBold, fontSize: 15 },
  completeButton: { minWidth: 180, minHeight: minimumTouchTarget, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.primary, elevation: 2 },
  completeButtonText: { color: colors.surface, fontFamily: typography.bodyBold, fontSize: 15 },
  cancelEdit: { minHeight: minimumTouchTarget, alignItems: 'center', justifyContent: 'center' },
  cancelEditText: { color: colors.primary, fontFamily: typography.bodyBold, fontSize: 15 },
  pressed: { opacity: 0.7 },
});
