# Duely UI/UX Plan

Status: approved direction for the Android beta design revision.

## Brand Foundation

- Product and mascot name: **Duely**.
- Mascot nickname in friendly copy: **Due**.
- Use "Duely" for product, legal, account, notification-source, and store copy so "due" is not confused with a deadline state.
- Use **Nunito** for friendly display headings and prominent numbers.
- Use **Inter** for body copy, labels, forms, dates, and dense task information.
- Do not depend on SF Pro Display in the Android application. Use platform system fonts only as fallbacks where necessary.
- Preserve the blue/indigo palette, rounded surfaces, white space, and mascot-led illustrations.

## Primary Navigation

Use five persistent destinations:

1. **Home**
2. **Tasks**
3. **Scan** — elevated center action
4. **Calendar**
5. **Profile**

Navigation requirements:

- Each destination must have both an icon and a visible text label.
- Selected state must not rely on color alone.
- Preserve navigation state when moving between tabs.
- Hide the tab bar only during camera capture, scan processing, authentication, onboarding, and focused edit flows.
- Back navigation must never discard edits without warning.

## Home

Purpose: answer "What needs my attention today?"

Include:

- Friendly greeting and current date.
- Overdue section, shown only when needed.
- Tasks due today.
- Recommended next task using deterministic smart priority.
- Quick scan card.
- Short upcoming-deadlines preview.
- Manual **Add task** action.
- Clear path to the full Tasks collection.

Do not include in the initial beta:

- Automatically generated study sessions.
- Weekly goals.
- Checklist-derived percentage progress.
- Unsupported claims about time or stress saved.
- Duely Coach as a general-purpose assistant.

## Tasks

Purpose: provide a searchable collection of every task.

The experience should borrow Google Drive's findability without implementing nested folders.

### Default layout

- Search bar at the top.
- Compact task rows or cards.
- Grouping selector: deadline, subject, status, or none.
- Sort options: smart priority, due date, date created, title.
- Filter chips: Open, Completed, Overdue, No deadline, Subject, Task type, Priority.
- Floating or header **Add task** action.
- Scan action remains available through the center navigation button.

### Search

Search across:

- Title
- Subject/course
- Instructions and notes
- Task type

Search should work locally and tolerate partial words and letter case differences.

### Subject organization

- Subjects visually resemble collections but are not nested file folders.
- Selecting a subject shows all tasks belonging to it.
- A task belongs to one subject in v0.
- Include **Unassigned** for tasks without a subject.
- Subject color must be supplemented by a label or icon.

### Task states

- Open
- Completed
- Overdue — calculated when an open task passes its deadline

Do not add archive, trash, nested folders, shared folders, or multi-subject membership in v0.

## Scan Flow

1. Choose Camera or Gallery.
2. Request permission when needed, with a clear explanation.
3. Capture/select one image.
4. Crop and rotate.
5. Run on-device ML Kit OCR.
6. If appropriate and authorized, use a Gemini-assisted scan.
7. Show progress with Cancel available.
8. Present extracted fields for review.
9. Highlight uncertain or missing fields individually.
10. Student edits and confirms.
11. Save the task and schedule reminders.
12. Show success and open the saved task or return Home.

Only one task is created per image in the beta. If multiple assignments are detected, ask the student to crop or select one.

### Review fields

- Title
- Subject/course
- Deadline and optional time
- Task type
- Priority
- Estimated effort
- Instructions/notes
- Reminder settings
- Source-image preview

Do not show a single overall AI confidence percentage. Show uncertainty beside the affected field.

## Calendar

- Internal Duely calendar only.
- Month view with previous/next controls and swipe support.
- Today shortcut.
- Clear selected-date state.
- Task count or accessible indicator on populated dates.
- Selected-day task list below the calendar.
- Add-task action prefilled with the selected date.
- Empty state for a date with no tasks.
- Do not rely on colored dots without labels or another distinguishable cue.

## Profile and Settings

Include:

- Account identity and school-email status.
- Google or school-email sign-in prompt for guests.
- AI-assisted scan allowance, such as **3 of 5 remaining**.
- Default reminders.
- Notification controls.
- Subject management.
- Language preference.
- Optional model-improvement consent.
- View/delete retained model-improvement contributions.
- Export data.
- Delete account.
- Privacy notice and terms.
- Help and feedback.
- Application version.
- Sign out for authenticated users.

Defer Google Calendar sync, academic-calendar integration, study-hour planning, weekly goals, and general AI coach settings.

## Onboarding

### Slide 1

**Capture an assignment**

Take a clear photo or choose an assignment image from your gallery.

### Slide 2

**Review the important details**

Duely finds the title, subject, deadline, and instructions for you to check.

### Slide 3

**Stay ahead of deadlines**

Organize upcoming work and choose when Duely should remind you.

Every slide includes Skip. The final action is **Get started**.

## Authentication

Offer:

- Continue with Google
- Continue with school email
- Continue without an account

Explain guest access:

> Manual tasks and on-device scanning are available without an account. Sign in to use AI-assisted scans.

School email should use a verification link or one-time code, not a password in v0. Do not restrict valid accounts to a literal `.edu` suffix. A verified-school badge may use a maintained domain allowlist.

## Required Empty, Error, and Permission States

Design and implement:

- First launch and onboarding.
- Guest-mode explanation.
- Google sign-in failure.
- School-email entry, code/link sent, verification success, expired link, and failure.
- Empty Home with a first-task call to action.
- Empty Tasks collection.
- No task results after search/filtering.
- Empty selected calendar date.
- Manual task creation and validation errors.
- Manual task editing.
- Subject creation, editing, and deletion consequences.
- Camera permission explanation, denial, and permanently denied state.
- Gallery permission explanation and denial.
- Notification permission explanation, denial, and settings recovery.
- Image crop and rotation.
- Blurry, dark, obstructed, or unsupported image guidance.
- Offline on-device scan.
- Cloud AI unavailable or timed out.
- Scan cancelled.
- No text detected.
- Ambiguous or missing deadline.
- Multiple assignments detected.
- AI scan allowance exhausted.
- Premium preview and purchase unavailable.
- Review extraction with unsaved changes.
- Task-save success and failure.
- Reminder scheduling failure.
- Task completion and undo.
- Delete-task confirmation.
- Dataset-consent explanation, grant, withdrawal, and contribution deletion.
- Data export requested, processing, ready, and failed.
- Delete-account confirmation, reauthentication if required, progress, and completion.
- General feedback and report-a-problem flow.

## Accessibility Requirements

- Meet WCAG AA contrast for meaningful text, icons, controls, borders, and focus states.
- Do not use color alone for priority, deadline state, subject, completion, errors, or selection.
- Use at least 48 by 48 dp touch targets for Android controls.
- Support Android font scaling without clipping, overlap, or hidden actions.
- Prefer a 16 sp body-text baseline; use smaller text sparingly and never for essential information.
- Provide accessible names and states for every icon-only control.
- Announce scan progress and completion without repeatedly interrupting screen readers.
- Keep logical focus order and return focus sensibly after dialogs.
- Provide visible pressed, selected, disabled, loading, error, and focus states.
- Respect reduced-motion preferences for nonessential mascot and loading animation.
- Ensure all actions are usable without gesture-only interaction.
- Use plain-language errors that explain recovery.
- Keep destructive actions separated from routine controls and require confirmation.
- Test TalkBack, large text, display scaling, high contrast, and common forms of color-vision deficiency.

## Icon Production Requirements

- Preserve the approved Duely face concept.
- Produce separate adaptive foreground and background layers.
- Keep the face within Android adaptive-icon safe zones.
- Produce a monochrome themed-icon asset.
- Test common circle, squircle, rounded-square, and irregular launcher masks.
- Verify legibility at launcher, settings-list, and store-listing sizes.

## Figma Deliverables

For every screen, include:

- Default state.
- Loading state where applicable.
- Empty state where applicable.
- Error state where applicable.
- Disabled and pressed controls.
- Large-font behavior.
- Component names matching implementation terminology.
- Notes for navigation destination and back behavior.
- Reusable components for task cards, filter chips, fields, buttons, navigation, warnings, and dialogs.

The editable Figma file remains the visual source of truth. This document is the behavioral and scope source of truth.
