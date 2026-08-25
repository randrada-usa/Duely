export const AUTH_REDIRECT_URL = 'duely://auth/callback';

export type AuthRedirectResult =
  | { status: 'ignored' }
  | { status: 'error'; message: string }
  | { status: 'session'; accessToken: string; refreshToken: string };

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function emailAddressError(value: string) {
  const email = normalizeEmail(value);
  if (!email) return 'Enter your school email address.';
  if (email.length > 254) return 'Enter a shorter email address.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email address.';
  }
  return null;
}

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
      message: 'The sign-in link could not be completed. Request a new link and try again.',
    };
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) {
    return {
      status: 'error',
      message: 'This sign-in link is incomplete or expired. Request a new link.',
    };
  }

  return { status: 'session', accessToken, refreshToken };
}
