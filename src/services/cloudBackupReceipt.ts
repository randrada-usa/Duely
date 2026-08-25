import type { LocalTaskData } from '../domain/subject';

const CLOUD_BACKUP_RECEIPT_PREFIX = 'duely.cloud-backup-receipt.v1';

export type CloudBackupReceipt = {
  userId: string;
  taskIds: string[];
  subjectIds: string[];
  confirmedAt: string;
};

export type CloudBackupReceiptStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

export function cloudBackupReceiptKey(userId: string) {
  return `${CLOUD_BACKUP_RECEIPT_PREFIX}:${userId}`;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string' && item.length > 0) &&
    new Set(value).size === value.length
  );
}

export function decodeCloudBackupReceipt(
  value: string | null,
  userId: string,
): CloudBackupReceipt | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<CloudBackupReceipt>;
    if (
      parsed.userId !== userId ||
      !isStringArray(parsed.taskIds) ||
      !isStringArray(parsed.subjectIds) ||
      typeof parsed.confirmedAt !== 'string' ||
      Number.isNaN(new Date(parsed.confirmedAt).getTime())
    ) {
      return null;
    }
    return parsed as CloudBackupReceipt;
  } catch {
    return null;
  }
}

export async function loadCloudBackupReceipt(
  storage: CloudBackupReceiptStorage,
  userId: string,
) {
  const value = await storage.getItem(cloudBackupReceiptKey(userId));
  return decodeCloudBackupReceipt(value, userId);
}

export async function saveCloudBackupReceipt(
  storage: CloudBackupReceiptStorage,
  userId: string,
  data: LocalTaskData,
  confirmedAt: string,
) {
  const receipt: CloudBackupReceipt = {
    userId,
    taskIds: data.tasks.map((task) => task.id),
    subjectIds: data.subjects.map((subject) => subject.id),
    confirmedAt,
  };
  await storage.setItem(cloudBackupReceiptKey(userId), JSON.stringify(receipt));
  return receipt;
}

export function pendingCloudBackupCounts(
  data: LocalTaskData,
  receipt: CloudBackupReceipt | null,
) {
  const confirmedTasks = new Set(receipt?.taskIds ?? []);
  const confirmedSubjects = new Set(receipt?.subjectIds ?? []);
  return {
    tasks: data.tasks.filter((task) => !confirmedTasks.has(task.id)).length,
    subjects: data.subjects.filter(
      (subject) => !confirmedSubjects.has(subject.id),
    ).length,
  };
}
