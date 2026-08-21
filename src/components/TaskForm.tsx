import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TaskDraft, TaskPriority } from '../domain/task';
import { colors, minimumTouchTarget, radius, spacing } from '../theme/tokens';
import { PrimaryButton } from './PrimaryButton';

type TaskFormProps = { initial?: TaskDraft; submitLabel: string; onSubmit: (draft: TaskDraft) => void };
const blank: TaskDraft = { title: '', subject: '', notes: '', dueAt: null, priority: 'medium' };

function splitDueAt(value: string | null) {
  if (!value) return { date: '', time: '' };
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, '0');
  return { date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`, time: `${pad(date.getHours())}:${pad(date.getMinutes())}` };
}

export function TaskForm({ initial = blank, submitLabel, onSubmit }: TaskFormProps) {
  const parts = splitDueAt(initial.dueAt);
  const [title, setTitle] = useState(initial.title); const [subject, setSubject] = useState(initial.subject); const [notes, setNotes] = useState(initial.notes); const [date, setDate] = useState(parts.date); const [time, setTime] = useState(parts.time); const [priority, setPriority] = useState<TaskPriority>(initial.priority); const [error, setError] = useState('');
  function submit() {
    if (!title.trim()) return setError('Enter a task title.');
    let dueAt: string | null = null;
    if (date.trim()) { const parsed = new Date(`${date.trim()}T${time.trim() || '23:59'}:00`); if (Number.isNaN(parsed.getTime())) return setError('Use YYYY-MM-DD for the date and HH:MM for the time.'); dueAt = parsed.toISOString(); }
    setError(''); onSubmit({ title: title.trim(), subject: subject.trim(), notes: notes.trim(), dueAt, priority });
  }
  return <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
    <Field label="Title *" value={title} onChangeText={setTitle} placeholder="Research paper draft" />
    <Field label="Subject" value={subject} onChangeText={setSubject} placeholder="Unassigned" />
    <View style={styles.row}><View style={styles.flex}><Field label="Due date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" /></View><View style={styles.time}><Field label="Time" value={time} onChangeText={setTime} placeholder="23:59" keyboardType="numbers-and-punctuation" /></View></View>
    <Text style={styles.label}>Priority</Text><View style={styles.priorityRow}>{(['low', 'medium', 'high'] as const).map((value) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: priority === value }} key={value} onPress={() => setPriority(value)} style={[styles.priority, priority === value && styles.prioritySelected]}><Text style={[styles.priorityText, priority === value && styles.priorityTextSelected]}>{value[0].toUpperCase() + value.slice(1)}</Text></Pressable>)}</View>
    <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Instructions or details" multiline />
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <PrimaryButton label={submitLabel} onPress={submit} />
  </ScrollView>;
}

type FieldProps = React.ComponentProps<typeof TextInput> & { label: string };
function Field({ label, multiline, style, ...props }: FieldProps) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput multiline={multiline} placeholderTextColor={colors.textMuted} style={[styles.input, multiline && styles.multiline, style]} {...props} /></View>; }
const styles = StyleSheet.create({ form: { padding: spacing.xl, gap: spacing.lg }, field: { gap: spacing.sm }, label: { color: colors.text, fontSize: 14, fontWeight: '700' }, input: { minHeight: minimumTouchTarget, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, color: colors.text, fontSize: 16 }, multiline: { minHeight: 112, paddingTop: spacing.md, textAlignVertical: 'top' }, row: { flexDirection: 'row', gap: spacing.md }, flex: { flex: 1 }, time: { width: 112 }, priorityRow: { flexDirection: 'row', gap: spacing.sm }, priority: { minHeight: minimumTouchTarget, flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, backgroundColor: colors.surface }, prioritySelected: { borderColor: colors.primary, backgroundColor: colors.primary }, priorityText: { color: colors.text, fontWeight: '700' }, priorityTextSelected: { color: colors.surface }, error: { color: colors.danger, fontSize: 14 } });
