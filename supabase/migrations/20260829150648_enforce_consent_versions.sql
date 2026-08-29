alter table public.consent_events
  add constraint consent_events_known_version_check
  check (
    (consent_type = 'ai_processing' and consent_version = 'ai-processing-v1')
    or (
      consent_type = 'model_improvement'
      and consent_version = 'model-improvement-v1'
    )
  );
