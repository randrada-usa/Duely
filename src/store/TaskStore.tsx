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

import {
  deleteSubjectFromData,
  normalizeSubjectName,
  subjectNameError,
  subjectNameForId,
  type LocalTaskData,
  type Subject,
} from '../domain/subject';
import { normalizeTask, type Task, type TaskDraft } from '../domain/task';
import {
  completeTask as markTaskComplete,
  reopenTask as markTaskOpen,
  undoTaskCompletion as restoreTaskCompletion,
  type TaskCompletionUndo,
} from '../domain/taskCompletion';
import {
  createTaskPersistenceQueue,
  loadLocalTaskData,
  resetLocalTaskData as clearLocalTaskData,
} from '../services/taskStorage';

const CORRUPT_ERROR =
  'Your saved tasks could not be read. Duely left the stored data untouched.';
const READ_ERROR =
  'Local task storage is temporarily unavailable. Close and reopen Duely to try again.';
const WRITE_ERROR = 'Your latest task changes could not be saved on this device.';
const RESET_ERROR =
  'Duely could not finish resetting local data. Your tasks remain unavailable; try again.';
const STORAGE_LOCKED_ERROR =
  'Resolve the local storage issue before changing tasks or subjects.';
const emptyData: LocalTaskData = { tasks: [], subjects: [] };

type TaskStorageIssue = 'corrupt' | 'read' | 'write' | null;

type SubjectMutationResult =
  | { subject: Subject; error: null }
  | { subject: null; error: string };

type TaskStoreValue = LocalTaskData & {
  isHydrated: boolean;
  canEditTasks: boolean;
  storageError: string | null;
  canResetLocalData: boolean;
  isResettingLocalData: boolean;
  resetLocalData: () => Promise<boolean>;
  addTask: (draft: TaskDraft) => Task | null;
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
  const [storageIssue, setStorageIssue] = useState<TaskStorageIssue>(null);
  const [isResettingLocalData, setIsResettingLocalData] = useState(false);
  const persistenceQueue = useMemo(
    () =>
      createTaskPersistenceQueue(AsyncStorage, {
        onWriteSuccess: () => {
          setStorageIssue((current) => (current === 'write' ? null : current));
          setStorageError((current) =>
            current === WRITE_ERROR ? null : current,
          );
        },
        onWriteError: () => {
          setStorageIssue('write');
          setStorageError(WRITE_ERROR);
        },
      }),
    [],
  );

  useEffect(() => {
    let active = true;

    loadLocalTaskData(AsyncStorage)
      .then((result) => {
        if (!active) return;

        if (result.status === 'corrupt') {
          setStorageIssue('corrupt');
          setStorageError(CORRUPT_ERROR);
          return;
        }
        setData(result.data);
        setStorageIssue(null);
        setStorageError(null);
        setCanPersist(true);
      })
      .catch(() => {
        if (active) {
          setStorageIssue('read');
          setStorageError(READ_ERROR);
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
    void persistenceQueue.enqueue(data);
  }, [canPersist, data, isHydrated, persistenceQueue]);

  const resetLocalData = useCallback(async () => {
    if (storageIssue !== 'corrupt' || isResettingLocalData) return false;

    setIsResettingLocalData(true);
    try {
      await clearLocalTaskData(AsyncStorage);
      setData(emptyData);
      setStorageIssue(null);
      setStorageError(null);
      setCanPersist(true);
      return true;
    } catch {
      setStorageError(RESET_ERROR);
      return false;
    } finally {
      setIsResettingLocalData(false);
    }
  }, [isResettingLocalData, storageIssue]);

  const addTask = useCallback(
    (draft: TaskDraft) => {
      if (!canPersist) return null;

      const task: Task = normalizeTask({
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
        sourceImageRef: draft.sourceImageRef ?? null,
        extractionProvenance: draft.extractionProvenance ?? null,
      });
      setData((current) => ({
        ...current,
        tasks: [task, ...current.tasks],
      }));
      return task;
    },
    [canPersist, data.subjects],
  );

  const updateTask = useCallback(
    (id: string, draft: TaskDraft) => {
      if (!canPersist) return;
      setData((current) => {
        const subjectId = current.subjects.some(
          (subject) => subject.id === draft.subjectId,
        )
          ? draft.subjectId
          : null;
        return {
          ...current,
          tasks: current.tasks.map((task) =>
            task.id === id
              ? normalizeTask({
                  ...task,
                  ...draft,
                  subjectId,
                  sourceImageRef:
                    draft.sourceImageRef === undefined
                      ? task.sourceImageRef
                      : draft.sourceImageRef,
                  extractionProvenance:
                    draft.extractionProvenance === undefined
                      ? task.extractionProvenance
                      : draft.extractionProvenance,
                })
              : task,
          ),
        };
      });
    },
    [canPersist],
  );

  const completeTask = useCallback(
    (id: string, completedAt: string) => {
      if (!canPersist) return;
      setData((current) => ({
        ...current,
        tasks: markTaskComplete(current.tasks, id, completedAt),
      }));
    },
    [canPersist],
  );

  const reopenTask = useCallback(
    (id: string) => {
      if (!canPersist) return;
      setData((current) => ({
        ...current,
        tasks: markTaskOpen(current.tasks, id),
      }));
    },
    [canPersist],
  );

  const undoTaskCompletion = useCallback(
    (undo: TaskCompletionUndo) => {
      if (!canPersist) return;
      setData((current) => ({
        ...current,
        tasks: restoreTaskCompletion(current.tasks, undo),
      }));
    },
    [canPersist],
  );

  const deleteTask = useCallback(
    (id: string) => {
      if (!canPersist) return;
      setData((current) => ({
        ...current,
        tasks: current.tasks.filter((task) => task.id !== id),
      }));
    },
    [canPersist],
  );

  const addSubject = useCallback(
    (value: string): SubjectMutationResult => {
      if (!canPersist) return { subject: null, error: STORAGE_LOCKED_ERROR };

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
    [canPersist, data.subjects],
  );

  const renameSubject = useCallback(
    (id: string, value: string) => {
      if (!canPersist) return STORAGE_LOCKED_ERROR;

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
    [canPersist, data.subjects],
  );

  const deleteSubject = useCallback(
    (id: string) => {
      if (!canPersist) return;
      setData((current) => deleteSubjectFromData(current, id));
    },
    [canPersist],
  );

  const value = useMemo<TaskStoreValue>(
    () => ({
      ...data,
      isHydrated,
      canEditTasks: canPersist,
      storageError,
      canResetLocalData: storageIssue === 'corrupt',
      isResettingLocalData,
      resetLocalData,
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
      canPersist,
      completeTask,
      data,
      deleteSubject,
      deleteTask,
      isHydrated,
      isResettingLocalData,
      renameSubject,
      reopenTask,
      resetLocalData,
      storageError,
      storageIssue,
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
