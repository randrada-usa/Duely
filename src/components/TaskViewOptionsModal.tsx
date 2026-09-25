import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Subject } from '../domain/subject';
import { TASK_TYPE_OPTIONS } from '../domain/task';
import { ALL_SUBJECTS, DEFAULT_TASK_QUERY, TASK_STATE_FILTER_OPTIONS, UNASSIGNED_SUBJECTS, TASK_GROUPING_OPTIONS, TASK_SORT_OPTIONS, type TaskQuery } from '../domain/taskQuery';
import { colors, minimumTouchTarget, radius, spacing, typography } from '../theme/tokens';

type Props = {
  visible: boolean;
  value: TaskQuery;
  subjects: Subject[];
  onChange: (patch: Partial<TaskQuery>) => void;
  onClose: () => void;
};

export function TaskViewOptionsModal({ visible, value, subjects, onChange, onClose }: Props) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onClose} />
        <View accessibilityViewIsModal style={styles.popup}>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>Filter and arrange</Text>
            <Pressable
              accessibilityLabel="Close filters"
              accessibilityRole="button"
              hitSlop={4}
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <Ionicons accessibilityElementsHidden name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Group title="Status">
              {TASK_STATE_FILTER_OPTIONS.map((o) => <Pill key={o.value} label={o.label} selected={value.state === o.value} onPress={() => onChange({ state: o.value })} />)}
            </Group>
            <Group title="Deadline" checkbox>
              <Pill label="No deadline" checkbox selected={value.noDeadline} onPress={() => onChange({ noDeadline: !value.noDeadline })} />
            </Group>
            <Group title="Subject">
              {[{ id: ALL_SUBJECTS, name: 'All' }, { id: UNASSIGNED_SUBJECTS, name: 'Unassigned' }, ...subjects].map((s) => <Pill key={s.id} label={s.name} selected={value.subject === s.id} onPress={() => onChange({ subject: s.id })} />)}
            </Group>
            <Group title="Priority">
              <Pill label="Any priority" selected={value.priority === null} onPress={() => onChange({ priority: null })} />
              {(['high', 'medium', 'low'] as const).map((priority) => <Pill key={priority} label={priority[0].toUpperCase() + priority.slice(1)} selected={value.priority === priority} onPress={() => onChange({ priority })} />)}
            </Group>
            <Group title="Task type">
              <Pill label="Any type" selected={value.taskType === null} onPress={() => onChange({ taskType: null })} />
              {TASK_TYPE_OPTIONS.map((o) => <Pill key={o.value} label={o.label} selected={value.taskType === o.value} onPress={() => onChange({ taskType: o.value })} />)}
            </Group>
            <Group title="Sort by">
              {TASK_SORT_OPTIONS.map((o) => <Pill key={o.value} label={o.label} selected={value.sort === o.value} onPress={() => onChange({ sort: o.value })} />)}
            </Group>
            <Group title="Group by">
              {TASK_GROUPING_OPTIONS.map((o) => <Pill key={o.value} label={o.label} selected={value.grouping === o.value} onPress={() => onChange({ grouping: o.value })} />)}
            </Group>
          </ScrollView>
          <View style={styles.footer}>
            <Pressable accessibilityRole="button" onPress={() => onChange({ ...DEFAULT_TASK_QUERY, search: value.search })} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
              <Text style={styles.resetText}>Reset</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.action, styles.done, pressed && styles.pressed]}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function Group({ title, children, checkbox = false }: { title: string; children: ReactNode; checkbox?: boolean }) {
  return <View accessibilityRole={checkbox ? undefined : 'radiogroup'} accessibilityLabel={title} style={styles.group}><Text style={styles.groupTitle}>{title}</Text><View style={styles.options}>{children}</View></View>;
}

function Pill({ label, selected, onPress, checkbox = false }: { label: string; selected: boolean; onPress: () => void; checkbox?: boolean }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole={checkbox ? 'checkbox' : 'radio'} accessibilityState={checkbox ? { checked: selected } : { selected }} onPress={onPress} style={({ pressed }) => [styles.pill, selected && styles.selected, pressed && styles.pressed]}>
      <Text style={[styles.pillText, selected && styles.selectedText]}>{selected ? '✓ ' : ''}{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, backgroundColor: 'rgba(30,32,54,0.4)' },
  popup: { width: '100%', maxWidth: 480, maxHeight: '75%', borderRadius: radius.xl, backgroundColor: colors.surface, overflow: 'hidden', elevation: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.xl, paddingRight: spacing.md, paddingVertical: spacing.sm },
  title: { flex: 1, color: colors.text, fontFamily: typography.headingStrong, fontSize: 22 },
  closeButton: { width: minimumTouchTarget, height: minimumTouchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: colors.surfaceSubtle },
  scroll: { flexShrink: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.lg },
  group: { gap: spacing.sm },
  groupTitle: { color: colors.textMuted, fontFamily: typography.bodySemibold, fontSize: 14 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: { minHeight: minimumTouchTarget, maxWidth: '100%', justifyContent: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pillText: { color: colors.text, fontFamily: typography.bodyMedium, fontSize: 14, flexShrink: 1 },
  selectedText: { color: colors.primaryPressed, fontFamily: typography.bodySemibold },
  footer: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  action: { flex: 1, minHeight: minimumTouchTarget, padding: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: colors.surfaceSubtle },
  done: { backgroundColor: colors.primary },
  resetText: { color: colors.primary, fontFamily: typography.bodyBold, fontSize: 16 },
  doneText: { color: colors.surface, fontFamily: typography.bodyBold, fontSize: 16 },
  pressed: { opacity: 0.7 },
});
