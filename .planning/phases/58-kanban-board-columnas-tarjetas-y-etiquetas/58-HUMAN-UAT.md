---
status: partial
phase: 58-kanban-board-columnas-tarjetas-y-etiquetas
source: [58-VERIFICATION.md]
started: 2026-07-04T22:58:46Z
updated: 2026-07-04T22:58:46Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Column order in browser
expected: "Sin clasificar" renders last; "Cirugía Realizada" appears immediately after "Confirmado" in the kanban board.
result: [pending]

### 2. Orange badge visible
expected: A patient in the "Cirugía Realizada" column with at least one pending step shows the orange "Pasos pendientes" badge (orange border/text, filled orange dot).
result: [pending]

### 3. "Espera fecha" badge
expected: A CONFIRMADO patient without a scheduled surgery (paso cirugia ≠ completo) shows the "Espera fecha" contact label.
result: [pending]

### 4. "Cirugía programada" badge
expected: A CONFIRMADO patient with a scheduled surgery (paso cirugia = completo) shows the "Cirugía programada" contact label (with accent).
result: [pending]

### 5. todosCompletos filter active
expected: A patient with all steps complete is absent from every board column.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
