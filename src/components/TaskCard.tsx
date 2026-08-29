import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { isOverdue, type Task, type TaskType } from '../domain/task';
import { useTasks } from '../store/TaskStore';
import {
  colors,
  minimumTouchTarget,
  radius,
  spacing,
  typography,
} from '../theme/tokens';
import { priorityColors } from '../theme/priority';
import { useCompletionUndo } from './CompletionUndoProvider';

function formatDueDate(dueAt: string | null) {
  if (!dueAt) return 'No deadline';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dueAt));
}

const taskTypeIcons: Record<TaskType, React.ComponentProps<typeof Ionicons>['name']> = {
  assignment: 'document-text-outline',
  quiz: 'help-circle-outline',
  exam: 'school-outline',
  project: 'construct-outline',
  reading: 'book-outline',
  other: 'clipboard-outline',
};

const priorityLabels = {
  high: 'High priority',
  medium: 'Medium priority',
  low: 'Low priority',
} as const;

const priorityIconBackgrounds = {
  high: priorityColors.high.background,
  medium: priorityColors.medium.background,
  low: priorityColors.low.background,
} as const;

const priorityIconColors = {
  high: priorityColors.high.accent,
  medium: priorityColors.medium.accent,
  low: priorityColors.low.accent,
} as const;

export function TaskCard({ task }: { task: Task }) {
  const { getSubjectName } = useTasks();
  const { toggleTaskCompletion } = useCompletionUndo();
  const overdue = isOverdue(task);
  const subjectName = getSubjectName(task.subjectId);

  return (
    <Pressable
      accessibilityHint="Opens task details"
      accessibilityLabel={`${task.title}, ${subjectName}, ${
        overdue ? 'Overdue' : priorityLabels[task.priority]
      }, ${formatDueDate(task.dueAt)}`}
      accessibilityRole="button"
      onPress={() => router.push(`/task/${task.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.typeIcon,
          { backgroundColor: priorityIconBackgrounds[task.priority] },
        ]}
      >
        <Ionicons
          accessibilityElementsHidden
          color={priorityIconColors[task.priority]}
          name={taskTypeIcons[task.taskType]}
          size={24}
        />
      </View>
      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.subject}>
          {subjectName}
        </Text>
        <Text
          numberOfLines={2}
          style={[styles.title, task.status === 'completed' && styles.completedTitle]}
        >
          {task.title}
        </Text>
        <View style={styles.metaRow}>
          <Text
            style={[
              styles.priority,
              styles[`${task.priority}Priority`],
              overdue && styles.overduePriority,
            ]}
          >
            {overdue ? 'Overdue' : priorityLabels[task.priority]}
          </Text>
          <Text numberOfLines={1} style={styles.metadata}>
            {formatDueDate(task.dueAt)}
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityLabel={
          task.status === 'completed'
            ? `Mark ${task.title} incomplete`
            : `Mark ${task.title} complete`
        }
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.status === 'completed' }}
        hitSlop={6}
        onPress={(event) => {
          event.stopPropagation();
          toggleTaskCompletion(task);
        }}
        style={[styles.checkbox, task.status === 'completed' && styles.checked]}
      >
        {task.status === 'completed' && (
          <Ionicons
            accessibilityElementsHidden
            name="checkmark"
            size={21}
            color={colors.surface}
          />
        )}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    elevation: 2,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.995 }] },
  typeIcon: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  checkbox: {
    width: minimumTouchTarget,
    height: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: minimumTouchTarget / 2,
  },
  checked: { backgroundColor: colors.success, borderColor: colors.success },
  content: { flex: 1, minWidth: 0, gap: 3 },
  subject: {
    color: colors.primary,
    fontFamily: typography.bodyBold,
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  title: { color: colors.text, fontFamily: typography.bodyBold, fontSize: 15 },
  completedTitle: { color: colors.textSubtle, textDecorationLine: 'line-through' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metadata: { flex: 1, color: colors.textMuted, fontFamily: typography.body, fontSize: 11 },
  priority: {
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
    fontFamily: typography.bodySemibold,
    fontSize: 10,
  },
  highPriority: {
    color: priorityColors.high.foreground,
    backgroundColor: priorityColors.high.background,
  },
  mediumPriority: {
    color: priorityColors.medium.foreground,
    backgroundColor: priorityColors.medium.background,
  },
  lowPriority: {
    color: priorityColors.low.foreground,
    backgroundColor: priorityColors.low.background,
  },
  overduePriority: { color: colors.danger, backgroundColor: colors.dangerSoft },
});
