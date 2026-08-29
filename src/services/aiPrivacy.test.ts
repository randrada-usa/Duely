import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import {
  loadAiPrivacySnapshot,
  recordConsentDecision,
} from './aiPrivacy';

describe('AI privacy service', () => {
  it('uses the latest event for each independent consent purpose', async () => {
    let orderCalls = 0;
    const result = {
      data: [
        {
          id: '3',
          consent_type: 'ai_processing',
          consent_version: 'ai-processing-v1',
          decision: 'withdrawn',
          decided_at: '2026-08-29T12:00:00Z',
        },
        {
          id: '2',
          consent_type: 'model_improvement',
          consent_version: 'model-improvement-v1',
          decision: 'granted',
          decided_at: '2026-08-29T11:00:00Z',
        },
        {
          id: '1',
          consent_type: 'ai_processing',
          consent_version: 'ai-processing-v1',
          decision: 'granted',
          decided_at: '2026-08-29T10:00:00Z',
        },
      ],
      error: null,
    };
    const query = {
      eq: () => query,
      in: () => query,
      order: () => {
        orderCalls += 1;
        return orderCalls === 2 ? Promise.resolve(result) : query;
      },
    };
    const supabase = {
      from: () => ({ select: () => query }),
    } as unknown as SupabaseClient;

    await expect(loadAiPrivacySnapshot(supabase, 'user-1')).resolves.toEqual({
      aiProcessing: 'withdrawn',
      modelImprovement: 'granted',
    });
  });

  it('records the reviewed version for the selected purpose', async () => {
    const inserts: unknown[] = [];
    const supabase = {
      from: () => ({
        insert: async (value: unknown) => {
          inserts.push(value);
          return { error: null };
        },
      }),
    } as unknown as SupabaseClient;

    await recordConsentDecision(
      supabase,
      'user-1',
      'model_improvement',
      'withdrawn',
    );

    expect(inserts).toEqual([
      {
        user_id: 'user-1',
        consent_type: 'model_improvement',
        consent_version: 'model-improvement-v1',
        decision: 'withdrawn',
      },
    ]);
  });
});
