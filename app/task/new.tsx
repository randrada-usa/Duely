import { router } from 'expo-router';
import { TaskForm } from '../../src/components/TaskForm';
import { useTasks } from '../../src/store/TaskStore';

export default function NewTaskScreen() {
  const { addTask } = useTasks();
  return <TaskForm submitLabel="Save task" onSubmit={(draft) => { addTask(draft); router.back(); }} />;
}
