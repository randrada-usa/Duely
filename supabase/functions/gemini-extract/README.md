# Gemini extraction Edge Function

This authenticated function receives OCR text only. Duely never sends the scan
image to Gemini. It checks the latest `ai_processing` consent event, atomically
reserves one monthly use, and refunds the reservation if extraction fails.

Required hosted secrets:

- `GEMINI_API_KEY`
- `GEMINI_REAL_DATA_ENABLED` — must remain `false` until Rey confirms the Gemini
  project uses paid services and approves the privacy review.
- `GEMINI_MODEL` — optional; defaults to `gemini-3.1-flash-lite`.
- `REVENUECAT_SECRET_API_KEY` — optional while Plus is unconfigured; use a
  server-only RevenueCat secret v1 API key for verified Test Store entitlements.
  Without it, the function grants only the free allowance.
- `REVENUECAT_PLUS_ENTITLEMENT_ID` — optional; defaults to `duely_plus`.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied by the Edge Function
runtime. Never expose any of these values through Expo public environment variables.
