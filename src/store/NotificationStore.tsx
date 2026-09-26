import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  decodeNotificationReadKeys,
  notificationReadKey,
  NOTIFICATION_READ_STORAGE_KEY,
} from '../domain/notificationInbox';
import type { Task } from '../domain/task';

type NotificationStoreValue = {
  isReady: boolean;
  isUnread: (task: Task) => boolean;
  markRead: (task: Task) => void;
  markAllRead: (tasks: Task[]) => void;
};

const NotificationStoreContext = createContext<NotificationStoreValue | null>(null);

export function NotificationStoreProvider({ children }: PropsWithChildren) {
  const [readKeys, setReadKeys] = useState<Set<string>>(() => new Set());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(NOTIFICATION_READ_STORAGE_KEY)
      .then((saved) => {
        if (active) setReadKeys(decodeNotificationReadKeys(saved));
      })
      .finally(() => {
        if (active) setIsReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateReadKeys = useCallback((keys: string[]) => {
    setReadKeys((current) => {
      const next = new Set(current);
      keys.forEach((key) => next.add(key));
      void AsyncStorage.setItem(
        NOTIFICATION_READ_STORAGE_KEY,
        JSON.stringify([...next]),
      );
      return next;
    });
  }, []);

  const markRead = useCallback(
    (task: Task) => updateReadKeys([notificationReadKey(task)]),
    [updateReadKeys],
  );
  const markAllRead = useCallback(
    (tasks: Task[]) => updateReadKeys(tasks.map(notificationReadKey)),
    [updateReadKeys],
  );
  const isUnread = useCallback(
    (task: Task) => !readKeys.has(notificationReadKey(task)),
    [readKeys],
  );

  const value = useMemo(
    () => ({ isReady, isUnread, markRead, markAllRead }),
    [isReady, isUnread, markAllRead, markRead],
  );

  return (
    <NotificationStoreContext.Provider value={value}>
      {children}
    </NotificationStoreContext.Provider>
  );
}

export function useNotificationStore() {
  const value = useContext(NotificationStoreContext);
  if (!value) {
    throw new Error('useNotificationStore must be used inside NotificationStoreProvider');
  }
  return value;
}
