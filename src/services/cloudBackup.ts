import type { SupabaseClient } from '@supabase/supabase-js';

import { reminderTriggerAt } from '../domain/reminder';
import { subjectNameKey, type LocalTaskData } from '../domain/subject';

export const CLOUD_BACKUP_ERROR =
  'Duely could not confirm the backup. Your tasks are still safe on this device.';

export type RemoteSubject = {
  id: string;
  client_id: string;
  name: string;
};

export type RemoteTask = {
  id: string;
  client_id: string;
};

export type SubjectBackupRow = {
  user_id: string;
  client_id: string;
  name: string;
  created_at: string;
};

export type TaskBackupRow = {
  user_id: string;
  client_id: string;
  subject_id: string | null;
  title: string;
  notes: string;
  due_at: string | null;
  task_type: string;
  priority: string;
  estimated_effort_minutes: number | null;
  status: string;
  completed_at: string | null;
  source_image_path: null;
  extraction_provenance: object | null;
  created_at: string;
};

export type ReminderBackupRow = {
  user_id: string;
  task_id: string;
  minutes_before: number;
  scheduled_for: string;
};

export type CloudBackupGateway = {
  listSubjects: (userId: string) => Promise<RemoteSubject[]>;
  insertSubjects: (rows: SubjectBackupRow[]) => Promise<void>;
  listTasks: (userId: string) => Promise<RemoteTask[]>;
  insertTasks: (rows: TaskBackupRow[]) => Promise<void>;
  listReminderTaskIds: (userId: string) => Promise<string[]>;
  insertReminders: (rows: ReminderBackupRow[]) => Promise<void>;
};

export type CloudBackupResult = {
  subjectsConfirmed: number;
  tasksConfirmed: number;
  remindersConfirmed: number;
};

function backupFailure(): never {
  throw new Error(CLOUD_BACKUP_ERROR);
}

function subjectIdMap(
  data: LocalTaskData,
  remoteSubjects: RemoteSubject[],
) {
  const byClientId = new Map(
    remoteSubjects.map((subject) => [subject.client_id, subject.id]),
  );
  const byName = new Map(
    remoteSubjects.map((subject) => [subjectNameKey(subject.name), subject.id]),
  );
  return new Map(
    data.subjects.flatMap((subject) => {
      const remoteId =
        byClientId.get(subject.id) ?? byName.get(subjectNameKey(subject.name));
      return remoteId ? [[subject.id, remoteId] as const] : [];
    }),
  );
}

async function confirmSubjects(
  gateway: CloudBackupGateway,
  userId: string,
  data: LocalTaskData,
) {
  let remoteSubjects = await gateway.listSubjects(userId);
  let resolved = subjectIdMap(data, remoteSubjects);
  const missing = data.subjects.filter((subject) => !resolved.has(subject.id));

  if (missing.length > 0) {
    try {
      await gateway.insertSubjects(
        missing.map((subject) => ({
          user_id: userId,
          client_id: subject.id,
          name: subject.name,
          created_at: subject.createdAt,
        })),
      );
    } catch {
      // The request may have reached Postgres before the connection failed.
      // Confirmation below determines whether retrying is necessary.
    }
    remoteSubjects = await gateway.listSubjects(userId);
    resolved = subjectIdMap(data, remoteSubjects);
  }

  if (resolved.size !== data.subjects.length) backupFailure();
  return resolved;
}

async function confirmTasks(
  gateway: CloudBackupGateway,
  userId: string,
  data: LocalTaskData,
  remoteSubjectIds: Map<string, string>,
) {
  let remoteTasks = await gateway.listTasks(userId);
  const existingClientIds = new Set(remoteTasks.map((task) => task.client_id));
  const missing = data.tasks.filter((task) => !existingClientIds.has(task.id));

  if (missing.length > 0) {
    try {
      await gateway.insertTasks(
        missing.map((task) => ({
          user_id: userId,
          client_id: task.id,
          subject_id: task.subjectId
            ? (remoteSubjectIds.get(task.subjectId) ?? null)
            : null,
          title: task.title,
          notes: task.notes,
          due_at: task.dueAt,
          task_type: task.taskType,
          priority: task.priority,
          estimated_effort_minutes: task.estimatedEffortMinutes,
          status: task.status,
          completed_at: task.completedAt,
          // Device file references are intentionally never uploaded as cloud paths.
          source_image_path: null,
          extraction_provenance: task.extractionProvenance,
          created_at: task.createdAt,
        })),
      );
    } catch {
      // Verify below before reporting failure so interrupted retries stay idempotent.
    }
    remoteTasks = await gateway.listTasks(userId);
  }

  const remoteByClientId = new Map(
    remoteTasks.map((task) => [task.client_id, task.id]),
  );
  if (data.tasks.some((task) => !remoteByClientId.has(task.id))) backupFailure();
  return remoteByClientId;
}

async function confirmReminders(
  gateway: CloudBackupGateway,
  userId: string,
  data: LocalTaskData,
  remoteTaskIds: Map<string, string>,
) {
  const desired = data.tasks.flatMap<ReminderBackupRow>((task) => {
    if (!task.dueAt || task.reminderMinutesBefore === null) return [];
    const scheduledFor = reminderTriggerAt(
      task.dueAt,
      task.reminderMinutesBefore,
    );
    const remoteTaskId = remoteTaskIds.get(task.id);
    if (!scheduledFor || !remoteTaskId) return [];
    return [
      {
        user_id: userId,
        task_id: remoteTaskId,
        minutes_before: task.reminderMinutesBefore,
        scheduled_for: scheduledFor.toISOString(),
      },
    ];
  });
  if (desired.length === 0) return 0;

  let confirmed = new Set(await gateway.listReminderTaskIds(userId));
  const missing = desired.filter((row) => !confirmed.has(row.task_id));
  if (missing.length > 0) {
    try {
      await gateway.insertReminders(missing);
    } catch {
      // Confirm after any interrupted write before asking the student to retry.
    }
    confirmed = new Set(await gateway.listReminderTaskIds(userId));
  }
  if (desired.some((row) => !confirmed.has(row.task_id))) backupFailure();
  return desired.length;
}

export async function backupLocalTaskData(
  gateway: CloudBackupGateway,
  userId: string,
  data: LocalTaskData,
): Promise<CloudBackupResult> {
  if (!userId) backupFailure();

  try {
    const subjectIds = await confirmSubjects(gateway, userId, data);
    const taskIds = await confirmTasks(gateway, userId, data, subjectIds);
    const remindersConfirmed = await confirmReminders(
      gateway,
      userId,
      data,
      taskIds,
    );
    return {
      subjectsConfirmed: data.subjects.length,
      tasksConfirmed: data.tasks.length,
      remindersConfirmed,
    };
  } catch {
    backupFailure();
  }
}

export function createSupabaseCloudBackupGateway(
  supabase: SupabaseClient,
): CloudBackupGateway {
  return {
    async listSubjects(userId) {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, client_id, name')
        .eq('user_id', userId);
      if (error) backupFailure();
      return (data ?? []) as RemoteSubject[];
    },
    async insertSubjects(rows) {
      if (rows.length === 0) return;
      const { error } = await supabase
        .from('subjects')
        .upsert(rows, {
          onConflict: 'user_id,client_id',
          ignoreDuplicates: true,
        });
      if (error) backupFailure();
    },
    async listTasks(userId) {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, client_id')
        .eq('user_id', userId);
      if (error) backupFailure();
      return (data ?? []) as RemoteTask[];
    },
    async insertTasks(rows) {
      if (rows.length === 0) return;
      const { error } = await supabase
        .from('tasks')
        .upsert(rows, {
          onConflict: 'user_id,client_id',
          ignoreDuplicates: true,
        });
      if (error) backupFailure();
    },
    async listReminderTaskIds(userId) {
      const { data, error } = await supabase
        .from('reminders')
        .select('task_id')
        .eq('user_id', userId);
      if (error) backupFailure();
      return (data ?? []).map((row) => row.task_id as string);
    },
    async insertReminders(rows) {
      if (rows.length === 0) return;
      const { error } = await supabase
        .from('reminders')
        .upsert(rows, {
          onConflict: 'user_id,task_id',
          ignoreDuplicates: true,
        });
      if (error) backupFailure();
    },
  };
}
