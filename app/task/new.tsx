import { router, useLocalSearchParams } from 'expo-router';
import { TaskForm } from '../../src/components/TaskForm';
import { dueAtForLocalDate } from '../../src/domain/calendar';
import type { TaskDraft } from '../../src/domain/task';
import { useTasks } from '../../src/store/TaskStore';
import { useReminders } from '../../src/store/ReminderStore';

export default function NewTaskScreen() {
  const { dueDate } = useLocalSearchParams<{ dueDate?: string }>();
  const { addTask } = useTasks();
  const { defaultReminder } = useReminders();
  const initial: TaskDraft = {
    title: '',
    subject: '',
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
      submitLabel="Save task"
      onSubmit={(draft) => {
        addTask(draft);
        router.back();
      }}
    />
  );
}
