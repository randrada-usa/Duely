import { describe, expect, it } from 'vitest';

import {
  TASK_NOTES_MAX_LENGTH,
  TASK_TITLE_MAX_LENGTH,
  taskTextLimitError,
  taskTextWithinLimits,
} from './taskLimits';

describe('task text limits', () => {
  it('accepts title and notes at their exact limits', () => {
    expect(
      taskTextWithinLimits(
        'T'.repeat(TASK_TITLE_MAX_LENGTH),
        'N'.repeat(TASK_NOTES_MAX_LENGTH),
      ),
    ).toBe(true);
  });

  it('rejects a title over 120 characters', () => {
    expect(
      taskTextLimitError('T'.repeat(TASK_TITLE_MAX_LENGTH + 1), ''),
    ).toBe('Keep the task title to 120 characters or fewer.');
  });

  it('rejects instructions and notes over 2,000 characters', () => {
    expect(
      taskTextLimitError('', 'N'.repeat(TASK_NOTES_MAX_LENGTH + 1)),
    ).toBe('Keep instructions and notes to 2,000 characters or fewer.');
  });
});
