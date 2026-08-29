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

import { aiAssistEnabled } from '../config/aiAssist';
import {
  loadAiPrivacySnapshot,
  recordConsentDecision,
  type AiPrivacySnapshot,
  type ConsentDecision,
} from '../services/aiPrivacy';
import { getSupabaseClient } from '../services/supabaseClient';
import { useAuth } from './AuthStore';

type AiPrivacyStoreValue = {
  featureEnabled: boolean;
  snapshot: AiPrivacySnapshot;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  refresh: () => void;
  setAiProcessingDecision: (decision: ConsentDecision) => Promise<boolean>;
  withdrawModelImprovement: () => Promise<boolean>;
};

const emptySnapshot: AiPrivacySnapshot = {
  aiProcessing: 'not-decided',
  modelImprovement: 'not-decided',
};
const AiPrivacyContext = createContext<AiPrivacyStoreValue | null>(null);

export function AiPrivacyStoreProvider({ children }: PropsWithChildren) {
  const { status, user } = useAuth();
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let active = true;
    if (status !== 'authenticated' || !user) {
      setSnapshot(emptySnapshot);
      setIsLoading(false);
      setError(null);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return;
    setIsLoading(true);
    setError(null);
    void loadAiPrivacySnapshot(supabase, user.id).then(
      (nextSnapshot) => {
        if (!active) return;
        setSnapshot(nextSnapshot);
        setIsLoading(false);
      },
      () => {
        if (!active) return;
        setError('Duely could not load your AI privacy choice. No text will be uploaded.');
        setIsLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [refreshCount, status, user]);

  const refresh = useCallback(() => setRefreshCount((count) => count + 1), []);

  const setAiProcessingDecision = useCallback(
    async (decision: ConsentDecision) => {
      if (status !== 'authenticated' || !user || isSavingRef.current) return false;
      const supabase = getSupabaseClient();
      if (!supabase) return false;
      isSavingRef.current = true;
      setIsSaving(true);
      setError(null);
      try {
        await recordConsentDecision(supabase, user.id, 'ai_processing', decision);
        setSnapshot((current) => ({ ...current, aiProcessing: decision }));
        return true;
      } catch {
        setError('Duely could not save your AI privacy choice. No text was uploaded.');
        return false;
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
      }
    },
    [status, user],
  );

  const withdrawModelImprovement = useCallback(async () => {
    if (status !== 'authenticated' || !user || isSavingRef.current) return false;
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    isSavingRef.current = true;
    setIsSaving(true);
    setError(null);
    try {
      await recordConsentDecision(
        supabase,
        user.id,
        'model_improvement',
        'withdrawn',
      );
      setSnapshot((current) => ({ ...current, modelImprovement: 'withdrawn' }));
      return true;
    } catch {
      setError('Duely could not save the withdrawal. Try again before contributing data.');
      return false;
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [status, user]);

  const value = useMemo<AiPrivacyStoreValue>(
    () => ({
      featureEnabled: aiAssistEnabled,
      snapshot,
      isLoading,
      isSaving,
      error,
      refresh,
      setAiProcessingDecision,
      withdrawModelImprovement,
    }),
    [
      error,
      isLoading,
      isSaving,
      refresh,
      setAiProcessingDecision,
      snapshot,
      withdrawModelImprovement,
    ],
  );

  return <AiPrivacyContext.Provider value={value}>{children}</AiPrivacyContext.Provider>;
}

export function useAiPrivacy() {
  const value = useContext(AiPrivacyContext);
  if (!value) throw new Error('useAiPrivacy must be used inside AiPrivacyStoreProvider');
  return value;
}
