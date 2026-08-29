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

const titleLabels = 'assignment\\s+title|title|task|pamagat(?:\\s+ng\\s+gawain)?';
const subjectLabels =
  'subject(?:\\s*&\\s*course)?|course|asignatura(?:\\s*&\\s*kurso)?|kurso';
const deadlineLabels =
  'due(?:\\s+date)?|duc\\s+date|deadline|submit\\s+(?:before|by)|takdang\\s+petsa|petsa\\s+ng\\s+pagpasa';
const taskTypeLabels = 'task\\s+type|type|uri\\s+ng\\s+gawain|uri';
const priorityLabels = 'priority|prayoridad';
const effortLabels =
  'estimated\\s+(?:time|effort|workload)|workload|tinatayang\\s+(?:oras|tagal)';
const notesLabels =
  'instructions?|notes?|description|panuto|mga\\s+panuto|tala|paglalarawan';
const metadataLabelPattern = new RegExp(
  `^(?:${titleLabels}|${subjectLabels}|${deadlineLabels}|${taskTypeLabels}|${priorityLabels}|${effortLabels}|${notesLabels})\\b`,
  'i',
);
const deadlineLinePattern = new RegExp(
  `(?:^|[|•])\\s*(?:no\\s+marks\\s*)?(?:(?:critical|final|assignment)\\s+)?(?:${deadlineLabels})\\b`,
  'i',
);
const monthPattern =
  '(?:jan(?:uary)?|enero|feb(?:ruary)?|pebrero|mar(?:ch)?|marso|apr(?:il)?|abril|may|mayo|jun(?:e)?|hunyo|jul(?:y)?|hulyo|au(?:g|q)(?:ust)?|agosto|sep(?:tember)?|setyembre|oct(?:ober)?|oktubre|nov(?:ember)?|nobyembre|dec(?:ember)?|disyembre)';
const monthNumbers: Record<string, number> = {
  jan: 1,
  ene: 1,
  feb: 2,
  peb: 2,
  mar: 3,
  apr: 4,
  abr: 4,
  may: 5,
  jun: 6,
  hun: 6,
  jul: 7,
  hul: 7,
  aug: 8,
  auq: 8,
  ago: 8,
  sep: 9,
  set: 9,
  oct: 10,
  okt: 10,
  nov: 11,
  nob: 11,
  dec: 12,
  dis: 12,
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
  const labeled = labeledValue(lines, titleLabels);
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
  const labeled = labeledValue(lines, subjectLabels);
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
  const twelveHour = /\b(1[0-2]|0?[1-9])(?:\s*[.:;]\s*([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)\b/i.exec(value);
  if (twelveHour) {
    let hour = Number(twelveHour[1]);
    const minutes = Number(twelveHour[2] ?? '00');
    const isPm = twelveHour[3].toLowerCase().startsWith('p');
    if (hour === 12) hour = 0;
    if (isPm) hour += 12;
    return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  const twentyFourHour = /\b([01]?\d|2[0-3])\s*:\s*([0-5]\d)\b/.exec(value);
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
      monthCorrection: null,
    };
  }

  const named = new RegExp(
    `\\b(${monthPattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(20\\d{2}))?\\b`,
    'i',
  ).exec(value);
  if (named) {
    const monthKey = named[1].slice(0, 3).toLowerCase();
    const month = monthNumbers[monthKey];
    const year = Number(named[3] ?? now.getFullYear());
    return {
      date: `${year}-${String(month).padStart(2, '0')}-${String(Number(named[2])).padStart(2, '0')}`,
      inferredYear: !named[3],
      ambiguous: false,
      monthCorrection:
        monthKey === 'auq'
          ? 'Duely interpreted “Auqust” as August. Check the deadline.'
          : null,
    };
  }

  const namedDayFirst = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthPattern})(?:,?\\s+(20\\d{2}))?\\b`,
    'i',
  ).exec(value);
  if (namedDayFirst) {
    const monthKey = namedDayFirst[2].slice(0, 3).toLowerCase();
    const month = monthNumbers[monthKey];
    const year = Number(namedDayFirst[3] ?? now.getFullYear());
    return {
      date: `${year}-${String(month).padStart(2, '0')}-${String(Number(namedDayFirst[1])).padStart(2, '0')}`,
      inferredYear: !namedDayFirst[3],
      ambiguous: false,
      monthCorrection:
        monthKey === 'auq'
          ? 'Duely interpreted “Auqust” as August. Check the deadline.'
          : null,
    };
  }

  const numeric = /\b(0?[1-9]|[12]\d|3[01])[/-](0?[1-9]|[12]\d|3[01])[/-](20\d{2})\b/.exec(value);
  if (!numeric) return null;
  const first = Number(numeric[1]);
  const second = Number(numeric[2]);
  if (first <= 12 && second <= 12) {
    return {
      date: '',
      inferredYear: false,
      ambiguous: true,
      monthCorrection: null,
    };
  }

  const day = first > 12 ? first : second;
  const month = first > 12 ? second : first;
  return {
    date: `${numeric[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    inferredYear: false,
    ambiguous: false,
    monthCorrection: null,
  };
}

function deadlineCandidate(lines: string[], now: Date) {
  const dueLines = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => deadlineLinePattern.test(line));
  let issue: string | null = null;

  for (const { line, index } of dueLines) {
    const nearbyLines = [line];
    for (let offset = 1; offset <= 8; offset += 1) {
      const nextLine = lines[index + offset];
      if (!nextLine) break;
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
      : parsedDate.monthCorrection || !time
        ? 'medium'
        : 'high';
    const deadlineIssues = [
      parsedDate.inferredYear
        ? `The year was not shown clearly, so Duely used ${now.getFullYear()}. Check it.`
        : null,
      parsedDate.monthCorrection,
      !time
        ? 'No deadline time was found. Duely used 11:59 PM; check it.'
        : null,
    ].filter((message): message is string => message !== null);
    return {
      field: { value: deadline.dueAt, confidence } satisfies ExtractedValue<string>,
      lineIndex: nearbyLines.length > 1 ? index + 1 : index,
      issue: deadlineIssues.join(' ') || null,
    };
  }

  return { field: null, lineIndex: -1, issue };
}

function taskTypeCandidate(lines: string[], title: string | null) {
  const labeled = labeledWindow(lines, taskTypeLabels);
  const matches: Array<[RegExp, TaskType]> = [
    [/\b(?:quiz|maikling\s+pagsusulit)\b/i, 'quiz'],
    [/\b(?:exam(?:ination)?|eksamen)\b/i, 'exam'],
    [/\b(?:project|proyekto)\b/i, 'project'],
    [/\b(?:reading|read|pagbasa|basahin)\b/i, 'reading'],
    [
      /\b(?:assignment|problem\s+set|worksheet|activity|takdang[-\s]?aralin|gawain)\b/i,
      'assignment',
    ],
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
  const labeled = labeledWindow(lines, priorityLabels);
  if (!labeled) return null;
  const candidates: Array<[RegExp, TaskPriority]> = [
    [/\b(?:low|mababa)\b/i, 'low'],
    [/\b(?:medium|katamtaman)\b/i, 'medium'],
    [/\b(?:high|mataas)\b/i, 'high'],
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
    effortLabels,
  )?.toLowerCase();
  if (!text) return null;
  const candidates = [
    { value: 30 as const, pattern: /\b30\s*(?:min(?:ute)?s?|minuto)\b/ },
    {
      value: 60 as const,
      pattern: /\b(?:1|one|isa(?:ng)?)\s*(?:h(?:r|rs)?|hours?|oras)\b/,
    },
    {
      value: 120 as const,
      pattern: /\b(?:2|two|dalawa(?:ng)?)\s*(?:h(?:r|rs)?|hours?|oras)\b/,
    },
    {
      value: 180 as const,
      pattern: /\b(?:3|three|tatlo(?:ng)?)\s*(?:h(?:r|rs)?|hours?|oras)\b/,
    },
    {
      value: 240 as const,
      pattern: /\b(?:4|four|apat(?: na)?)\s*\+?\s*(?:h(?:r|rs)?|hours?|oras)\b/,
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
  const labelPattern = new RegExp(
    `^(?:${notesLabels})\\s*[:\\-–—]?\\s*(.*)$`,
    'i',
  );
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
    .map(
      (line) =>
        /^(?:assignment|gawain|takdang[-\s]?aralin)\s*(?:#|no\.?\s*)?(\d+)\b/i.exec(
          line,
        )?.[1],
    )
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
