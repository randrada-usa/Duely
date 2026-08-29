import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../src/components/PrimaryButton';
import { ScreenShell } from '../../src/components/ScreenShell';
import { TaskEditorHero } from '../../src/components/TaskEditorHero';
import { TaskForm } from '../../src/components/TaskForm';
import { TaskStorageWarning } from '../../src/components/TaskStorageWarning';
import { dueAtForLocalDate } from '../../src/domain/calendar';
import type { TaskDraft } from '../../src/domain/task';
import { useUnsavedChangesGuard } from '../../src/hooks/useUnsavedChangesGuard';
import { useTasks } from '../../src/store/TaskStore';
import { useReminders } from '../../src/store/ReminderStore';
import { colors, spacing } from '../../src/theme/tokens';

export default function NewTaskScreen() {
  const { dueDate } = useLocalSearchParams<{ dueDate?: string }>();
  const { addTask, canEditTasks, isHydrated } = useTasks();
  const { defaultReminder } = useReminders();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const allowNavigation = useUnsavedChangesGuard(hasUnsavedChanges);
  const initial: TaskDraft = {
    title: '',
    subjectId: null,
    notes: '',
    dueAt: typeof dueDate === 'string' ? dueAtForLocalDate(dueDate) : null,
    taskType: 'assignment',
    estimatedEffortMinutes: null,
    priority: 'medium',
    reminderMinutesBefore:
      typeof dueDate === 'string' ? defaultReminder : null,
  };

  if (!isHydrated || !canEditTasks) {
    return (
      <ScreenShell scroll>
        <TaskStorageWarning />
        <View style={styles.unavailable}>
          <Text accessibilityRole="header" style={styles.unavailableTitle}>
            {isHydrated ? 'Task storage unavailable' : 'Loading tasks…'}
          </Text>
          <Text style={styles.unavailableText}>
            {isHydrated
              ? 'Resolve the storage issue before creating a task so your work is not lost.'
              : 'Duely is checking the tasks saved on this device.'}
          </Text>
          <PrimaryButton label="Go back" onPress={() => router.back()} />
        </View>
      </ScreenShell>
    );
  }

  return (
    <TaskForm
      defaultReminder={defaultReminder}
      header={
        <TaskEditorHero
          description="Add the details you need to recognize and finish this assignment."
          eyebrow="Manual task"
          title="Create a new task"
        />
      }
      initial={initial}
      onDirtyChange={setHasUnsavedChanges}
      submitLabel="Save task"
      onSubmit={(draft) => {
        const savedTask = addTask(draft);
        if (!savedTask) return;
        allowNavigation();
        router.back();
      }}
    />
  );
}

const styles = StyleSheet.create({
  unavailable: { gap: spacing.lg },
  unavailableTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  unavailableText: { color: colors.textMuted, fontSize: 16, lineHeight: 23 },
});
