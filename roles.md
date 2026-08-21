# Duely Team Roles

These roles define primary ownership for the Duely Android beta. Everyone may contribute across areas, but the named owner is responsible for keeping the work moving and confirming that it meets the agreed requirements.

## Rey — Founder, Product Lead, and Technical Lead

Primary responsibility: product direction, architecture, and release quality.

- Own the product vision, MVP scope, roadmap, and final product decisions.
- Define requirements and acceptance criteria before development begins.
- Design the application architecture and database structure.
- Own Supabase, authentication, synchronization, security, and access policies.
- Own ML Kit and Gemini integration, confidence handling, and scan evaluation.
- Own privacy, consent, dataset governance, and deletion processes.
- Review pull requests and maintain engineering standards.
- Manage beta releases, production credentials, budgets, and incident response.
- Pair with Gio and Jenard when tasks are unfamiliar or high risk.

## Gio — Mobile Feature Developer

Primary responsibility: implement and test the main student experience.

- Build the Today and Upcoming views.
- Build the internal calendar experience.
- Implement task creation, review, editing, completion, and deletion.
- Implement camera and gallery-image intake with Expo-compatible libraries.
- Implement reminders and notification preferences.
- Implement local/offline storage and synchronization behavior.
- Add automated tests for assigned features.
- Document technical decisions and raise blockers early.
- Review smaller contributions from Jenard as his development skills grow.

## Jenard — QA, Design Operations, and Community

Primary responsibility: make Duely testable, understandable, and ready for students.

- Maintain the beta test plan, device matrix, and regression checklist.
- Build and organize a consented, redacted scan-evaluation collection.
- Test images from Messenger, LMS pages, PDFs, slides, handouts, and whiteboards.
- Record extraction failures by field: title, subject, deadline, effort, and instructions.
- Verify layouts and accessibility across supported Android screen sizes.
- Organize tester recruitment, onboarding, feedback, and issue reports.
- Prepare approved social posts, store screenshots, and beta announcements.
- Maintain brand assets and design handoff notes.
- Start contributing through small UI fixes, test cases, and documentation tasks.

## Shared Working Agreement

- Work from written issues with an owner, acceptance criteria, and target milestone.
- Keep pull requests small enough to review safely.
- Require Rey's review for authentication, payments, AI, privacy, database policies, and releases.
- Do not put real student scans in source control or general team folders.
- Never use a scan for model improvement unless the contributor separately opted in.
- Remove or redact unrelated names, profile photos, student numbers, contact details, and conversations before dataset use.
- Track product metrics using aggregated or pseudonymous data wherever possible.
- Hold a short weekly planning session and a separate beta-quality review.

## Decision Ownership

| Area | Responsible | Final decision |
| --- | --- | --- |
| Product scope and roadmap | Rey | Rey |
| Architecture and backend | Rey | Rey |
| AI/OCR pipeline | Rey | Rey |
| Core mobile features | Gio | Rey |
| Testing and beta readiness | Jenard | Rey |
| Brand and promotional execution | Jenard | Rey |
| Privacy and dataset approval | Rey | Rey |
| Release approval | Whole team reviews | Rey |

## Initial Beta Success Measures

- A student can create and confirm one task from one image.
- Clearly printed deadlines are extracted correctly at least 95% of the time in the controlled evaluation set.
- Duely does not invent a deadline when none is shown in at least 99% of evaluation cases.
- At least 80% of beta scans have all essential fields correct without editing.
- Every ambiguous deadline is flagged for student confirmation.
- Every saved task appears correctly in Today, Upcoming, and Calendar.
- Users can control reminders, consent, account data, and deletion.
