---
status: partial
phase: 51-schema-foundation-chat-fix
source: [51-VERIFICATION.md]
started: 2026-06-26T04:00:00Z
updated: 2026-06-26T04:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Smoke-test existing screens after migration (SC#4)
expected: Pacientes list, HC entries, chat view (mensajes internos), turnos calendar, and finanzas screens all load without console errors or 500 responses after the new columns were added
result: [pending]

### 2. Decide on WR-02: bounded 23-message burst acceptable or requires backfill?
expected: Human confirms the one-time wave of up to 23 new esSistema=true messages that will appear on the next 09:00 cron is intentional (first-and-only alert for each overdue task) OR requests a backfill UPDATE so the tasks start with notificada=true and the chat stays clean
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
