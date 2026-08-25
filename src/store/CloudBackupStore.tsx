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

import type { LocalTaskData } from '../domain/subject';
import {
  backupLocalTaskData,
  CLOUD_BACKUP_ERROR,
  createSupabaseCloudBackupGateway,
  type CloudBackupResult,
} from '../services/cloudBackup';
import {
  loadCloudBackupReceipt,
  pendingCloudBackupCounts,
  saveCloudBackupReceipt,
  type CloudBackupReceipt,
} from '../services/cloudBackupReceipt';
import { getSupabaseClient } from '../services/supabaseClient';
import { useAuth } from './AuthStore';
import { useTasks } from './TaskStore';

const RECEIPT_ERROR =
  'The cloud backup was confirmed, but Duely could not save its local receipt. It is safe to retry.';

type CloudBackupStoreValue = {
  isCheckingBackup: boolean;
  isBackingUp: boolean;
  isBackupPromptDismissed: boolean;
  pendingTaskCount: number;
  pendingSubjectCount: number;
  shouldOfferBackup: boolean;
  backupError: string | null;
  lastBackupResult: CloudBackupResult | null;
  backUpLocalData: () => Promise<boolean>;
  dismissBackupPrompt: () => void;
  clearBackupResult: () => void;
};

const CloudBackupContext = createContext<CloudBackupStoreValue | null>(null);

export function CloudBackupStoreProvider({ children }: PropsWithChildren) {
  const { status: authStatus, user } = useAuth();
  const { tasks, subjects, isHydrated, canEditTasks } = useTasks();
  const [receipt, setReceipt] = useState<CloudBackupReceipt | null>(null);
  const [isCheckingBackup, setIsCheckingBackup] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isBackupPromptDismissed, setIsBackupPromptDismissed] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [lastBackupResult, setLastBackupResult] =
    useState<CloudBackupResult | null>(null);

  useEffect(() => {
    let active = true;
    setReceipt(null);
    setBackupError(null);
    setLastBackupResult(null);
    setIsBackupPromptDismissed(false);

    if (authStatus !== 'authenticated' || !user) {
      setIsCheckingBackup(false);
      return () => {
        active = false;
      };
    }

    setIsCheckingBackup(true);
    loadCloudBackupReceipt(AsyncStorage, user.id)
      .then((saved) => {
        if (active) setReceipt(saved);
      })
      .catch(() => {
        if (active) setBackupError(CLOUD_BACKUP_ERROR);
      })
      .finally(() => {
        if (active) setIsCheckingBackup(false);
      });

    return () => {
      active = false;
    };
  }, [authStatus, user]);

  const pending = useMemo(
    () => pendingCloudBackupCounts({ tasks, subjects }, receipt),
    [receipt, subjects, tasks],
  );

  const backUpLocalData = useCallback(async () => {
    if (
      authStatus !== 'authenticated' ||
      !user ||
      !isHydrated ||
      !canEditTasks ||
      isBackingUp
    ) {
      return false;
    }

    const snapshot: LocalTaskData = {
      tasks: [...tasks],
      subjects: [...subjects],
    };
    setIsBackingUp(true);
    setBackupError(null);
    setLastBackupResult(null);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error(CLOUD_BACKUP_ERROR);
      const result = await backupLocalTaskData(
        createSupabaseCloudBackupGateway(supabase),
        user.id,
        snapshot,
      );
      const confirmedAt = new Date().toISOString();
      try {
        const savedReceipt = await saveCloudBackupReceipt(
          AsyncStorage,
          user.id,
          snapshot,
          confirmedAt,
        );
        setReceipt(savedReceipt);
      } catch {
        setBackupError(RECEIPT_ERROR);
        return false;
      }
      setLastBackupResult(result);
      setIsBackupPromptDismissed(false);
      return true;
    } catch {
      setBackupError(CLOUD_BACKUP_ERROR);
      return false;
    } finally {
      setIsBackingUp(false);
    }
  }, [
    authStatus,
    canEditTasks,
    isBackingUp,
    isHydrated,
    subjects,
    tasks,
    user,
  ]);

  const value = useMemo<CloudBackupStoreValue>(
    () => ({
      isCheckingBackup,
      isBackingUp,
      isBackupPromptDismissed,
      pendingTaskCount: pending.tasks,
      pendingSubjectCount: pending.subjects,
      shouldOfferBackup:
        authStatus === 'authenticated' &&
        isHydrated &&
        !isCheckingBackup &&
        !isBackupPromptDismissed &&
        pending.tasks + pending.subjects > 0,
      backupError,
      lastBackupResult,
      backUpLocalData,
      dismissBackupPrompt: () => {
        setIsBackupPromptDismissed(true);
        setBackupError(null);
      },
      clearBackupResult: () => setLastBackupResult(null),
    }),
    [
      authStatus,
      backUpLocalData,
      backupError,
      isBackingUp,
      isBackupPromptDismissed,
      isCheckingBackup,
      isHydrated,
      lastBackupResult,
      pending.subjects,
      pending.tasks,
    ],
  );

  return (
    <CloudBackupContext.Provider value={value}>
      {children}
    </CloudBackupContext.Provider>
  );
}

export function useCloudBackup() {
  const value = useContext(CloudBackupContext);
  if (!value) {
    throw new Error('useCloudBackup must be used inside CloudBackupStoreProvider');
  }
  return value;
}
