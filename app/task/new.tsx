import { router, useLocalSearchParams } from 'expo-router';
import { TaskForm } from '../../src/components/TaskForm';
import { dueAtForLocalDate } from '../../src/domain/calendar';
import type { TaskDraft } from '../../src/domain/task';
import { useTasks } from '../../src/store/TaskStore';

export default function NewTaskScreen() {
  const { dueDate } = useLocalSearchParams<{ dueDate?: string }>();
  const { addTask } = useTasks();
  const initial: TaskDraft = {
    title: '',
    subject: '',
    notes: '',
    dueAt: typeof dueDate === 'string' ? dueAtForLocalDate(dueDate) : null,
    priority: 'medium',
  };

  return (
    <TaskForm
      initial={initial}
      submitLabel="Save task"
      onSubmit={(draft) => {
        addTask(draft);
        router.back();
      }}
    />
  );
}
