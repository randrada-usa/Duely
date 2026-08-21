import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { TaskForm } from '../../src/components/TaskForm';
import { dueAtForLocalDate } from '../../src/domain/calendar';
import type { TaskDraft } from '../../src/domain/task';
import { useUnsavedChangesGuard } from '../../src/hooks/useUnsavedChangesGuard';
import { useTasks } from '../../src/store/TaskStore';
import { useReminders } from '../../src/store/ReminderStore';

export default function NewTaskScreen() {
  const { dueDate } = useLocalSearchParams<{ dueDate?: string }>();
  const { addTask } = useTasks();
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

  return (
    <TaskForm
      defaultReminder={defaultReminder}
      initial={initial}
      onDirtyChange={setHasUnsavedChanges}
      submitLabel="Save task"
      onSubmit={(draft) => {
        allowNavigation();
        addTask(draft);
        router.back();
      }}
    />
  );
}
