import { normalizeTask, type Task } from './task';

export const UNASSIGNED_SUBJECT_NAME = 'Unassigned';

export type Subject = {
  id: string;
  name: string;
  createdAt: string;
};

export type LocalTaskData = {
  tasks: Task[];
  subjects: Subject[];
};

type LegacyTask = Task & { subject?: unknown };

export function normalizeSubjectName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function subjectNameKey(value: string) {
  return normalizeSubjectName(value).toLocaleLowerCase();
}

export function subjectNameForId(
  subjects: Subject[],
  subjectId: string | null,
) {
  if (!subjectId) return UNASSIGNED_SUBJECT_NAME;
  return subjects.find((subject) => subject.id === subjectId)?.name ?? UNASSIGNED_SUBJECT_NAME;
}

export function subjectNameError(
  subjects: Subject[],
  value: string,
  excludedId?: string,
) {
  const name = normalizeSubjectName(value);
  if (!name) return 'Enter a subject name.';
  if (subjectNameKey(name) === subjectNameKey(UNASSIGNED_SUBJECT_NAME)) {
    return 'Unassigned is reserved for tasks without a subject.';
  }
  if (
    subjects.some(
      (subject) =>
        subject.id !== excludedId && subjectNameKey(subject.name) === subjectNameKey(name),
    )
  ) {
    return 'A subject with this name already exists.';
  }
  return null;
}

function legacySubjectId(name: string, usedIds: Set<string>) {
  let hash = 2166136261;
  for (const character of subjectNameKey(name)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  const base = `subject_legacy_${(hash >>> 0).toString(36)}`;
  let candidate = base;
  let suffix = 2;
  while (usedIds.has(candidate)) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export function migrateLocalTaskData(
  rawTasks: unknown,
  rawSubjects: unknown,
): LocalTaskData {
  const subjects: Subject[] = [];
  const subjectIdAliases = new Map<string, string>();
  const subjectIds = new Set<string>();
  const subjectsByName = new Map<string, Subject>();

  if (Array.isArray(rawSubjects)) {
    for (const candidate of rawSubjects) {
      if (!candidate || typeof candidate !== 'object') continue;
      const stored = candidate as Partial<Subject>;
      if (typeof stored.id !== 'string' || typeof stored.name !== 'string') continue;

      const name = normalizeSubjectName(stored.name);
      if (!name || subjectIds.has(stored.id)) continue;

      const matchingSubject = subjectsByName.get(subjectNameKey(name));
      if (matchingSubject) {
        subjectIdAliases.set(stored.id, matchingSubject.id);
        continue;
      }

      const subject: Subject = {
        id: stored.id,
        name,
        createdAt:
          typeof stored.createdAt === 'string'
            ? stored.createdAt
            : new Date(0).toISOString(),
      };
      subjects.push(subject);
      subjectIds.add(subject.id);
      subjectsByName.set(subjectNameKey(subject.name), subject);
    }
  }

  const tasks = Array.isArray(rawTasks)
    ? rawTasks.flatMap<Task>((candidate) => {
        if (!candidate || typeof candidate !== 'object') return [];
        const stored = candidate as LegacyTask;
        let subjectId: string | null = null;

        if (typeof stored.subjectId === 'string') {
          const resolvedId = subjectIdAliases.get(stored.subjectId) ?? stored.subjectId;
          if (subjectIds.has(resolvedId)) subjectId = resolvedId;
        }

        if (!subjectId && typeof stored.subject === 'string') {
          const legacyName = normalizeSubjectName(stored.subject);
          if (legacyName) {
            let subject = subjectsByName.get(subjectNameKey(legacyName));
            if (!subject) {
              subject = {
                id: legacySubjectId(legacyName, subjectIds),
                name: legacyName,
                createdAt:
                  typeof stored.createdAt === 'string'
                    ? stored.createdAt
                    : new Date(0).toISOString(),
              };
              subjects.push(subject);
              subjectIds.add(subject.id);
              subjectsByName.set(subjectNameKey(subject.name), subject);
            }
            subjectId = subject.id;
          }
        }

        return [normalizeTask({ ...stored, subjectId })];
      })
    : [];

  subjects.sort((first, second) => first.name.localeCompare(second.name));
  return { tasks, subjects };
}

export function deleteSubjectFromData(
  data: LocalTaskData,
  subjectId: string,
): LocalTaskData {
  return {
    subjects: data.subjects.filter((subject) => subject.id !== subjectId),
    tasks: data.tasks.map((task) =>
      task.subjectId === subjectId ? { ...task, subjectId: null } : task,
    ),
  };
}
