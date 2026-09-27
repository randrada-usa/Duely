import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { syncPlusAllowance } from './plusAllowance';

const allowance = {
  usedCount: 0,
  limit: 20,
  periodStart: '2026-09-01',
  periodEnd: '2026-10-01',
};

describe('Plus allowance synchronization', () => {
  it('requests a server-verified allowance refresh', async () => {
    let invocation: Record<string, unknown> | undefined;
    const supabase = {
      functions: {
        invoke: async (_name: string, options: Record<string, unknown>) => {
          invocation = options;
          return { data: { allowance }, error: null };
        },
      },
    } as unknown as SupabaseClient;

    await expect(syncPlusAllowance(supabase)).resolves.toEqual(allowance);
    expect(invocation).toEqual({
      body: { action: 'sync-allowance' },
      timeout: 10_000,
    });
  });

  it('does not accept an unverified or malformed allowance', async () => {
    const supabase = {
      functions: {
        invoke: async () => ({
          data: { allowance: { ...allowance, limit: '20' } },
          error: null,
        }),
      },
    } as unknown as SupabaseClient;

    await expect(syncPlusAllowance(supabase)).rejects.toThrow('synchronize');
  });
});
