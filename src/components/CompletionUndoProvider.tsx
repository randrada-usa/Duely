import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Task } from '../domain/task';
import type { TaskCompletionUndo } from '../domain/taskCompletion';
import { useTasks } from '../store/TaskStore';
import { colors, minimumTouchTarget, radius, spacing } from '../theme/tokens';

const UNDO_VISIBLE_MS = 10_000;

type CompletionUndoState = TaskCompletionUndo & {
  taskTitle: string;
  expiresAt: number;
};

type CompletionUndoValue = {
  toggleTaskCompletion: (task: Task) => void;
};

const CompletionUndoContext = createContext<CompletionUndoValue | null>(null);

export function CompletionUndoProvider({ children }: PropsWithChildren) {
  const { completeTask, reopenTask, undoTaskCompletion } = useTasks();
  const insets = useSafeAreaInsets();
  const [undo, setUndo] = useState<CompletionUndoState | null>(null);

  useEffect(() => {
    if (!undo) return;
    const remaining = Math.max(0, undo.expiresAt - Date.now());
    const timer = setTimeout(() => {
      setUndo((current) =>
        current?.completedAt === undo.completedAt ? null : current,
      );
    }, remaining);
    return () => clearTimeout(timer);
  }, [undo]);

  const toggleTaskCompletion = useCallback(
    (task: Task) => {
      if (task.status === 'completed') {
        reopenTask(task.id);
        setUndo((current) =>
          current?.taskId === task.id ? null : current,
        );
        return;
      }

      const completedAt = new Date().toISOString();
      completeTask(task.id, completedAt);
      setUndo({
        taskId: task.id,
        taskTitle: task.title,
        completedAt,
        expiresAt: Date.now() + UNDO_VISIBLE_MS,
      });
    },
    [completeTask, reopenTask],
  );

  const undoCompletion = useCallback(() => {
    if (!undo) return;
    undoTaskCompletion(undo);
    setUndo(null);
  }, [undo, undoTaskCompletion]);

  return (
    <CompletionUndoContext.Provider value={{ toggleTaskCompletion }}>
      <View style={styles.root}>
        {children}
        {undo && (
          <View
            pointerEvents="box-none"
            style={[
              styles.positioner,
              { bottom: insets.bottom + minimumTouchTarget + spacing.xxl },
            ]}
          >
            <View style={styles.banner}>
              <View style={styles.message}>
                <Text
                  accessibilityLabel={`Task completed: ${undo.taskTitle}`}
                  accessibilityLiveRegion="polite"
                  accessibilityRole="alert"
                  style={styles.title}
                >
                  Task completed
                </Text>
                <Text numberOfLines={1} style={styles.taskTitle}>
                  {undo.taskTitle}
                </Text>
              </View>
              <Pressable
                accessibilityHint="Marks the task open again"
                accessibilityRole="button"
                onPress={undoCompletion}
                style={({ pressed }) => [
                  styles.undoButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.undoText}>Undo</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </CompletionUndoContext.Provider>
  );
}

export function useCompletionUndo() {
  const value = useContext(CompletionUndoContext);
  if (!value) {
    throw new Error('useCompletionUndo must be used inside CompletionUndoProvider');
  }
  return value;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  positioner: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 20,
  },
  banner: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.text,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  message: { flex: 1 },
  title: { color: colors.surface, fontSize: 16, fontWeight: '800' },
  taskTitle: {
    marginTop: 2,
    color: colors.border,
    fontSize: 14,
    lineHeight: 20,
  },
  undoButton: {
    minWidth: minimumTouchTarget,
    minHeight: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  undoText: { color: colors.primaryPressed, fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.7 },
});
