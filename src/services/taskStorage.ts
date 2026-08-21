import { migrateLocalTaskData, type LocalTaskData } from '../domain/subject';
import {
  isSourceImageReference,
  isTaskExtractionProvenance,
} from '../domain/task';

export const TASK_STORAGE_KEY = 'duely.local-task-data.v2';
export const LEGACY_TASK_STORAGE_KEY = 'duely.tasks.v1';
export const TASK_STORAGE_KEYS = [
  TASK_STORAGE_KEY,
  LEGACY_TASK_STORAGE_KEY,
] as const;

export type TaskStorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  multiRemove: (keys: readonly string[]) => Promise<void>;
};

export type TaskStorageLoadResult =
  | { status: 'ready'; data: LocalTaskData }
  | { status: 'corrupt' };

type TaskPersistenceCallbacks = {
  onWriteSuccess: () => void;
  onWriteError: () => void;
};

const TASK_TYPES = new Set([
  'assignment',
  'quiz',
  'exam',
  'project',
  'reading',
  'other',
]);
const EFFORT_VALUES = new Set([30, 60, 120, 180, 240]);
const REMINDER_VALUES = new Set([0, 15, 60, 1_440]);

function isDateString(value: unknown) {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
}

function isNullableDateString(value: unknown) {
  return value === null || isDateString(value);
}

function isStoredTask(value: unknown) {
  if (!value || typeof value !== 'object') return false;
  const task = value as Record<string, unknown>;
  return (
    typeof task.id === 'string' &&
    task.id.length > 0 &&
    typeof task.title === 'string' &&
    task.title.trim().length > 0 &&
    typeof task.notes === 'string' &&
    isNullableDateString(task.dueAt) &&
    (task.subjectId === undefined ||
      task.subjectId === null ||
      typeof task.subjectId === 'string') &&
    (task.subject === undefined || typeof task.subject === 'string') &&
    (task.taskType === undefined ||
      (typeof task.taskType === 'string' && TASK_TYPES.has(task.taskType))) &&
    (task.estimatedEffortMinutes === undefined ||
      task.estimatedEffortMinutes === null ||
      (typeof task.estimatedEffortMinutes === 'number' &&
        EFFORT_VALUES.has(task.estimatedEffortMinutes))) &&
    (task.reminderMinutesBefore === undefined ||
      task.reminderMinutesBefore === null ||
      (typeof task.reminderMinutesBefore === 'number' &&
        REMINDER_VALUES.has(task.reminderMinutesBefore))) &&
    (task.sourceImageRef === undefined ||
      task.sourceImageRef === null ||
      isSourceImageReference(task.sourceImageRef)) &&
    (task.extractionProvenance === undefined ||
      task.extractionProvenance === null ||
      isTaskExtractionProvenance(task.extractionProvenance)) &&
    (task.priority === 'low' ||
      task.priority === 'medium' ||
      task.priority === 'high') &&
    (task.status === 'open' || task.status === 'completed') &&
    isDateString(task.createdAt) &&
    isNullableDateString(task.completedAt)
  );
}

function isStoredSubject(value: unknown) {
  if (!value || typeof value !== 'object') return false;
  const subject = value as Record<string, unknown>;
  return (
    typeof subject.id === 'string' &&
    subject.id.length > 0 &&
    typeof subject.name === 'string' &&
    subject.name.trim().length > 0 &&
    (subject.createdAt === undefined || isDateString(subject.createdAt))
  );
}

function hasUniqueIds(records: unknown[]) {
  const ids = records.map((record) => (record as { id: string }).id);
  return new Set(ids).size === ids.length;
}

function parseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function decodeLocalTaskData(
  currentValue: string | null,
  legacyTasksValue: string | null,
): TaskStorageLoadResult {
  if (currentValue !== null) {
    const parsed = parseJson(currentValue);
    if (!parsed || typeof parsed !== 'object') return { status: 'corrupt' };

    const saved = parsed as Partial<LocalTaskData>;
    if (
      !Array.isArray(saved.tasks) ||
      !Array.isArray(saved.subjects) ||
      !saved.tasks.every(isStoredTask) ||
      !saved.subjects.every(isStoredSubject) ||
      !hasUniqueIds(saved.tasks) ||
      !hasUniqueIds(saved.subjects)
    ) {
      return { status: 'corrupt' };
    }
    return {
      status: 'ready',
      data: migrateLocalTaskData(saved.tasks, saved.subjects),
    };
  }

  if (legacyTasksValue !== null) {
    const legacyTasks = parseJson(legacyTasksValue);
    if (
      !Array.isArray(legacyTasks) ||
      !legacyTasks.every(isStoredTask) ||
      !hasUniqueIds(legacyTasks)
    ) {
      return { status: 'corrupt' };
    }
    return {
      status: 'ready',
      data: migrateLocalTaskData(legacyTasks, []),
    };
  }

  return { status: 'ready', data: { tasks: [], subjects: [] } };
}

export async function loadLocalTaskData(storage: TaskStorageAdapter) {
  const [currentValue, legacyTasksValue] = await Promise.all([
    storage.getItem(TASK_STORAGE_KEY),
    storage.getItem(LEGACY_TASK_STORAGE_KEY),
  ]);
  return decodeLocalTaskData(currentValue, legacyTasksValue);
}

export function serializeLocalTaskData(data: LocalTaskData) {
  return JSON.stringify({ version: 2, ...data });
}

export function persistLocalTaskData(
  storage: TaskStorageAdapter,
  data: LocalTaskData,
) {
  return storage.setItem(TASK_STORAGE_KEY, serializeLocalTaskData(data));
}

export function createTaskPersistenceQueue(
  storage: TaskStorageAdapter,
  { onWriteSuccess, onWriteError }: TaskPersistenceCallbacks,
) {
  let queue = Promise.resolve();

  return {
    enqueue(data: LocalTaskData) {
      const snapshot = serializeLocalTaskData(data);
      queue = queue
        .then(() => storage.setItem(TASK_STORAGE_KEY, snapshot))
        .then(onWriteSuccess)
        .catch(onWriteError);
      return queue;
    },
  };
}

export function resetLocalTaskData(storage: TaskStorageAdapter) {
  return storage.multiRemove(TASK_STORAGE_KEYS);
}
