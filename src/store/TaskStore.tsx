import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { Task, TaskDraft } from '../domain/task';

const STORAGE_KEY = 'duely.tasks.v1';

type TaskStoreValue = {
  tasks: Task[];
  isHydrated: boolean;
  addTask: (draft: TaskDraft) => Task;
  updateTask: (id: string, draft: TaskDraft) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  getTask: (id: string) => Task | undefined;
};

const TaskStoreContext = createContext<TaskStoreValue | null>(null);

function createTaskId() {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function TaskStoreProvider({ children }: PropsWithChildren) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (active && value) setTasks(JSON.parse(value) as Task[]);
      })
      .catch(() => {
        // A storage failure should not prevent local task creation this session.
      })
      .finally(() => {
        if (active) setIsHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isHydrated) void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [isHydrated, tasks]);

  const addTask = useCallback((draft: TaskDraft) => {
    const task: Task = {
      ...draft,
      id: createTaskId(),
      status: 'open',
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    setTasks((current) => [task, ...current]);
    return task;
  }, []);

  const updateTask = useCallback((id: string, draft: TaskDraft) => {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, ...draft } : task)),
    );
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? {
              ...task,
              status: task.status === 'open' ? 'completed' : 'open',
              completedAt:
                task.status === 'open' ? new Date().toISOString() : null,
            }
          : task,
      ),
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((current) => current.filter((task) => task.id !== id));
  }, []);

  const value = useMemo<TaskStoreValue>(
    () => ({
      tasks,
      isHydrated,
      addTask,
      updateTask,
      toggleTask,
      deleteTask,
      getTask: (id) => tasks.find((task) => task.id === id),
    }),
    [addTask, deleteTask, isHydrated, tasks, toggleTask, updateTask],
  );

  return (
    <TaskStoreContext.Provider value={value}>
      {children}
    </TaskStoreContext.Provider>
  );
}

export function useTasks() {
  const value = useContext(TaskStoreContext);
  if (!value) throw new Error('useTasks must be used inside TaskStoreProvider');
  return value;
}
