import type { SupabaseClient } from '@supabase/supabase-js';

import {
  AI_PROCESSING_CONSENT_VERSION,
  MODEL_IMPROVEMENT_CONSENT_VERSION,
} from '../config/aiAssist';

export type ConsentType = 'ai_processing' | 'model_improvement';
export type ConsentDecision = 'granted' | 'withdrawn';
export type ConsentState = 'not-decided' | ConsentDecision;

export type AiPrivacySnapshot = {
  aiProcessing: ConsentState;
  modelImprovement: ConsentState;
};

const consentVersions: Record<ConsentType, string> = {
  ai_processing: AI_PROCESSING_CONSENT_VERSION,
  model_improvement: MODEL_IMPROVEMENT_CONSENT_VERSION,
};

export async function loadAiPrivacySnapshot(
  supabase: SupabaseClient,
  userId: string,
): Promise<AiPrivacySnapshot> {
  const { data, error } = await supabase
    .from('consent_events')
    .select('consent_type, decision, decided_at, id')
    .eq('user_id', userId)
    .in('consent_type', ['ai_processing', 'model_improvement'])
    .order('decided_at', { ascending: false })
    .order('id', { ascending: false });

  if (error) throw error;
  const snapshot: AiPrivacySnapshot = {
    aiProcessing: 'not-decided',
    modelImprovement: 'not-decided',
  };

  for (const row of data ?? []) {
    const type = row.consent_type as ConsentType;
    if (type === 'ai_processing' && snapshot.aiProcessing === 'not-decided') {
      snapshot.aiProcessing = row.decision as ConsentDecision;
    }
    if (
      type === 'model_improvement' &&
      snapshot.modelImprovement === 'not-decided'
    ) {
      snapshot.modelImprovement = row.decision as ConsentDecision;
    }
  }
  return snapshot;
}

export async function recordConsentDecision(
  supabase: SupabaseClient,
  userId: string,
  consentType: ConsentType,
  decision: ConsentDecision,
) {
  const { error } = await supabase.from('consent_events').insert({
    user_id: userId,
    consent_type: consentType,
    consent_version: consentVersions[consentType],
    decision,
  });
  if (error) throw error;
}
