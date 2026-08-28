# Phone-Authoritative Cloud Backup

Status: accepted for the Android beta on 2026-08-29.

## Decision

Duely treats the task data on the current phone as authoritative. The cloud is a per-user backup mirror, not a multi-device synchronization engine.

- Guest data stays local until the student signs in and explicitly approves the first backup.
- Stable local client IDs map records to user-scoped cloud rows and make repeated writes idempotent.
- Each account has a local receipt containing confirmed record IDs, the confirmed data fingerprint, and the confirmation time.
- After the first confirmed backup, local creates, edits, and deletes are mirrored to that account.
- Cloud data never silently overwrites non-empty local data.
- Restore is offered only when the phone has no local tasks, and nothing is restored without confirmation.
- Signing out does not delete local data. Signing into another account does not copy that data until the student explicitly approves the new account's first backup.

Device-only source-image references are excluded from cloud fingerprints and backup payloads.

## Consequences

The beta does not need remote-wins behavior, automatic merges, conflict screens, or cross-device change vectors. Editing the same account on multiple phones is not supported as a synchronization workflow. If multi-device editing is approved later, it requires a new decision covering version metadata, deletions, conflict resolution, restore semantics, and user-visible recovery.

This decision prioritizes predictable behavior and prevents a remote account or account switch from silently changing the student's only working copy on their phone.
