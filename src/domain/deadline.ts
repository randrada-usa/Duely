import { parseLocalDateKey, toLocalDateKey } from './calendar';

export type DeadlineParts = { date: string; time: string };

export function deadlineParts(value: string | null): DeadlineParts {
  if (!value) return { date: '', time: '' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '', time: '' };
  const pad = (part: number) => String(part).padStart(2, '0');
  return {
    date: toLocalDateKey(date),
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

export function parseLocalDeadline(
  dateText: string,
  timeText: string,
): { dueAt: string | null; error: string | null } {
  const dateValue = dateText.trim();
  const timeValue = timeText.trim() || '23:59';
  if (!dateValue) return { dueAt: null, error: null };

  const date = parseLocalDateKey(dateValue);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue);
  if (!date || !timeMatch) {
    return { dueAt: null, error: 'Choose a valid deadline date and time.' };
  }

  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  if (hours > 23 || minutes > 59) {
    return { dueAt: null, error: 'Choose a valid deadline date and time.' };
  }

  date.setHours(hours, minutes, 0, 0);
  return { dueAt: date.toISOString(), error: null };
}

export function pickerDate(dateText: string, timeText: string, now = new Date()) {
  const parsed = parseLocalDeadline(dateText, timeText);
  return parsed.dueAt ? new Date(parsed.dueAt) : now;
}
