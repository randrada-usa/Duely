import type { SupabaseClient } from '@supabase/supabase-js';

import { migrateLocalTaskData, type LocalTaskData } from '../domain/subject';
import type {
  EstimatedEffortMinutes,
  ReminderMinutes,
  TaskExtractionProvenance,
  TaskPriority,
  TaskStatus,
  TaskType,
} from '../domain/task';
import { CLOUD_BACKUP_ERROR } from './cloudBackup';

type CloudSubjectRow = { id: string; client_id: string; name: string; created_at: string };
type CloudTaskRow = {
  id: string;
  client_id: string;
  subject_id: string | null;
  title: string;
  notes: string;
  due_at: string | null;
  task_type: TaskType;
  priority: TaskPriority;
  estimated_effort_minutes: EstimatedEffortMinutes | null;
  status: TaskStatus;
  completed_at: string | null;
  extraction_provenance: TaskExtractionProvenance | null;
  created_at: string;
};
type CloudReminderRow = { task_id: string; minutes_before: ReminderMinutes };

export type CloudRestoreGateway = {
  subjects: (userId: string) => Promise<CloudSubjectRow[]>;
  tasks: (userId: string) => Promise<CloudTaskRow[]>;
  reminders: (userId: string) => Promise<CloudReminderRow[]>;
};

export async function loadCloudTaskData(
  gateway: CloudRestoreGateway,
  userId: string,
): Promise<LocalTaskData> {
  try {
    const [subjects, tasks, reminders] = await Promise.all([
      gateway.subjects(userId),
      gateway.tasks(userId),
      gateway.reminders(userId),
    ]);
    const subjectClientIds = new Map(
      subjects.map((subject) => [subject.id, subject.client_id]),
    );
    const remindersByTask = new Map(
      reminders.map((reminder) => [reminder.task_id, reminder.minutes_before]),
    );
    return migrateLocalTaskData(
      tasks.map((task) => ({
        id: task.client_id,
        title: task.title,
        subjectId: task.subject_id
          ? (subjectClientIds.get(task.subject_id) ?? null)
          : null,
        notes: task.notes,
        dueAt: task.due_at,
        taskType: task.task_type,
        estimatedEffortMinutes: task.estimated_effort_minutes,
        priority: task.priority,
        reminderMinutesBefore: remindersByTask.get(task.id) ?? null,
        status: task.status,
        createdAt: task.created_at,
        completedAt: task.completed_at,
        sourceImageRef: null,
        extractionProvenance: task.extraction_provenance,
      })),
      subjects.map((subject) => ({
        id: subject.client_id,
        name: subject.name,
        createdAt: subject.created_at,
      })),
    );
  } catch {
    throw new Error(CLOUD_BACKUP_ERROR);
  }
}

export function createSupabaseCloudRestoreGateway(
  supabase: SupabaseClient,
): CloudRestoreGateway {
  return {
    async subjects(userId) {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, client_id, name, created_at')
        .eq('user_id', userId);
      if (error) throw error;
      return (data ?? []) as CloudSubjectRow[];
    },
    async tasks(userId) {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, client_id, subject_id, title, notes, due_at, task_type, priority, estimated_effort_minutes, status, completed_at, extraction_provenance, created_at')
        .eq('user_id', userId);
      if (error) throw error;
      return (data ?? []) as CloudTaskRow[];
    },
    async reminders(userId) {
      const { data, error } = await supabase
        .from('reminders')
        .select('task_id, minutes_before')
        .eq('user_id', userId);
      if (error) throw error;
      return (data ?? []) as CloudReminderRow[];
    },
  };
}
