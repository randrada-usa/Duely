# RevenueCat sandbox milestone

This internal Android screen tests purchases, restoration, and the exact Plus entitlement. It does not change server AI allowances, link billing to Google accounts, or implement production subscriptions.

## Setup

1. In RevenueCat Test Store, attach the monthly product to the intended Duely Plus entitlement. Copy its **identifier**, not its display name.
2. Add that product as the **monthly package** in the current offering.
3. In ignored `.env.local`, set `EXPO_PUBLIC_REVENUECAT_SANDBOX_ENABLED=true`, `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY` to the public `test_` SDK key, and `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` to the exact identifier. Never supply a secret API key.
4. Rebuild Android with `npm run android`; an old installed native build or Expo Go cannot establish this purchase verification. Use a **debug build** with the Test Store key. RevenueCat closes a release build that uses a Test Store key.
5. Open Profile → Duely Plus · Test Store. The monthly price comes from RevenueCat, not a hardcoded amount.

Missing configuration fails closed. The production EAS profile explicitly disables the screen. Keep sandbox configuration out of every production build and update channel.

## Device verification (Pixel 7 emulator, September 23, 2026)

- Verified: the current monthly Test Store package loaded at the SDK-reported $9.99 price. The dashboard price was not independently checked.
- Verified: the Test Store dialog identified product `monthly`; simulated valid purchase returned active `duely_plus` in Duely.
- Verified: Restore retained the active test entitlement; a process relaunch fetched and displayed it again.
- Automated tests cover disabled configuration, missing exact entitlement, no monthly fallback, and offering fetch errors.
- Still to check on device: cancel, failed purchase, restore without active access, expiry, offline recovery, large text, and TalkBack. Confirm the transaction in the RevenueCat dashboard.

The SDK uses an anonymous installation customer. Account identity, server-verified higher scan allowance, expiration enforcement for paid AI, production store products, and the final paywall require separate implementation and Rey review. No real student data is sent by this screen.

SDK dependency: `react-native-purchases` provides native purchase and entitlement verification without introducing a second UI stack. Official guides: https://www.revenuecat.com/docs/getting-started/installation/expo and https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store.
