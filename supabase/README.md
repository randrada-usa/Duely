# Duely Supabase groundwork

This directory contains the local Supabase configuration and versioned database
migrations for M6. It does not contain project credentials or real student data.

## Client configuration

Copy `.env.example` to an untracked `.env.local` and set only:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The mobile client deliberately rejects secret/service-role key formats. Guest mode
continues to work when both values are absent. Native auth sessions use Expo Secure
Store; the web fallback uses AsyncStorage.

Adding `expo-secure-store` changes native configuration, so rebuild the Android
development client before testing authenticated sessions.

## Migration security decisions

- Every exposed table has explicit privileges, enabled and forced RLS, and policies
  scoped to `auth.uid()`.
- Authenticated writes use column-level grants so ownership IDs and audit timestamps
  cannot be rewritten by the mobile client.
- Task/subject and reminder/task relationships use composite foreign keys so a
  client cannot attach its record to another user's record.
- Consent is an append-only event history for authenticated clients.
- AI allowances are client-readable but server-writable, keeping the monthly limit
  configurable and resistant to client manipulation.
- Overdue remains calculated from an open task's deadline; it is not stored as a
  task status.
- School-domain verification is intentionally deferred until the allowlist and
  verification authority are approved.

## Verification

Run `npm run verify:supabase-migration` for the repository-level security structure
check. Applying the migration locally requires Docker:

```powershell
npx supabase start
npx supabase db reset
npx supabase db lint
```

Do not run `supabase db push` against the hosted project until Rey reviews the auth,
privacy, and RLS changes. After linking, test with at least two authenticated users
and run the hosted security and performance advisors.
