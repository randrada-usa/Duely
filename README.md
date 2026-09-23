<p align="center">
  <img src="assets/icon.png" alt="Duely app icon" width="96" height="96" />
</p>

# Duely

Duely is an Android-first assignment organizer for students. Take a photo of one assignment, review the suggested task details, and keep its deadline alongside manually added work—without needing an account for the core experience.

> **Status:** Android beta in active development. This repository is not a published app-store release. Cloud AI and Duely Plus are optional, gated test features; the Test Store does not charge real money.

## What Duely does

- Creates and edits tasks manually, with subjects, deadlines, priorities, notes, and reminders.
- Reads a camera or gallery image with on-device ML Kit OCR. One image becomes **one editable task** only after the student reviews and confirms the fields.
- Highlights missing or uncertain scan fields instead of silently accepting extracted text.
- Shows Today, Upcoming, searchable tasks, an internal calendar, and deterministic task prioritization.
- Keeps guest tasks on the phone. Google sign-in offers optional cloud backup; signing in does not silently upload local tasks.
- Can optionally send **OCR text, not the image**, to a consent-gated Gemini extraction service when the authenticated feature is enabled.

Duely is designed around assignments, not automatic study scheduling or general-purpose AI coaching. PDF import, multi-assignment extraction from one image, and external calendar sync are outside the current beta.

## Run the Android app

You need Node.js and npm, Android Studio with an Android SDK and running emulator (or an Android phone with USB debugging), and the Android build tools required by Expo. This app uses native OCR and purchase modules, so **Expo Go is not sufficient**.

```sh
git clone https://github.com/randrada-usa/Duely.git
cd Duely
npm ci
npm run android
```

The app works in **Guest** mode without cloud credentials: create a manual task, or open **Scan**, choose a single assignment image, review the extracted fields, and save the task. For subsequent runs of an installed development build, use `npm start -- --dev-client` and reopen Duely on the emulator or phone.

## Optional account and cloud setup

Each checkout or worktree needs its own ignored `.env.local`. Copy `.env.example`, then add the Duely Supabase project's **public** URL and **publishable** key:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Configure the Google provider in Supabase Auth and allow `duely://auth/callback` as a redirect. Restart Metro after changing `.env.local`. **Profile → Sign in with Google** then becomes available; **Sign out** is at the bottom of Profile. See [Android account setup](docs/android-auth-setup.md) for the full checklist.

Never put a Supabase secret/service-role key, Gemini key, or RevenueCat secret API key in an `EXPO_PUBLIC_` variable, the mobile app, or Git. Cloud AI requires a separately configured Edge Function, explicit processing consent, and a privacy review. See [Supabase setup](supabase/README.md) and the [Gemini function notes](supabase/functions/gemini-extract/README.md). On-device scanning remains available when cloud AI is off or unavailable.

## Duely Plus test mode

Internal Android builds can use RevenueCat's **Test Store** to exercise the monthly purchase and restore flow. Sign in to Duely first so a test purchase is associated with the correct account. This is **not** a production subscription or a real-money checkout. The proposed 5-free/20-Plus monthly AI-scan limits require server-side entitlement verification; a client-side purchase indicator alone does not grant extra scans. Setup, rollout order, and remaining device checks are in [RevenueCat sandbox setup](docs/revenuecat-sandbox.md).

## Check the code

```sh
npm run typecheck
npm test
npm run verify:supabase-migration
```

The repository also has a synthetic Android OCR evaluation harness (`npm run evaluate:ocr-images:android`). Its results describe controlled fixtures, **not** real-student accuracy or a public pilot. Do not add real assignment photos, OCR output, student details, credentials, or private exports to test fixtures.

## Repository map

| Path | Purpose |
| --- | --- |
| `app/` | Expo Router screens and navigation |
| `src/domain/` | Task rules, parsing, prioritization, and other testable logic |
| `src/services/` and `src/store/` | Device, cloud, purchase, and app-state boundaries |
| `supabase/` | Versioned database migrations and the AI Edge Function |
| `evaluation/` | Synthetic OCR fixtures and evaluation material |
| `docs/` | Focused setup and architecture notes |
| `roadmap.md`, `ui-ux-plan.md`, `AGENTS.md` | Current scope, product behavior, and contribution guardrails |

## Privacy and current limits

Assignment images and on-device OCR are sensitive. Optional cloud AI requires separate consent, and dataset/model-improvement participation is separate and off by default. The student reviews every scan before saving a task. Account deletion/export and broader real-world OCR evaluation remain beta work; do not treat the current build as a finished public service. See the [roadmap](roadmap.md) for the remaining gates.

## License

An open-source license has **not yet been selected or added**. The repository should not be described as open-source licensed until the project owner chooses a license and adds a root `LICENSE` file.
