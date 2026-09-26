import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '../../src/components/EmptyState';
import { ScreenShell } from '../../src/components/ScreenShell';
import { sortBySmartPriority } from '../../src/domain/task';
import { useNotificationStore } from '../../src/store/NotificationStore';
import { useTasks } from '../../src/store/TaskStore';
import { colors, radius, spacing, surfaces, typography } from '../../src/theme/tokens';

function relativeDeadline(dueAt: string) {
  const due = new Date(dueAt);
  const difference = due.getTime() - Date.now();
  const hours = Math.max(1, Math.ceil(Math.abs(difference) / 3_600_000));
  if (difference < 0) return `${hours}h overdue`;
  if (hours < 24) return `Due in ${hours}h`;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(due);
}

export default function NotificationsScreen() {
  const { getSubjectName, tasks } = useTasks();
  const { isReady, isUnread, markAllRead, markRead } = useNotificationStore();
  const notices = useMemo(
    () =>
      sortBySmartPriority(tasks)
        .filter((task) => task.status === 'open' && task.dueAt)
        .slice(0, 12),
    [tasks],
  );
  const unreadCount = isReady ? notices.filter(isUnread).length : 0;

  return (
    <ScreenShell scroll>
      <View style={styles.header}>
        <View>
          <Text accessibilityRole="header" style={styles.title}>Notifications</Text>
          <Text accessibilityLiveRegion="polite" style={styles.unread}>
            {unreadCount === 0 ? 'All caught up' : `${unreadCount} unread`}
          </Text>
        </View>
        {unreadCount > 0 && (
          <Pressable
            accessibilityRole="button"
            onPress={() => markAllRead(notices)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.markRead}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {notices.length === 0 ? (
        <EmptyState
          description="Task reminders and upcoming deadlines will appear here."
          title="No notifications"
        />
      ) : (
        <View style={styles.list}>
          {notices.map((task) => {
            const unread = isReady && isUnread(task);
            return (
              <Pressable
                accessibilityLabel={`${task.title}. ${relativeDeadline(task.dueAt!)}. ${unread ? 'Unread' : 'Read'}.`}
                accessibilityRole="button"
                key={task.id}
                onPress={() => markRead(task)}
                style={({ pressed }) => [
                  styles.notice,
                  unread && styles.unreadNotice,
                  pressed && styles.pressed,
                ]}
              >
                {unread && <View accessibilityElementsHidden style={styles.unreadDot} />}
                <View style={styles.iconFrame}>
                  <Ionicons
                    accessibilityElementsHidden
                    color={colors.danger}
                    name="notifications"
                    size={20}
                  />
                </View>
                <View style={styles.copy}>
                  <View style={styles.noticeHeader}>
                    <Text style={styles.noticeTitle}>
                      {task.title}
                    </Text>
                    <Text style={styles.time}>{relativeDeadline(task.dueAt!)}</Text>
                  </View>
                  <Text style={styles.body}>
                    {getSubjectName(task.subjectId)} · {task.reminderMinutesBefore === null
                      ? 'Deadline saved'
                      : 'Reminder scheduled'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontFamily: typography.headingStrong, fontSize: 26 },
  unread: { marginTop: 2, color: colors.primary, fontFamily: typography.body, fontSize: 13 },
  markRead: { color: colors.primary, fontFamily: typography.bodySemibold, fontSize: 14 },
  list: { gap: spacing.md },
  notice: {
    ...surfaces.card,
    position: 'relative',
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
  },
  unreadNotice: { borderColor: '#FFD3D7', backgroundColor: '#FFF9F9' },
  iconFrame: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.dangerSoft,
  },
  copy: { flex: 1, minWidth: 0, gap: spacing.xs },
  noticeHeader: { alignItems: 'flex-start', gap: spacing.sm },
  noticeTitle: { color: colors.text, fontFamily: typography.bodyBold, fontSize: 16 },
  time: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13 },
  unreadDot: { position: 'absolute', top: spacing.lg, right: spacing.lg, width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.primary },
  body: { color: colors.textMuted, fontFamily: typography.body, fontSize: 14, lineHeight: 20 },
  pressed: { opacity: 0.7 },
});
