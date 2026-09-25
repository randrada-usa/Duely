# Shipaton demo and submission guide

This is a recording plan, not evidence that a video has been made or the app has
been submitted. Show a real Android build running on an emulator or phone. Use a
fully synthetic assignment image; never record a student's actual assignment,
account details, email address, API key, or private dashboard.

## Before recording

1. Start a native Android development build. Expo Go cannot run Duely's native
   OCR or RevenueCat modules. Prepare a synthetic, clearly printed **single**
   assignment image in Gallery. Use invented names, subjects, and deadlines.
2. Decide whether to show Guest mode or a signed-in test account. Guest mode
   can demonstrate the core scan-to-task flow without showing personal account
   information. Hide notifications and other private overlays before recording.
3. Create a clean starting state so one new task is easy to spot on Home, Tasks,
   and Calendar. Check that the synthetic due date is visible in those views.
4. If showing Plus, use a debug build with RevenueCat **Test Store** configured.
   Sign in with a test account and confirm the monthly package loads. The screen
   must visibly say Test Store; never present it as a live paid checkout.
5. Rehearse the full path once. If the OCR result is imperfect, correct it in
   the editable review—that is part of Duely's intended workflow.

## Suggested 90–110 second walkthrough

Keep the finished video **under two minutes**. The official rules say judges
need not watch beyond that point. Upload it publicly to YouTube or Vimeo and
check the link in a signed-out browser.

| Time | Show | Suggested narration |
| --- | --- | --- |
| 0–12 s | Onboarding or Home | “Assignments arrive as photos and printed handouts. Duely helps turn one image into a task you can actually track.” |
| 12–35 s | Scan → Gallery → synthetic image → on-device result | “The first pass reads the image on the device. Duely proposes details; it does not silently save them.” |
| 35–58 s | Editable review; correct or confirm a field; save | “I can fix the title or deadline, then confirm one task from this one image.” |
| 58–78 s | New task in Tasks, Home, and Calendar | “Now the deadline appears where I plan my work, with a reminder I control.” |
| 78–95 s | Profile → Duely Plus · Test Store; loaded monthly package and test entitlement, if configured | “This is a test purchase, not a real charge. Plus is an optional experiment; manual tasks and on-device scanning stay free.” |
| 95–110 s | Return to app or end card with repo link | “The app is an Android beta, and the source is public.” |

The Plus segment is optional. If the Test Store or account is unavailable, use
those seconds to demonstrate manual task entry or an uncertain OCR field. Do not
claim that Plus increases live cloud-AI usage until the server migration, Edge
Function, secret, and end-to-end entitlement check have been deployed and
verified. Do not describe the synthetic OCR evaluation as a real-student pilot.

## Submission checks

- [x] Public source repository: https://github.com/randrada-usa/Duely
- [x] Open-source license in the repository: `LICENSE` (MIT)
- [x] 1024×1024 app icon exists at `assets/icon.png`; confirm it is the file
      uploaded to Devpost.
- [x] README describes what the Android beta does, how to run it, and its limits.
- [ ] Capture at least one frameless app screenshot at 1179×2556 pixels for
      Devpost. Do not substitute a Figma mockup for a working-app screenshot.
- [ ] Record a working-app video under two minutes, upload it publicly to
      YouTube or Vimeo, and verify its link without a private login.
- [ ] Add the video link, repository link, and accurate project story to Devpost.
- [ ] Complete the category-specific eligibility, consent, and additional-info
      fields in Devpost; check the current official rules before final submission.
- [ ] Preview the public project page and submit before the displayed deadline.

## Honest status to preserve in the video and description

Duely is an Android beta, not an app-store release. Google sign-in and optional
cloud backup require project configuration. Gemini-assisted extraction is
consent-gated and may be disabled; the on-device review still works. RevenueCat
Test Store purchase and restore were exercised on an emulator, but remaining
cancel, failure, expiry, offline, accessibility, and deployed-server allowance
checks are not yet complete. Account deletion and export are still beta work.
