import type { Task } from './task';

export type TaskCompletionUndo = {
  taskId: string;
  completedAt: string;
};

function updateTask(
  tasks: Task[],
  id: string,
  update: (task: Task) => Task,
) {
  let changed = false;
  const nextTasks = tasks.map((task) => {
    if (task.id !== id) return task;
    changed = true;
    return update(task);
  });
  return changed ? nextTasks : tasks;
}

export function completeTask(
  tasks: Task[],
  id: string,
  completedAt: string,
) {
  return updateTask(tasks, id, (task) => ({
    ...task,
    status: 'completed',
    completedAt,
  }));
}

export function reopenTask(tasks: Task[], id: string) {
  return updateTask(tasks, id, (task) => ({
    ...task,
    status: 'open',
    completedAt: null,
  }));
}

export function undoTaskCompletion(
  tasks: Task[],
  undo: TaskCompletionUndo,
) {
  let changed = false;
  const nextTasks = tasks.map((task) => {
    if (
      task.id !== undo.taskId ||
      task.status !== 'completed' ||
      task.completedAt !== undo.completedAt
    ) {
      return task;
    }
    changed = true;
    return { ...task, status: 'open' as const, completedAt: null };
  });
  return changed ? nextTasks : tasks;
}
