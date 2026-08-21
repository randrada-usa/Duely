export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'open' | 'completed';
export type ReminderMinutes = 0 | 15 | 60 | 1440;
export type TaskType = 'assignment' | 'quiz' | 'exam' | 'project' | 'reading' | 'other';
export type EstimatedEffortMinutes = 30 | 60 | 120 | 180 | 240;
export type ExtractionEngine = 'ml-kit' | 'gemini';
export type ExtractionConfidence = 'low' | 'medium' | 'high';
export type ExtractionComparison = 'not-compared' | 'agree' | 'disagree';
export type ExtractionUserAction = 'accepted' | 'edited' | 'entered' | 'cleared';
export type ExtractedTaskField =
  | 'title'
  | 'subject'
  | 'dueAt'
  | 'taskType'
  | 'priority'
  | 'estimatedEffortMinutes'
  | 'notes';

export type TaskFieldProvenance = {
  sources: ExtractionEngine[];
  confidenceBySource: Partial<Record<ExtractionEngine, ExtractionConfidence>>;
  comparison: ExtractionComparison;
  userAction: ExtractionUserAction;
  confirmedAt: string;
};

export type TaskExtractionProvenance = Partial<
  Record<ExtractedTaskField, TaskFieldProvenance>
>;

export const TASK_TYPE_OPTIONS: ReadonlyArray<{ label: string; value: TaskType }> = [
  { label: 'Assignment', value: 'assignment' },
  { label: 'Quiz', value: 'quiz' },
  { label: 'Exam', value: 'exam' },
  { label: 'Project', value: 'project' },
  { label: 'Reading', value: 'reading' },
  { label: 'Other', value: 'other' },
];

export const EFFORT_OPTIONS: ReadonlyArray<{
  label: string;
  value: EstimatedEffortMinutes | null;
}> = [
  { label: 'Not estimated', value: null },
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '3 hours', value: 180 },
  { label: '4+ hours', value: 240 },
];

export type Task = {
  id: string;
  title: string;
  subjectId: string | null;
  notes: string;
  dueAt: string | null;
  taskType: TaskType;
  estimatedEffortMinutes: EstimatedEffortMinutes | null;
  priority: TaskPriority;
  reminderMinutesBefore: ReminderMinutes | null;
  status: TaskStatus;
  createdAt: string;
  completedAt: string | null;
  sourceImageRef: string | null;
  extractionProvenance: TaskExtractionProvenance | null;
};

export type TaskDraft = Pick<
  Task,
  | 'title'
  | 'subjectId'
  | 'notes'
  | 'dueAt'
  | 'taskType'
  | 'estimatedEffortMinutes'
  | 'priority'
  | 'reminderMinutesBefore'
> & {
  sourceImageRef?: string | null;
  extractionProvenance?: TaskExtractionProvenance | null;
};

export function taskTypeLabel(value: TaskType) {
  return TASK_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? 'Other';
}

export function effortLabel(value: EstimatedEffortMinutes | null) {
  return EFFORT_OPTIONS.find((option) => option.value === value)?.label ?? 'Not estimated';
}

const EXTRACTION_ENGINES = new Set<ExtractionEngine>(['ml-kit', 'gemini']);
const EXTRACTION_CONFIDENCES = new Set<ExtractionConfidence>([
  'low',
  'medium',
  'high',
]);
const EXTRACTION_COMPARISONS = new Set<ExtractionComparison>([
  'not-compared',
  'agree',
  'disagree',
]);
const EXTRACTION_USER_ACTIONS = new Set<ExtractionUserAction>([
  'accepted',
  'edited',
  'entered',
  'cleared',
]);
const EXTRACTED_TASK_FIELDS = new Set<ExtractedTaskField>([
  'title',
  'subject',
  'dueAt',
  'taskType',
  'priority',
  'estimatedEffortMinutes',
  'notes',
]);
const TASK_FIELD_PROVENANCE_KEYS = new Set([
  'sources',
  'confidenceBySource',
  'comparison',
  'userAction',
  'confirmedAt',
]);
const MAX_SOURCE_IMAGE_REF_LENGTH = 2_048;

export function isSourceImageReference(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const reference = value.trim();
  return (
    reference.length > 0 &&
    reference.length <= MAX_SOURCE_IMAGE_REF_LENGTH &&
    !reference.toLowerCase().startsWith('data:')
  );
}

export function isTaskExtractionProvenance(
  value: unknown,
): value is TaskExtractionProvenance {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  return Object.entries(value).every(([field, candidate]) => {
    if (!EXTRACTED_TASK_FIELDS.has(field as ExtractedTaskField)) return false;
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      return false;
    }

    const provenance = candidate as Record<string, unknown>;
    const provenanceKeys = Object.keys(provenance);
    if (
      provenanceKeys.length !== TASK_FIELD_PROVENANCE_KEYS.size ||
      provenanceKeys.some((key) => !TASK_FIELD_PROVENANCE_KEYS.has(key))
    ) {
      return false;
    }
    if (!Array.isArray(provenance.sources)) return false;
    const sources = provenance.sources;
    if (
      !sources.every((source) =>
        EXTRACTION_ENGINES.has(source as ExtractionEngine),
      ) ||
      new Set(sources).size !== sources.length
    ) {
      return false;
    }

    const confidence = provenance.confidenceBySource;
    if (!confidence || typeof confidence !== 'object' || Array.isArray(confidence)) {
      return false;
    }
    const confidenceEntries = Object.entries(confidence);
    if (
      confidenceEntries.some(
        ([source, level]) =>
          !EXTRACTION_ENGINES.has(source as ExtractionEngine) ||
          !EXTRACTION_CONFIDENCES.has(level as ExtractionConfidence) ||
          !sources.includes(source),
      ) ||
      sources.some(
        (source) => !Object.prototype.hasOwnProperty.call(confidence, source),
      )
    ) {
      return false;
    }

    if (
      !EXTRACTION_COMPARISONS.has(
        provenance.comparison as ExtractionComparison,
      ) ||
      (sources.length < 2 &&
        provenance.comparison !== 'not-compared') ||
      (sources.length === 2 &&
        provenance.comparison === 'not-compared') ||
      !EXTRACTION_USER_ACTIONS.has(
        provenance.userAction as ExtractionUserAction,
      ) ||
      typeof provenance.confirmedAt !== 'string' ||
      Number.isNaN(new Date(provenance.confirmedAt).getTime())
    ) {
      return false;
    }

    return true;
  });
}

function normalizeExtractionProvenance(value: unknown) {
  if (!isTaskExtractionProvenance(value)) return null;
  return Object.fromEntries(
    Object.entries(value).map(([field, provenance]) => [
      field,
      {
        ...provenance,
        sources: [...provenance.sources],
        confidenceBySource: { ...provenance.confidenceBySource },
      },
    ]),
  ) as TaskExtractionProvenance;
}

export function normalizeTask(task: Task): Task {
  const taskType = TASK_TYPE_OPTIONS.some((option) => option.value === task.taskType)
    ? task.taskType
    : 'assignment';
  const estimatedEffortMinutes = EFFORT_OPTIONS.some(
    (option) => option.value === task.estimatedEffortMinutes,
  )
    ? (task.estimatedEffortMinutes ?? null)
    : null;

  return {
    id: task.id,
    title: task.title,
    subjectId: typeof task.subjectId === 'string' ? task.subjectId : null,
    notes: task.notes,
    dueAt: task.dueAt,
    taskType,
    estimatedEffortMinutes,
    priority: task.priority,
    reminderMinutesBefore: task.reminderMinutesBefore ?? null,
    status: task.status,
    createdAt: task.createdAt,
    completedAt: task.completedAt,
    sourceImageRef: isSourceImageReference(task.sourceImageRef)
      ? task.sourceImageRef.trim()
      : null,
    extractionProvenance: normalizeExtractionProvenance(
      task.extractionProvenance,
    ),
  };
}

export function isOverdue(task: Task, now = new Date()) {
  return (
    task.status === 'open' &&
    task.dueAt !== null &&
    new Date(task.dueAt).getTime() < now.getTime()
  );
}

export function smartPriorityScore(task: Task, now = new Date()) {
  if (task.status === 'completed') return Number.NEGATIVE_INFINITY;

  const priorityWeight = { low: 0, medium: 10, high: 20 }[task.priority];
  if (!task.dueAt) return priorityWeight;

  const hoursUntilDue =
    (new Date(task.dueAt).getTime() - now.getTime()) / (60 * 60 * 1000);
  const urgency = hoursUntilDue <= 0 ? 100 : Math.max(0, 72 - hoursUntilDue);
  return priorityWeight + urgency;
}

export function sortBySmartPriority(tasks: Task[], now = new Date()) {
  return [...tasks].sort((a, b) => {
    const firstScore = smartPriorityScore(a, now);
    const secondScore = smartPriorityScore(b, now);
    if (firstScore !== secondScore) return firstScore > secondScore ? -1 : 1;
    return (
      a.createdAt.localeCompare(b.createdAt) ||
      a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }) ||
      a.id.localeCompare(b.id)
    );
  });
}
