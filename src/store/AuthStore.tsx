import type { Session, User } from '@supabase/supabase-js';
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
  getSupabaseClient,
  startSupabaseSessionRefresh,
} from '../services/supabaseClient';

type AuthStatus =
  | 'unconfigured'
  | 'loading'
  | 'guest'
  | 'authenticated'
  | 'error';

type AuthStoreValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  error: string | null;
  isSigningOut: boolean;
  retry: () => void;
  signOut: () => Promise<boolean>;
};

const SESSION_ERROR =
  'Duely could not check your account session. Your local tasks are still available.';
const SIGN_OUT_ERROR =
  'Duely could not sign out. Check your connection and try again.';

const AuthStoreContext = createContext<AuthStoreValue | null>(null);

export function AuthStoreProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    let stopRefresh: (() => void) | undefined;
    let unsubscribe: (() => void) | undefined;

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setStatus('unconfigured');
        setSession(null);
        setError(null);
        return;
      }

      setStatus('loading');
      setError(null);
      stopRefresh = startSupabaseSessionRefresh(supabase);
      const authSubscription = supabase.auth.onAuthStateChange(
        (_event, nextSession) => {
          if (!active) return;
          setSession(nextSession);
          setStatus(nextSession ? 'authenticated' : 'guest');
          setError(null);
        },
      );
      unsubscribe = () => authSubscription.data.subscription.unsubscribe();

      void supabase.auth.getSession().then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) {
          setStatus('error');
          setError(SESSION_ERROR);
          return;
        }
        setSession(data.session);
        setStatus(data.session ? 'authenticated' : 'guest');
      });
    } catch {
      setStatus('error');
      setSession(null);
      setError(SESSION_ERROR);
    }

    return () => {
      active = false;
      unsubscribe?.();
      stopRefresh?.();
    };
  }, [retryCount]);

  const retry = useCallback(() => setRetryCount((count) => count + 1), []);

  const signOut = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase || isSigningOut) return false;

      setIsSigningOut(true);
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError(SIGN_OUT_ERROR);
        return false;
      }
      setSession(null);
      setStatus('guest');
      setError(null);
      return true;
    } catch {
      setError(SIGN_OUT_ERROR);
      return false;
    } finally {
      setIsSigningOut(false);
    }
  }, [isSigningOut]);

  const value = useMemo<AuthStoreValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      error,
      isSigningOut,
      retry,
      signOut,
    }),
    [error, isSigningOut, retry, session, signOut, status],
  );

  return (
    <AuthStoreContext.Provider value={value}>
      {children}
    </AuthStoreContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthStoreContext);
  if (!value) throw new Error('useAuth must be used inside AuthStoreProvider');
  return value;
}
