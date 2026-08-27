import type { SupabaseClient } from '@supabase/supabase-js';

import { subjectNameKey, type LocalTaskData } from '../domain/subject';
import { reminderTriggerAt } from '../domain/reminder';
import {
  backupLocalTaskData,
  CLOUD_BACKUP_ERROR,
  createSupabaseCloudBackupGateway,
  type CloudBackupGateway,
  type TaskBackupRow,
} from './cloudBackup';
import type { CloudBackupReceipt } from './cloudBackupReceipt';

type TaskUpdateRow = Omit<TaskBackupRow, 'user_id' | 'client_id' | 'created_at'>;

export type CloudMirrorGateway = CloudBackupGateway & {
  updateSubject: (userId: string, remoteId: string, name: string) => Promise<void>;
  updateTask: (userId: string, remoteId: string, row: TaskUpdateRow) => Promise<void>;
  replaceReminder: (
    userId: string,
    remoteTaskId: string,
    minutesBefore: number | null,
    scheduledFor: string | null,
  ) => Promise<void>;
  deleteTasks: (userId: string, remoteIds: string[]) => Promise<void>;
  deleteSubjects: (userId: string, remoteIds: string[]) => Promise<void>;
};

function failure(): never {
  throw new Error(CLOUD_BACKUP_ERROR);
}

export async function mirrorLocalTaskData(
  gateway: CloudMirrorGateway,
  userId: string,
  data: LocalTaskData,
  previous: CloudBackupReceipt,
) {
  try {
    await backupLocalTaskData(gateway, userId, data);
    const remoteSubjects = await gateway.listSubjects(userId);
    const remoteTasks = await gateway.listTasks(userId);
    const subjectsByClientId = new Map(
      remoteSubjects.map((subject) => [subject.client_id, subject.id]),
    );
    const subjectsByName = new Map(
      remoteSubjects.map((subject) => [subjectNameKey(subject.name), subject.id]),
    );
    const subjectIds = new Map(
      data.subjects.flatMap((subject) => {
        const remoteId =
          subjectsByClientId.get(subject.id) ??
          subjectsByName.get(subjectNameKey(subject.name));
        return remoteId ? [[subject.id, remoteId] as const] : [];
      }),
    );
    const taskIds = new Map(
      remoteTasks.map((task) => [task.client_id, task.id]),
    );

    for (const subject of data.subjects) {
      const remoteId = subjectIds.get(subject.id);
      if (!remoteId) failure();
      await gateway.updateSubject(userId, remoteId, subject.name);
    }

    for (const task of data.tasks) {
      const remoteId = taskIds.get(task.id);
      if (!remoteId) failure();
      await gateway.updateTask(userId, remoteId, {
        subject_id: task.subjectId ? (subjectIds.get(task.subjectId) ?? null) : null,
        title: task.title,
        notes: task.notes,
        due_at: task.dueAt,
        task_type: task.taskType,
        priority: task.priority,
        estimated_effort_minutes: task.estimatedEffortMinutes,
        status: task.status,
        completed_at: task.completedAt,
        source_image_path: null,
        extraction_provenance: task.extractionProvenance,
      });
      const scheduled =
        task.dueAt && task.reminderMinutesBefore !== null
          ? reminderTriggerAt(task.dueAt, task.reminderMinutesBefore)
          : null;
      await gateway.replaceReminder(
        userId,
        remoteId,
        scheduled ? task.reminderMinutesBefore : null,
        scheduled?.toISOString() ?? null,
      );
    }

    const localTaskIds = new Set(data.tasks.map((task) => task.id));
    const deletedTaskRemoteIds = previous.taskIds.flatMap((clientId) => {
      const remoteId = taskIds.get(clientId);
      return !localTaskIds.has(clientId) && remoteId ? [remoteId] : [];
    });
    await gateway.deleteTasks(userId, deletedTaskRemoteIds);

    const localSubjectIds = new Set(data.subjects.map((subject) => subject.id));
    const deletedSubjectRemoteIds = previous.subjectIds.flatMap((clientId) => {
      const remoteId = subjectsByClientId.get(clientId);
      return !localSubjectIds.has(clientId) && remoteId ? [remoteId] : [];
    });
    await gateway.deleteSubjects(userId, deletedSubjectRemoteIds);

    const confirmedTasks = await gateway.listTasks(userId);
    const confirmedSubjects = await gateway.listSubjects(userId);
    if (
      data.tasks.some((task) => !confirmedTasks.some((row) => row.client_id === task.id)) ||
      data.subjects.some(
        (subject) => !confirmedSubjects.some((row) => row.client_id === subject.id),
      ) ||
      deletedTaskRemoteIds.some((id) => confirmedTasks.some((row) => row.id === id)) ||
      deletedSubjectRemoteIds.some((id) =>
        confirmedSubjects.some((row) => row.id === id),
      )
    ) {
      failure();
    }
  } catch {
    failure();
  }
}

export function createSupabaseCloudMirrorGateway(
  supabase: SupabaseClient,
): CloudMirrorGateway {
  const backup = createSupabaseCloudBackupGateway(supabase);
  return {
    ...backup,
    async updateSubject(userId, remoteId, name) {
      const { data, error } = await supabase
        .from('subjects')
        .update({ name })
        .eq('user_id', userId)
        .eq('id', remoteId)
        .select('id');
      if (error || data?.length !== 1) failure();
    },
    async updateTask(userId, remoteId, row) {
      const { data, error } = await supabase
        .from('tasks')
        .update(row)
        .eq('user_id', userId)
        .eq('id', remoteId)
        .select('id');
      if (error || data?.length !== 1) failure();
    },
    async replaceReminder(userId, remoteTaskId, minutesBefore, scheduledFor) {
      if (minutesBefore === null || !scheduledFor) {
        const { error } = await supabase
          .from('reminders')
          .delete()
          .eq('user_id', userId)
          .eq('task_id', remoteTaskId);
        if (error) failure();
        return;
      }

      // Ownership/link columns are insert-only for authenticated clients. An
      // upsert requires UPDATE privileges on those conflict columns, so update
      // the mutable fields first and insert only when the row does not exist.
      const updateExisting = () =>
        supabase
          .from('reminders')
          .update({
            minutes_before: minutesBefore,
            scheduled_for: scheduledFor,
          })
          .eq('user_id', userId)
          .eq('task_id', remoteTaskId)
          .select('task_id');
      const { data: updated, error: updateError } = await updateExisting();
      if (updateError) failure();
      if (updated?.length === 1) return;
      if ((updated?.length ?? 0) > 1) failure();

      const { error: insertError } = await supabase.from('reminders').insert({
        user_id: userId,
        task_id: remoteTaskId,
        minutes_before: minutesBefore,
        scheduled_for: scheduledFor,
      });
      if (!insertError) return;

      // A concurrent retry may have inserted the unique row first. Confirm by
      // updating it rather than turning a harmless race into a backup failure.
      const { data: recovered, error: recoveryError } = await updateExisting();
      if (recoveryError || recovered?.length !== 1) failure();
    },
    async deleteTasks(userId, remoteIds) {
      if (remoteIds.length === 0) return;
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('user_id', userId)
        .in('id', remoteIds);
      if (error) failure();
    },
    async deleteSubjects(userId, remoteIds) {
      if (remoteIds.length === 0) return;
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('user_id', userId)
        .in('id', remoteIds);
      if (error) failure();
    },
  };
}
