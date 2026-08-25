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

import type { LocalTaskData } from '../domain/subject';
import {
  backupLocalTaskData,
  CLOUD_BACKUP_ERROR,
  createSupabaseCloudBackupGateway,
  type CloudBackupResult,
} from '../services/cloudBackup';
import {
  cloudTaskDataFingerprint,
  loadCloudBackupReceipt,
  pendingCloudBackupCounts,
  saveCloudBackupReceipt,
  type CloudBackupReceipt,
} from '../services/cloudBackupReceipt';
import {
  createSupabaseCloudMirrorGateway,
  mirrorLocalTaskData,
} from '../services/cloudMirror';
import {
  createSupabaseCloudRestoreGateway,
  loadCloudTaskData,
} from '../services/cloudRestore';
import { getSupabaseClient } from '../services/supabaseClient';
import { useAuth } from './AuthStore';
import { useTasks } from './TaskStore';

const RECEIPT_ERROR =
  'The cloud backup was confirmed, but Duely could not save its local receipt. It is safe to retry.';

type CloudBackupStoreValue = {
  isCheckingBackup: boolean;
  isBackingUp: boolean;
  isSyncing: boolean;
  isRestoring: boolean;
  isBackupPromptDismissed: boolean;
  pendingTaskCount: number;
  pendingSubjectCount: number;
  shouldOfferBackup: boolean;
  shouldOfferRestore: boolean;
  restoreTaskCount: number;
  backupError: string | null;
  syncError: string | null;
  lastSyncedAt: string | null;
  lastBackupResult: CloudBackupResult | null;
  backUpLocalData: () => Promise<boolean>;
  dismissBackupPrompt: () => void;
  clearBackupResult: () => void;
  retrySync: () => void;
  restoreFromCloud: () => Promise<boolean>;
};

const CloudBackupContext = createContext<CloudBackupStoreValue | null>(null);

export function CloudBackupStoreProvider({ children }: PropsWithChildren) {
  const { status: authStatus, user } = useAuth();
  const { tasks, subjects, isHydrated, canEditTasks, restoreLocalData } = useTasks();
  const [receipt, setReceipt] = useState<CloudBackupReceipt | null>(null);
  const [isCheckingBackup, setIsCheckingBackup] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreCandidate, setRestoreCandidate] = useState<LocalTaskData | null>(null);
  const [isBackupPromptDismissed, setIsBackupPromptDismissed] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const attemptedFingerprint = useRef<string | null>(null);
  const retryAttempt = useRef(0);
  const [lastBackupResult, setLastBackupResult] =
    useState<CloudBackupResult | null>(null);

  useEffect(() => {
    let active = true;
    setReceipt(null);
    setBackupError(null);
    setSyncError(null);
    setRestoreCandidate(null);
    attemptedFingerprint.current = null;
    retryAttempt.current = 0;
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

  useEffect(() => {
    let active = true;
    if (
      authStatus !== 'authenticated' ||
      !user ||
      !isHydrated ||
      isCheckingBackup ||
      receipt ||
      tasks.length > 0 ||
      subjects.length > 0
    ) {
      return () => {
        active = false;
      };
    }
    const supabase = getSupabaseClient();
    if (!supabase) return;
    loadCloudTaskData(createSupabaseCloudRestoreGateway(supabase), user.id)
      .then((candidate) => {
        if (active && candidate.tasks.length > 0) setRestoreCandidate(candidate);
      })
      .catch(() => {
        if (active) setBackupError(CLOUD_BACKUP_ERROR);
      });
    return () => {
      active = false;
    };
  }, [
    authStatus,
    isCheckingBackup,
    isHydrated,
    receipt,
    subjects.length,
    tasks.length,
    user,
  ]);

  const pending = useMemo(
    () => pendingCloudBackupCounts({ tasks, subjects }, receipt),
    [receipt, subjects, tasks],
  );

  const currentFingerprint = useMemo(
    () => cloudTaskDataFingerprint({ tasks, subjects }),
    [subjects, tasks],
  );

  const syncLocalData = useCallback(async () => {
    if (
      authStatus !== 'authenticated' ||
      !user ||
      !receipt ||
      !isHydrated ||
      !canEditTasks ||
      isSyncing
    ) {
      return false;
    }
    const snapshot: LocalTaskData = { tasks: [...tasks], subjects: [...subjects] };
    const fingerprint = cloudTaskDataFingerprint(snapshot);
    attemptedFingerprint.current = fingerprint;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error(CLOUD_BACKUP_ERROR);
      await mirrorLocalTaskData(
        createSupabaseCloudMirrorGateway(supabase),
        user.id,
        snapshot,
        receipt,
      );
      const saved = await saveCloudBackupReceipt(
        AsyncStorage,
        user.id,
        snapshot,
        new Date().toISOString(),
      );
      setReceipt(saved);
      retryAttempt.current = 0;
      return true;
    } catch {
      retryAttempt.current += 1;
      setSyncError(CLOUD_BACKUP_ERROR);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [
    authStatus,
    canEditTasks,
    isHydrated,
    isSyncing,
    receipt,
    subjects,
    tasks,
    user,
  ]);

  useEffect(() => {
    if (
      !receipt ||
      receipt.dataFingerprint === currentFingerprint ||
      attemptedFingerprint.current === currentFingerprint
    ) {
      return;
    }
    const timer = setTimeout(() => void syncLocalData(), 1_000);
    return () => clearTimeout(timer);
  }, [currentFingerprint, receipt, syncLocalData]);

  useEffect(() => {
    if (!syncError || !receipt || retryAttempt.current > 3) return;
    const delays = [5_000, 30_000, 120_000];
    const timer = setTimeout(() => {
      attemptedFingerprint.current = null;
      void syncLocalData();
    }, delays[Math.max(0, retryAttempt.current - 1)]);
    return () => clearTimeout(timer);
  }, [receipt, syncError, syncLocalData]);

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

  const restoreFromCloud = useCallback(async () => {
    if (!user || !restoreCandidate || isRestoring) return false;
    setIsRestoring(true);
    setBackupError(null);
    try {
      if (!(await restoreLocalData(restoreCandidate))) {
        setBackupError(CLOUD_BACKUP_ERROR);
        return false;
      }
      const saved = await saveCloudBackupReceipt(
        AsyncStorage,
        user.id,
        restoreCandidate,
        new Date().toISOString(),
      );
      setReceipt(saved);
      setRestoreCandidate(null);
      return true;
    } catch {
      setBackupError(CLOUD_BACKUP_ERROR);
      return false;
    } finally {
      setIsRestoring(false);
    }
  }, [isRestoring, restoreCandidate, restoreLocalData, user]);

  const value = useMemo<CloudBackupStoreValue>(
    () => ({
      isCheckingBackup,
      isBackingUp,
      isSyncing,
      isRestoring,
      isBackupPromptDismissed,
      pendingTaskCount: pending.tasks,
      pendingSubjectCount: pending.subjects,
      shouldOfferBackup:
        authStatus === 'authenticated' &&
        isHydrated &&
        !isCheckingBackup &&
        receipt === null &&
        !isBackupPromptDismissed &&
        pending.tasks + pending.subjects > 0,
      shouldOfferRestore: !!restoreCandidate,
      restoreTaskCount: restoreCandidate?.tasks.length ?? 0,
      backupError,
      syncError,
      lastSyncedAt: receipt?.confirmedAt ?? null,
      lastBackupResult,
      backUpLocalData,
      dismissBackupPrompt: () => {
        setIsBackupPromptDismissed(true);
        setBackupError(null);
      },
      clearBackupResult: () => setLastBackupResult(null),
      retrySync: () => {
        retryAttempt.current = 0;
        attemptedFingerprint.current = null;
        void syncLocalData();
      },
      restoreFromCloud,
    }),
    [
      authStatus,
      backUpLocalData,
      backupError,
      isBackingUp,
      isSyncing,
      isBackupPromptDismissed,
      isCheckingBackup,
      isHydrated,
      isRestoring,
      lastBackupResult,
      pending.subjects,
      pending.tasks,
      receipt,
      restoreCandidate,
      restoreFromCloud,
      syncError,
      syncLocalData,
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
