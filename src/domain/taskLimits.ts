export const TASK_TITLE_MAX_LENGTH = 120;
export const TASK_NOTES_MAX_LENGTH = 2_000;

export function taskTextLimitError(title: string, notes: string) {
  if (title.length > TASK_TITLE_MAX_LENGTH) {
    return `Keep the task title to ${TASK_TITLE_MAX_LENGTH} characters or fewer.`;
  }
  if (notes.length > TASK_NOTES_MAX_LENGTH) {
    return `Keep instructions and notes to ${TASK_NOTES_MAX_LENGTH.toLocaleString()} characters or fewer.`;
  }
  return null;
}

export function taskTextWithinLimits(title: string, notes: string) {
  return taskTextLimitError(title, notes) === null;
}
