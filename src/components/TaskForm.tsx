import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { deadlineParts, parseLocalDeadline, pickerDate } from '../domain/deadline';
import { REMINDER_OPTIONS } from '../domain/reminder';
import { subjectNameKey, UNASSIGNED_SUBJECT_NAME } from '../domain/subject';
import {
  EFFORT_OPTIONS,
  TASK_TYPE_OPTIONS,
  type EstimatedEffortMinutes,
  type ExtractedTaskField,
  type ReminderMinutes,
  type TaskDraft,
  type TaskPriority,
  type TaskType,
} from '../domain/task';
import {
  hasUnsavedTaskFormChanges,
  taskFormSnapshotFromDraft,
  type TaskFormSnapshot,
} from '../domain/taskForm';
import { useTasks } from '../store/TaskStore';
import { colors, minimumTouchTarget, radius, spacing } from '../theme/tokens';
import { PrimaryButton } from './PrimaryButton';

type TaskFormProps = {
  initial?: TaskDraft;
  defaultReminder?: ReminderMinutes | null;
  submitLabel: string;
  onSubmit: (draft: TaskDraft, context: TaskFormSubmitContext) => void;
  onDirtyChange?: (hasUnsavedChanges: boolean) => void;
  fieldNotices?: Partial<Record<ExtractedTaskField, string>>;
  footer?: ReactNode;
  header?: ReactNode;
  initialSubjectName?: string;
};

export type TaskFormSubmitContext = { subjectName: string };

const blank: TaskDraft = {
  title: '',
  subjectId: null,
  notes: '',
  dueAt: null,
  taskType: 'assignment',
  estimatedEffortMinutes: null,
  priority: 'medium',
  reminderMinutesBefore: null,
};

export function TaskForm({
  initial = blank,
  defaultReminder = null,
  submitLabel,
  onSubmit,
  onDirtyChange,
  fieldNotices = {},
  footer,
  header,
  initialSubjectName = '',
}: TaskFormProps) {
  const formRef = useRef<ScrollView>(null);
  const { addSubject, subjects } = useTasks();
  const parts = deadlineParts(initial.dueAt);
  const [title, setTitle] = useState(initial.title);
  const [subjectId, setSubjectId] = useState<string | null>(initial.subjectId);
  const [notes, setNotes] = useState(initial.notes);
  const [date, setDate] = useState(parts.date);
  const [time, setTime] = useState(parts.time);
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const [taskType, setTaskType] = useState<TaskType>(initial.taskType);
  const [estimatedEffortMinutes, setEstimatedEffortMinutes] =
    useState<EstimatedEffortMinutes | null>(initial.estimatedEffortMinutes);
  const [priority, setPriority] = useState<TaskPriority>(initial.priority);
  const [reminderMinutesBefore, setReminderMinutesBefore] =
    useState<ReminderMinutes | null>(initial.reminderMinutesBefore ?? null);
  const [showSubjectInput, setShowSubjectInput] = useState(
    Boolean(initialSubjectName.trim()),
  );
  const [newSubjectName, setNewSubjectName] = useState(initialSubjectName.trim());
  const [subjectError, setSubjectError] = useState('');
  const [error, setError] = useState('');
  const [reviewedNotices, setReviewedNotices] = useState<
    Partial<Record<ExtractedTaskField, true>>
  >({});

  const currentSnapshot: TaskFormSnapshot = {
    title,
    subjectId,
    notes,
    dueDate: date,
    dueTime: time,
    taskType,
    estimatedEffortMinutes,
    priority,
    reminderMinutesBefore,
    pendingSubjectName: showSubjectInput ? newSubjectName : '',
  };
  const hasUnsavedChanges = hasUnsavedTaskFormChanges(
    taskFormSnapshotFromDraft(initial),
    currentSnapshot,
  );

  useEffect(() => {
    if (subjectId && !subjects.some((subject) => subject.id === subjectId)) {
      setSubjectId(null);
    }
  }, [subjectId, subjects]);

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyChange]);

  useEffect(() => {
    if (!error) return;
    const frame = requestAnimationFrame(() => {
      formRef.current?.scrollToEnd({ animated: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [error]);

  function acknowledgeNotice(field: ExtractedTaskField) {
    if (!fieldNotices[field]) return;
    setReviewedNotices((current) =>
      current[field] ? current : { ...current, [field]: true },
    );
  }

  function noticeFor(field: ExtractedTaskField) {
    return reviewedNotices[field] ? undefined : fieldNotices[field];
  }

  function submit() {
    if (!title.trim()) {
      setError('Enter a task title.');
      return;
    }

    const deadline = parseLocalDeadline(date, time);
    if (deadline.error) {
      setError(deadline.error);
      return;
    }

    let resolvedSubjectId = subjectId;
    let resolvedSubjectName =
      subjects.find((subject) => subject.id === subjectId)?.name ?? '';
    if (!resolvedSubjectId && showSubjectInput && newSubjectName.trim()) {
      const matchingSubject = subjects.find(
        (subject) =>
          subjectNameKey(subject.name) === subjectNameKey(newSubjectName),
      );
      if (matchingSubject) {
        resolvedSubjectId = matchingSubject.id;
        resolvedSubjectName = matchingSubject.name;
      } else {
        const result = addSubject(newSubjectName);
        if (!result.subject) {
          setSubjectError(result.error);
          return;
        }
        resolvedSubjectId = result.subject.id;
        resolvedSubjectName = result.subject.name;
      }
      setSubjectId(resolvedSubjectId);
    }

    setError('');
    setSubjectError('');
    onSubmit(
      {
        title: title.trim(),
        subjectId: resolvedSubjectId,
        notes: notes.trim(),
        dueAt: deadline.dueAt,
        taskType,
        estimatedEffortMinutes,
        priority,
        reminderMinutesBefore,
        sourceImageRef: initial.sourceImageRef,
        extractionProvenance: initial.extractionProvenance,
      },
      { subjectName: resolvedSubjectName },
    );
  }

  function createSubject() {
    const result = addSubject(newSubjectName);
    if (!result.subject) {
      setSubjectError(result.error);
      return;
    }

    setSubjectId(result.subject.id);
    setNewSubjectName('');
    setSubjectError('');
    setShowSubjectInput(false);
    acknowledgeNotice('subject');
  }

  function setNativeDeadline(selected: Date) {
    const selectedParts = deadlineParts(selected.toISOString());
    if (pickerMode === 'date') {
      if (!date && reminderMinutesBefore === null) {
        setReminderMinutesBefore(defaultReminder);
      }
      setDate(selectedParts.date);
    } else {
      setTime(selectedParts.time);
    }
    acknowledgeNotice('dueAt');
    setPickerMode(null);
  }

  function clearDeadline() {
    setDate('');
    setTime('');
    setReminderMinutesBefore(null);
    setPickerMode(null);
    acknowledgeNotice('dueAt');
  }

  const subjectOptions = [
    { label: UNASSIGNED_SUBJECT_NAME, value: null },
    ...subjects.map((subject) => ({ label: subject.name, value: subject.id })),
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.form}
      keyboardShouldPersistTaps="handled"
      ref={formRef}
    >
      {header}
      <Field
        label="Title *"
        onChangeText={(value) => {
          setTitle(value);
          acknowledgeNotice('title');
        }}
        placeholder="Research paper draft"
        value={title}
      />
      <FieldNotice message={noticeFor('title')} />

      <View style={styles.sectionHeader}>
        <Text style={styles.label}>Subject</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (showSubjectInput) setNewSubjectName('');
            setShowSubjectInput(!showSubjectInput);
            setSubjectError('');
            acknowledgeNotice('subject');
          }}
          style={({ pressed }) => [
            styles.addSubjectButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.addSubjectText}>
            {showSubjectInput ? 'Cancel' : '+ Add subject'}
          </Text>
        </Pressable>
      </View>
      <SelectionChips
        onSelect={(value) => {
          setSubjectId(value);
          acknowledgeNotice('subject');
        }}
        options={subjectOptions}
        value={subjectId}
      />
      {showSubjectInput && (
        <View style={styles.newSubjectCard}>
          <TextInput
            accessibilityLabel="New subject name"
            autoCapitalize="words"
            onChangeText={(value) => {
              setNewSubjectName(value);
              setSubjectError('');
              acknowledgeNotice('subject');
            }}
            onSubmitEditing={createSubject}
            placeholder="e.g. CS 301 · Algorithms"
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            style={styles.input}
            value={newSubjectName}
          />
          <Pressable
            accessibilityRole="button"
            onPress={createSubject}
            style={({ pressed }) => [
              styles.saveSubjectButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.saveSubjectText}>Add</Text>
          </Pressable>
        </View>
      )}
      {!!subjectError && (
        <Text accessibilityRole="alert" style={styles.error}>
          {subjectError}
        </Text>
      )}
      <FieldNotice message={noticeFor('subject')} />

      {Platform.OS === 'android' ? (
        <>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.label}>Due date</Text>
              <Pressable
                accessibilityLabel={
                  date
                    ? `Due date, ${new Intl.DateTimeFormat(undefined, {
                        dateStyle: 'medium',
                      }).format(pickerDate(date, time))}`
                    : 'Choose due date'
                }
                accessibilityRole="button"
                onPress={() => setPickerMode('date')}
                style={styles.inputButton}
              >
                <Text
                  style={[styles.inputButtonText, !date && styles.placeholder]}
                >
                  {date
                    ? new Intl.DateTimeFormat(undefined, {
                        dateStyle: 'medium',
                      }).format(pickerDate(date, time))
                    : 'Choose date'}
                </Text>
              </Pressable>
            </View>
            <View style={styles.time}>
              <Text style={styles.label}>Time</Text>
              <Pressable
                accessibilityLabel={
                  date
                    ? `Due time, ${new Intl.DateTimeFormat(undefined, {
                        timeStyle: 'short',
                      }).format(pickerDate(date, time))}`
                    : 'Choose a due date first'
                }
                accessibilityRole="button"
                accessibilityState={{ disabled: !date }}
                disabled={!date}
                onPress={() => setPickerMode('time')}
                style={[styles.inputButton, !date && styles.disabled]}
              >
                <Text
                  style={[styles.inputButtonText, !date && styles.placeholder]}
                >
                  {date
                    ? new Intl.DateTimeFormat(undefined, {
                        timeStyle: 'short',
                      }).format(pickerDate(date, time))
                    : 'Time'}
                </Text>
              </Pressable>
            </View>
          </View>
          {!!date && (
            <Pressable
              accessibilityRole="button"
              onPress={clearDeadline}
              style={styles.clearDeadline}
            >
              <Text style={styles.clearDeadlineText}>Clear deadline</Text>
            </Pressable>
          )}
          {pickerMode && (
            <DateTimePicker
              mode={pickerMode}
              onDismiss={() => setPickerMode(null)}
              onValueChange={(_, selected) => setNativeDeadline(selected)}
              value={pickerDate(date, time)}
            />
          )}
        </>
      ) : (
        <View style={styles.row}>
          <View style={styles.flex}>
            <Field
              keyboardType="numbers-and-punctuation"
              label="Due date"
              onChangeText={(value) => {
                setDate(value);
                acknowledgeNotice('dueAt');
              }}
              placeholder="YYYY-MM-DD"
              value={date}
            />
          </View>
          <View style={styles.time}>
            <Field
              keyboardType="numbers-and-punctuation"
              label="Time"
              onChangeText={(value) => {
                setTime(value);
                acknowledgeNotice('dueAt');
              }}
              placeholder="23:59"
              value={time}
            />
          </View>
        </View>
      )}
      <FieldNotice message={noticeFor('dueAt')} />

      <Text style={styles.label}>Task type</Text>
      <SelectionChips
        onSelect={(value) => {
          setTaskType(value);
          acknowledgeNotice('taskType');
        }}
        options={TASK_TYPE_OPTIONS}
        value={taskType}
      />
      <FieldNotice message={noticeFor('taskType')} />

      <Text style={styles.label}>Priority</Text>
      <View accessibilityRole="radiogroup" style={styles.priorityRow}>
        {(['low', 'medium', 'high'] as const).map((value) => {
          const selected = priority === value;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={value}
              onPress={() => {
                setPriority(value);
                acknowledgeNotice('priority');
              }}
              style={[styles.priority, selected && styles.prioritySelected]}
            >
              <Text
                style={[
                  styles.priorityText,
                  selected && styles.priorityTextSelected,
                ]}
              >
                {selected ? '✓ ' : ''}
                {value[0].toUpperCase() + value.slice(1)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <FieldNotice message={noticeFor('priority')} />

      <Text style={styles.label}>Estimated workload</Text>
      <SelectionChips
        onSelect={(value) => {
          setEstimatedEffortMinutes(value);
          acknowledgeNotice('estimatedEffortMinutes');
        }}
        options={EFFORT_OPTIONS}
        value={estimatedEffortMinutes}
      />
      <FieldNotice message={noticeFor('estimatedEffortMinutes')} />

      <Text style={styles.label}>Reminder</Text>
      <View accessibilityRole="radiogroup" style={styles.reminderOptions}>
        {REMINDER_OPTIONS.map((option) => {
          const selected = reminderMinutesBefore === option.value;
          const disabled = option.value !== null && !date.trim();
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              key={option.label}
              onPress={() => setReminderMinutesBefore(option.value)}
              style={[
                styles.reminder,
                selected && styles.reminderSelected,
                disabled && styles.disabled,
              ]}
            >
              <View
                style={[styles.radioDot, selected && styles.radioDotSelected]}
              />
              <Text
                style={[
                  styles.reminderText,
                  selected && styles.reminderTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {!date.trim() && (
        <Text style={styles.helper}>Add a due date to choose a reminder.</Text>
      )}

      <Field
        label="Notes"
        multiline
        onChangeText={(value) => {
          setNotes(value);
          acknowledgeNotice('notes');
        }}
        placeholder="Instructions or details"
        value={notes}
      />
      <FieldNotice message={noticeFor('notes')} />
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <PrimaryButton label={submitLabel} onPress={submit} />
      {footer}
    </ScrollView>
  );
}

function FieldNotice({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <View
      accessible
      accessibilityLabel={`Needs attention. ${message}`}
      style={styles.fieldNotice}
    >
      <Text style={styles.fieldNoticeMark}>!</Text>
      <Text style={styles.fieldNoticeText}>{message}</Text>
    </View>
  );
}

type FieldProps = React.ComponentProps<typeof TextInput> & { label: string };

function Field({ label, multiline, style, ...props }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        multiline={multiline}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, multiline && styles.multiline, style]}
        {...props}
      />
    </View>
  );
}

type SelectionChipsProps<T extends string | number | null> = {
  options: ReadonlyArray<{ label: string; value: T }>;
  value: T;
  onSelect: (value: T) => void;
};

function SelectionChips<T extends string | number | null>({
  options,
  value,
  onSelect,
}: SelectionChipsProps<T>) {
  return (
    <View accessibilityRole="radiogroup" style={styles.chips}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            key={option.label}
            onPress={() => onSelect(option.value)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text
              style={[styles.chipText, selected && styles.chipTextSelected]}
            >
              {selected ? '✓ ' : ''}
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { padding: spacing.xl, gap: spacing.lg },
  field: { gap: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  label: { color: colors.text, fontSize: 14, fontWeight: '700' },
  input: {
    minHeight: minimumTouchTarget,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 16,
  },
  newSubjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addSubjectButton: {
    minHeight: minimumTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  addSubjectText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  saveSubjectButton: {
    minHeight: minimumTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  saveSubjectText: { color: colors.surface, fontSize: 15, fontWeight: '800' },
  inputButton: {
    minHeight: minimumTouchTarget,
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  inputButtonText: { color: colors.text, fontSize: 16 },
  placeholder: { color: colors.textMuted },
  clearDeadline: {
    minHeight: minimumTouchTarget,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    marginTop: -spacing.md,
    paddingHorizontal: spacing.sm,
  },
  clearDeadlineText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  multiline: { minHeight: 112, paddingTop: spacing.md, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  time: { width: 132 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: minimumTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  chipTextSelected: { color: colors.surface },
  priorityRow: { flexDirection: 'row', gap: spacing.sm },
  priority: {
    minHeight: minimumTouchTarget,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  prioritySelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  priorityText: { color: colors.text, fontWeight: '700' },
  priorityTextSelected: { color: colors.surface },
  reminderOptions: { gap: spacing.sm },
  reminder: {
    minHeight: minimumTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  reminderSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSubtle,
  },
  reminderText: { color: colors.text, fontSize: 16 },
  reminderTextSelected: { color: colors.primary, fontWeight: '700' },
  radioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioDotSelected: { borderWidth: 5, borderColor: colors.primary },
  disabled: { opacity: 0.45 },
  helper: { marginTop: -spacing.sm, color: colors.textMuted, fontSize: 14 },
  fieldNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: -spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#FFF7E8',
  },
  fieldNoticeMark: {
    width: 22,
    height: 22,
    overflow: 'hidden',
    borderRadius: radius.full,
    backgroundColor: '#F4C98B',
    color: colors.warning,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 22,
    textAlign: 'center',
  },
  fieldNoticeText: {
    flex: 1,
    color: colors.warning,
    fontSize: 16,
    lineHeight: 24,
  },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  pressed: { opacity: 0.65 },
});
