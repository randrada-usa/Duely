import type { SupabaseClient } from '@supabase/supabase-js';

import {
  isGeminiScanExtraction,
  type GeminiScanExtraction,
} from '../domain/geminiExtraction';

export type AiAllowance = {
  usedCount: number;
  limit: number;
  periodStart: string;
  periodEnd: string;
};

export type GeminiAssistResult = {
  extraction: GeminiScanExtraction;
  allowance: AiAllowance;
};

export class GeminiAssistError extends Error {
  constructor(
    readonly code:
      | 'disabled'
      | 'consent-required'
      | 'quota-exhausted'
      | 'invalid-response'
      | 'unavailable',
    message: string,
  ) {
    super(message);
  }
}

function createRequestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

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

export async function requestGeminiAssistance(
  supabase: SupabaseClient,
  ocrText: string,
  signal?: AbortSignal,
): Promise<GeminiAssistResult> {
  const { data, error } = await supabase.functions.invoke('gemini-extract', {
    body: { requestId: createRequestId(), ocrText },
    signal,
    timeout: 30_000,
  });

  if (error) {
    const context =
      typeof Response !== 'undefined' &&
      'context' in error &&
      error.context instanceof Response
        ? error.context
        : null;
    const status = context?.status ?? 0;
    let serverCode = '';
    if (context) {
      try {
        const payload: unknown = await context.clone().json();
        if (isRecord(payload) && typeof payload.code === 'string') {
          serverCode = payload.code;
        }
      } catch {
        // Status-based recovery below still preserves the on-device result.
      }
    }
    if (serverCode === 'ai_assist_disabled') {
      throw new GeminiAssistError('disabled', 'AI-assisted extraction is not enabled yet.');
    }
    if (status === 403 || serverCode === 'consent_required') {
      throw new GeminiAssistError('consent-required', 'Cloud AI processing consent is required.');
    }
    if (status === 429 || serverCode === 'quota_exhausted') {
      throw new GeminiAssistError('quota-exhausted', 'Your monthly AI-assisted scans are used.');
    }
    throw new GeminiAssistError('unavailable', 'AI assistance is unavailable.');
  }

  if (
    !isRecord(data) ||
    !isGeminiScanExtraction(data.extraction) ||
    !isAllowance(data.allowance)
  ) {
    throw new GeminiAssistError('invalid-response', 'AI assistance returned an invalid result.');
  }

  return { extraction: data.extraction, allowance: data.allowance };
}
