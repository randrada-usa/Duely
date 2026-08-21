import type { Task } from './task';

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDateKey(value: string) {
  const match = DATE_KEY_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function dueAtForLocalDate(value: string) {
  const date = parseLocalDateKey(value);
  if (!date) return null;
  date.setHours(23, 59, 0, 0);
  return date.toISOString();
}

export function startOfLocalMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function moveLocalMonth(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

export function calendarMonthCells(month: Date) {
  const first = startOfLocalMonth(month);
  const daysInMonth = new Date(
    first.getFullYear(),
    first.getMonth() + 1,
    0,
  ).getDate();
  const cells: Array<Date | null> = Array.from(
    { length: first.getDay() },
    () => null,
  );

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(first.getFullYear(), first.getMonth(), day));
  }

  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function tasksByLocalDate(tasks: Task[]) {
  const grouped = new Map<string, Task[]>();

  for (const task of tasks) {
    if (!task.dueAt) continue;
    const dueDate = new Date(task.dueAt);
    if (Number.isNaN(dueDate.getTime())) continue;
    const key = toLocalDateKey(dueDate);
    const existing = grouped.get(key) ?? [];
    existing.push(task);
    grouped.set(key, existing);
  }

  for (const dateTasks of grouped.values()) {
    dateTasks.sort((a, b) => {
      const dueDifference =
        new Date(a.dueAt ?? 0).getTime() - new Date(b.dueAt ?? 0).getTime();
      return dueDifference || a.title.localeCompare(b.title);
    });
  }

  return grouped;
}
