# Duely Development Roadmap

Last updated: 2026-08-25

This is the living execution plan for the Duely Android beta. Update it whenever a milestone begins, finishes, changes scope, or becomes blocked. Product behavior remains governed by `ui-ux-plan.md`; ownership and required reviews remain governed by `roles.md` and `AGENTS.md`.

## Status Legend

- `[x]` Complete and verified
- `[~]` In progress
- `[ ]` Not started
- `[!]` Blocked or requires a decision
- `[D]` Deliberately deferred beyond the beta

## Current Position

Current milestones: **M5 — On-Device OCR and Editable Review**, **M6 — Supabase Backend and Authentication**, and **M7 — Cloud Synchronization**

Current outcome: M5 implementation is complete and its end-to-end accuracy gates remain open. The Android development build now runs bundled ML Kit OCR fully on device, keeps raw text and the temporary image transient, parses conservative task candidates, flags uncertainty per field, handles no-text/multiple-assignment recovery, and saves only an editable user-confirmed task with field provenance. A deterministic post-OCR parser harness covers 24 synthetic English, Filipino, and mixed-language cases. A separate 12-image synthetic Android run on the Pixel 7 completed all images at 99.5% aggregate token accuracy and produced 11/12 parser-ready results; one explicit deadline did not match, so the controlled deadline gate remains open. These small synthetic results validate the harness but do not certify beta-scan accuracy.

Next recommended task: verify ongoing subject and reminder synchronization, then cover the remaining sign-out, account-switch, and stale-session cases. Explicit empty-device restore and queued offline retry are now live-verified on the Pixel 7. Keep the reproducible M5 explicit-deadline recognition failure tracked for a targeted normalization and regression-test pass.

## Locked Product Decisions

- Android-first React Native application using Expo and TypeScript.
- Android package name: `com.duely.app`.
- Expo/EAS project ID: `45655a6e-8201-4380-9d27-668bb04207bd`.
- Git remote: `https://github.com/randrada-usa/Duely.git`.
- Primary navigation: Home, Tasks, elevated Scan, Calendar, Profile.
- Supabase is the planned backend and authentication platform.
- Guest access supports manual tasks and on-device scanning.
- Google and passwordless school-email sign-in are the beta authentication methods.
- ML Kit performs on-device OCR; Gemini is an optional authenticated fallback/assistant.
- One image produces one task in the beta. Images only; no PDF ingestion.
- Five free AI-assisted scans per month is the current product assumption and must remain configurable.
- The beta uses an internal Duely calendar only.
- Dataset participation is optional, separately consented, and off by default.
- English ships first while code and content remain localization-ready for Filipino.
- Nunito is the heading font and Inter is the body font. Local font integration remains pending.

## Milestone Overview

| ID | Milestone | Status | Depends on |
| --- | --- | --- | --- |
| M0 | Planning and product foundation | Complete | — |
| M1 | Expo and engineering foundation | Complete | M0 |
| M2 | Local task experience | Complete | M1 |
| M3 | Internal calendar and reminders | Complete | M2 |
| M4 | Image intake and preparation | Complete | M1 |
| M5 | On-device OCR and review | In progress | M4 |
| M6 | Supabase backend and authentication | In progress | M2 |
| M7 | Cloud synchronization | In progress | M6 |
| M8 | Gemini-assisted extraction | Not started | M5, M6 |
| M9 | Consent, privacy, export, and deletion | Not started | M6–M8 |
| M10 | Quality, analytics, and beta release | Not started | M2–M9 |
| M11 | Premium study planning | Deferred | Post-beta |
| M12 | iOS release | Deferred | Stable Android release |

---

## M0 — Planning and Product Foundation

Status: `[x] Complete`

### Deliverables

- [x] Define the primary student audience and Philippine operating context.
- [x] Review initial Duely screens, mascots, and icons.
- [x] Lock five-destination navigation.
- [x] Define Home, Tasks, Scan, Calendar, and Profile behavior.
- [x] Define onboarding and guest access.
- [x] Define the beta OCR and Gemini direction.
- [x] Define separate optional dataset consent.
- [x] Define initial pricing and five-scan allowance assumption.
- [x] Document team ownership in `roles.md`.
- [x] Document UI/UX requirements in `ui-ux-plan.md`.
- [x] Document repository-wide agent rules in `AGENTS.md`.
- [x] Establish Figma tokens and reusable reference components.

### Exit verification

- [x] Product scope and exclusions are written.
- [x] Privacy-sensitive decisions have a named owner.
- [x] Original design assets remain preserved.

---

## M1 — Expo and Engineering Foundation

Status: `[x] Complete`

### Deliverables

- [x] Scaffold Expo with TypeScript in the repository root.
- [x] Configure Expo Router.
- [x] Configure five-tab Android navigation.
- [x] Configure `com.duely.app`.
- [x] Link the EAS project.
- [x] Connect the local repository to the GitHub remote.
- [x] Configure Duely icon, adaptive foreground, monochrome icon, and splash asset.
- [x] Add shared color, spacing, radius, and touch-target tokens.
- [x] Add environment-variable template without secrets.
- [x] Add type-check script.
- [ ] Integrate Nunito and Inter as bundled local fonts.
- [ ] Add linting and formatting configuration.
- [x] Add unit-test framework and baseline tests.
- [x] Create development and preview profiles in `eas.json`.
- [x] Confirm application launch on the Android 13 emulator.
- [ ] Confirm application launch on the physical Android 13 phone.

### Exit verification

- [x] `npm run typecheck` passes.
- [x] Expo production web export succeeds.
- [x] Android development build launches without runtime errors.
- [ ] Navigation works with TalkBack labels and Android back behavior.

---

## M2 — Local Task Experience

Status: `[x] Complete`

### Completed

- [x] Define a typed local task model.
- [x] Support title, subject, notes, deadline, and priority.
- [x] Persist tasks with AsyncStorage.
- [x] Create tasks manually.
- [x] Edit existing tasks.
- [x] Delete tasks with confirmation.
- [x] Mark tasks complete or incomplete.
- [x] Calculate overdue state from deadline and completion status.
- [x] Search title, subject, and notes without case sensitivity.
- [x] Add deterministic smart-priority scoring.
- [x] Display prioritized open tasks on Home.
- [x] Add empty Tasks and no-results states.
- [x] Add accessible task-card completion controls.
- [x] Add reminder settings to the task model.
- [x] Add task type.
- [x] Add estimated effort.
- [x] Add subject creation, renaming, deletion, filtering, and explicit `Unassigned` behavior.

### Remaining

- [x] Replace typed deadline strings with an accessible date/time picker.
- [x] Add source-image reference and extraction provenance fields.
- [x] Add filters for Open, Completed, Overdue, No deadline, Subject, Task type, and Priority.
- [x] Add grouping: deadline, subject, status, or none.
- [x] Add sorting: smart priority, due date, date created, and title.
- [x] Add completion undo.
- [x] Add unsaved-change confirmation when leaving task forms.
- [x] Add safe handling for corrupted local storage data.
- [x] Add task-domain and persistence tests.

### Acceptance criteria

- [x] A guest can create, edit, search, complete, reopen, and delete a task offline.
- [x] Restarting the app preserves all valid task data.
- [x] Overdue state is correct around local timezone boundaries.
- [x] Smart-priority ordering is deterministic and covered by regression tests.
- [x] Large text does not hide task actions or form errors.
- [x] Destructive actions require confirmation.

---

## M3 — Internal Calendar and Reminders

Status: `[x] Complete`

### Calendar

- [x] Build month view with previous/next controls.
- [x] Add a Today shortcut.
- [x] Add a clear selected-date state.
- [x] Indicate populated dates without relying on color alone.
- [x] Show selected-day task list below the month.
- [x] Add task from a selected date with deadline prefilled.
- [x] Add empty selected-date state.
- [x] Test month/year transitions and local-date boundaries.

### Reminders

- [x] Install and configure Expo Notifications.
- [x] Explain notification permission before requesting it.
- [x] Handle denied and permanently denied permission states.
- [x] Add configurable default reminder timing.
- [x] Add task-level fixed reminder selections.
- [x] Schedule, update, and cancel reminders idempotently.
- [x] Handle reminder scheduling failure without losing the task.
- [x] Reconcile reminders after task edits, completion, or deletion.

### Acceptance criteria

- [x] Every saved deadline appears on the correct calendar date.
- [x] Reminder changes do not produce duplicate notifications.
- [x] Calendar and reminder behavior works offline.
- [x] Denied permissions have a clear settings-recovery path.

---

## M4 — Image Intake and Preparation

Status: `[x] Complete`

- [x] Add Camera and Gallery choices.
- [x] Add contextual camera permission flow.
- [x] Add contextual gallery permission flow.
- [x] Handle denial and settings recovery.
- [x] Accept exactly one image per scan attempt.
- [x] Add crop and rotation.
- [x] Compress oversized images while preserving readable text.
- [x] Detect or guide users through blurry, dark, obstructed, or unsupported images.
- [x] Keep temporary images private and remove abandoned captures.
- [x] Confirm Expo Go versus development-build requirements for selected libraries.

### Acceptance criteria

- [x] A user can capture or select, review, crop, rotate, cancel, and retry one image.
- [x] Permission denial never traps the user.
- [x] No image is uploaded before the relevant cloud action and consent conditions.

---

## M5 — On-Device OCR and Editable Review

Status: `[~] In progress — implementation complete; controlled accuracy gates pending`

- [x] Select an Expo-compatible ML Kit integration.
- [x] Run OCR on device.
- [x] Parse title, subject, deadline/time, task type, effort, and notes.
- [x] Preserve raw OCR separately from structured fields.
- [x] Track provenance and confidence per field.
- [x] Show cancellable scan progress.
- [x] Build extraction-review form.
- [x] Highlight ambiguous and missing fields individually.
- [x] Handle no text detected.
- [x] Handle ambiguous or missing deadlines.
- [x] Handle multiple assignments by requesting crop or selection.
- [x] Save only after explicit student confirmation.
- [x] Support a fully offline OCR path.
- [x] Add a consent-safe controlled post-OCR parser fixture set and metric runner.
- [x] Cover English, Filipino, and mixed-language labels in parser evaluation.
- [x] Expose preliminary parser metrics with `npm run evaluate:ocr-parser`.
- [x] Run an initial 12-fixture synthetic rendered-image pack through ML Kit on Android.

### Accuracy gates

- [ ] Clearly printed deadlines are correct in at least 95% of controlled cases.
- [ ] The system avoids inventing a missing deadline in at least 99% of controlled cases.
- [ ] At least 80% of beta scans have all essential fields correct without editing.
- [ ] Every ambiguous deadline is flagged for confirmation.

---

## M6 — Supabase Backend and Authentication

Status: `[~] In progress`

### Preparation required from Rey

- [x] Create or confirm the Supabase project.
- [x] Provide the project URL and publishable client key through local environment configuration.
- [x] Never provide or embed the service-role key in the mobile client.
- [x] Configure Google OAuth credentials.
- [ ] Configure passwordless school-email redirect URLs.
- [ ] Confirm allowed beta school domains for the verified-school badge.

### Implementation

- [x] Add Supabase client with secure session persistence.
- [x] Add Google sign-in.
- [ ] Add passwordless school-email link or one-time-code flow.
- [x] Add explicit, retry-safe guest-to-account first-backup behavior.
- [x] Create profiles, subjects, tasks, reminders, consent, and allowance schema migration.
- [x] Enable RLS on every exposed table in the migration.
- [x] Add ownership policies using `auth.uid()` predicates.
- [x] Add both `USING` and `WITH CHECK` for updates.
- [x] Verify anonymous users cannot access authenticated data.
- [x] Add account and session error recovery.

### Acceptance criteria

- [x] Transactional two-user RLS verification confirms one user cannot read, modify, or delete another user's records across protected tables.
- [x] Guest tasks remain local during the opt-in backup, and the first live cloud backup is confirmed.
- [x] Sign-in failure never deletes local data.
- [x] Authenticated features clearly explain why an account is needed.

---

## M7 — Cloud Synchronization

Status: `[~] In progress`

- [~] Define local/remote identifiers and synchronization metadata. Stable client IDs and per-account backup receipts are implemented; full sync metadata remains open.
- [x] Upload local guest tasks after explicit authorization and confirm the first live backup without removing the local copy.
- [x] Make create/update/delete synchronization idempotent and confirm all three paths live from the Pixel 7 to Supabase.
- [x] Define the beta conflict rule: this phone is authoritative, and cloud data never silently overwrites local tasks.
- [x] Queue changes while offline and retry with bounded backoff. Receipt fingerprints preserve unconfirmed work across restarts; the Pixel 7 live check confirmed no premature cloud write while offline, one automatic upload after reconnecting, and mirrored cleanup without duplication.
- [x] Avoid duplicate tasks after interrupted requests using unique client IDs, idempotent writes, and post-write confirmation.
- [~] Synchronize subjects and reminders. First-backup support is implemented; ongoing synchronization remains open.
- [x] Add active-backup, progress, failure, and manual-retry UI.
- [~] Test reinstall, sign-out, account switch, and stale-session behavior. Explicit empty-device restore is unit-tested and live-verified on the Pixel 7 after clearing only Duely app data, signing back in, confirming the one-task restore offer, and checking that no duplicate cloud row was created.

---

## M8 — Gemini-Assisted Extraction

Status: `[ ] Not started`

- [ ] Keep Gemini calls server-side; never ship the API secret in the application.
- [ ] Require authentication for Gemini-assisted scans.
- [ ] Enforce the configurable monthly allowance server-side.
- [ ] Start with five free AI-assisted scans per month.
- [ ] Define structured output schema and validation.
- [ ] Compare ML Kit and Gemini outputs by field.
- [ ] Record agreement, disagreement, correction, and final confirmed value separately.
- [ ] Do not claim agreement is confirmation of correctness.
- [ ] Handle cloud timeout, service failure, quota exhaustion, and offline mode.
- [ ] Fall back to the editable on-device result.
- [ ] Add allowance display in Profile.

### Acceptance criteria

- [ ] Users never lose an ML Kit result because Gemini failed.
- [ ] Usage cannot be bypassed by client manipulation.
- [ ] No overall confidence percentage is shown.
- [ ] Every final task remains user-editable before saving.

---

## M9 — Consent, Privacy, Export, and Deletion

Status: `[ ] Not started`

- [ ] Add separate optional model-improvement consent.
- [ ] Keep consent off by default.
- [ ] Version and timestamp consent records.
- [ ] Explain what is collected, why, retention, and withdrawal.
- [ ] Redact unrelated personal information before dataset retention.
- [ ] Let users view or delete retained contributions.
- [ ] Implement consent withdrawal for future collection.
- [ ] Implement data export request, processing, ready, and failure states.
- [ ] Implement account deletion with reauthentication where needed.
- [ ] Revoke sessions before or during sensitive deletion flow.
- [ ] Define cleanup for tasks, subjects, scans, contributions, and storage objects.
- [ ] Review Philippine Data Privacy Act obligations with qualified counsel before public release.

---

## M10 — Quality, Analytics, and Beta Release

Status: `[ ] Not started`

### Quality

- [ ] Add unit tests for domain and parsing rules.
- [ ] Add integration tests for storage, auth, sync, and scan review.
- [ ] Build Jenard's Android device and regression matrix.
- [ ] Test Android 13 emulator and physical phone.
- [ ] Test TalkBack, large text, display scaling, high contrast, and color-vision accessibility.
- [ ] Test slow network, offline mode, interruption, cancellation, and process restart.
- [x] Run Supabase security and performance advisors.
- [ ] Review dependency audit findings without forcing breaking upgrades.

### Beta operations

- [ ] Recruit an initial 20–50 testers; expand toward 100 only after stability.
- [ ] Prepare synthetic/redacted scan evaluation set.
- [ ] Add privacy-safe crash and product analytics.
- [ ] Define beta feedback and report-a-problem flow.
- [ ] Prepare store listing, screenshots, privacy notice, and terms.
- [ ] Create EAS preview build.
- [ ] Complete internal acceptance test.
- [ ] Release Android beta.

### Beta success measures

- [ ] A student can create and confirm one task from one image.
- [ ] Saved tasks appear correctly in Home, Tasks, and Calendar.
- [ ] Users can control reminders, consent, account data, and deletion.
- [ ] OCR accuracy gates from M5 are met on the controlled evaluation set.
- [ ] No release-blocking privacy, authorization, data-loss, or crash issue remains.

---

## Deferred Roadmap

### M11 — Premium Study Planning

Status: `[D] Deferred`

- Automatically schedule study sessions before deadlines.
- Add premium planning assistance and AI features.
- Validate student affordability and subscription price before implementation.
- Do not let premium work delay deadline tracking or beta reliability.

### M12 — iOS Release

Status: `[D] Deferred`

- Adapt platform-specific permissions, notifications, and OCR implementation.
- Produce and verify iOS icons.
- Test Apple sign-in requirements if applicable.
- Validate parity after the Android workflow is stable.

## Cross-Cutting Workstreams

These apply to every milestone rather than being postponed until release:

### Accessibility

- [~] Maintain 48 dp minimum touch targets.
- [~] Provide visible labels and accessible control states.
- [ ] Add formal TalkBack and large-text testing to every completed flow.
- [ ] Add reduced-motion handling before animations are introduced.

### Localization

- [ ] Extract user-facing strings from components.
- [ ] Establish English message catalog.
- [ ] Prepare Filipino translation workflow.
- [ ] Test mixed English/Filipino OCR examples during M5.

### Security and privacy

- [x] Keep secrets out of source control.
- [x] Provide `.env.example` with public-client placeholders only.
- [ ] Add automated secret scanning or repository checks.
- [ ] Threat-model authentication, storage, AI, export, and deletion flows.

### Documentation

- [x] Maintain `AGENTS.md`, `roles.md`, and `ui-ux-plan.md`.
- [~] Maintain this roadmap after each development session.
- [ ] Add developer setup instructions after Android launch is verified.
- [ ] Add architecture decision records for major irreversible choices.

## Known Risks and Open Decisions

| Risk or decision | Current handling | Owner | Needed by |
| --- | --- | --- | --- |
| Nunito/Inter package dependency conflict | Avoid forced install; bundle compatible local font files later | Rey / Gio | Before UI polish completion |
| Expo dependency audit reports transitive findings | Review deliberately; do not use breaking `audit fix --force` | Rey | Before beta build |
| ML Kit library compatibility with managed Expo | Use `expo-mlkit-ocr` with its bundled Android model in the Expo development build; keep native rebuild verification in release checks | Rey | M5/M10 |
| Guest-to-account data migration behavior | Preserve local tasks; specify conflict rules before auth work | Rey | M6 |
| School-domain verification | Use maintained allowlist, not literal `.edu` check | Rey | M6 |
| AI allowance reset and premium price | Keep configurable; finalize with usage and student feedback | Rey | M8/M11 |
| Dataset retention duration | Not yet finalized | Rey | M9 |
| Beta tester count | Start with 20–50; expand after stability | Team | M10 |

## Roadmap Update Protocol

At the start of a development session:

1. Read `AGENTS.md` and this file.
2. Confirm the current milestone and next unchecked dependency-safe task.
3. Check the working tree and preserve unrelated changes.
4. State any assumption that could change scope, privacy, architecture, or cost.

During the session:

1. Mark the active item `[~]` only after work actually begins.
2. Add newly discovered work under the correct milestone.
3. Add blockers to **Known Risks and Open Decisions** instead of hiding them in chat.
4. Never mark work complete based only on code existing; run its verification gate.

At the end of the session:

1. Mark verified items `[x]`.
2. Leave incomplete work `[~]` and state the exact remaining step.
3. Update **Current Position** and `Last updated`.
4. Record tests or manual checks that passed.
5. Report the next recommended task and any user preparation required.

## Release Gate

Do not declare the Android beta ready until all of the following are true:

- [ ] M2 through M10 acceptance criteria required for beta are complete.
- [ ] Android emulator and physical-device checks pass.
- [ ] Supabase RLS and storage policies are verified with multiple test users.
- [ ] OCR accuracy gates pass on consent-safe evaluation data.
- [ ] Consent, export, contribution deletion, and account deletion work end to end.
- [ ] TalkBack and large-text critical-flow tests pass.
- [ ] Privacy notice, terms, support contact, and store metadata are ready.
- [ ] Rey approves the release build.
