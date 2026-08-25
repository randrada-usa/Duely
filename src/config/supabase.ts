export type SupabaseConfig = {
  url: string;
  publishableKey: string;
};

export type SupabaseConfigState =
  | { status: 'configured'; config: SupabaseConfig }
  | { status: 'unconfigured' }
  | { status: 'invalid'; reason: string };

function isLocalHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

export function resolveSupabaseConfig(
  urlValue: string | undefined,
  keyValue: string | undefined,
): SupabaseConfigState {
  const url = urlValue?.trim() ?? '';
  const publishableKey = keyValue?.trim() ?? '';

  if (!url && !publishableKey) return { status: 'unconfigured' };
  if (!url || !publishableKey) {
    return {
      status: 'invalid',
      reason: 'Both the Supabase URL and publishable key are required.',
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { status: 'invalid', reason: 'The Supabase URL is not valid.' };
  }

  if (
    parsedUrl.protocol !== 'https:' &&
    !(parsedUrl.protocol === 'http:' && isLocalHost(parsedUrl.hostname))
  ) {
    return {
      status: 'invalid',
      reason: 'The Supabase URL must use HTTPS, except for local development.',
    };
  }

  if (!publishableKey.startsWith('sb_publishable_')) {
    return {
      status: 'invalid',
      reason: 'Use a Supabase publishable key; secret and service-role keys are not allowed.',
    };
  }

  return {
    status: 'configured',
    config: { url: parsedUrl.toString().replace(/\/$/, ''), publishableKey },
  };
}

export const supabaseConfigState = resolveSupabaseConfig(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
