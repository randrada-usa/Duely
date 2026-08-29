import type {
  ExtractedValue,
  ScanExtraction,
  ScanExtractionFields,
  ScanReviewValues,
} from './scanExtraction';
import type {
  EstimatedEffortMinutes,
  ExtractedTaskField,
  ExtractionConfidence,
  TaskExtractionProvenance,
  TaskPriority,
  TaskType,
} from './task';

export type GeminiScanExtraction = {
  title: ExtractedValue<string | null>;
  subject: ExtractedValue<string | null>;
  dueAt: ExtractedValue<string | null>;
  taskType: ExtractedValue<TaskType | null>;
  priority: ExtractedValue<TaskPriority | null>;
  estimatedEffortMinutes: ExtractedValue<EstimatedEffortMinutes | null>;
  notes: ExtractedValue<string | null>;
  hasMultipleAssignments: boolean;
};

const fieldNames: ExtractedTaskField[] = [
  'title',
  'subject',
  'dueAt',
  'taskType',
  'priority',
  'estimatedEffortMinutes',
  'notes',
];
const confidences = new Set<ExtractionConfidence>(['low', 'medium', 'high']);
const taskTypes = new Set<TaskType>([
  'assignment',
  'quiz',
  'exam',
  'project',
  'reading',
  'other',
]);
const priorities = new Set<TaskPriority>(['low', 'medium', 'high']);
const efforts = new Set<EstimatedEffortMinutes>([30, 60, 120, 180, 240]);
const confidenceWeight: Record<ExtractionConfidence, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isField(
  value: unknown,
  validValue: (candidate: unknown) => boolean,
) {
  return (
    isRecord(value) &&
    validValue(value.value) &&
    confidences.has(value.confidence as ExtractionConfidence)
  );
}

function isNullableString(value: unknown, maxLength: number) {
  return value === null || (typeof value === 'string' && value.length <= maxLength);
}

export function isGeminiScanExtraction(value: unknown): value is GeminiScanExtraction {
  if (!isRecord(value)) return false;
  return (
    isField(value.title, (item) => isNullableString(item, 240)) &&
    isField(value.subject, (item) => isNullableString(item, 80)) &&
    isField(
      value.dueAt,
      (item) =>
        item === null ||
        (typeof item === 'string' &&
          item.length <= 40 &&
          !Number.isNaN(new Date(item).getTime())),
    ) &&
    isField(value.taskType, (item) => item === null || taskTypes.has(item as TaskType)) &&
    isField(value.priority, (item) => item === null || priorities.has(item as TaskPriority)) &&
    isField(
      value.estimatedEffortMinutes,
      (item) => item === null || efforts.has(item as EstimatedEffortMinutes),
    ) &&
    isField(value.notes, (item) => isNullableString(item, 10_000)) &&
    typeof value.hasMultipleAssignments === 'boolean'
  );
}

function comparable(field: ExtractedTaskField, value: unknown) {
  if (field === 'dueAt' && typeof value === 'string') {
    const timestamp = new Date(value).getTime();
    if (!Number.isNaN(timestamp)) return timestamp;
  }
  if (typeof value === 'string') return value.trim().toLocaleLowerCase();
  return value;
}

function geminiField(
  extraction: GeminiScanExtraction,
  field: ExtractedTaskField,
) {
  return extraction[field] as ExtractedValue<unknown | null>;
}

export function mergeGeminiExtraction(
  local: ScanExtraction,
  gemini: GeminiScanExtraction,
): ScanExtraction {
  const fields = { ...local.fields } as ScanExtractionFields;
  const issues = { ...local.issues };

  for (const field of fieldNames) {
    const localField = local.fields[field] as ExtractedValue<unknown> | null;
    const aiField = geminiField(gemini, field);
    if (aiField.value === null || aiField.value === '') continue;
    if (field === 'notes' && !local.hasExplicitInstructions) continue;

    if (!localField) {
      (fields as Record<string, unknown>)[field] = aiField;
      issues[field] = 'AI suggested this value because on-device extraction did not find one. Check it.';
      continue;
    }

    if (comparable(field, localField.value) === comparable(field, aiField.value)) {
      if (localField.confidence !== 'high') {
        issues[field] = 'On-device extraction and AI agreed. Check the value before saving.';
      }
      continue;
    }

    if (confidenceWeight[aiField.confidence] > confidenceWeight[localField.confidence]) {
      (fields as Record<string, unknown>)[field] = aiField;
    }
    issues[field] = 'On-device extraction and AI disagreed. Duely kept the higher-confidence value; check it.';
  }

  return {
    ...local,
    fields,
    issues,
    hasMultipleAssignments:
      local.hasMultipleAssignments || gemini.hasMultipleAssignments,
  };
}

export function buildCombinedProvenance(
  local: ScanExtraction,
  gemini: GeminiScanExtraction,
  confirmed: ScanReviewValues,
  confirmedAt = new Date().toISOString(),
): TaskExtractionProvenance {
  const provenance: TaskExtractionProvenance = {};

  for (const field of fieldNames) {
    const localField = local.fields[field] as ExtractedValue<unknown> | null;
    const aiField = geminiField(gemini, field);
    const hasAiValue =
      aiField.value !== null &&
      aiField.value !== '' &&
      (field !== 'notes' || local.hasExplicitInstructions);
    const sources = [
      ...(localField ? (['ml-kit'] as const) : []),
      ...(hasAiValue ? (['gemini'] as const) : []),
    ];
    const finalValue = confirmed[field as keyof ScanReviewValues];
    const suggestedValue =
      hasAiValue &&
      (!localField || confidenceWeight[aiField.confidence] > confidenceWeight[localField.confidence])
        ? aiField.value
        : localField?.value;

    provenance[field] = {
      sources: [...sources],
      confidenceBySource: {
        ...(localField ? { 'ml-kit': localField.confidence } : {}),
        ...(hasAiValue ? { gemini: aiField.confidence } : {}),
      },
      comparison:
        localField && hasAiValue
          ? comparable(field, localField.value) === comparable(field, aiField.value)
            ? 'agree'
            : 'disagree'
          : 'not-compared',
      userAction:
        suggestedValue === undefined
          ? finalValue === null || finalValue === ''
            ? 'cleared'
            : 'entered'
          : comparable(field, suggestedValue) === comparable(field, finalValue)
            ? 'accepted'
            : finalValue === null || finalValue === ''
              ? 'cleared'
              : 'edited',
      confirmedAt,
    };
  }

  return provenance;
}
