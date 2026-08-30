import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import {
  requestGeminiAssistance,
} from './geminiAssist';

const extraction = {
  title: { value: 'Cell Structure Worksheet', confidence: 'high' as const },
  subject: { value: 'BIO 201', confidence: 'high' as const },
  dueAt: { value: '2026-09-05T16:00:00+08:00', confidence: 'high' as const },
  taskType: { value: 'assignment' as const, confidence: 'high' as const },
  priority: { value: null, confidence: 'low' as const },
  estimatedEffortMinutes: { value: null, confidence: 'low' as const },
  notes: { value: 'Answer questions 1 through 8.', confidence: 'high' as const },
  hasMultipleAssignments: false,
};

const allowance = {
  usedCount: 1,
  limit: 5,
  periodStart: '2026-08-01T00:00:00Z',
  periodEnd: '2026-09-01T00:00:00Z',
};

function clientReturning(result: unknown) {
  return {
    functions: { invoke: async () => result },
  } as unknown as SupabaseClient;
}

function functionError(status: number, code: string) {
  return {
    context: new Response(JSON.stringify({ code }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  };
}

describe('Gemini assistance service', () => {
  it('accepts a valid structured extraction and allowance', async () => {
    const result = await requestGeminiAssistance(
      clientReturning({ data: { extraction, allowance }, error: null }),
      'Synthetic OCR text',
    );

    expect(result).toEqual({ extraction, allowance });
  });

  it.each([
    [503, 'ai_assist_disabled', 'disabled'],
    [403, 'consent_required', 'consent-required'],
    [429, 'quota_exhausted', 'quota-exhausted'],
    [502, 'ai_extraction_failed', 'unavailable'],
  ] as const)('maps HTTP %s and %s to %s', async (status, code, expectedCode) => {
    const promise = requestGeminiAssistance(
      clientReturning({ data: null, error: functionError(status, code) }),
      'Synthetic OCR text',
    );

    await expect(promise).rejects.toMatchObject({
      code: expectedCode,
    });
  });

  it('rejects malformed successful responses', async () => {
    const promise = requestGeminiAssistance(
      clientReturning({ data: { extraction: { title: 'wrong' }, allowance }, error: null }),
      'Synthetic OCR text',
    );

    await expect(promise).rejects.toMatchObject({
      code: 'invalid-response',
    });
  });
});
