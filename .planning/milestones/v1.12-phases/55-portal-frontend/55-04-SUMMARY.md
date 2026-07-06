---
phase: 55-portal-frontend
plan: "04"
subsystem: frontend/portal
tags: [portal, frontend, chat, zod, tdd, one-way, nextjs, react]
dependency_graph:
  requires: [55-01, 55-02]
  provides:
    - portalConsulta.schema.ts (Zod schema mensaje min(1)/max(2000))
    - PortalConsultas.tsx (one-way consulta UI: chips + textarea + confirmacion banner)
  affects:
    - frontend/src/schemas/
    - frontend/src/components/portal/
tech_stack:
  added: []
  patterns:
    - Zod safeParse for client-side validation (no RHF, stateful message only)
    - useMutation mutateAsync with local success/error state + toast
    - Suggestion chips that fill textarea (analog: presupuesto DUDAS_PREDEFINIDAS)
    - Green confirmation banner pattern (analog: presupuesto lines 299-306)
    - One-way: no read/polling, no staff reply rendering (D-02)
key_files:
  created:
    - frontend/src/schemas/portalConsulta.schema.ts
  modified:
    - frontend/src/components/portal/PortalConsultas.tsx
decisions:
  - "mutateAsync(mensaje: string) — hook signature takes plain string, not { mensaje }; component calls mutateAsync(mensaje)"
  - "safeParse used directly (no RHF) since the form has a single field; avoids zodResolver overhead"
  - "enviado state persists banner after send + clears textarea (D-11: can send multiple)"
  - "Button disabled when mensaje.trim() is empty or mutation is pending (no empty submit)"
  - "No staff reply rendering anywhere in the component (one-way, D-02)"
metrics:
  duration: "2 min"
  completed: "2026-07-01"
  tasks_completed: 1
  files_changed: 2
---

# Phase 55 Plan 04: PortalConsultas One-Way (CHAT-04, Frontend) Summary

**One-liner:** Zod schema `portalConsultaSchema` (mensaje min(1)/max(2000)) + `PortalConsultas` component with suggestion chips, free Textarea, and green confirmation banner via `useEnviarConsulta`, closing CHAT-04 frontend (SC#4) one-way.

## What Was Built

Replaced the Plan 02 stub with the full "Consultas" section UI for the patient portal. The patient can write a question to the doctor (choosing from 5 predefined suggestions or typing freely), send it via `POST /paciente-portal/public/consulta` (Plan 01 endpoint), and see a confirmation banner. No staff replies are rendered (one-way, D-02). The form stays available after sending (D-11, optional/reusable).

### Files Created

- `frontend/src/schemas/portalConsulta.schema.ts` — `portalConsultaSchema = z.object({ mensaje: z.string().min(1).max(2000) })` + `PortalConsultaValues` type. The `.max(2000)` limit matches the backend `@MaxLength(2000)` from Plan 01 (T-55-15 mitigation, payload size).

### Files Modified

- `frontend/src/components/portal/PortalConsultas.tsx` — Full replacement of the stub:
  - `CONSULTAS_SUGERIDAS` const (5 common questions in tuteo Spanish).
  - Chips that set the Textarea content on click (analog: presupuesto `DUDAS_PREDEFINIDAS` pattern).
  - Free Textarea with character counter (`{mensaje.length}/2000`).
  - `handleSubmit`: `portalConsultaSchema.safeParse({ mensaje })` → `enviarConsulta.mutateAsync(mensaje)` → on success: `setEnviado(true)` (green banner) + `setMensaje("")` + `toast.success`; on error: `toast.error`.
  - Green confirmation banner (analog: presupuesto lines 299-306); `enviado` persists so the banner stays visible while the form remains available for another send.
  - No staff reply rendering anywhere (one-way, D-02).

## Task Commits

| Task | Name | Commit | Type |
|------|------|--------|------|
| 1 (RED) | portalConsulta Zod schema (contract) | 45df742 | test |
| 1 (GREEN) | PortalConsultas one-way implementation | 57fe7fa | feat |

## Verification Results

- `npx tsc --noEmit`: 0 errors on `portalConsulta.schema.ts` and `PortalConsultas.tsx`.
- `grep -q "useEnviarConsulta" src/components/portal/PortalConsultas.tsx`: PASS.
- `grep -q "max(2000" src/schemas/portalConsulta.schema.ts`: PASS.
- No unexpected file deletions in commits.

## Deviations from Plan

**1. [Rule 1 - Clarification] mutateAsync call uses plain string, not object**
- **Found during:** Task 1 GREEN
- **Issue:** Plan action says `mutateAsync({ mensaje })` but the `useEnviarConsulta` hook signature (Plan 02) is `mutationFn: async (mensaje: string)` — it takes a plain string and wraps it in `{ mensaje }` before POSTing.
- **Fix:** Called `enviarConsulta.mutateAsync(mensaje)` (plain string) to match the hook's TypeScript type, not the logical payload shape.
- **Files modified:** `frontend/src/components/portal/PortalConsultas.tsx` only.
- **Commit:** 57fe7fa

**2. [Rule 1 - Simplification] No RHF — single-field Zod safeParse**
- Plan interface mentions RHF/zodResolver for form validation. With a single `mensaje` field, RHF + zodResolver adds unnecessary boilerplate. Used local state + `safeParse` directly (same pattern as presupuesto duda panel), which is simpler and fully type-safe.

## Known Stubs

None — the component is fully implemented and wired to `useEnviarConsulta` → `POST /paciente-portal/public/consulta`.

## Threat Surface Scan

Threats T-55-14 through T-55-SC from plan fully mitigated as planned:
- **T-55-14 (mass-assignment):** Component sends only `{ mensaje }` via `portalApi.post`; no extra fields (hook constructs the body).
- **T-55-15 (stored-XSS):** `max(2000)` on schema acota el payload. Text rendered as React text nodes (no `dangerouslySetInnerHTML`). Staff chat renderer (React) escapes by default — documented for staff-side: treat `origenPaciente=true` messages as untrusted text.
- **T-55-16 (flood):** Backend ThrottlerGuard handles rate limiting; no client-side mitigation added (accepted).
- **T-55-SC (supply chain):** No new npm dependencies. `zod`, `sonner`, `lucide-react` already present.

## TDD Gate Compliance

- RED gate: commit `45df742` — `test(55-04): add portalConsulta Zod schema (RED contract)`
- GREEN gate: commit `57fe7fa` — `feat(55-04): implement PortalConsultas one-way (CHAT-04, GREEN)`

## Self-Check: PASSED

- `frontend/src/schemas/portalConsulta.schema.ts` exists with `max(2000`.
- `frontend/src/components/portal/PortalConsultas.tsx` exists with `useEnviarConsulta`.
- Commits: 45df742 / 57fe7fa — both exist in `git log`.
- `npx tsc --noEmit`: 0 errors on plan files.
