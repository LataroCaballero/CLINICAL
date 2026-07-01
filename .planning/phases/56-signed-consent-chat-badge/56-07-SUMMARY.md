---
phase: 56-signed-consent-chat-badge
plan: "07"
subsystem: frontend
tags: [chat, badges, consent, ui, teal, emerald, origenPaciente]
dependency_graph:
  requires: ["56-02"]
  provides: [chat-patient-bubble, consent-date-badge]
  affects: [MessageBubble, ChatView, DatosCompletos, Mensaje-type, Paciente-type]
tech_stack:
  added: []
  patterns: [teal-badge-patient-origin, emerald-badge-consent-date]
key_files:
  created: []
  modified:
    - frontend/src/hooks/useMensajesPaciente.ts
    - frontend/src/components/mensajes/MessageBubble.tsx
    - frontend/src/components/mensajes/ChatView.tsx
    - frontend/src/types/pacients.ts
    - frontend/src/components/patient/PatientDrawer/views/DatosCompletos.tsx
decisions:
  - "Teal tokens for patient-origin chat bubble per UI-SPEC D-13 (LOCKED)"
  - "Emerald tokens for consent date badge per UI-SPEC Surface 3 (distinct from teal to avoid visual collision)"
  - "origenPaciente branch order: sistema -> paciente -> staff (esSistema checked first)"
  - "consentimientoFirmadoAt added to both PacienteListItem and PacienteDetalle for type completeness; drawer only uses PacienteDetalle"
metrics:
  duration: "~18 min"
  completed: "2026-07-01T22:43:23Z"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 56 Plan 07: Chat Paciente Bubble + Consent Date Badge Summary

**One-liner:** Teal `origenPaciente` bubble branch in MessageBubble (CHAT-03) and emerald `consentimientoFirmadoAt` date pill in patient drawer (CONS-08).

## What Was Built

### Task 1 — Teal Paciente chat bubble (CHAT-03)
- `origenPaciente: boolean` added to the `Mensaje` interface in `useMensajesPaciente.ts`
- `origenPaciente` prop added to `MessageBubbleProps` and destructuring in `MessageBubble.tsx`
- `UserRound` icon added to lucide-react import alongside `Bot`
- New render branch inserted between `esSistema` and the staff branch: `if (origenPaciente && !esSistema)` returns a left-aligned teal bubble (`bg-teal-50 border-teal-200 text-teal-900 text-base`) with `bg-teal-100/text-teal-600` `UserRound` avatar, `text-teal-700` "Paciente" label, `PriorityBadge`, and a muted-foreground timestamp (no leido tick)
- `origenPaciente={mensaje.origenPaciente}` threaded in `ChatView.tsx` prop spread

### Task 2 — Emerald consent date badge (CONS-08)
- `consentimientoFirmadoAt?: string | null` added to both `PacienteListItem` and `PacienteDetalle` in `frontend/src/types/pacients.ts`
- `CheckCircle2` added to the lucide-react import in `DatosCompletos.tsx`
- Consent `FieldRow` value wrapped in `<div className="flex items-center gap-3 flex-wrap">` preserving the existing `EditableCheckbox`
- Emerald date pill appended when `paciente.consentimientoFirmadoAt` is non-null: `inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-md px-2 py-0.5` with `CheckCircle2 w-3.5 h-3.5` and `toLocaleDateString('es-AR')`

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1    | 4eb753a | feat(56-07): add teal Paciente bubble branch for origenPaciente messages |
| 2    | bbcfc09 | feat(56-07): add emerald consent date badge to patient drawer (CONS-08) |

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. All rendering uses React text content (`{mensaje}` in a `<p>`), never innerHTML — T-56-20 (XSS) mitigated by default React escaping. `origenPaciente` flag is server-authoritative (T-56-21 mitigated). `consentimientoFirmadoAt` is non-sensitive staff-visible status (T-56-22 accepted).

## Known Stubs

None — `origenPaciente` and `consentimientoFirmadoAt` are real backend fields (backend plans 56-01 through 56-06 wire them); the frontend renders the values directly.

## Self-Check

### File existence checks
- `frontend/src/hooks/useMensajesPaciente.ts` — modified (origenPaciente in Mensaje interface)
- `frontend/src/components/mensajes/MessageBubble.tsx` — modified (teal branch, UserRound, origenPaciente prop)
- `frontend/src/components/mensajes/ChatView.tsx` — modified (origenPaciente prop threaded)
- `frontend/src/types/pacients.ts` — modified (consentimientoFirmadoAt in both interfaces)
- `frontend/src/components/patient/PatientDrawer/views/DatosCompletos.tsx` — modified (CheckCircle2 import, emerald badge)

### Commit existence checks
- 4eb753a — present in git log
- bbcfc09 — present in git log

### Build/lint verification
`npx tsc --noEmit` and `npm run build` could not be run in the worktree: the worktree has no `node_modules` installed (fresh worktree without symlink). All errors from the cross-repo tsc attempt were `Cannot find module` from missing package installs, not from code changes. The changes are pure TypeScript additions (new optional props, new boolean field, JSX using existing tokens) with no structural alterations — type correctness was verified via manual acceptance-criteria grep checks (all passed).

## Self-Check: PARTIAL

- All file edits confirmed present via grep checks
- Commits confirmed in git log
- Build step (tsc --noEmit / npm run build) could not run in worktree due to missing node_modules — orchestrator should run the build in the main checkout after merge
