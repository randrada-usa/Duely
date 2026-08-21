import { toLocalDateKey } from './calendar';
import { subjectNameForId, type Subject } from './subject';
import {
  isOverdue,
  sortBySmartPriority,
  taskTypeLabel,
  type Task,
  type TaskPriority,
  type TaskType,
} from './task';

export type TaskStateFilter = 'all' | 'open' | 'completed' | 'overdue';
export type TaskSort = 'smart' | 'due' | 'created' | 'title';
export type TaskGrouping = 'none' | 'deadline' | 'subject' | 'status';

export type TaskQuery = {
  search: string;
  state: TaskStateFilter;
  noDeadline: boolean;
  subject: string;
  taskType: TaskType | null;
  priority: TaskPriority | null;
  sort: TaskSort;
  grouping: TaskGrouping;
};

export type TaskSection = {
  key: string;
  title: string | null;
  data: Task[];
};

export const ALL_SUBJECTS = 'all';
export const UNASSIGNED_SUBJECTS = 'unassigned';

export const TASK_STATE_FILTER_OPTIONS: ReadonlyArray<{
  label: string;
  value: TaskStateFilter;
}> = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Completed', value: 'completed' },
  { label: 'Overdue', value: 'overdue' },
];

export const TASK_SORT_OPTIONS: ReadonlyArray<{
  label: string;
  value: TaskSort;
}> = [
  { label: 'Smart priority', value: 'smart' },
  { label: 'Due date', value: 'due' },
  { label: 'Date created', value: 'created' },
  { label: 'Title', value: 'title' },
];

export const TASK_GROUPING_OPTIONS: ReadonlyArray<{
  label: string;
  value: TaskGrouping;
}> = [
  { label: 'None', value: 'none' },
  { label: 'Deadline', value: 'deadline' },
  { label: 'Subject', value: 'subject' },
  { label: 'Status', value: 'status' },
];

export const DEFAULT_TASK_QUERY: TaskQuery = {
  search: '',
  state: 'all',
  noDeadline: false,
  subject: ALL_SUBJECTS,
  taskType: null,
  priority: null,
  sort: 'smart',
  grouping: 'none',
};

function matchesState(task: Task, state: TaskStateFilter, now: Date) {
  if (state === 'all') return true;
  if (state === 'completed') return task.status === 'completed';
  if (state === 'overdue') return isOverdue(task, now);
  return task.status === 'open' && !isOverdue(task, now);
}

export function filterTasks(
  tasks: Task[],
  subjects: Subject[],
  query: TaskQuery,
  now = new Date(),
) {
  const search = query.search.trim().toLocaleLowerCase();

  return tasks.filter((task) => {
    if (!matchesState(task, query.state, now)) return false;
    if (query.noDeadline && task.dueAt !== null) return false;
    if (query.taskType && task.taskType !== query.taskType) return false;
    if (query.priority && task.priority !== query.priority) return false;

    if (
      query.subject !== ALL_SUBJECTS &&
      (query.subject === UNASSIGNED_SUBJECTS
        ? task.subjectId !== null
        : task.subjectId !== query.subject)
    ) {
      return false;
    }

    if (!search) return true;
    const subjectName = subjectNameForId(subjects, task.subjectId);
    return [task.title, subjectName, task.notes, taskTypeLabel(task.taskType)].some(
      (value) => value.toLocaleLowerCase().includes(search),
    );
  });
}

function validTimestamp(value: string | null) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function compareTie(first: Task, second: Task) {
  return (
    first.createdAt.localeCompare(second.createdAt) ||
    first.title.localeCompare(second.title) ||
    first.id.localeCompare(second.id)
  );
}

export function sortTasks(tasks: Task[], sort: TaskSort, now = new Date()) {
  if (sort === 'smart') return sortBySmartPriority(tasks, now);

  return [...tasks].sort((first, second) => {
    if (sort === 'due') {
      const firstDue = validTimestamp(first.dueAt);
      const secondDue = validTimestamp(second.dueAt);
      if (firstDue === null && secondDue !== null) return 1;
      if (firstDue !== null && secondDue === null) return -1;
      if (firstDue !== null && secondDue !== null && firstDue !== secondDue) {
        return firstDue - secondDue;
      }
      return compareTie(first, second);
    }

    if (sort === 'created') {
      const createdDifference =
        (validTimestamp(second.createdAt) ?? 0) -
        (validTimestamp(first.createdAt) ?? 0);
      return createdDifference || first.id.localeCompare(second.id);
    }

    return (
      first.title.localeCompare(second.title, undefined, {
        sensitivity: 'base',
      }) || compareTie(first, second)
    );
  });
}

type GroupDescriptor = {
  key: string;
  label: string;
  rank: number;
  order: number | string;
};

function statusGroup(task: Task, now: Date): GroupDescriptor {
  if (task.status === 'completed') {
    return { key: 'completed', label: 'Completed', rank: 2, order: 0 };
  }
  if (isOverdue(task, now)) {
    return { key: 'overdue', label: 'Overdue', rank: 0, order: 0 };
  }
  return { key: 'open', label: 'Open', rank: 1, order: 0 };
}

function subjectGroup(task: Task, subjects: Subject[]): GroupDescriptor {
  const label = subjectNameForId(subjects, task.subjectId);
  return {
    key: task.subjectId ?? UNASSIGNED_SUBJECTS,
    label,
    rank: task.subjectId ? 0 : 1,
    order: label.toLocaleLowerCase(),
  };
}

function deadlineGroup(task: Task, now: Date): GroupDescriptor {
  if (isOverdue(task, now)) {
    return { key: 'overdue', label: 'Overdue', rank: 0, order: 0 };
  }

  const dueTimestamp = validTimestamp(task.dueAt);
  if (dueTimestamp === null) {
    return { key: 'no-deadline', label: 'No deadline', rank: 2, order: 0 };
  }

  const dueDate = new Date(dueTimestamp);
  const todayKey = toLocalDateKey(now);
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const dueKey = toLocalDateKey(dueDate);
  const label =
    dueKey === todayKey
      ? 'Today'
      : dueKey === toLocalDateKey(tomorrow)
        ? 'Tomorrow'
        : dueDate.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: dueDate.getFullYear() === now.getFullYear() ? undefined : 'numeric',
          });

  const localDate = new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate(),
  );
  return { key: `date-${dueKey}`, label, rank: 1, order: localDate.getTime() };
}

function compareGroups(first: GroupDescriptor, second: GroupDescriptor) {
  if (first.rank !== second.rank) return first.rank - second.rank;
  if (typeof first.order === 'number' && typeof second.order === 'number') {
    return first.order - second.order;
  }
  return String(first.order).localeCompare(String(second.order));
}

export function groupTasks(
  tasks: Task[],
  grouping: TaskGrouping,
  subjects: Subject[],
  now = new Date(),
): TaskSection[] {
  if (grouping === 'none') {
    return tasks.length === 0 ? [] : [{ key: 'all', title: null, data: tasks }];
  }

  const groups = new Map<
    string,
    { descriptor: GroupDescriptor; data: Task[] }
  >();

  for (const task of tasks) {
    const descriptor =
      grouping === 'status'
        ? statusGroup(task, now)
        : grouping === 'subject'
          ? subjectGroup(task, subjects)
          : deadlineGroup(task, now);
    const existing = groups.get(descriptor.key);
    if (existing) existing.data.push(task);
    else groups.set(descriptor.key, { descriptor, data: [task] });
  }

  return [...groups.values()]
    .sort((first, second) =>
      compareGroups(first.descriptor, second.descriptor),
    )
    .map(({ descriptor, data }) => ({
      key: descriptor.key,
      title: descriptor.label,
      data,
    }));
}

export function taskSections(
  tasks: Task[],
  subjects: Subject[],
  query: TaskQuery,
  now = new Date(),
) {
  const filtered = filterTasks(tasks, subjects, query, now);
  const sorted = sortTasks(filtered, query.sort, now);
  return groupTasks(sorted, query.grouping, subjects, now);
}

export function hasActiveTaskFilters(query: TaskQuery) {
  return (
    query.search.trim().length > 0 ||
    query.state !== DEFAULT_TASK_QUERY.state ||
    query.noDeadline ||
    query.subject !== DEFAULT_TASK_QUERY.subject ||
    query.taskType !== null ||
    query.priority !== null
  );
}
