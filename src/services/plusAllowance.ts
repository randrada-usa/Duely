import type { SupabaseClient } from '@supabase/supabase-js';

import type { AiAllowance } from './geminiAssist';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isAllowance(value: unknown): value is AiAllowance {
  if (!isRecord(value)) return false;
  return (
    Number.isInteger(value.usedCount) &&
    Number.isInteger(value.limit) &&
    typeof value.periodStart === 'string' &&
    typeof value.periodEnd === 'string'
  );
}

export async function syncPlusAllowance(
  supabase: SupabaseClient,
): Promise<AiAllowance> {
  const { data, error } = await supabase.functions.invoke('gemini-extract', {
    body: { action: 'sync-allowance' },
    timeout: 10_000,
  });

  if (error || !isRecord(data) || !isAllowance(data.allowance)) {
    throw new Error('Duely could not synchronize the Plus scan allowance.');
  }
  return data.allowance;
}
