import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { isOverdue, type Task, type TaskType } from '../domain/task';
import { useTasks } from '../store/TaskStore';
import {
  colors,
  minimumTouchTarget,
  radius,
  spacing,
  surfaces,
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

const taskTypeArtwork: Record<TaskType, ImageSourcePropType> = {
  assignment: require('../../assets/task-artwork/assignment.png'),
  quiz: require('../../assets/task-artwork/quiz.png'),
  exam: require('../../assets/task-artwork/exam.png'),
  project: require('../../assets/task-artwork/project.png'),
  reading: require('../../assets/task-artwork/reading.png'),
  other: require('../../assets/task-artwork/other.png'),
};

const priorityLabels = {
  high: 'High priority',
  medium: 'Medium priority',
  low: 'Low priority',
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
      <TaskArtwork task={task} />
      <View style={styles.content}>
        <Text style={styles.subject}>
          {subjectName}
        </Text>
        <Text
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
          <Text style={styles.metadata}>
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
        style={styles.checkboxTarget}
      >
        <View style={[styles.checkbox, task.status === 'completed' && styles.checked]}>
          {task.status === 'completed' && (
            <Ionicons
              accessibilityElementsHidden
              name="checkmark"
              size={21}
              color={colors.surface}
            />
          )}
        </View>
      </Pressable>
    </Pressable>
  );
}

function TaskArtwork({ task }: { task: Task }) {
  const [sourceFailed, setSourceFailed] = useState(false);
  const sourceImageRef = task.sourceImageRef;

  useEffect(() => setSourceFailed(false), [sourceImageRef]);

  const showsScan = Boolean(sourceImageRef) && !sourceFailed;
  const source: ImageSourcePropType = showsScan
    ? { uri: sourceImageRef ?? undefined }
    : taskTypeArtwork[task.taskType];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.artworkFrame}
    >
      <Image
        onError={() => setSourceFailed(true)}
        resizeMode="cover"
        source={source}
        style={styles.artwork}
      />
      {showsScan && (
        <View style={styles.scanBadge}>
          <Ionicons color={colors.surface} name="camera" size={11} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...surfaces.card,
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.995 }] },
  artworkFrame: {
    width: 58,
    height: 64,
    overflow: 'hidden',
    borderRadius: radius.md,
    backgroundColor: colors.primaryFaint,
  },
  artwork: { width: '100%', height: '100%' },
  scanBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: 'rgba(30, 32, 54, 0.78)',
  },
  checkboxTarget: {
    width: minimumTouchTarget,
    minHeight: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: minimumTouchTarget / 2,
  },
  checked: { backgroundColor: colors.success, borderColor: colors.success },
  content: { flex: 1, minWidth: 0, gap: spacing.sm },
  subject: {
    color: colors.primary,
    fontFamily: typography.bodyBold,
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  title: { color: colors.text, fontFamily: typography.bodySemibold, fontSize: 16, lineHeight: 23 },
  completedTitle: { color: colors.textSubtle, textDecorationLine: 'line-through' },
  metaRow: { alignItems: 'flex-start', gap: spacing.sm },
  metadata: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13, lineHeight: 19 },
  priority: {
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
    fontFamily: typography.bodySemibold,
    fontSize: 12,
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
