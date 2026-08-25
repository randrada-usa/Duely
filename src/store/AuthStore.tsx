import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
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
  AUTH_REDIRECT_URL,
  emailAddressError,
  normalizeEmail,
  parseAuthRedirect,
} from '../domain/auth';
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
  isAuthActionPending: boolean;
  authActionError: string | null;
  magicLinkSentTo: string | null;
  retry: () => void;
  sendMagicLink: (email: string) => Promise<boolean>;
  clearAuthAction: () => void;
  signOut: () => Promise<boolean>;
};

const SESSION_ERROR =
  'Duely could not check your account session. Your local tasks are still available.';
const SIGN_OUT_ERROR =
  'Duely could not sign out. Check your connection and try again.';
const MAGIC_LINK_ERROR =
  'Duely could not send the sign-in link. Check your connection and try again.';

const AuthStoreContext = createContext<AuthStoreValue | null>(null);

export function AuthStoreProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isAuthActionPending, setIsAuthActionPending] = useState(false);
  const [authActionError, setAuthActionError] = useState<string | null>(null);
  const [magicLinkSentTo, setMagicLinkSentTo] = useState<string | null>(null);

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

  useEffect(() => {
    let active = true;

    const applyRedirect = async (url: string) => {
      const redirect = parseAuthRedirect(url);
      if (redirect.status === 'ignored') return;
      if (redirect.status === 'error') {
        if (active) setAuthActionError(redirect.message);
        return;
      }

      setIsAuthActionPending(true);
      try {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error('Supabase is not configured.');
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: redirect.accessToken,
          refresh_token: redirect.refreshToken,
        });
        if (sessionError) throw sessionError;
        if (active) {
          setAuthActionError(null);
          setMagicLinkSentTo(null);
        }
      } catch {
        if (active) {
          setAuthActionError(
            'Duely could not finish signing in. Request a new link and try again.',
          );
        }
      } finally {
        if (active) setIsAuthActionPending(false);
      }
    };

    void Linking.getInitialURL().then((url) => {
      if (active && url) void applyRedirect(url);
    });
    const subscription = Linking.addEventListener('url', ({ url }) => {
      void applyRedirect(url);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const retry = useCallback(() => setRetryCount((count) => count + 1), []);

  const clearAuthAction = useCallback(() => {
    setAuthActionError(null);
    setMagicLinkSentTo(null);
  }, []);

  const sendMagicLink = useCallback(
    async (value: string) => {
      const validationError = emailAddressError(value);
      if (validationError) {
        setAuthActionError(validationError);
        return false;
      }
      if (isAuthActionPending) return false;

      setIsAuthActionPending(true);
      setAuthActionError(null);
      try {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error('Supabase is not configured.');
        const email = normalizeEmail(value);
        const { error: requestError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: AUTH_REDIRECT_URL,
            shouldCreateUser: true,
          },
        });
        if (requestError) {
          setAuthActionError(
            requestError.status === 429
              ? 'Please wait before requesting another sign-in link.'
              : MAGIC_LINK_ERROR,
          );
          return false;
        }
        setMagicLinkSentTo(email);
        return true;
      } catch {
        setAuthActionError(MAGIC_LINK_ERROR);
        return false;
      } finally {
        setIsAuthActionPending(false);
      }
    },
    [isAuthActionPending],
  );

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
      isAuthActionPending,
      authActionError,
      magicLinkSentTo,
      retry,
      sendMagicLink,
      clearAuthAction,
      signOut,
    }),
    [
      authActionError,
      clearAuthAction,
      error,
      isAuthActionPending,
      isSigningOut,
      magicLinkSentTo,
      retry,
      sendMagicLink,
      session,
      signOut,
      status,
    ],
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
