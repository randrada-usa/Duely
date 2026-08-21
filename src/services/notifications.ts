import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  buildReminderPlan,
  type ScheduledReminder,
} from '../domain/reminder';
import type { Task } from '../domain/task';

const CHANNEL_ID = 'task-reminders';

export type NotificationPermission = {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined';
};

function permissionSummary(
  permission: Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>,
): NotificationPermission {
  return {
    granted: permission.granted,
    canAskAgain: permission.canAskAgain,
    status: permission.status,
  };
}

export async function prepareNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Task reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 200, 250],
      lightColor: '#5B6FE8',
    });
  }
}

export async function getNotificationPermission() {
  if (Platform.OS === 'web') {
    return { granted: false, canAskAgain: false, status: 'denied' } as const;
  }
  return permissionSummary(await Notifications.getPermissionsAsync());
}

export async function requestNotificationPermission() {
  return permissionSummary(await Notifications.requestPermissionsAsync());
}

function scheduledDuelyReminders(
  requests: Awaited<ReturnType<typeof Notifications.getAllScheduledNotificationsAsync>>,
) {
  return requests.flatMap<ScheduledReminder>((request) => {
    const taskId = request.content.data?.taskId;
    const fingerprint = request.content.data?.reminderFingerprint;
    if (typeof taskId !== 'string' || typeof fingerprint !== 'string') return [];
    return [{ identifier: request.identifier, taskId, fingerprint }];
  });
}

export async function reconcileTaskReminders(
  tasks: Task[],
  canSchedule: boolean,
  now = new Date(),
) {
  if (Platform.OS === 'web') return;

  const requests = await Notifications.getAllScheduledNotificationsAsync();
  const plan = buildReminderPlan(tasks, scheduledDuelyReminders(requests), now);

  await Promise.all(
    plan.cancelIdentifiers.map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier),
    ),
  );

  if (!canSchedule) return;

  await Promise.all(
    plan.schedule.map((reminder) =>
      Notifications.scheduleNotificationAsync({
        identifier: reminder.identifier,
        content: {
          title: 'Duely task reminder',
          body: reminder.title,
          sound: 'default',
          data: {
            taskId: reminder.taskId,
            reminderFingerprint: reminder.fingerprint,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminder.triggerAt,
          channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
        },
      }),
    ),
  );
}
