import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  deleteSubjectFromData,
  migrateLocalTaskData,
  normalizeSubjectName,
  subjectNameError,
  subjectNameForId,
  type LocalTaskData,
  type Subject,
} from '../domain/subject';
import type { Task, TaskDraft } from '../domain/task';
import {
  completeTask as markTaskComplete,
  reopenTask as markTaskOpen,
  undoTaskCompletion as restoreTaskCompletion,
  type TaskCompletionUndo,
} from '../domain/taskCompletion';

const STORAGE_KEY = 'duely.local-task-data.v2';
const LEGACY_TASK_STORAGE_KEY = 'duely.tasks.v1';
const WRITE_ERROR = 'Your latest task changes could not be saved on this device.';
const emptyData: LocalTaskData = { tasks: [], subjects: [] };

type SubjectMutationResult =
  | { subject: Subject; error: null }
  | { subject: null; error: string };

type TaskStoreValue = LocalTaskData & {
  isHydrated: boolean;
  storageError: string | null;
  addTask: (draft: TaskDraft) => Task;
  updateTask: (id: string, draft: TaskDraft) => void;
  completeTask: (id: string, completedAt: string) => void;
  reopenTask: (id: string) => void;
  undoTaskCompletion: (undo: TaskCompletionUndo) => void;
  deleteTask: (id: string) => void;
  getTask: (id: string) => Task | undefined;
  addSubject: (name: string) => SubjectMutationResult;
  renameSubject: (id: string, name: string) => string | null;
  deleteSubject: (id: string) => void;
  getSubjectName: (subjectId: string | null) => string;
};

const TaskStoreContext = createContext<TaskStoreValue | null>(null);

function createLocalId(prefix: 'task' | 'subject') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function TaskStoreProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<LocalTaskData>(emptyData);
  const [isHydrated, setIsHydrated] = useState(false);
  const [canPersist, setCanPersist] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const persistenceQueue = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;

    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(LEGACY_TASK_STORAGE_KEY),
    ])
      .then(([currentValue, legacyTasksValue]) => {
        if (!active) return;

        try {
          if (currentValue) {
            const parsed: unknown = JSON.parse(currentValue);
            if (!parsed || typeof parsed !== 'object') throw new Error();
            const saved = parsed as Partial<LocalTaskData>;
            if (!Array.isArray(saved.tasks) || !Array.isArray(saved.subjects)) {
              throw new Error();
            }
            setData(migrateLocalTaskData(saved.tasks, saved.subjects));
          } else {
            const legacyTasks = legacyTasksValue
              ? JSON.parse(legacyTasksValue)
              : [];
            if (!Array.isArray(legacyTasks)) throw new Error();
            setData(migrateLocalTaskData(legacyTasks, []));
          }
          setCanPersist(true);
        } catch {
          setStorageError(
            'Your saved tasks could not be read. Duely left the stored data untouched.',
          );
        }
      })
      .catch(() => {
        if (active) {
          setStorageError('Local task storage is temporarily unavailable.');
        }
      })
      .finally(() => {
        if (active) setIsHydrated(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated || !canPersist) return;
    const snapshot = JSON.stringify({ version: 2, ...data });
    persistenceQueue.current = persistenceQueue.current
      .then(() => AsyncStorage.setItem(STORAGE_KEY, snapshot))
      .then(() => {
        setStorageError((current) => (current === WRITE_ERROR ? null : current));
      })
      .catch(() => {
        setStorageError(WRITE_ERROR);
      });
  }, [canPersist, data, isHydrated]);

  const addTask = useCallback(
    (draft: TaskDraft) => {
      const task: Task = {
        ...draft,
        subjectId: data.subjects.some(
          (subject) => subject.id === draft.subjectId,
        )
          ? draft.subjectId
          : null,
        id: createLocalId('task'),
        status: 'open',
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      setData((current) => ({
        ...current,
        tasks: [task, ...current.tasks],
      }));
      return task;
    },
    [data.subjects],
  );

  const updateTask = useCallback((id: string, draft: TaskDraft) => {
    setData((current) => {
      const subjectId = current.subjects.some(
        (subject) => subject.id === draft.subjectId,
      )
        ? draft.subjectId
        : null;
      return {
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === id ? { ...task, ...draft, subjectId } : task,
        ),
      };
    });
  }, []);

  const completeTask = useCallback((id: string, completedAt: string) => {
    setData((current) => ({
      ...current,
      tasks: markTaskComplete(current.tasks, id, completedAt),
    }));
  }, []);

  const reopenTask = useCallback((id: string) => {
    setData((current) => ({
      ...current,
      tasks: markTaskOpen(current.tasks, id),
    }));
  }, []);

  const undoTaskCompletion = useCallback((undo: TaskCompletionUndo) => {
    setData((current) => ({
      ...current,
      tasks: restoreTaskCompletion(current.tasks, undo),
    }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setData((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== id),
    }));
  }, []);

  const addSubject = useCallback(
    (value: string): SubjectMutationResult => {
      const error = subjectNameError(data.subjects, value);
      if (error) return { subject: null, error };

      const subject: Subject = {
        id: createLocalId('subject'),
        name: normalizeSubjectName(value),
        createdAt: new Date().toISOString(),
      };
      setData((current) => ({
        ...current,
        subjects: [...current.subjects, subject].sort((first, second) =>
          first.name.localeCompare(second.name),
        ),
      }));
      return { subject, error: null };
    },
    [data.subjects],
  );

  const renameSubject = useCallback(
    (id: string, value: string) => {
      const error = subjectNameError(data.subjects, value, id);
      if (error) return error;

      const name = normalizeSubjectName(value);
      setData((current) => ({
        ...current,
        subjects: current.subjects
          .map((subject) =>
            subject.id === id ? { ...subject, name } : subject,
          )
          .sort((first, second) => first.name.localeCompare(second.name)),
      }));
      return null;
    },
    [data.subjects],
  );

  const deleteSubject = useCallback((id: string) => {
    setData((current) => deleteSubjectFromData(current, id));
  }, []);

  const value = useMemo<TaskStoreValue>(
    () => ({
      ...data,
      isHydrated,
      storageError,
      addTask,
      updateTask,
      completeTask,
      reopenTask,
      undoTaskCompletion,
      deleteTask,
      getTask: (id) => data.tasks.find((task) => task.id === id),
      addSubject,
      renameSubject,
      deleteSubject,
      getSubjectName: (subjectId) =>
        subjectNameForId(data.subjects, subjectId),
    }),
    [
      addSubject,
      addTask,
      completeTask,
      data,
      deleteSubject,
      deleteTask,
      isHydrated,
      renameSubject,
      reopenTask,
      storageError,
      undoTaskCompletion,
      updateTask,
    ],
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
