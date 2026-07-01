---
phase: 55-portal-frontend
plan: "02"
subsystem: frontend/portal
tags: [portal, frontend, nextjs, react, tanstack-query, axios, typescript]
dependency_graph:
  requires: [55-01]
  provides:
    - portal-api (portalApi, setPortalToken, clearPortalToken)
    - usePortalDatos + useUpdateContacto + useUpdateSalud + useEnviarConsulta hooks
    - PortalDatos type + UpdateContactoPayload + UpdateSaludPayload types
    - portal/[token] shell with DNI-gate + blocked state + 4-section navigable layout
    - PortalInfoBasica / PortalSalud / PortalConsultas stub components with props contracts
  affects:
    - frontend/src/lib/
    - frontend/src/types/
    - frontend/src/hooks/
    - frontend/src/app/portal/
    - frontend/src/components/portal/
tech_stack:
  added: []
  patterns:
    - axios.create with sessionStorage-based request interceptor (no refresh/redirect-to-login)
    - TanStack Query useQuery + useMutation with invalidateQueries on success
    - state machine PageState union (loading | dni-gate | blocked | ready | error)
    - Accordion type=multiple for always-accessible free navigation
    - mobile-first shadcn/Tailwind, text-base (>=16px), tuteo copy
key_files:
  created:
    - frontend/src/lib/portal-api.ts
    - frontend/src/types/portal.ts
    - frontend/src/hooks/usePortalDatos.ts
    - frontend/src/app/portal/[token]/page.tsx
    - frontend/src/components/portal/PortalInfoBasica.tsx
    - frontend/src/components/portal/PortalSalud.tsx
    - frontend/src/components/portal/PortalConsultas.tsx
  modified: []
decisions:
  - portalToken in sessionStorage["portalToken"], never localStorage — separated from staff accessToken (T-55-06)
  - portal-api has NO response interceptor for refresh/redirect — 401 re-gates by DNI, never redirects to /login (T-55-07)
  - 429 blocked state shows human Spanish tuteo message with retryAfter minutes; handled client-side only (T-55-08)
  - All patient data rendered as React text (no dangerouslySetInnerHTML) — XSS-safe (T-55-09)
  - Consentimiento section is inline placeholder text only (Phase 56)
  - "Paso X de 4" is a visual progress indicator (dots), not a navigation lock (D-07)
metrics:
  duration: "15 min"
  completed: "2026-07-01"
  tasks_completed: 3
  files_changed: 7
---

# Phase 55 Plan 02: Portal Frontend Foundation Summary

**One-liner:** Portal-api axios client with sessionStorage JWT, PortalDatos types, TanStack Query hooks (query + 3 mutations), and portal/[token] shell with DNI-gate state machine, 429-blocked state, and always-navigable 4-section Accordion layout; section components defined as typed stubs for Wave 2.

## What Was Built

The full frontend skeleton for the patient self-service portal (PORTAL-02), consisting of 7 new files that define every contract Wave 2 plans (03 and 04) will implement:

### Files Created

**API layer:**
- `frontend/src/lib/portal-api.ts` — `portalApi` axios instance with a request interceptor that reads `sessionStorage.getItem("portalToken")`. Exports `setPortalToken(token)` and `clearPortalToken()`. No response interceptor for refresh or `/login` redirect — this is intentional (T-55-07).

**Type layer:**
- `frontend/src/types/portal.ts` — `PortalDatos` interface mirroring the backend `getDatos` return shape (contacto 7 fields + saludAutoReportada 4 fields); `UpdateContactoPayload` and `UpdateSaludPayload` mutation payload types.

**Hook layer:**
- `frontend/src/hooks/usePortalDatos.ts` — `usePortalDatos(enabled: boolean)` TanStack Query hook; `useUpdateContacto`, `useUpdateSalud`, `useEnviarConsulta` mutations, all invalidating `["portal-datos"]` on success.

**Page shell:**
- `frontend/src/app/portal/[token]/page.tsx` (381 lines) — full state machine shell:
  - `PageState = "loading" | "dni-gate" | "blocked" | "ready" | "error"`
  - `useEffect` pre-verify: `GET /paciente-portal/public/:token` → 404→error, bloqueado→blocked, else→dni-gate
  - `handleVerificarDni`: POST verify → 401 (wrong DNI msg tuteo) / 429 (blocked+human minutes msg) / ok (setPortalToken+ready)
  - DNI-gate: centered card, `Input inputMode="numeric"`, text ≥16px, Enter key handler, tuteo Spanish copy
  - Blocked state: ShieldAlert icon + human tuteo message with `retryAfter` minutes from 429 body
  - Ready view: read-only header (nombre, DNI, obra social, próxima cirugía), "Paso X de 4" visual dots (NOT a lock)
  - `<Accordion type="multiple">` with 4 AccordionItems all always-accessible in any order (D-07)
  - Consentimiento section: inline placeholder text only (Phase 56)

**Section stubs (Wave 2 contracts):**
- `frontend/src/components/portal/PortalInfoBasica.tsx` — `({ datos: PortalDatos })` — stub placeholder
- `frontend/src/components/portal/PortalSalud.tsx` — `({ salud: PortalDatos["saludAutoReportada"] })` — stub placeholder
- `frontend/src/components/portal/PortalConsultas.tsx` — `()` — uses `useEnviarConsulta` internally (Wave 2 wires it)

## Task Commits

| Task | Name | Commit | Type |
|------|------|--------|------|
| 1 | portal-api + PortalDatos types + hooks | a129953 | feat |
| 2 | PortalInfoBasica/Salud/Consultas stubs | 020f5ff | feat |
| 3 | portal/[token] shell with DNI-gate + layout | 3006303 | feat |

## Verification Results

- `npx tsc --noEmit`: 0 errors in any of the 7 new files (portal-api, types/portal, usePortalDatos, components/portal/*, app/portal/[token]/page.tsx).
- `grep -q "Paso"` in page.tsx: OK
- `grep -q "blocked"` in page.tsx: OK
- `grep -q "setPortalToken"` in page.tsx: OK
- `grep -q "sessionStorage"` in portal-api.ts: OK
- No `localStorage`, `redirect`, or `/login` in portal-api.ts code (only in comment)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

The following 3 components are intentional stubs (Wave 2 implements them in Plans 03 and 04):

| File | Stub Type | Reason |
|------|-----------|--------|
| `frontend/src/components/portal/PortalInfoBasica.tsx` | Placeholder text | Wave 2 (Plan 03) implements RHF+Zod contact form |
| `frontend/src/components/portal/PortalSalud.tsx` | Placeholder text | Wave 2 (Plan 03) implements chips + sugerencias |
| `frontend/src/components/portal/PortalConsultas.tsx` | Placeholder text | Wave 2 (Plan 04) wires useEnviarConsulta |

These stubs are intentional — they define the props contract and the shell compiles against them. They will be replaced with full implementations in plans 03 and 04.

## Threat Surface Scan

All threats from the plan's `<threat_model>` are mitigated as planned:

- **T-55-06** (JWT isolation): `portalToken` in `sessionStorage["portalToken"]`, never `localStorage.accessToken`. `clearPortalToken()` exported.
- **T-55-07** (auth bypass): portal-api has NO response interceptor for refresh or `/login` redirect. 401 causes re-gate by DNI in the shell state machine.
- **T-55-08** (brute-force): 429 lock is server-side (F54). Client only reflects it as `"blocked"` state with human tuteo message — no new client-side brute-force surface.
- **T-55-09** (XSS): All patient data rendered as React text. No `dangerouslySetInnerHTML` anywhere in the 7 files.
- **T-55-SC** (supply chain): No new npm packages installed. axios, @tanstack/react-query, lucide-react already present.

No new security surface outside the plan's threat model.

## Pending Human Verification

The final task of this plan is a `checkpoint:human-verify` that requires visual inspection in a mobile viewport. The orchestrator/user must perform the following checks:

**Setup:**
1. `cd frontend && npm run dev`
2. Get a valid portal token (patient with `portalToken` in DB). Open `http://localhost:3000/portal/<TOKEN_CRUDO>` in the browser — preferably DevTools responsive mode at ~390px width.

**Verifications required:**

1. **DNI-gate (mobile viewport):**
   - A centered card is displayed with text ≥16px legible without zoom.
   - Copy is in tuteo Spanish ("Ingresá tu número de DNI para acceder...").
   - Enter an incorrect DNI → clear error message appears below the input.
   - Enter 3 incorrect DNIs (or use a token whose patient is already locked) → the blocked state screen appears with a human tuteo message (e.g. "Demasiados intentos. Volvé a intentar en X minutos.").

2. **Ready view after correct DNI:**
   - After entering the correct DNI, the read-only header appears with the patient's name, DNI, obra social (if any), and próxima cirugía (if any).
   - A "Paso X de 4" indicator with dots is visible (NOT a lock icon, NOT a blocking step).
   - All 4 sections (Info básica, Salud, Consentimiento, Consultas) are visible as expandable accordion items — they can be opened in ANY order simultaneously.
   - The Consentimiento section shows the placeholder text "Próximamente vas a poder firmar tu consentimiento informado acá."

3. **Section stubs:**
   - Info básica, Salud, and Consultas sections open and display their placeholder text (Wave 2 content not yet present — this is expected).

## Self-Check: PASSED

- `frontend/src/lib/portal-api.ts` exists and exports `portalApi`, `setPortalToken`, `clearPortalToken`.
- `frontend/src/types/portal.ts` exists and exports `PortalDatos`, `UpdateContactoPayload`, `UpdateSaludPayload`.
- `frontend/src/hooks/usePortalDatos.ts` exists and exports `usePortalDatos`, `useUpdateContacto`, `useUpdateSalud`, `useEnviarConsulta`.
- `frontend/src/app/portal/[token]/page.tsx` exists (381 lines).
- `frontend/src/components/portal/PortalInfoBasica.tsx`, `PortalSalud.tsx`, `PortalConsultas.tsx` all exist.
- Commits: a129953 / 020f5ff / 3006303 — all exist in `git log`.
- `npx tsc --noEmit` — 0 errors on all new files.
