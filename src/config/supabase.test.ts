import { describe, expect, it } from 'vitest';

import { resolveSupabaseConfig } from './supabase';

describe('resolveSupabaseConfig', () => {
  it('keeps guest mode available when cloud configuration is absent', () => {
    expect(resolveSupabaseConfig(undefined, '')).toEqual({ status: 'unconfigured' });
  });

  it('normalizes a complete publishable client configuration', () => {
    expect(
      resolveSupabaseConfig(
        ' https://example.supabase.co/ ',
        ' sb_publishable_example ',
      ),
    ).toEqual({
      status: 'configured',
      config: {
        url: 'https://example.supabase.co',
        publishableKey: 'sb_publishable_example',
      },
    });
  });

  it('allows plain HTTP only for local development', () => {
    expect(
      resolveSupabaseConfig('http://127.0.0.1:54321', 'sb_publishable_local').status,
    ).toBe('configured');
    expect(
      resolveSupabaseConfig('http://example.com', 'sb_publishable_example').status,
    ).toBe('invalid');
  });

  it('rejects incomplete configuration and non-publishable keys', () => {
    expect(resolveSupabaseConfig('https://example.supabase.co', '').status).toBe(
      'invalid',
    );
    expect(
      resolveSupabaseConfig('https://example.supabase.co', 'service-role-key').status,
    ).toBe('invalid');
    expect(
      resolveSupabaseConfig('https://example.supabase.co', 'sb_secret_example').status,
    ).toBe('invalid');
  });
});
