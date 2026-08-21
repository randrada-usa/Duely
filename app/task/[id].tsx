import { router, useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { TaskForm } from '../../src/components/TaskForm';
import { useTasks } from '../../src/store/TaskStore';
import { colors, spacing } from '../../src/theme/tokens';

export default function TaskDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { deleteTask, getTask, updateTask } = useTasks(); const task = getTask(id);
  if (!task) return <View style={styles.missing}><Text style={styles.title}>Task not found</Text><PrimaryButton label="Go back" onPress={() => router.back()} /></View>;
  return <View style={styles.screen}><TaskForm initial={task} submitLabel="Save changes" onSubmit={(draft) => { updateTask(task.id, draft); router.back(); }} /><View style={styles.delete}><PrimaryButton label="Delete task" onPress={() => Alert.alert('Delete task?', 'This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { deleteTask(task.id); router.replace('/tasks'); } }])} /></View></View>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, delete: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl }, missing: { flex: 1, justifyContent: 'center', gap: spacing.xl, padding: spacing.xl, backgroundColor: colors.background }, title: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center' } });
