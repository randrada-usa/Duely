import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  TASK_GROUPING_OPTIONS,
  TASK_SORT_OPTIONS,
  type TaskQuery,
} from '../domain/taskQuery';
import {
  TASK_TYPE_OPTIONS,
  type TaskPriority,
  type TaskType,
} from '../domain/task';
import { priorityColors } from '../theme/priority';
import { colors, minimumTouchTarget, radius, spacing, surfaces, typography } from '../theme/tokens';

type ViewOptionPatch = Pick<
  TaskQuery,
  'taskType' | 'priority' | 'sort' | 'grouping'
>;

type TaskViewOptionsModalProps = {
  visible: boolean;
  value: ViewOptionPatch;
  onChange: (patch: Partial<ViewOptionPatch>) => void;
  onClose: () => void;
};

const PRIORITY_OPTIONS: ReadonlyArray<{
  label: string;
  value: TaskPriority | null;
}> = [
  { label: 'Any priority', value: null },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

export function TaskViewOptionsModal({
  visible,
  value,
  onChange,
  onClose,
}: TaskViewOptionsModalProps) {
  const typeOptions: ReadonlyArray<{
    label: string;
    value: TaskType | null;
  }> = [{ label: 'Any type', value: null }, ...TASK_TYPE_OPTIONS];

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text accessibilityRole="header" style={styles.title}>
              Filter and arrange
            </Text>
            <Text style={styles.subtitle}>
              Refine which tasks appear and how they are organized.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.headerButtonText}>Done</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <OptionGroup description="Show one kind of task." title="Task type">
            {typeOptions.map((option) => (
              <OptionRow
                key={option.value ?? 'any-type'}
                label={option.label}
                onPress={() => onChange({ taskType: option.value })}
                selected={value.taskType === option.value}
              />
            ))}
          </OptionGroup>

          <OptionGroup description="Show one priority level." title="Priority">
            {PRIORITY_OPTIONS.map((option) => (
              <OptionRow
                key={option.value ?? 'any-priority'}
                label={option.label}
                onPress={() => onChange({ priority: option.value })}
                priority={option.value ?? undefined}
                selected={value.priority === option.value}
              />
            ))}
          </OptionGroup>

          <OptionGroup description="Choose the order inside each group." title="Sort by">
            {TASK_SORT_OPTIONS.map((option) => (
              <OptionRow
                key={option.value}
                label={option.label}
                onPress={() => onChange({ sort: option.value })}
                selected={value.sort === option.value}
              />
            ))}
          </OptionGroup>

          <OptionGroup description="Add labeled sections to the list." title="Group by">
            {TASK_GROUPING_OPTIONS.map((option) => (
              <OptionRow
                key={option.value}
                label={option.label}
                onPress={() => onChange({ grouping: option.value })}
                selected={value.grouping === option.value}
              />
            ))}
          </OptionGroup>

          <Pressable
            accessibilityRole="button"
            onPress={() =>
              onChange({
                taskType: null,
                priority: null,
                sort: 'smart',
                grouping: 'none',
              })
            }
            style={({ pressed }) => [
              styles.resetButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.resetButtonText}>Reset view options</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

type OptionGroupProps = {
  title: string;
  description: string;
  children: ReactNode;
};

function OptionGroup({ title, description, children }: OptionGroupProps) {
  return (
    <View accessibilityRole="radiogroup" style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <Text style={styles.groupDescription}>{description}</Text>
      <View style={styles.options}>{children}</View>
    </View>
  );
}

type OptionRowProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  priority?: TaskPriority;
};

function OptionRow({ label, selected, onPress, priority }: OptionRowProps) {
  const palette = priority ? priorityColors[priority] : null;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        selected && palette && {
          borderColor: palette.accent,
          backgroundColor: palette.background,
        },
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.optionText,
          selected && styles.optionTextSelected,
          selected && palette && { color: palette.foreground },
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.radio,
          selected && styles.radioSelected,
          selected && palette && { borderColor: palette.accent },
        ]}
      >
        {selected && (
          <View
            style={[
              styles.radioCenter,
              palette && { backgroundColor: palette.accent },
            ]}
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerCopy: { flex: 1 },
  title: { color: colors.text, fontSize: 24, fontFamily: typography.headingStrong },
  subtitle: {
    fontFamily: typography.body,
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  headerButton: {
    minWidth: minimumTouchTarget,
    minHeight: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
  },
  headerButtonText: { color: colors.primary, fontSize: 15, fontFamily: typography.bodyBold },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  group: {
    ...surfaces.card,
    padding: spacing.lg,
  },
  groupTitle: { color: colors.text, fontSize: 20, fontFamily: typography.heading },
  groupDescription: {
    fontFamily: typography.body,
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  options: { marginTop: spacing.md, gap: spacing.sm },
  option: {
    paddingVertical: spacing.md,
    minHeight: minimumTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSubtle,
  },
  optionText: { flex: 1, color: colors.text, fontSize: 16, fontFamily: typography.bodySemibold },
  optionTextSelected: { color: colors.primaryPressed },
  radio: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.full,
  },
  radioSelected: { borderColor: colors.primary },
  radioCenter: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  resetButton: {
    minHeight: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  resetButtonText: { color: colors.primary, fontSize: 16, fontFamily: typography.bodyBold },
  pressed: { opacity: 0.65 },
});
