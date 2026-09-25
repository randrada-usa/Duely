import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Linking } from 'react-native';

import { parseSavedReminder } from '../domain/reminder';
import type { ReminderMinutes } from '../domain/task';
import {
  getNotificationPermission,
  type NotificationPermission,
  prepareNotifications,
  reconcileTaskReminders,
  requestNotificationPermission,
} from '../services/notifications';
import { useTasks } from './TaskStore';

const DEFAULT_REMINDER_KEY = 'duely.default-reminder.v1';
const initialPermission: NotificationPermission = {
  granted: false,
  canAskAgain: true,
  status: 'undetermined',
};

type ReminderStoreValue = {
  defaultReminder: ReminderMinutes | null;
  permission: NotificationPermission;
  isReady: boolean;
  schedulingError: string | null;
  setDefaultReminder: (value: ReminderMinutes | null) => void;
  requestPermission: () => Promise<NotificationPermission>;
  openSettings: () => Promise<void>;
};

const ReminderStoreContext = createContext<ReminderStoreValue | null>(null);

export function ReminderStoreProvider({ children }: PropsWithChildren) {
  const { tasks, isHydrated: tasksHydrated } = useTasks();
  const needsStartupReschedule = useRef(true);
  const [defaultReminder, setDefaultReminderState] =
    useState<ReminderMinutes | null>(1440);
  const [permission, setPermission] = useState(initialPermission);
  const [isReady, setIsReady] = useState(false);
  const [schedulingError, setSchedulingError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      prepareNotifications(),
      getNotificationPermission(),
      AsyncStorage.getItem(DEFAULT_REMINDER_KEY),
    ])
      .then(([, currentPermission, savedDefault]) => {
        if (!active) return;
        setPermission(currentPermission);
        const parsed = parseSavedReminder(savedDefault);
        if (parsed !== undefined) setDefaultReminderState(parsed);
      })
      .catch(() => {
        if (active) setSchedulingError('Notification settings could not be loaded.');
      })
      .finally(() => {
        if (active) setIsReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady || !tasksHydrated) return;
    let active = true;
    const replaceExisting = needsStartupReschedule.current;
    needsStartupReschedule.current = false;
    reconcileTaskReminders(tasks, permission.granted, new Date(), replaceExisting)
      .then(() => {
        if (active) setSchedulingError(null);
      })
      .catch(() => {
        if (replaceExisting) needsStartupReschedule.current = true;
        if (active) {
          setSchedulingError(
            'Your task was saved, but its reminder could not be scheduled.',
          );
        }
      });
    return () => {
      active = false;
    };
  }, [isReady, permission.granted, tasks, tasksHydrated]);

  const setDefaultReminder = useCallback((value: ReminderMinutes | null) => {
    setDefaultReminderState(value);
    void AsyncStorage.setItem(DEFAULT_REMINDER_KEY, JSON.stringify(value));
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const next = await requestNotificationPermission();
      setPermission(next);
      return next;
    } catch {
      setSchedulingError('Android could not open the notification permission prompt.');
      return initialPermission;
    }
  }, []);

  const value = useMemo<ReminderStoreValue>(
    () => ({
      defaultReminder,
      permission,
      isReady,
      schedulingError,
      setDefaultReminder,
      requestPermission,
      openSettings: () => Linking.openSettings(),
    }),
    [defaultReminder, isReady, permission, requestPermission, schedulingError, setDefaultReminder],
  );

  return (
    <ReminderStoreContext.Provider value={value}>
      {children}
    </ReminderStoreContext.Provider>
  );
}

export function useReminders() {
  const value = useContext(ReminderStoreContext);
  if (!value) throw new Error('useReminders must be used inside ReminderStoreProvider');
  return value;
}
