export function homeHeroEyebrow(urgentCount: number) {
  return urgentCount > 0 ? 'NEEDS ATTENTION' : 'YOU’RE ON TRACK';
}

export function homeHeroTitle(overdueCount: number, dueSoonCount: number) {
  if (overdueCount > 0) {
    return `${overdueCount} ${overdueCount === 1 ? 'task is' : 'tasks are'} overdue`;
  }
  if (dueSoonCount > 0) {
    return `${dueSoonCount} ${dueSoonCount === 1 ? 'task is' : 'tasks are'} due soon`;
  }
  return 'No urgent tasks today';
}

export function homeHeroEmptyMessage(hasTaskHistory: boolean) {
  return hasTaskHistory
    ? 'All caught up for now.'
    : 'Add or scan your first task.';
}

export type HomeScheduleView = 'today' | 'upcoming';

export function defaultHomeScheduleView(
  todayOrOverdueCount: number,
  upcomingCount: number,
): HomeScheduleView {
  return todayOrOverdueCount === 0 && upcomingCount > 0
    ? 'upcoming'
    : 'today';
}

export function homeHeroDeadline(
  dueAt: string | null | undefined,
  locale?: string | string[],
) {
  if (!dueAt) return 'No deadline set';
  const deadline = new Date(dueAt);
  const date = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(deadline);
  const time = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(deadline);
  return `${date} · ${time}`;
}
