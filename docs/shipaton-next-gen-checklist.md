# Shipaton 2026 Next Gen submission checklist

This checklist maps Duely to the official rules updated August 31, 2026. It is
an engineering and submission aid, not legal advice. Recheck the live Devpost
rules before submitting because the sponsor may change dates or requirements.

The submission deadline in the supplied rules is **September 30, 2026 at
11:45 PM PDT**, which is **October 1, 2026 at 2:45 PM in Singapore**.

## Readiness matrix

| Requirement | Status | Duely evidence or remaining action |
| --- | --- | --- |
| Active student using a `.edu` or equivalent academic email | Entrant action | Rey must confirm current enrollment and submit with the qualifying academic email. |
| Parent or guardian consent when the entrant is under the local age of majority | If applicable | Obtain and retain consent before entering; the sponsor may request written confirmation. |
| Android app with meaningful working functionality | Ready | Guest task creation, image-to-editable-task OCR, reminders, Tasks, Calendar, and Profile run in the Android beta. |
| RevenueCat thoughtfully powers a purchase flow | Ready for demo | Duely Plus loads a RevenueCat Test Store offering in a development build, supports purchase/restore testing, and keeps premium AI allowance enforcement server-side. Release builds never initialize the Test Store. |
| Public open-source repository with all necessary source, assets, and instructions | Ready | `https://github.com/randrada-usa/Duely` is public. `README.md` contains Android setup and a credential-free Guest judge path. |
| Open-source license file visible in the repository About section | Verify on GitHub | `LICENSE` is MIT and GitHub detects it. Before submitting, visually confirm **MIT license** is displayed in the repository's About panel. |
| App accessible from the United States | Verify manually | Confirm the public repository and final public video open from a signed-out or private browser session in the United States. Next Gen does not require an app-store release. |
| 1024×1024 app icon | Ready | Use `assets/icon.png`; it has been verified at exactly 1024×1024. |
| At least one frameless 1179×2556 screenshot | Ready | Use `docs/submission-assets/duely-plus-test-store-1179x2556.png`; it has been verified at exactly 1179×2556 with no device frame or private account data. |
| Text description of features and functionality | Draft below | Paste and adjust the description below in Devpost. Do not claim a public launch, real-student accuracy, or production purchases. |
| Public YouTube or Vimeo demonstration under two minutes | Missing | Record the working Android app on-device, upload publicly, and test the link while signed out. |
| Video contains no unauthorized third-party trademarks, music, or copyrighted material | Recording action | Use no background music, hide unrelated notifications/status icons, use synthetic assignment content, and show only assets the team owns or is licensed to use. |
| Devpost registration and completed submission fields | Missing | Join the hackathon, complete every required field, select Next Gen, add the repository/video links and assets, preview, then submit before the deadline. |
| Third-party integrations used under their terms | Verify manually | Confirm current terms and permissions for Expo, Google/Supabase, ML Kit, Gemini, and RevenueCat before submitting. Never include private keys in the repository or video. |

## Suggested Devpost description

Duely is an Android-first assignment organizer built for students who lose time
turning photos of handouts and whiteboards into reliable reminders. A student
captures or chooses one assignment image, Duely runs on-device ML Kit OCR, and
the student reviews and edits every suggested field before saving one task.
Tasks then appear in focused Today, Upcoming, searchable task, and internal
calendar views with deterministic priority and reminder behavior.

The core experience works in Guest mode without an account. Optional AI Assist
runs on-device OCR first and, only after authentication and explicit consent,
sends recognized text rather than the assignment image to Gemini for structured
suggestions. Missing and uncertain values stay editable instead of being saved
as fact. If cloud AI is unavailable, the student can continue with the local
result.

Duely Plus uses RevenueCat to demonstrate a student-friendly subscription for
additional AI-assisted scans. The development build uses RevenueCat Test Store,
supports purchase and restore testing, clearly separates the planned US$5 price
from the simulated store package, and never charges real money. Test Store
initialization is blocked in release builds. Entitlement-based AI allowances are
verified server-side rather than trusted from client UI state.

This submission is an Android beta, not a published store release. It uses
synthetic evaluation data and does not claim production adoption or real-student
accuracy.

## Final recording order

Use the 90–110 second script in `docs/shipaton-demo.md`. The strongest judging
sequence is:

1. State the student problem and show Home.
2. Scan one synthetic assignment using OCR or consented AI Assist.
3. Correct an extracted field and save the task.
4. Show the saved task in Tasks and Calendar with its reminder.
5. Open Duely Plus and show the RevenueCat Test Store package, purchase state,
   and restore control without displaying credentials or personal information.
6. Close with the privacy fallback: Guest and on-device OCR remain usable when
   cloud AI or purchasing is unavailable.

## Do not submit until these are complete

- [ ] Qualifying student status and academic email confirmed.
- [ ] Parent or guardian consent recorded if applicable.
- [ ] GitHub About panel visibly shows the MIT license.
- [ ] Final video is under two minutes and publicly viewable while signed out.
- [ ] Video has no private data, real student work, unauthorized music, or
      unrelated third-party branding.
- [ ] Devpost description, public repository URL, video URL, icon, and screenshot
      are attached and previewed.
- [ ] Submission is entered in the Next Gen category before the live deadline.
