export const AUTH_REDIRECT_URL = 'duely://auth/callback';

export type AuthRedirectResult =
  | { status: 'ignored' }
  | { status: 'error'; message: string }
  | { status: 'session'; accessToken: string; refreshToken: string };

export function parseAuthRedirect(url: string): AuthRedirectResult {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { status: 'ignored' };
  }

  if (
    parsedUrl.protocol !== 'duely:' ||
    parsedUrl.hostname !== 'auth' ||
    parsedUrl.pathname !== '/callback'
  ) {
    return { status: 'ignored' };
  }

  const fragment = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
  const params = new URLSearchParams(fragment || parsedUrl.search.slice(1));
  const providerError = params.get('error_description') ?? params.get('error');
  if (providerError) {
    return {
      status: 'error',
      message: 'Sign-in could not be completed. Try Google sign-in again.',
    };
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) {
    return {
      status: 'error',
      message: 'This sign-in response is incomplete or expired. Try again.',
    };
  }

  return { status: 'session', accessToken, refreshToken };
}
