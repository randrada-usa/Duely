import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../src/components/PrimaryButton';
import { TaskForm } from '../../src/components/TaskForm';
import { useUnsavedChangesGuard } from '../../src/hooks/useUnsavedChangesGuard';
import { useTasks } from '../../src/store/TaskStore';
import { colors, spacing } from '../../src/theme/tokens';

export default function TaskDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { deleteTask, getTask, updateTask } = useTasks();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const allowNavigation = useUnsavedChangesGuard(hasUnsavedChanges);
  const task = getTask(id);

  if (!task) {
    return (
      <View style={styles.missing}>
        <Text style={styles.title}>Task not found</Text>
        <PrimaryButton label="Go back" onPress={() => router.back()} />
      </View>
    );
  }
  const taskId = task.id;

  function confirmDelete() {
    Alert.alert('Delete task?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          allowNavigation();
          deleteTask(taskId);
          router.replace('/tasks');
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <TaskForm
        initial={task}
        onDirtyChange={setHasUnsavedChanges}
        submitLabel="Save changes"
        onSubmit={(draft) => {
          allowNavigation();
          updateTask(taskId, draft);
          router.back();
        }}
      />
      <View style={styles.delete}>
        <PrimaryButton label="Delete task" onPress={confirmDelete} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  delete: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  missing: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xl,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
});
