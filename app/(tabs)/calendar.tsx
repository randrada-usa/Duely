import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ScreenShell } from '../../src/components/ScreenShell';
import { TaskCard } from '../../src/components/TaskCard';
import {
  calendarMonthCells,
  moveLocalMonth,
  startOfLocalMonth,
  tasksByLocalDate,
  toLocalDateKey,
} from '../../src/domain/calendar';
import { useTasks } from '../../src/store/TaskStore';
import {
  colors,
  minimumTouchTarget,
  radius,
  spacing,
} from '../../src/theme/tokens';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarScreen() {
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfLocalMonth(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const { isHydrated, tasks } = useTasks();
  const monthCells = useMemo(
    () => calendarMonthCells(visibleMonth),
    [visibleMonth],
  );
  const groupedTasks = useMemo(() => tasksByLocalDate(tasks), [tasks]);
  const selectedKey = toLocalDateKey(selectedDate);
  const selectedTasks = groupedTasks.get(selectedKey) ?? [];

  function selectToday() {
    const current = new Date();
    setSelectedDate(current);
    setVisibleMonth(startOfLocalMonth(current));
  }

  return (
    <ScreenShell>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Calendar
          </Text>
          <View style={styles.monthControls}>
            <IconButton
              accessibilityLabel="Previous month"
              icon="chevron-back"
              onPress={() => setVisibleMonth((month) => moveLocalMonth(month, -1))}
            />
            <Text accessibilityLiveRegion="polite" style={styles.monthTitle}>
              {visibleMonth.toLocaleDateString(undefined, {
                month: 'long',
                year: 'numeric',
              })}
            </Text>
            <IconButton
              accessibilityLabel="Next month"
              icon="chevron-forward"
              onPress={() => setVisibleMonth((month) => moveLocalMonth(month, 1))}
            />
          </View>
        </View>

        <View style={styles.calendarCard}>
          <View accessibilityRole="header" style={styles.weekdayRow}>
            {WEEKDAYS.map((weekday) => (
              <Text key={weekday} style={styles.weekday}>
                {weekday}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>
            {Array.from(
              { length: monthCells.length / 7 },
              (_, weekIndex) => monthCells.slice(weekIndex * 7, weekIndex * 7 + 7),
            ).map((week, weekIndex) => (
              <View key={`week-${weekIndex}`} style={styles.weekRow}>
                {week.map((date, dayIndex) => {
                  if (!date) {
                    return (
                      <View
                        key={`blank-${weekIndex}-${dayIndex}`}
                        style={styles.cellWrapper}
                      />
                    );
                  }

                  const key = toLocalDateKey(date);
                  const count = groupedTasks.get(key)?.length ?? 0;
                  const selected = key === selectedKey;
                  const isToday = key === toLocalDateKey(today);
                  const dateLabel = date.toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <View key={key} style={styles.cellWrapper}>
                      <Pressable
                        accessibilityLabel={`${dateLabel}${
                          count === 0
                            ? ', no tasks'
                            : `, ${count} ${count === 1 ? 'task' : 'tasks'}`
                        }`}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => setSelectedDate(date)}
                        style={({ pressed }) => [
                          styles.day,
                          isToday && styles.today,
                          selected && styles.selectedDay,
                          pressed && styles.dayPressed,
                        ]}
                      >
                        <Text
                          style={[styles.dayNumber, selected && styles.selectedText]}
                        >
                          {date.getDate()}
                        </Text>
                        {count > 0 && (
                          <Text
                            accessibilityElementsHidden
                            style={[styles.taskCount, selected && styles.selectedCount]}
                          >
                            {count}
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.selectedHeader}>
          <View style={styles.selectedTitleGroup}>
            <Text accessibilityRole="header" style={styles.selectedTitle}>
              {selectedDate.toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            <Text style={styles.selectedWeekday}>
              {selectedDate.toLocaleDateString(undefined, { weekday: 'long' })}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={selectToday}
            style={({ pressed }) => [styles.todayButton, pressed && styles.dayPressed]}
          >
            <Text style={styles.todayButtonText}>Today</Text>
          </Pressable>
        </View>

        {!isHydrated ? (
          <View accessibilityLabel="Loading calendar tasks" style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading tasks…</Text>
          </View>
        ) : selectedTasks.length === 0 ? (
          <View accessibilityRole="summary" style={styles.emptyDate}>
            <Ionicons
              accessibilityElementsHidden
              color={colors.primary}
              name="calendar-outline"
              size={28}
            />
            <View style={styles.emptyCopy}>
              <Text style={styles.emptyTitle}>No tasks due</Text>
              <Text style={styles.emptyDescription}>
                Add a task and this date will appear in your plan.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.taskList}>
            {selectedTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </View>
        )}

        <Pressable
          accessibilityHint={`Prefills the deadline as ${selectedDate.toLocaleDateString()}`}
          accessibilityRole="button"
          onPress={() => router.push(`/task/new?dueDate=${selectedKey}`)}
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
        >
          <Ionicons
            accessibilityElementsHidden
            color={colors.surface}
            name="add"
            size={22}
          />
          <Text style={styles.addButtonText}>Add task for this date</Text>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

type IconButtonProps = {
  accessibilityLabel: string;
  icon: 'chevron-back' | 'chevron-forward';
  onPress: () => void;
};

function IconButton({ accessibilityLabel, icon, onPress }: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.dayPressed]}
    >
      <Ionicons
        accessibilityElementsHidden
        color={colors.primary}
        name={icon}
        size={20}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl, gap: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  title: { color: colors.text, fontSize: 30, fontWeight: '800' },
  monthControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  monthTitle: {
    minWidth: 132,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  iconButton: {
    width: minimumTouchTarget,
    height: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
  },
  calendarCard: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  weekdayRow: { flexDirection: 'row', marginBottom: spacing.sm },
  weekday: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  grid: {},
  weekRow: { flexDirection: 'row' },
  cellWrapper: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: {
    width: minimumTouchTarget,
    height: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: radius.md,
  },
  today: { borderColor: colors.primary },
  selectedDay: { borderColor: colors.primary, backgroundColor: colors.primary },
  dayPressed: { opacity: 0.65 },
  dayNumber: { color: colors.text, fontSize: 15, fontWeight: '700' },
  selectedText: { color: colors.surface },
  taskCount: {
    minWidth: 18,
    height: 16,
    marginTop: 1,
    paddingHorizontal: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 16,
    textAlign: 'center',
  },
  selectedCount: { backgroundColor: colors.surface, color: colors.primary },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  selectedTitleGroup: { flex: 1 },
  selectedTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  selectedWeekday: { marginTop: 2, color: colors.textMuted, fontSize: 14 },
  todayButton: {
    minHeight: minimumTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
  },
  todayButtonText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  loading: {
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: { color: colors.textMuted, fontSize: 16 },
  emptyDate: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  emptyCopy: { flex: 1, gap: spacing.xs },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  emptyDescription: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  taskList: { gap: spacing.md },
  addButton: {
    minHeight: minimumTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  addButtonPressed: { backgroundColor: colors.primaryPressed },
  addButtonText: { color: colors.surface, fontSize: 16, fontWeight: '800' },
});
