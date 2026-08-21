import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { deadlineParts, parseLocalDeadline, pickerDate } from '../domain/deadline';
import { REMINDER_OPTIONS } from '../domain/reminder';
import type { ReminderMinutes, TaskDraft, TaskPriority } from '../domain/task';
import { colors, minimumTouchTarget, radius, spacing } from '../theme/tokens';
import { PrimaryButton } from './PrimaryButton';

type TaskFormProps = { initial?: TaskDraft; defaultReminder?: ReminderMinutes | null; submitLabel: string; onSubmit: (draft: TaskDraft) => void };
const blank: TaskDraft = { title: '', subject: '', notes: '', dueAt: null, priority: 'medium', reminderMinutesBefore: null };

export function TaskForm({ initial = blank, defaultReminder = null, submitLabel, onSubmit }: TaskFormProps) {
  const parts = deadlineParts(initial.dueAt);
  const [title, setTitle] = useState(initial.title); const [subject, setSubject] = useState(initial.subject); const [notes, setNotes] = useState(initial.notes); const [date, setDate] = useState(parts.date); const [time, setTime] = useState(parts.time); const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null); const [priority, setPriority] = useState<TaskPriority>(initial.priority); const [reminderMinutesBefore, setReminderMinutesBefore] = useState<ReminderMinutes | null>(initial.reminderMinutesBefore ?? null); const [error, setError] = useState('');
  function submit() {
    if (!title.trim()) return setError('Enter a task title.');
    const deadline = parseLocalDeadline(date, time);
    if (deadline.error) return setError(deadline.error);
    const dueAt = deadline.dueAt;
    setError(''); onSubmit({ title: title.trim(), subject: subject.trim(), notes: notes.trim(), dueAt, priority, reminderMinutesBefore });
  }
  function setNativeDeadline(selected: Date) {
    const selectedParts = deadlineParts(selected.toISOString());
    if (pickerMode === 'date') {
      if (!date && reminderMinutesBefore === null) setReminderMinutesBefore(defaultReminder);
      setDate(selectedParts.date);
    }
    else setTime(selectedParts.time);
    setPickerMode(null);
  }
  function clearDeadline() {
    setDate(''); setTime(''); setReminderMinutesBefore(null); setPickerMode(null);
  }
  return <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
    <Field label="Title *" value={title} onChangeText={setTitle} placeholder="Research paper draft" />
    <Field label="Subject" value={subject} onChangeText={setSubject} placeholder="Unassigned" />
    {Platform.OS === 'android' ? <>
      <View style={styles.row}>
        <View style={styles.flex}><Text style={styles.label}>Due date</Text><Pressable accessibilityLabel={date ? `Due date, ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(pickerDate(date, time))}` : 'Choose due date'} accessibilityRole="button" onPress={() => setPickerMode('date')} style={styles.inputButton}><Text style={[styles.inputButtonText, !date && styles.placeholder]}>{date ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(pickerDate(date, time)) : 'Choose date'}</Text></Pressable></View>
        <View style={styles.time}><Text style={styles.label}>Time</Text><Pressable accessibilityLabel={date ? `Due time, ${new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(pickerDate(date, time))}` : 'Choose a due date first'} accessibilityRole="button" accessibilityState={{ disabled: !date }} disabled={!date} onPress={() => setPickerMode('time')} style={[styles.inputButton, !date && styles.disabled]}><Text style={[styles.inputButtonText, !date && styles.placeholder]}>{date ? new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(pickerDate(date, time)) : 'Time'}</Text></Pressable></View>
      </View>
      {!!date && <Pressable accessibilityRole="button" onPress={clearDeadline} style={styles.clearDeadline}><Text style={styles.clearDeadlineText}>Clear deadline</Text></Pressable>}
      {pickerMode && <DateTimePicker mode={pickerMode} onDismiss={() => setPickerMode(null)} onValueChange={(_, selected) => setNativeDeadline(selected)} value={pickerDate(date, time)} />}
    </> : <View style={styles.row}><View style={styles.flex}><Field label="Due date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" /></View><View style={styles.time}><Field label="Time" value={time} onChangeText={setTime} placeholder="23:59" keyboardType="numbers-and-punctuation" /></View></View>}
    <Text style={styles.label}>Priority</Text><View style={styles.priorityRow}>{(['low', 'medium', 'high'] as const).map((value) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: priority === value }} key={value} onPress={() => setPriority(value)} style={[styles.priority, priority === value && styles.prioritySelected]}><Text style={[styles.priorityText, priority === value && styles.priorityTextSelected]}>{value[0].toUpperCase() + value.slice(1)}</Text></Pressable>)}</View>
    <Text style={styles.label}>Reminder</Text>
    <View accessibilityRole="radiogroup" style={styles.reminderOptions}>
      {REMINDER_OPTIONS.map((option) => {
        const selected = reminderMinutesBefore === option.value;
        return <Pressable accessibilityRole="radio" accessibilityState={{ selected, disabled: option.value !== null && !date.trim() }} disabled={option.value !== null && !date.trim()} key={option.label} onPress={() => setReminderMinutesBefore(option.value)} style={[styles.reminder, selected && styles.reminderSelected, option.value !== null && !date.trim() && styles.disabled]}><View style={[styles.radioDot, selected && styles.radioDotSelected]} /><Text style={[styles.reminderText, selected && styles.reminderTextSelected]}>{option.label}</Text></Pressable>;
      })}
    </View>
    {!date.trim() && <Text style={styles.helper}>Add a due date to choose a reminder.</Text>}
    <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Instructions or details" multiline />
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <PrimaryButton label={submitLabel} onPress={submit} />
  </ScrollView>;
}

type FieldProps = React.ComponentProps<typeof TextInput> & { label: string };
function Field({ label, multiline, style, ...props }: FieldProps) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput multiline={multiline} placeholderTextColor={colors.textMuted} style={[styles.input, multiline && styles.multiline, style]} {...props} /></View>; }
const styles = StyleSheet.create({ form: { padding: spacing.xl, gap: spacing.lg }, field: { gap: spacing.sm }, label: { color: colors.text, fontSize: 14, fontWeight: '700' }, input: { minHeight: minimumTouchTarget, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, color: colors.text, fontSize: 16 }, inputButton: { minHeight: minimumTouchTarget, justifyContent: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface }, inputButtonText: { color: colors.text, fontSize: 16 }, placeholder: { color: colors.textMuted }, clearDeadline: { minHeight: minimumTouchTarget, alignSelf: 'flex-start', justifyContent: 'center', marginTop: -spacing.md, paddingHorizontal: spacing.sm }, clearDeadlineText: { color: colors.primary, fontSize: 14, fontWeight: '700' }, multiline: { minHeight: 112, paddingTop: spacing.md, textAlignVertical: 'top' }, row: { flexDirection: 'row', gap: spacing.md }, flex: { flex: 1 }, time: { width: 132 }, priorityRow: { flexDirection: 'row', gap: spacing.sm }, priority: { minHeight: minimumTouchTarget, flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, backgroundColor: colors.surface }, prioritySelected: { borderColor: colors.primary, backgroundColor: colors.primary }, priorityText: { color: colors.text, fontWeight: '700' }, priorityTextSelected: { color: colors.surface }, reminderOptions: { gap: spacing.sm }, reminder: { minHeight: minimumTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface }, reminderSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceSubtle }, reminderText: { color: colors.text, fontSize: 16 }, reminderTextSelected: { color: colors.primary, fontWeight: '700' }, radioDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border }, radioDotSelected: { borderWidth: 5, borderColor: colors.primary }, disabled: { opacity: 0.45 }, helper: { marginTop: -spacing.sm, color: colors.textMuted, fontSize: 14 }, error: { color: colors.danger, fontSize: 14 } });
