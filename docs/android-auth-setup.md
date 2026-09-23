# Android sign-in setup for local worktrees

Duely's Google sign-in UI is available only when the app has a working Supabase client configuration. Each worktree has its own ignored `.env.local`; settings in another checkout are not inherited. A missing URL and publishable key make Profile show Guest and hide sign-in and sign-out.

1. Confirm that the **Duely** Supabase project is active. If it is paused, restore it and wait for `ACTIVE_HEALTHY` before testing.
2. In the project **Connect** dialog, copy the project URL and **publishable** key into this worktree's ignored `.env.local` as `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Do not use a secret or service-role key, and never commit `.env.local`.
3. In Supabase Auth, keep the Google provider enabled and allow `duely://auth/callback` as a redirect URL. The app uses Supabase's browser OAuth flow; `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` is not used.
4. Restart Metro after changing `.env.local` so Expo rebuilds the JavaScript bundle with the new public configuration. Open Profile: **Sign in with Google** should be directly below the Guest header. After signing in, **Sign out** appears at the bottom of Profile, below App Settings.

Guest tasks remain local until the student explicitly chooses cloud backup. A RevenueCat Test Store purchase is not a Duely sign-in.

For the current local emulator check, the Duely backend was restored, the ignored worktree config was filled from the matching main checkout, and the visible sign-in handoff reached a signed-in Profile. This does not verify a separately packaged preview or production APK; those builds need their own public Expo environment values and Google redirect configuration.
