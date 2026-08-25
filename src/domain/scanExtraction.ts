import { parseLocalDeadline } from './deadline';
import {
  type EstimatedEffortMinutes,
  type ExtractedTaskField,
  type ExtractionConfidence,
  type TaskExtractionProvenance,
  type TaskPriority,
  type TaskType,
} from './task';

export type ExtractedValue<T> = {
  value: T;
  confidence: ExtractionConfidence;
};

export type ScanExtractionFields = {
  title: ExtractedValue<string> | null;
  subject: ExtractedValue<string> | null;
  dueAt: ExtractedValue<string> | null;
  taskType: ExtractedValue<TaskType> | null;
  priority: ExtractedValue<TaskPriority> | null;
  estimatedEffortMinutes: ExtractedValue<EstimatedEffortMinutes> | null;
  notes: ExtractedValue<string> | null;
};

export type ScanExtraction = {
  rawText: string;
  fields: ScanExtractionFields;
  issues: Partial<Record<ExtractedTaskField, string>>;
  hasMultipleAssignments: boolean;
};

export type ScanReviewValues = {
  title: string;
  subject: string;
  dueAt: string | null;
  taskType: TaskType;
  priority: TaskPriority;
  estimatedEffortMinutes: EstimatedEffortMinutes | null;
  notes: string;
};

const metadataLabelPattern = /^(?:assignment\s+title|title|subject(?:\s*&\s*course)?|course|due(?:\s+date)?|deadline|task\s+type|type|priority|estimated\s+(?:time|effort|workload)|workload|instructions?|notes?|description)\b/i;
const monthPattern = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const monthNumbers: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function cleanLines(text: string) {
  return text
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function labeledValue(lines: string[], labels: string) {
  const inlinePattern = new RegExp(`^(?:${labels})\\s*[:\\-–—]\\s*(.+)$`, 'i');
  const labelOnlyPattern = new RegExp(`^(?:${labels})\\s*[:\\-–—]?$`, 'i');

  for (let index = 0; index < lines.length; index += 1) {
    const inline = inlinePattern.exec(lines[index]);
    if (inline?.[1]?.trim()) {
      return { value: inline[1].trim(), index };
    }
    if (labelOnlyPattern.test(lines[index]) && lines[index + 1]) {
      return { value: lines[index + 1], index: index + 1 };
    }
  }
  return null;
}

function labeledWindow(lines: string[], labels: string, maxFollowing = 6) {
  const labelPattern = new RegExp(
    `^(?:${labels})\\b\\s*[:\\-–—]?\\s*(.*)$`,
    'i',
  );
  const labelIndex = lines.findIndex((line) => labelPattern.test(line));
  if (labelIndex < 0) return null;

  const inlineValue = labelPattern.exec(lines[labelIndex])?.[1]?.trim() ?? '';
  if (inlineValue) return inlineValue;

  const values: string[] = [];
  for (
    let index = labelIndex + 1;
    index < lines.length && index <= labelIndex + maxFollowing;
    index += 1
  ) {
    if (metadataLabelPattern.test(lines[index])) break;
    values.push(lines[index]);
  }
  return values.join(' ');
}

function titleCandidate(lines: string[]) {
  const labeled = labeledValue(lines, 'assignment\\s+title|title|task');
  if (labeled) {
    return {
      field: { value: labeled.value, confidence: 'high' } satisfies ExtractedValue<string>,
      lineIndex: labeled.index,
    };
  }

  const lineIndex = lines.findIndex(
    (line) =>
      line.length >= 4 &&
      line.length <= 120 &&
      !metadataLabelPattern.test(line) &&
      !/^assignment\s*(?:#|no\.?\s*)?\d+$/i.test(line) &&
      !/^(?:submit|complete|answer|read|solve)\b/i.test(line),
  );
  if (lineIndex < 0) return { field: null, lineIndex: -1 };
  return {
    field: { value: lines[lineIndex], confidence: 'low' } satisfies ExtractedValue<string>,
    lineIndex,
  };
}

function subjectCandidate(lines: string[]) {
  const labeled = labeledValue(lines, 'subject(?:\\s*&\\s*course)?|course');
  if (labeled) {
    return {
      field: { value: labeled.value, confidence: 'high' } satisfies ExtractedValue<string>,
      lineIndex: labeled.index,
    };
  }

  const lineIndex = lines.findIndex(
    (line) =>
      line.length <= 100 &&
      /\b[A-Z]{2,6}\s*[- ]?\d{2,4}[A-Z]?\b/.test(line),
  );
  if (lineIndex < 0) return { field: null, lineIndex: -1 };
  return {
    field: { value: lines[lineIndex], confidence: 'medium' } satisfies ExtractedValue<string>,
    lineIndex,
  };
}

function timeFromText(value: string) {
  const twelveHour = /\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)\b/i.exec(value);
  if (twelveHour) {
    let hour = Number(twelveHour[1]);
    const minutes = Number(twelveHour[2] ?? '00');
    const isPm = twelveHour[3].toLowerCase().startsWith('p');
    if (hour === 12) hour = 0;
    if (isPm) hour += 12;
    return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  const twentyFourHour = /\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(value);
  if (!twentyFourHour) return '';
  return `${String(Number(twentyFourHour[1])).padStart(2, '0')}:${twentyFourHour[2]}`;
}

function dateKeyFromText(value: string, now: Date) {
  const iso = /\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/.exec(value);
  if (iso) {
    return {
      date: `${iso[1]}-${String(Number(iso[2])).padStart(2, '0')}-${String(Number(iso[3])).padStart(2, '0')}`,
      inferredYear: false,
      ambiguous: false,
    };
  }

  const named = new RegExp(
    `\\b${monthPattern}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(20\\d{2}))?\\b`,
    'i',
  ).exec(value);
  if (named) {
    const month = monthNumbers[named[1].slice(0, 3).toLowerCase()];
    const year = Number(named[3] ?? now.getFullYear());
    return {
      date: `${year}-${String(month).padStart(2, '0')}-${String(Number(named[2])).padStart(2, '0')}`,
      inferredYear: !named[3],
      ambiguous: false,
    };
  }

  const namedDayFirst = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${monthPattern}(?:,?\\s+(20\\d{2}))?\\b`,
    'i',
  ).exec(value);
  if (namedDayFirst) {
    const month = monthNumbers[namedDayFirst[2].slice(0, 3).toLowerCase()];
    const year = Number(namedDayFirst[3] ?? now.getFullYear());
    return {
      date: `${year}-${String(month).padStart(2, '0')}-${String(Number(namedDayFirst[1])).padStart(2, '0')}`,
      inferredYear: !namedDayFirst[3],
      ambiguous: false,
    };
  }

  const numeric = /\b(0?[1-9]|[12]\d|3[01])[/-](0?[1-9]|[12]\d|3[01])[/-](20\d{2})\b/.exec(value);
  if (!numeric) return null;
  const first = Number(numeric[1]);
  const second = Number(numeric[2]);
  if (first <= 12 && second <= 12) {
    return { date: '', inferredYear: false, ambiguous: true };
  }

  const day = first > 12 ? first : second;
  const month = first > 12 ? second : first;
  return {
    date: `${numeric[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    inferredYear: false,
    ambiguous: false,
  };
}

function deadlineCandidate(lines: string[], now: Date) {
  const dueLines = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /\b(?:due(?:\s+date)?|deadline)\b/i.test(line));
  let issue: string | null = null;

  for (const { line, index } of dueLines) {
    const nearbyLines = [line];
    for (let offset = 1; offset <= 2; offset += 1) {
      const nextLine = lines[index + offset];
      if (!nextLine || metadataLabelPattern.test(nextLine)) break;
      nearbyLines.push(nextLine);
    }
    const candidateText = nearbyLines.join(' ');
    const parsedDate = dateKeyFromText(candidateText, now);
    if (!parsedDate) {
      issue = 'A deadline label was found, but its date could not be read. Add it manually.';
      continue;
    }
    if (parsedDate.ambiguous) {
      issue = 'The numeric deadline could mean day/month or month/day. Choose the correct date.';
      continue;
    }

    const time = timeFromText(candidateText);
    const deadline = parseLocalDeadline(parsedDate.date, time);
    if (deadline.error || !deadline.dueAt) {
      issue = 'The detected deadline is not a valid calendar date. Choose it manually.';
      continue;
    }

    const confidence: ExtractionConfidence = parsedDate.inferredYear
      ? 'low'
      : time
        ? 'high'
        : 'medium';
    return {
      field: { value: deadline.dueAt, confidence } satisfies ExtractedValue<string>,
      lineIndex: nearbyLines.length > 1 ? index + 1 : index,
      issue: parsedDate.inferredYear
        ? `The year was not shown clearly, so Duely used ${now.getFullYear()}. Check it.`
        : !time
          ? 'No deadline time was found. Duely used 11:59 PM; check it.'
          : null,
    };
  }

  return { field: null, lineIndex: -1, issue };
}

function taskTypeCandidate(lines: string[], title: string | null) {
  const labeled = labeledWindow(lines, 'task\\s+type|type');
  const matches: Array<[RegExp, TaskType]> = [
    [/\bquiz\b/i, 'quiz'],
    [/\bexam(?:ination)?\b/i, 'exam'],
    [/\bproject\b/i, 'project'],
    [/\b(?:reading|read)\b/i, 'reading'],
    [/\b(?:assignment|problem\s+set|worksheet|activity)\b/i, 'assignment'],
  ];
  const labeledMatches = labeled
    ? matches.filter(([pattern]) => pattern.test(labeled))
    : [];
  const value =
    labeledMatches.length === 1
      ? labeledMatches[0][1]
      : matches.find(([pattern]) => pattern.test(title ?? ''))?.[1];
  if (!value) return null;
  return {
    value,
    confidence: labeledMatches.length === 1 ? 'high' : 'medium',
  } satisfies ExtractedValue<TaskType>;
}

function priorityCandidate(lines: string[]) {
  const labeled = labeledWindow(lines, 'priority');
  if (!labeled) return null;
  const candidates: Array<[RegExp, TaskPriority]> = [
    [/\blow\b/i, 'low'],
    [/\bmedium\b/i, 'medium'],
    [/\bhigh\b/i, 'high'],
  ];
  const matches = candidates.filter(([pattern]) => pattern.test(labeled));
  return matches.length === 1
    ? ({
        value: matches[0][1],
        confidence: 'high',
      } satisfies ExtractedValue<TaskPriority>)
    : null;
}

function effortCandidate(lines: string[]) {
  const text = labeledWindow(
    lines,
    'estimated\\s+(?:time|effort|workload)|workload',
  )?.toLowerCase();
  if (!text) return null;
  const candidates = [
    { value: 30 as const, pattern: /\b30\s*min(?:ute)?s?\b/ },
    { value: 60 as const, pattern: /\b(?:1|one)\s*(?:h(?:r|rs)?|hours?)\b/ },
    { value: 120 as const, pattern: /\b(?:2|two)\s*(?:h(?:r|rs)?|hours?)\b/ },
    { value: 180 as const, pattern: /\b(?:3|three)\s*(?:h(?:r|rs)?|hours?)\b/ },
    {
      value: 240 as const,
      pattern: /\b(?:4|four)\s*\+?\s*(?:h(?:r|rs)?|hours?)\b/,
    },
  ].filter((candidate) => candidate.pattern.test(text));

  // OCR cannot identify which visual chip is selected when a form shows
  // several workload choices, even when each choice arrives as its own line.
  // Only accept a labeled value when the nearby text contains one candidate.
  return candidates.length === 1
    ? ({
        value: candidates[0].value,
        confidence: 'high',
      } satisfies ExtractedValue<EstimatedEffortMinutes>)
    : null;
}

function notesCandidate(lines: string[], excludedIndexes: Set<number>) {
  const labelPattern = /^(?:instructions?|notes?|description)\s*[:\-–—]?\s*(.*)$/i;
  const labelIndex = lines.findIndex((line) => labelPattern.test(line));
  if (labelIndex >= 0) {
    const first = labelPattern.exec(lines[labelIndex])?.[1]?.trim() ?? '';
    const values = first ? [first] : [];
    for (let index = labelIndex + 1; index < lines.length; index += 1) {
      if (metadataLabelPattern.test(lines[index])) break;
      values.push(lines[index]);
    }
    const value = values.join('\n').trim();
    if (value) {
      return { value, confidence: 'high' } satisfies ExtractedValue<string>;
    }
  }

  const remaining = lines.filter(
    (line, index) =>
      !excludedIndexes.has(index) &&
      !metadataLabelPattern.test(line) &&
      !/^assignment\s*(?:#|no\.?\s*)?\d+$/i.test(line) &&
      line.length >= 18,
  );
  if (!remaining.length) return null;
  return {
    value: remaining.slice(0, 8).join('\n'),
    confidence: 'low',
  } satisfies ExtractedValue<string>;
}

export function detectsMultipleAssignments(lines: readonly string[]) {
  const numberedHeadings = lines
    .map((line) => /^assignment\s*(?:#|no\.?\s*)?(\d+)\b/i.exec(line)?.[1])
    .filter((value): value is string => Boolean(value));
  return new Set(numberedHeadings).size > 1;
}

function issueFor<T>(
  field: ExtractedValue<T> | null,
  missing: string,
  uncertain: string,
) {
  if (!field) return missing;
  return field.confidence === 'high' ? undefined : uncertain;
}

export function extractTaskFromOcr(text: string, now = new Date()): ScanExtraction {
  const rawText = text.trim();
  const lines = cleanLines(rawText);
  const title = titleCandidate(lines);
  const subject = subjectCandidate(lines);
  const deadline = deadlineCandidate(lines, now);
  const taskType = taskTypeCandidate(lines, title.field?.value ?? null);
  const priority = priorityCandidate(lines);
  const estimatedEffortMinutes = effortCandidate(lines);
  const excludedIndexes = new Set(
    [title.lineIndex, subject.lineIndex, deadline.lineIndex].filter(
      (index) => index >= 0,
    ),
  );
  const notes = notesCandidate(lines, excludedIndexes);
  const fields: ScanExtractionFields = {
    title: title.field,
    subject: subject.field,
    dueAt: deadline.field,
    taskType,
    priority,
    estimatedEffortMinutes,
    notes,
  };

  return {
    rawText,
    fields,
    hasMultipleAssignments: detectsMultipleAssignments(lines),
    issues: {
      title: issueFor(
        fields.title,
        'No assignment title was found. Enter one before saving.',
        'Duely used the first likely heading. Check the title.',
      ),
      subject: issueFor(
        fields.subject,
        'No subject was found. You can keep this task Unassigned.',
        'This looks like a course name or code. Check it.',
      ),
      dueAt:
        deadline.issue ??
        issueFor(
          fields.dueAt,
          'No deadline was found. Add one if the assignment has a due date.',
          'Check the detected deadline before saving.',
        ),
      taskType: issueFor(
        fields.taskType,
        'Task type was not stated. Assignment is selected by default.',
        'Task type was inferred from the title. Check it.',
      ),
      priority: issueFor(
        fields.priority,
        'Priority was not stated. Medium is selected by default.',
        'Check the detected priority.',
      ),
      estimatedEffortMinutes: issueFor(
        fields.estimatedEffortMinutes,
        'Workload was not stated. Not estimated is selected by default.',
        'Check the detected workload.',
      ),
      notes: issueFor(
        fields.notes,
        'No instructions were found. Add any missing details.',
        'These instructions were assembled from likely detail lines. Check them.',
      ),
    },
  };
}

export function scanReviewValues(extraction: ScanExtraction): ScanReviewValues {
  return {
    title: extraction.fields.title?.value ?? '',
    subject: extraction.fields.subject?.value ?? '',
    dueAt: extraction.fields.dueAt?.value ?? null,
    taskType: extraction.fields.taskType?.value ?? 'assignment',
    priority: extraction.fields.priority?.value ?? 'medium',
    estimatedEffortMinutes:
      extraction.fields.estimatedEffortMinutes?.value ?? null,
    notes: extraction.fields.notes?.value ?? '',
  };
}

function comparableValue(value: unknown) {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase() : value;
}

export function buildMlKitProvenance(
  extraction: ScanExtraction,
  confirmed: ScanReviewValues,
  confirmedAt = new Date().toISOString(),
): TaskExtractionProvenance {
  const provenance: TaskExtractionProvenance = {};
  const fields = Object.keys(extraction.fields) as ExtractedTaskField[];

  for (const field of fields) {
    const extracted = extraction.fields[field] as ExtractedValue<unknown> | null;
    const finalValue = confirmed[field as keyof ScanReviewValues];
    provenance[field] = {
      sources: extracted ? ['ml-kit'] : [],
      confidenceBySource: extracted
        ? { 'ml-kit': extracted.confidence }
        : {},
      comparison: 'not-compared',
      userAction: extracted
        ? comparableValue(extracted.value) === comparableValue(finalValue)
          ? 'accepted'
          : finalValue === null || finalValue === ''
            ? 'cleared'
            : 'edited'
        : finalValue === null || finalValue === ''
          ? 'cleared'
          : 'entered',
      confirmedAt,
    };
  }

  return provenance;
}
