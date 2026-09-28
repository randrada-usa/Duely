import { describe, expect, it } from 'vitest';

import {
  defaultHomeScheduleView,
  homeHeroDeadline,
  homeHeroEmptyMessage,
  homeHeroEyebrow,
  homeHeroTitle,
} from './homeHero';

describe('Home attention banner copy', () => {
  it('does not repeat the urgent-task count in the eyebrow', () => {
    expect(homeHeroEyebrow(1)).toBe('NEEDS ATTENTION');
    expect(homeHeroEyebrow(4)).toBe('NEEDS ATTENTION');
    expect(homeHeroEyebrow(0)).toBe('YOU’RE ON TRACK');
  });

  it('distinguishes a first task from an empty returning state', () => {
    expect(homeHeroEmptyMessage(false)).toBe('Add or scan your first task.');
    expect(homeHeroEmptyMessage(true)).toBe('All caught up for now.');
  });

  it('uses accurate singular and plural deadline wording', () => {
    expect(homeHeroTitle(1, 0)).toBe('1 task is overdue');
    expect(homeHeroTitle(2, 1)).toBe('2 tasks are overdue');
    expect(homeHeroTitle(0, 1)).toBe('1 task is due soon');
    expect(homeHeroTitle(0, 3)).toBe('3 tasks are due soon');
    expect(homeHeroTitle(0, 0)).toBe('No urgent tasks today');
  });

  it('keeps the complete date and time in one label', () => {
    const localDeadline = new Date(2026, 8, 24, 23, 59).toISOString();
    expect(homeHeroDeadline(localDeadline, 'en-US')).toBe(
      'Sep 24, 2026 · 11:59 PM',
    );
    expect(homeHeroDeadline(null, 'en-US')).toBe('No deadline set');
  });

  it('opens Upcoming when today is empty and future work exists', () => {
    expect(defaultHomeScheduleView(0, 2)).toBe('upcoming');
    expect(defaultHomeScheduleView(1, 2)).toBe('today');
    expect(defaultHomeScheduleView(0, 0)).toBe('today');
  });
});
