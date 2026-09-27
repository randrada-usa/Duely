# RevenueCat sandbox milestone

This internal Android screen tests purchases, restoration, and the exact Plus entitlement. Test purchases are tied to the signed-in Duely account ID. The AI Edge Function independently verifies that account's entitlement before setting the monthly test allowance to 20; otherwise it remains 5. This is not a production subscription flow.

## Setup

1. In RevenueCat Test Store, attach the monthly product to the intended Duely Plus entitlement. Copy its **identifier**, not its display name.
2. Add that product as the **monthly package** in the current offering.
3. In ignored `.env.local`, set `EXPO_PUBLIC_REVENUECAT_SANDBOX_ENABLED=true`, `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY` to the public `test_` SDK key, and `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` to the exact identifier. Never supply a secret API key.
4. Rebuild Android with `npm run android`; an old installed native build or Expo Go cannot establish this purchase verification. Use a **debug build** with the Test Store key. Duely blocks Test Store initialization outside development, because RevenueCat closes a release build that uses a Test Store key.
5. Sign in with Google, then open Profile → Duely Plus · Test Store. The monthly price comes from RevenueCat, not a hardcoded amount.
6. The `20260923145008_verified_plus_ai_allowance.sql` migration and updated `gemini-extract` function were deployed on September 23, 2026. Set the function's server-only `REVENUECAT_SECRET_API_KEY` to a RevenueCat **secret v1** API key with access to the Test Store customer, and optionally `REVENUECAT_PLUS_ENTITLEMENT_ID` (defaults to `duely_plus`). Never put the secret in `.env.local`, an Expo variable, or source control. Keep `GEMINI_REAL_DATA_ENABLED` disabled until Rey explicitly approves real-data AI processing.

Missing configuration fails closed. The production EAS profile explicitly disables the screen. Keep sandbox configuration out of every production build and update channel.

Without the server secret, the server grants only the free 5-scan test limit even if the client shows an active Plus test entitlement. If RevenueCat verification fails while configured, the AI request returns an allowance-unavailable error and the on-device scan remains usable. A lapsed entitlement returns to the free limit; historical usage is retained, so a user who already used more than five scans cannot request more that month. Do not deploy a Test Store secret as a production subscription configuration.

## Device verification (Pixel 7 emulator, September 27, 2026)

- Verified: the current monthly Test Store package loaded at the SDK-reported $9.99 price. The dashboard price was not independently checked.
- Verified: the Test Store dialog identified product `monthly`; simulated valid purchase returned active `duely_plus` in Duely without resetting navigation.
- Verified: the authenticated server rechecked RevenueCat, stored the 20-scan monthly allowance, and returned `20 of 20 AI-assisted scans available this month` to the app.
- Verified: a force-stop/cold relaunch fetched and displayed the active entitlement and 20-scan allowance again.
- Verified: the visible Restore purchases action retained both the active entitlement and the server-verified allowance.
- Automated tests cover disabled configuration, missing exact entitlement, no monthly fallback, and offering fetch errors.
- Still to check on device: cancel, failed purchase, restore without active access, expiry, offline recovery, large text, and TalkBack. Confirm the transaction in the RevenueCat dashboard.

The SDK identifies the signed-in Supabase user by ID, without sending the user's email. Previous anonymous test purchases may need restore after sign-in. The updated backend is deployed with JWT verification, and the signed-in Plus path now verifies the 20-scan allowance end to end. A full uninstall clears Duely's local sign-in session; after reinstall, sign in to the same Google account and use Restore purchases so RevenueCat receives the same Supabase user ID. Production store products, the final paywall, and release policy require Rey review. No real student data is sent by this screen.

The Expo Android config plugin keeps `MainActivity` on `singleTop`, as required for returning safely from RevenueCat's Android purchase activity. Do not replace it with Expo's default `singleTask` launch mode.

SDK dependency: `react-native-purchases` provides native purchase and entitlement verification without introducing a second UI stack. Official guides: https://www.revenuecat.com/docs/getting-started/installation/expo and https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store.
