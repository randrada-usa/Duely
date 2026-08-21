import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { effortLabel, isOverdue, taskTypeLabel, type Task } from '../domain/task';
import { useTasks } from '../store/TaskStore';
import { colors, minimumTouchTarget, radius, spacing } from '../theme/tokens';

function formatDueDate(dueAt: string | null) {
  if (!dueAt) return 'No deadline';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dueAt));
}

export function TaskCard({ task }: { task: Task }) {
  const { getSubjectName, toggleTask } = useTasks();
  const overdue = isOverdue(task);

  return (
    <Pressable
      accessibilityHint="Opens task details"
      accessibilityRole="button"
      onPress={() => router.push(`/task/${task.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Pressable
        accessibilityLabel={
          task.status === 'completed'
            ? `Mark ${task.title} incomplete`
            : `Mark ${task.title} complete`
        }
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.status === 'completed' }}
        hitSlop={8}
        onPress={() => toggleTask(task.id)}
        style={[styles.checkbox, task.status === 'completed' && styles.checked]}
      >
        <Text style={styles.checkmark}>{task.status === 'completed' ? '✓' : ''}</Text>
      </Pressable>
      <View style={styles.content}>
        <Text
          numberOfLines={2}
          style={[styles.title, task.status === 'completed' && styles.completedTitle]}
        >
          {task.title}
        </Text>
        <Text numberOfLines={1} style={styles.metadata}>
          {getSubjectName(task.subjectId)} · {formatDueDate(task.dueAt)}
        </Text>
        <Text numberOfLines={1} style={styles.metadata}>
          {taskTypeLabel(task.taskType)} · {effortLabel(task.estimatedEffortMinutes)}
        </Text>
        {(overdue || task.status === 'completed') && (
          <Text style={[styles.status, overdue ? styles.overdue : styles.completed]}>
            {overdue ? 'Overdue' : 'Completed'}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.75 },
  checkbox: {
    width: minimumTouchTarget,
    height: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: minimumTouchTarget / 2,
  },
  checked: { backgroundColor: colors.success, borderColor: colors.success },
  checkmark: { color: colors.surface, fontSize: 20, fontWeight: '800' },
  content: { flex: 1, gap: spacing.xs },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  completedTitle: { textDecorationLine: 'line-through' },
  metadata: { color: colors.textMuted, fontSize: 13 },
  status: { alignSelf: 'flex-start', fontSize: 12, fontWeight: '700' },
  overdue: { color: colors.danger },
  completed: { color: colors.success },
});
