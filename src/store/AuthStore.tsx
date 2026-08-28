import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
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

import {
  AUTH_REDIRECT_URL,
  emailAddressError,
  normalizeEmail,
  parseAuthRedirect,
} from '../domain/auth';
import {
  createSessionBootstrapCoordinator,
  CURRENT_SESSION_SIGN_OUT_OPTIONS,
} from '../services/authSessionBootstrap';
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
  startGoogleSignIn: () => Promise<boolean>;
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
const GOOGLE_SIGN_IN_ERROR =
  'Duely could not start Google sign-in. Check your connection and try again.';

WebBrowser.maybeCompleteAuthSession();

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
  const isMountedRef = useRef(true);
  const isSigningOutRef = useRef(false);
  const authRedirectHandledRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let stopRefresh: (() => void) | undefined;
    let unsubscribe: (() => void) | undefined;
    let stopBootstrap: (() => void) | undefined;

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
      const bootstrap = createSessionBootstrapCoordinator<Session>({
        onSession: (nextSession) => {
          setSession(nextSession);
          setStatus(nextSession ? 'authenticated' : 'guest');
          setError(null);
        },
        onError: () => {
          setSession(null);
          setStatus('error');
          setError(SESSION_ERROR);
        },
      });
      stopBootstrap = bootstrap.stop;
      const authSubscription = supabase.auth.onAuthStateChange(
        (_event, nextSession) => {
          bootstrap.applyAuthEvent(nextSession);
        },
      );
      unsubscribe = () => authSubscription.data.subscription.unsubscribe();

      void supabase.auth.getSession().then(
        ({ data, error: sessionError }) => {
          bootstrap.applySessionCheck(data.session, !!sessionError);
        },
        () => bootstrap.applySessionCheck(null, true),
      );
    } catch {
      setStatus('error');
      setSession(null);
      setError(SESSION_ERROR);
    }

    return () => {
      stopBootstrap?.();
      unsubscribe?.();
      stopRefresh?.();
    };
  }, [retryCount]);

  const applyAuthRedirect = useCallback(async (url: string) => {
    const redirect = parseAuthRedirect(url);
    if (redirect.status === 'ignored') return false;
    if (authRedirectHandledRef.current) {
      return redirect.status === 'session';
    }
    authRedirectHandledRef.current = true;

    if (redirect.status === 'error') {
      if (isMountedRef.current) {
        setAuthActionError(redirect.message);
        setIsAuthActionPending(false);
      }
      return false;
    }

    if (isMountedRef.current) {
      setIsAuthActionPending(true);
    }
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase is not configured.');
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: redirect.accessToken,
        refresh_token: redirect.refreshToken,
      });
      if (sessionError) throw sessionError;
      if (isMountedRef.current) {
        setAuthActionError(null);
        setMagicLinkSentTo(null);
      }
      return true;
    } catch {
      if (isMountedRef.current) {
        setAuthActionError(
          'Duely could not finish signing in. Request a new link and try again.',
        );
      }
      return false;
    } finally {
      if (isMountedRef.current) setIsAuthActionPending(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    void Linking.getInitialURL().then((url) => {
      if (active && url) void applyAuthRedirect(url);
    });
    const subscription = Linking.addEventListener('url', ({ url }) => {
      void applyAuthRedirect(url);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [applyAuthRedirect]);

  const retry = useCallback(() => setRetryCount((count) => count + 1), []);

  const clearAuthAction = useCallback(() => {
    setAuthActionError(null);
    setMagicLinkSentTo(null);
  }, []);

  const startGoogleSignIn = useCallback(async () => {
    if (isAuthActionPending) return false;

    setIsAuthActionPending(true);
    setAuthActionError(null);
    setMagicLinkSentTo(null);
    authRedirectHandledRef.current = false;
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase is not configured.');
      const { data, error: requestError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: AUTH_REDIRECT_URL,
          skipBrowserRedirect: true,
        },
      });
      if (requestError || !data.url) {
        setAuthActionError(GOOGLE_SIGN_IN_ERROR);
        return false;
      }

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        AUTH_REDIRECT_URL,
      );
      if (result.type === 'success') {
        return applyAuthRedirect(result.url);
      }
      if (result.type !== 'cancel' && result.type !== 'dismiss') {
        setAuthActionError(GOOGLE_SIGN_IN_ERROR);
      }
      return false;
    } catch {
      setAuthActionError(GOOGLE_SIGN_IN_ERROR);
      return false;
    } finally {
      if (isMountedRef.current) setIsAuthActionPending(false);
    }
  }, [applyAuthRedirect, isAuthActionPending]);

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
      authRedirectHandledRef.current = false;
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
      if (!supabase || isSigningOutRef.current) return false;

      isSigningOutRef.current = true;
      setIsSigningOut(true);
      setError(null);
      const { error: signOutError } = await supabase.auth.signOut(
        CURRENT_SESSION_SIGN_OUT_OPTIONS,
      );
      if (signOutError) {
        if (isMountedRef.current) setError(SIGN_OUT_ERROR);
        return false;
      }
      if (isMountedRef.current) {
        setSession(null);
        setStatus('guest');
        setError(null);
      }
      return true;
    } catch {
      if (isMountedRef.current) setError(SIGN_OUT_ERROR);
      return false;
    } finally {
      isSigningOutRef.current = false;
      if (isMountedRef.current) setIsSigningOut(false);
    }
  }, []);

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
      startGoogleSignIn,
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
      startGoogleSignIn,
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
