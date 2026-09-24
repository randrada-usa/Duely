import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { ScreenShell } from '../../src/components/ScreenShell';
import { TaskCard } from '../../src/components/TaskCard';
import { TaskStorageWarning } from '../../src/components/TaskStorageWarning';
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
  surfaces,
  typography,
} from '../../src/theme/tokens';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarScreen() {
  const { fontScale } = useWindowDimensions();
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfLocalMonth(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const { canEditTasks, isHydrated, tasks } = useTasks();
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
        <View
          style={[
            styles.header,
            fontScale >= 1.4 && styles.headerLargeText,
          ]}
        >
          <Text accessibilityRole="header" style={styles.title}>
            Calendar
          </Text>
          <View
            style={[
              styles.monthControls,
              fontScale >= 1.4 && styles.monthControlsLargeText,
            ]}
          >
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

        <TaskStorageWarning />

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
                          <View
                            accessibilityElementsHidden
                            importantForAccessibility="no-hide-descendants"
                            pointerEvents="none"
                            style={styles.taskDots}
                          >
                            {Array.from({ length: Math.min(count, 3) }, (_, index) => (
                              <View
                                key={index}
                                style={[styles.taskDot, selected && styles.selectedDot]}
                              />
                            ))}
                          </View>
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
          <View
            accessibilityLabel="Loading calendar tasks"
            accessibilityRole="progressbar"
            style={styles.loading}
          >
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading tasks…</Text>
          </View>
        ) : selectedTasks.length === 0 ? (
          <View
            accessibilityLabel="No tasks due. Add a task and this date will appear in your plan."
            accessibilityRole="summary"
            style={styles.emptyDate}
          >
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
          accessibilityLabel="Add task for this date"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canEditTasks }}
          disabled={!canEditTasks}
          onPress={() => router.push(`/task/new?dueDate=${selectedKey}`)}
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
            !canEditTasks && styles.addButtonDisabled,
          ]}
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
  content: { paddingBottom: spacing.xxl, gap: spacing.md },
  header: {
    minHeight: minimumTouchTarget,
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  headerLargeText: { alignItems: 'stretch', flexDirection: 'column' },
  title: {
    color: colors.text,
    fontFamily: typography.headingStrong,
    fontSize: 30,
  },
  monthControls: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  monthControlsLargeText: { justifyContent: 'space-between' },
  monthTitle: {
    flexShrink: 1,
    minWidth: 116,
    color: colors.text,
    fontFamily: typography.bodyBold,
    fontSize: 16,
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
    ...surfaces.card,
    paddingVertical: spacing.lg,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekday: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: typography.bodyBold,
    fontSize: 11,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  grid: {},
  weekRow: { flexDirection: 'row' },
  cellWrapper: {
    flex: 1,
    minHeight: 50,
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
    borderRadius: radius.full,
  },
  today: { borderColor: colors.primary },
  selectedDay: { borderColor: colors.primary, backgroundColor: colors.primary },
  dayPressed: { opacity: 0.65 },
  dayNumber: {
    color: colors.text,
    fontFamily: typography.bodySemibold,
    fontSize: 15,
  },
  selectedText: { color: colors.surface },
  taskDots: {
    // Keep task presence from changing the centered date number's position.
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 3,
  },
  taskDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  selectedDot: { backgroundColor: colors.surface },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  selectedTitleGroup: { flex: 1 },
  selectedTitle: {
    color: colors.text,
    fontFamily: typography.heading,
    fontSize: 20,
  },
  selectedWeekday: {
    marginTop: 2,
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
  },
  todayButton: {
    minHeight: minimumTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  todayButtonText: {
    color: colors.primary,
    fontFamily: typography.bodyBold,
    fontSize: 14,
  },
  loading: {
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 16,
  },
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
    elevation: 1,
  },
  emptyCopy: { flex: 1, gap: spacing.xs },
  emptyTitle: {
    color: colors.text,
    fontFamily: typography.bodyBold,
    fontSize: 16,
  },
  emptyDescription: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 21,
  },
  taskList: { gap: spacing.md },
  addButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    elevation: 2,
  },
  addButtonPressed: { backgroundColor: colors.primaryPressed },
  addButtonDisabled: { opacity: 0.45 },
  addButtonText: {
    color: colors.surface,
    fontFamily: typography.bodyBold,
    fontSize: 16,
  },
});
