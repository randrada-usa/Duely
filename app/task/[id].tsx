import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCompletionUndo } from '../../src/components/CompletionUndoProvider';
import { DuelyDialog } from '../../src/components/DuelyDialog';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { ScreenShell } from '../../src/components/ScreenShell';
import { TaskEditorHero } from '../../src/components/TaskEditorHero';
import { TaskForm } from '../../src/components/TaskForm';
import { effortLabel, taskTypeLabel } from '../../src/domain/task';
import { useUnsavedChangesGuard } from '../../src/hooks/useUnsavedChangesGuard';
import { useTasks } from '../../src/store/TaskStore';
import { priorityColors } from '../../src/theme/priority';
import { colors, minimumTouchTarget, radius, spacing, surfaces, typography } from '../../src/theme/tokens';

function formatDeadline(value: string | null) {
  if (!value) return 'No deadline';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function reminderLabel(value: number | null) {
  if (value === null) return 'No reminder';
  if (value === 0) return 'At due time';
  if (value >= 1440) {
    const days = value / 1440;
    return `${days} ${days === 1 ? 'day' : 'days'} before`;
  }
  if (value === 60) return '1 hour before';
  return `${value} minutes before`;
}

export default function TaskDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { deleteTask, getSubjectName, getTask, updateTask } = useTasks();
  const { toggleTaskCompletion } = useCompletionUndo();
  const [isEditing, setIsEditing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSourceImageOpen, setIsSourceImageOpen] = useState(false);
  const [sourceImageFailed, setSourceImageFailed] = useState(false);
  const [confirmation, setConfirmation] = useState<'delete' | 'discard' | null>(null);
  const {
    allowNavigation,
    cancelNavigation,
    discardAndNavigate,
    showDiscardDialog,
  } = useUnsavedChangesGuard(hasUnsavedChanges);
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
    setConfirmation('delete');
  }

  function cancelEditing() {
    if (!hasUnsavedChanges) {
      setIsEditing(false);
      return;
    }
    setConfirmation('discard');
  }

  const confirmationDialog = (
    <DuelyDialog
      cancelLabel={confirmation === 'discard' ? 'Keep editing' : 'Cancel'}
      confirmLabel={confirmation === 'discard' ? 'Discard changes' : 'Delete task'}
      destructive
      message={
        confirmation === 'discard'
          ? 'Your unsaved edits will be lost.'
          : 'This task will be permanently removed. This cannot be undone.'
      }
      onCancel={() => setConfirmation(null)}
      onConfirm={() => {
        if (confirmation === 'delete') {
          allowNavigation();
          deleteTask(taskId);
          setConfirmation(null);
          router.replace('/tasks');
          return;
        }
        setHasUnsavedChanges(false);
        setIsEditing(false);
        setConfirmation(null);
      }}
      title={confirmation === 'discard' ? 'Discard task changes?' : 'Delete task?'}
      visible={confirmation !== null}
    />
  );

  if (isEditing) {
    return (
      <>
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
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
              imageUri={task.sourceImageRef ?? undefined}
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
        {confirmationDialog}
        <DuelyDialog
          cancelLabel="Keep editing"
          confirmLabel="Discard changes"
          destructive
          message="Your changes have not been saved. If you leave now, they will be lost."
          onCancel={cancelNavigation}
          onConfirm={discardAndNavigate}
          title="Discard changes?"
          visible={showDiscardDialog}
        />
      </>
    );
  }

  const subjectName = getSubjectName(task.subjectId);
  const completed = task.status === 'completed';
  const priority = `${task.priority[0].toUpperCase()}${task.priority.slice(1)} priority`;
  const priorityPalette = priorityColors[task.priority];

  return (
    <>
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

      {task.sourceImageRef && (
        <View style={styles.sourceImageCard}>
          <View style={styles.sourceImageHeading}>
            <View style={styles.sourceImageCopy}>
              <Text style={styles.label}>Source assignment image</Text>
              <Text style={styles.sourceImageHelper}>
                Kept only on this device with this task.
              </Text>
            </View>
            {!sourceImageFailed && (
              <Ionicons
                accessibilityElementsHidden
                color={colors.primary}
                name="expand-outline"
                size={21}
              />
            )}
          </View>
          {sourceImageFailed ? (
            <View accessibilityRole="alert" style={styles.sourceImageUnavailable}>
              <Ionicons
                accessibilityElementsHidden
                color={colors.textMuted}
                name="image-outline"
                size={24}
              />
              <Text style={styles.sourceImageUnavailableText}>
                This image is no longer available on this device.
              </Text>
            </View>
          ) : (
            <Pressable
              accessibilityHint="Opens the complete image in a full-screen viewer"
              accessibilityLabel="View full source assignment image"
              accessibilityRole="button"
              onPress={() => setIsSourceImageOpen(true)}
              style={({ pressed }) => [
                styles.sourceImageButton,
                pressed && styles.pressed,
              ]}
            >
              <Image
                accessibilityIgnoresInvertColors
                accessibilityLabel="Source assignment image preview"
                onError={() => {
                  setSourceImageFailed(true);
                  setIsSourceImageOpen(false);
                }}
                resizeMode="cover"
                source={{ uri: task.sourceImageRef }}
                style={styles.sourceImagePreview}
              />
              <View pointerEvents="none" style={styles.sourceImageAction}>
                <Text style={styles.sourceImageActionText}>View full image</Text>
              </View>
            </Pressable>
          )}
        </View>
      )}

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
        {confirmationDialog}
      </ScreenShell>
      <Modal
        animationType="fade"
        onRequestClose={() => setIsSourceImageOpen(false)}
        presentationStyle="fullScreen"
        visible={isSourceImageOpen && !sourceImageFailed}
      >
        <SafeAreaView
          accessibilityViewIsModal
          edges={['top', 'bottom', 'left', 'right']}
          style={styles.sourceImageViewer}
        >
          <View style={styles.sourceImageViewerHeader}>
            <Text accessibilityRole="header" style={styles.sourceImageViewerTitle}>
              Source assignment image
            </Text>
            <Pressable
              accessibilityLabel="Close source assignment image"
              accessibilityRole="button"
              onPress={() => setIsSourceImageOpen(false)}
              style={({ pressed }) => [
                styles.sourceImageClose,
                pressed && styles.sourceImageClosePressed,
              ]}
            >
              <Ionicons
                accessibilityElementsHidden
                color={colors.surface}
                name="close"
                size={26}
              />
            </Pressable>
          </View>
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel="Full source assignment image"
            onError={() => {
              setSourceImageFailed(true);
              setIsSourceImageOpen(false);
            }}
            resizeMode="contain"
            source={{ uri: task.sourceImageRef ?? undefined }}
            style={styles.sourceImageFull}
          />
        </SafeAreaView>
      </Modal>
    </>
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
  hero: { gap: spacing.lg, padding: spacing.xl, borderRadius: radius.xl, backgroundColor: colors.navy },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  heroLeading: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  typeBadge: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: '#15172B' },
  typeBadgeText: { color: colors.surface, fontFamily: typography.bodyBold, fontSize: 12 },
  heroIconButton: { width: minimumTouchTarget, height: minimumTouchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: '#15172B' },
  heroSubject: { color: '#C9D0FF', fontFamily: typography.bodyBold, fontSize: 12, textTransform: 'uppercase' },
  heroTitle: { color: colors.surface, fontFamily: typography.headingStrong, fontSize: 28, lineHeight: 35 },
  heroStatus: { alignSelf: 'flex-start', overflow: 'hidden', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, fontFamily: typography.bodySemibold, fontSize: 12, textTransform: 'capitalize' },
  completedStatus: { color: '#176B3A', backgroundColor: colors.successSoft },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  detailCard: { ...surfaces.card, minHeight: 96, flexBasis: '45%', flexGrow: 1, gap: spacing.sm, padding: spacing.lg },
  label: { color: colors.textMuted, fontFamily: typography.bodyBold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  detailValue: { color: colors.text, fontFamily: typography.bodySemibold, fontSize: 16, lineHeight: 24 },
  sourceImageCard: { ...surfaces.card, gap: spacing.md, padding: spacing.lg },
  sourceImageHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  sourceImageCopy: { flex: 1, gap: spacing.xs },
  sourceImageHelper: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13, lineHeight: 19 },
  sourceImageButton: { minHeight: minimumTouchTarget, overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.surfaceSubtle },
  sourceImagePreview: { width: '100%', height: 180, backgroundColor: colors.surfaceSubtle },
  sourceImageAction: { position: 'absolute', right: spacing.md, bottom: spacing.md, minHeight: 32, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: 'rgba(21, 23, 43, 0.88)' },
  sourceImageActionText: { color: colors.surface, fontFamily: typography.bodyBold, fontSize: 12 },
  sourceImageUnavailable: { minHeight: 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surfaceSubtle },
  sourceImageUnavailableText: { flex: 1, color: colors.textMuted, fontFamily: typography.body, fontSize: 15, lineHeight: 22 },
  sourceImageViewer: { flex: 1, backgroundColor: '#080912' },
  sourceImageViewerHeader: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.lg },
  sourceImageViewerTitle: { flex: 1, color: colors.surface, fontFamily: typography.bodyBold, fontSize: 16 },
  sourceImageClose: { width: minimumTouchTarget, height: minimumTouchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: '#15172B' },
  sourceImageClosePressed: { opacity: 0.75 },
  sourceImageFull: { flex: 1, width: '100%', backgroundColor: '#080912' },
  notesCard: { ...surfaces.card, minHeight: 96, gap: spacing.md, padding: spacing.xl },
  notes: { color: colors.text, fontFamily: typography.body, fontSize: 16, lineHeight: 24 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  editButton: { minWidth: 96, minHeight: minimumTouchTarget, flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface },
  editButtonText: { color: colors.primary, fontFamily: typography.bodyBold, fontSize: 15 },
  completeButton: { minWidth: 180, minHeight: minimumTouchTarget, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.primary, elevation: 2 },
  completeButtonText: { color: colors.surface, fontFamily: typography.bodyBold, fontSize: 15 },
  cancelEdit: {
    minHeight: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
  },
  cancelEditText: { color: colors.primary, fontFamily: typography.bodyBold, fontSize: 15 },
  pressed: { opacity: 0.7 },
});
