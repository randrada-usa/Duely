import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Subject } from '../domain/subject';
import { useTasks } from '../store/TaskStore';
import { colors, minimumTouchTarget, radius, spacing } from '../theme/tokens';

type SubjectManagerModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function SubjectManagerModal({
  visible,
  onClose,
}: SubjectManagerModalProps) {
  const { addSubject, deleteSubject, renameSubject, subjects, tasks } = useTasks();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');
  const unassignedTaskCount = tasks.filter(
    (task) => task.subjectId === null,
  ).length;

  useEffect(() => {
    if (visible) return;
    setNewName('');
    setEditingId(null);
    setEditingName('');
    setError('');
  }, [visible]);

  function createSubject() {
    const result = addSubject(newName);
    if (result.error) {
      setError(result.error);
      return;
    }
    setNewName('');
    setError('');
  }

  function startRename(subject: Subject) {
    setEditingId(subject.id);
    setEditingName(subject.name);
    setError('');
  }

  function saveRename() {
    if (!editingId) return;
    const nextError = renameSubject(editingId, editingName);
    if (nextError) {
      setError(nextError);
      return;
    }
    setEditingId(null);
    setEditingName('');
    setError('');
  }

  function confirmDelete(subject: Subject) {
    const taskCount = tasks.filter(
      (task) => task.subjectId === subject.id,
    ).length;
    const assignmentMessage =
      taskCount === 0
        ? 'No tasks currently use this subject.'
        : `${taskCount} ${taskCount === 1 ? 'task' : 'tasks'} will move to Unassigned.`;

    Alert.alert(
      `Delete ${subject.name}?`,
      `${assignmentMessage} This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteSubject(subject.id);
            if (editingId === subject.id) {
              setEditingId(null);
              setEditingName('');
            }
          },
        },
      ],
    );
  }

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
              Manage subjects
            </Text>
            <Text style={styles.subtitle}>
              Keep each task in one subject or leave it Unassigned.
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

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.createCard}>
            <Text style={styles.label}>New subject</Text>
            <View style={styles.inputRow}>
              <TextInput
                accessibilityLabel="New subject name"
                autoCapitalize="words"
                onChangeText={(value) => {
                  setNewName(value);
                  setError('');
                }}
                onSubmitEditing={createSubject}
                placeholder="e.g. CS 301 · Algorithms"
                placeholderTextColor={colors.textMuted}
                returnKeyType="done"
                style={styles.input}
                value={newName}
              />
              <ActionButton label="Add" onPress={createSubject} />
            </View>
          </View>

          {!!error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}

          <View style={styles.unassignedCard}>
            <Text style={styles.subjectName}>Unassigned</Text>
            <Text style={styles.subjectCount}>
              {unassignedTaskCount}{' '}
              {unassignedTaskCount === 1 ? 'task' : 'tasks'} · always available
            </Text>
          </View>

          {subjects.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No subjects yet</Text>
              <Text style={styles.emptyDescription}>
                Add one above, or keep tasks in Unassigned.
              </Text>
            </View>
          ) : (
            subjects.map((subject) => {
              const taskCount = tasks.filter(
                (task) => task.subjectId === subject.id,
              ).length;
              const editing = editingId === subject.id;

              return (
                <View key={subject.id} style={styles.subjectCard}>
                  {editing ? (
                    <>
                      <TextInput
                        accessibilityLabel={`Rename ${subject.name}`}
                        autoCapitalize="words"
                        autoFocus
                        onChangeText={(value) => {
                          setEditingName(value);
                          setError('');
                        }}
                        onSubmitEditing={saveRename}
                        returnKeyType="done"
                        style={styles.input}
                        value={editingName}
                      />
                      <View style={styles.actionRow}>
                        <ActionButton label="Save" onPress={saveRename} />
                        <ActionButton
                          label="Cancel"
                          onPress={() => {
                            setEditingId(null);
                            setEditingName('');
                            setError('');
                          }}
                          secondary
                        />
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.subjectCopy}>
                        <Text style={styles.subjectName}>{subject.name}</Text>
                        <Text style={styles.subjectCount}>
                          {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                        </Text>
                      </View>
                      <View style={styles.actionRow}>
                        <ActionButton
                          label="Rename"
                          onPress={() => startRename(subject)}
                          secondary
                        />
                        <ActionButton
                          destructive
                          label="Delete"
                          onPress={() => confirmDelete(subject)}
                        />
                      </View>
                    </>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  destructive?: boolean;
};

function ActionButton({
  label,
  onPress,
  secondary = false,
  destructive = false,
}: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        secondary && styles.secondaryButton,
        destructive && styles.destructiveButton,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.actionButtonText,
          secondary && styles.secondaryButtonText,
          destructive && styles.destructiveButtonText,
        ]}
      >
        {label}
      </Text>
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
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  subtitle: {
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
  headerButtonText: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  content: { padding: spacing.xl, gap: spacing.md },
  createCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  label: { color: colors.text, fontSize: 14, fontWeight: '800' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    minHeight: minimumTouchTarget,
    flex: 1,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 16,
  },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  unassignedCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSubtle,
  },
  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  subjectCopy: { minWidth: 140, flex: 1 },
  subjectName: { color: colors.text, fontSize: 16, fontWeight: '800' },
  subjectCount: { marginTop: 2, color: colors.textMuted, fontSize: 13 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionButton: {
    minHeight: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  actionButtonText: { color: colors.surface, fontSize: 14, fontWeight: '800' },
  secondaryButton: { backgroundColor: colors.surface },
  secondaryButtonText: { color: colors.primary },
  destructiveButton: { borderColor: colors.danger, backgroundColor: colors.surface },
  destructiveButtonText: { color: colors.danger },
  pressed: { opacity: 0.65 },
  empty: {
    alignItems: 'center',
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  emptyDescription: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
});
