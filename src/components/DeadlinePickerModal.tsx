import { Ionicons } from '@expo/vector-icons';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  calendarMonthCells,
  moveLocalMonth,
  startOfLocalMonth,
  toLocalDateKey,
} from '../domain/calendar';

import {
  colors,
  minimumTouchTarget,
  radius,
  spacing,
  typography,
} from '../theme/tokens';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type DeadlinePickerModalProps = {
  initialValue: Date;
  onCancel: () => void;
  onClear?: () => void;
  onSave: (value: Date) => void;
  visible: boolean;
};

export function DeadlinePickerModal({
  initialValue,
  onCancel,
  onClear,
  onSave,
  visible,
}: DeadlinePickerModalProps) {
  const [selected, setSelected] = useState(initialValue);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfLocalMonth(initialValue),
  );
  const [openTimeField, setOpenTimeField] = useState<
    'hour' | 'minute' | null
  >(null);

  const timeMenuTranslateY = useRef(new Animated.Value(0)).current;
  const timeMenuStartY = useRef(0);
  const timeMenuCurrentY = useRef(0);
  const timeMenuContentHeight = useRef(0);
  const timeMenuMaxScroll = useRef(0);

  useEffect(() => {
    if (!visible) return;

    setSelected(new Date(initialValue));
    setVisibleMonth(startOfLocalMonth(initialValue));
    setOpenTimeField(null);
  }, [initialValue, visible]);

  useEffect(() => {
    timeMenuCurrentY.current = 0;
    timeMenuStartY.current = 0;
    timeMenuTranslateY.setValue(0);
    timeMenuContentHeight.current = 0;
    timeMenuMaxScroll.current = 0;
  }, [openTimeField, timeMenuTranslateY]);

  const monthCells = useMemo(
    () => calendarMonthCells(visibleMonth),
    [visibleMonth],
  );

  const selectedKey = toLocalDateKey(selected);

  function selectHour(hour: number) {
    setSelected((current) => {
      const next = new Date(current);
      const isPm = current.getHours() >= 12;

      next.setHours((hour % 12) + (isPm ? 12 : 0));

      return next;
    });

    setOpenTimeField(null);
  }

  function selectMinute(minute: number) {
    setSelected((current) => {
      const next = new Date(current);

      next.setMinutes(minute);

      return next;
    });

    setOpenTimeField(null);
  }

  function selectPeriod(period: 'AM' | 'PM') {
    setSelected((current) => {
      const next = new Date(current);
      const hour = current.getHours() % 12;

      next.setHours(hour + (period === 'PM' ? 12 : 0));

      return next;
    });
  }

  function selectDate(date: Date) {
    const next = new Date(date);

    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);

    setSelected(next);
  }

  const timeMenuPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,

      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 3,

      onMoveShouldSetPanResponderCapture: (_, gestureState) =>
        Math.abs(gestureState.dy) > 3,

      onPanResponderGrant: () => {
        timeMenuStartY.current = timeMenuCurrentY.current;
      },

      onPanResponderMove: (_, gestureState) => {
        const nextY =
          timeMenuStartY.current + gestureState.dy * 0.85;

        const clampedY = Math.min(
          0,
          Math.max(nextY, -timeMenuMaxScroll.current),
        );

        timeMenuCurrentY.current = clampedY;

        timeMenuTranslateY.setValue(clampedY);
      },

      onPanResponderRelease: (_, gestureState) => {
        const velocity = gestureState.vy;

        const currentY = timeMenuCurrentY.current;

        const projectedY = currentY + velocity * 120;

        const targetY = Math.min(
          0,
          Math.max(projectedY, -timeMenuMaxScroll.current),
        );

        timeMenuCurrentY.current = targetY;

        Animated.spring(timeMenuTranslateY, {
          toValue: targetY,
          useNativeDriver: true,
          tension: 90,
          friction: 12,
        }).start(() => {
          timeMenuStartY.current = targetY;
        });
      },

      onPanResponderTerminate: () => {
        timeMenuStartY.current = timeMenuCurrentY.current;
      },

      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  const timeOptions =
    openTimeField === 'hour'
      ? Array.from({ length: 12 }, (_, index) => index + 1)
      : Array.from({ length: 60 }, (_, index) => index);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onCancel}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <SafeAreaView style={styles.overlay}>
        <Pressable
          accessibilityLabel="Close deadline picker"
          accessibilityRole="button"
          onPress={onCancel}
          style={StyleSheet.absoluteFill}
        />

        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text accessibilityRole="header" style={styles.title}>
                Choose deadline
              </Text>

              <Text accessibilityLiveRegion="polite" style={styles.summary}>
                {selected.toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                ·{' '}
                {selected.toLocaleTimeString(undefined, {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>
            </View>

            <IconButton
              accessibilityLabel="Close deadline picker"
              icon="close"
              onPress={onCancel}
            />
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            scrollEnabled={!openTimeField}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.monthHeader}>
              <IconButton
                accessibilityLabel="Previous month"
                icon="chevron-back"
                onPress={() =>
                  setVisibleMonth((month) => moveLocalMonth(month, -1))
                }
              />

              <Text style={styles.monthTitle}>
                {visibleMonth.toLocaleDateString(undefined, {
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>

              <IconButton
                accessibilityLabel="Next month"
                icon="chevron-forward"
                onPress={() =>
                  setVisibleMonth((month) => moveLocalMonth(month, 1))
                }
              />
            </View>

            <View style={styles.calendar}>
              <View style={styles.weekRow}>
                {WEEKDAYS.map((weekday) => (
                  <Text key={weekday} style={styles.weekday}>
                    {weekday.slice(0, 1)}
                  </Text>
                ))}
              </View>

              {Array.from(
                { length: monthCells.length / 7 },
                (_, weekIndex) =>
                  monthCells.slice(
                    weekIndex * 7,
                    weekIndex * 7 + 7,
                  ),
              ).map((week, weekIndex) => (
                <View
                  key={`week-${weekIndex}`}
                  style={styles.weekRow}
                >
                  {week.map((date, dayIndex) => {
                    if (!date) {
                      return (
                        <View
                          key={`blank-${weekIndex}-${dayIndex}`}
                          style={styles.cell}
                        />
                      );
                    }

                    const key = toLocalDateKey(date);
                    const isSelected = key === selectedKey;

                    const label = date.toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    });

                    return (
                      <View key={key} style={styles.cell}>
                        <Pressable
                          accessibilityLabel={label}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                          onPress={() => selectDate(date)}
                          style={({ pressed }) => [
                            styles.day,
                            isSelected && styles.selectedDay,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              isSelected && styles.selectedDayText,
                            ]}
                          >
                            {date.getDate()}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>

            <View style={styles.timeCard}>
              <View style={styles.timeHeading}>
                <Ionicons
                  accessibilityElementsHidden
                  color={colors.primary}
                  name="time-outline"
                  size={22}
                />

                <Text style={styles.timeTitle}>Due time</Text>

                <Text style={styles.timeValue}>
                  {selected.toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </View>

              <View style={styles.timeControls}>
                <TimeDropdown
                  expanded={openTimeField === 'hour'}
                  label="Hour"
                  onPress={() =>
                    setOpenTimeField((current) =>
                      current === 'hour' ? null : 'hour',
                    )
                  }
                  value={String(selected.getHours() % 12 || 12)}
                />

                <Text
                  accessibilityElementsHidden
                  style={styles.timeSeparator}
                >
                  :
                </Text>

                <TimeDropdown
                  expanded={openTimeField === 'minute'}
                  label="Minute"
                  onPress={() =>
                    setOpenTimeField((current) =>
                      current === 'minute' ? null : 'minute',
                    )
                  }
                  value={String(selected.getMinutes()).padStart(2, '0')}
                />

                <View
                  accessibilityRole="radiogroup"
                  style={styles.periodControl}
                >
                  {(['AM', 'PM'] as const).map((period) => {
                    const active =
                      period ===
                      (selected.getHours() >= 12 ? 'PM' : 'AM');

                    return (
                      <Pressable
                        accessibilityLabel={period}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                        key={period}
                        onPress={() => selectPeriod(period)}
                        style={({ pressed }) => [
                          styles.periodButton,
                          active && styles.periodButtonSelected,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.periodText,
                            active && styles.periodTextSelected,
                          ]}
                        >
                          {period}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {openTimeField && (
                <View
                  {...timeMenuPanResponder.panHandlers}
                  style={[
                    styles.timeMenu,
                    openTimeField === 'hour'
                      ? styles.hourMenu
                      : styles.minuteMenu,
                  ]}
                >
                  <Animated.View
                    onLayout={(event) => {
                      const contentHeight =
                        event.nativeEvent.layout.height;

                      const visibleHeight =
                        250 - spacing.md * 2;

                      const maxScroll = Math.max(
                        0,
                        contentHeight - visibleHeight,
                      );

                      timeMenuContentHeight.current = contentHeight;
                      timeMenuMaxScroll.current = maxScroll;

                      const clampedCurrent = Math.max(
                        -maxScroll,
                        Math.min(
                          0,
                          timeMenuCurrentY.current,
                        ),
                      );

                      timeMenuCurrentY.current = clampedCurrent;
                      timeMenuStartY.current = clampedCurrent;

                      timeMenuTranslateY.setValue(clampedCurrent);
                    }}
                    style={[
                      styles.timeMenuContent,
                      {
                        transform: [
                          {
                            translateY: timeMenuTranslateY,
                          },
                        ],
                      },
                    ]}
                  >
                    <Text style={styles.timeMenuTitle}>
                      Select {openTimeField}
                    </Text>

                    <View style={styles.timeMenuOptions}>
                      {timeOptions.map((option) => {
                        const active =
                          openTimeField === 'hour'
                            ? option ===
                              (selected.getHours() % 12 || 12)
                            : option === selected.getMinutes();

                        return (
                          <Pressable
                            accessibilityLabel={
                              openTimeField === 'minute'
                                ? `${option} minutes`
                                : `${option} o'clock`
                            }
                            accessibilityRole="radio"
                            accessibilityState={{
                              selected: active,
                            }}
                            key={option}
                            onPress={() =>
                              openTimeField === 'hour'
                                ? selectHour(option)
                                : selectMinute(option)
                            }
                            style={({ pressed }) => [
                              styles.timeOption,
                              active &&
                                styles.timeOptionSelected,
                              pressed && styles.pressed,
                            ]}
                          >
                            <Text
                              style={[
                                styles.timeOptionText,
                                active &&
                                  styles.timeOptionTextSelected,
                              ]}
                            >
                              {openTimeField === 'minute'
                                ? String(option).padStart(2, '0')
                                : option}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </Animated.View>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            {onClear && (
              <Pressable
                accessibilityRole="button"
                onPress={onClear}
                style={({ pressed }) => [
                  styles.clear,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={() => onSave(selected)}
              style={({ pressed }) => [
                styles.save,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.saveText}>Save deadline</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function IconButton({
  accessibilityLabel,
  icon,
  onPress,
}: {
  accessibilityLabel: string;
  icon: 'chevron-back' | 'chevron-forward' | 'close';
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        accessibilityElementsHidden
        color={colors.text}
        name={icon}
        size={22}
      />
    </Pressable>
  );
}

function TimeDropdown({
  expanded,
  label,
  onPress,
  value,
}: {
  expanded: boolean;
  label: string;
  onPress: () => void;
  value: string;
}) {
  return (
    <View style={styles.dropdownGroup}>
      <Text style={styles.dropdownLabel}>{label}</Text>

      <Pressable
        accessibilityLabel={`${label}, ${value}`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.dropdown,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.dropdownValue}>{value}</Text>

        <Ionicons
          accessibilityElementsHidden
          color={colors.primary}
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(30, 32, 54, 0.48)',
  },

  sheet: {
    width: '100%',
    maxHeight: '92%',
    overflow: 'hidden',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
    elevation: 16,
  },

  handle: {
    width: 48,
    height: 5,
    alignSelf: 'center',
    marginTop: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.borderStrong,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  headerCopy: {
    flex: 1,
    gap: 2,
  },

  title: {
    color: colors.text,
    fontFamily: typography.headingStrong,
    fontSize: 22,
  },

  summary: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
  },

  iconButton: {
    width: minimumTouchTarget,
    height: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
  },

  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },

  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },

  monthTitle: {
    color: colors.text,
    fontFamily: typography.bodyBold,
    fontSize: 16,
    textAlign: 'center',
  },

  calendar: {
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryFaint,
  },

  weekRow: {
    flexDirection: 'row',
  },

  weekday: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: typography.bodyBold,
    fontSize: 11,
    textAlign: 'center',
  },

  cell: {
    flex: 1,
    minHeight: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },

  day: {
    width: minimumTouchTarget,
    height: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },

  selectedDay: {
    backgroundColor: colors.primary,
  },

  dayText: {
    color: colors.text,
    fontFamily: typography.bodySemibold,
    fontSize: 15,
  },

  selectedDayText: {
    color: colors.surface,
  },

  timeCard: {
    position: 'relative',
    zIndex: 3,
    overflow: 'visible',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSubtle,
  },

  timeHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  timeTitle: {
    flex: 1,
    color: colors.text,
    fontFamily: typography.bodyBold,
    fontSize: 16,
  },

  timeValue: {
    color: colors.primaryPressed,
    fontFamily: typography.headingStrong,
    fontSize: 20,
  },

  timeControls: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },

  timeSeparator: {
    minHeight: minimumTouchTarget,
    color: colors.text,
    fontFamily: typography.headingStrong,
    fontSize: 24,
    lineHeight: minimumTouchTarget,
  },

  dropdownGroup: {
    flex: 1,
    gap: spacing.xs,
  },

  dropdownLabel: {
    color: colors.textMuted,
    fontFamily: typography.bodySemibold,
    fontSize: 13,
  },

  dropdown: {
    minHeight: minimumTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },

  dropdownValue: {
    color: colors.text,
    fontFamily: typography.bodyBold,
    fontSize: 17,
  },

  periodControl: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },

  periodButton: {
    minWidth: minimumTouchTarget,
    minHeight: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },

  periodButtonSelected: {
    backgroundColor: colors.primary,
  },

  periodText: {
    color: colors.textMuted,
    fontFamily: typography.bodyBold,
    fontSize: 13,
  },

  periodTextSelected: {
    color: colors.surface,
  },

  timeMenu: {
    position: 'absolute',
    bottom: 88,
    zIndex: 20,
    width: 128,
    height: 250,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 14,
    overflow: 'hidden',
  },

  hourMenu: {
    left: spacing.lg,
  },

  minuteMenu: {
    left: 154,
  },

  timeMenuContent: {
    width: '100%',
  },

  timeMenuTitle: {
    color: colors.textMuted,
    fontFamily: typography.bodySemibold,
    fontSize: 13,
  },

  timeMenuOptions: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },

  timeOption: {
    width: '100%',
    minHeight: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primaryFaint,
  },

  timeOptionSelected: {
    backgroundColor: colors.primary,
  },

  timeOptionText: {
    color: colors.text,
    fontFamily: typography.bodySemibold,
    fontSize: 14,
  },

  timeOptionTextSelected: {
    color: colors.surface,
  },

  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },

  clear: {
    minWidth: 96,
    minHeight: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
  },

  clearText: {
    color: colors.primary,
    fontFamily: typography.bodyBold,
    fontSize: 15,
  },

  save: {
    flex: 1,
    minHeight: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },

  saveText: {
    color: colors.surface,
    fontFamily: typography.bodyBold,
    fontSize: 16,
  },

  pressed: {
    opacity: 0.68,
  },
});