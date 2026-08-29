export const AI_PROCESSING_CONSENT_VERSION = 'ai-processing-v1';
export const MODEL_IMPROVEMENT_CONSENT_VERSION = 'model-improvement-v1';

export function resolveAiAssistEnabled(value: string | undefined) {
  return value?.trim().toLowerCase() === 'true';
}

export const aiAssistEnabled = resolveAiAssistEnabled(
  process.env.EXPO_PUBLIC_GEMINI_ASSIST_ENABLED,
);
