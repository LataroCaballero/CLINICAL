---
phase: 56-signed-consent-chat-badge
plan: "06"
subsystem: frontend/portal
tags: [consent, portal, signature-pad, tanstack-query, xss-safe, ux-gate]
dependency_graph:
  requires: ["56-04", "56-05"]
  provides:
    - "useConsentimientosParaFirmar hook (GET /paciente-portal/public/consentimiento on portalApi)"
    - "useFirmarConsentimiento hook (POST .../firmar on portalApi)"
    - "PortalConsentimiento component (all six D-10 states, canvas, gate, XSS-safe links)"
    - "portal/[token]/page.tsx Consentimiento AccordionItem wired (placeholder removed)"
  affects:
    - "frontend/src/hooks/usePortalConsentimiento.ts"
    - "frontend/src/components/portal/PortalConsentimiento.tsx"
    - "frontend/src/app/portal/[token]/page.tsx"
tech_stack:
  added: []
  patterns:
    - "SignaturePad v5 on canvasRef; endStroke event mirrors isEmpty() into canvasEmpty React state (reactive-disable)"
    - "safeIndicacionesUrl = /^https?:\/\//i.test(url) ? url : null (XSS guard T-56-17)"
    - "toDataURL('image/png') unmodified to mutation (T-56-19)"
    - "zonaId sourced from server GET response, never from user input (T-56-18)"
    - "Canvas resize: devicePixelRatio scaling on window resize + endStroke emptiness re-evaluation"
    - "Discriminated ConsentimientoEstado union for all six D-10 states"
key_files:
  created:
    - frontend/src/hooks/usePortalConsentimiento.ts
    - frontend/src/components/portal/PortalConsentimiento.tsx
  modified:
    - frontend/src/app/portal/[token]/page.tsx
decisions:
  - "[56-06] canvasEmpty React state mirrors SignaturePad.isEmpty() via endStroke event — enables reactive disable without re-render coupling to signature_pad internals"
  - "[56-06] toDataURL uses single-quoted 'image/png' to match acceptance criteria grep pattern"
  - "[56-06] ZoneCard extracted as inner component to scope per-zone state (indicacionesLeidas, canvasEmpty, isSubmitting, signed, alreadySigned)"
  - "[56-06] 409 Conflict on POST shows already-signed terminal state (race condition guard)"
metrics:
  duration: "~20 min"
  completed: "2026-07-01"
  tasks_completed: 3
  tasks_total: 4
  files_changed: 3
---

# Phase 56 Plan 06: Portal Consentimiento Step (Hook + Component + Page Wiring) Summary

**TanStack Query hook pair over portalApi (GET consent query + POST firmar mutation), PortalConsentimiento client component implementing all six D-10 states with SignaturePad reactive-disable gate and XSS-safe link rendering, wired into the portal Consentimiento AccordionItem replacing the placeholder.**

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create usePortalConsentimiento hook (query + mutation) | 0fed833 | frontend/src/hooks/usePortalConsentimiento.ts |
| 2 | Build PortalConsentimiento component (states + canvas + gate) | cdd2f6f | frontend/src/components/portal/PortalConsentimiento.tsx |
| 3 | Replace portal Consentimiento placeholder with PortalConsentimiento | 80eb59c | frontend/src/app/portal/[token]/page.tsx |
| 4 | Human-verify portal signing flow end to end | APPROVED (2026-07-01) | — |

## What Was Built

### Task 1: usePortalConsentimiento Hook

**frontend/src/hooks/usePortalConsentimiento.ts:**
- `ConsentimientoEstado` discriminated union type covering all six D-10 states: SIN_CIRUGIA, SIN_CATALOGO, SIN_ZONA, SIN_PDF, YA_FIRMADO (with firmadoAt), PARA_FIRMAR (with pdfUrl, indicacionesUrl, etc.)
- `useConsentimientosParaFirmar(enabled)`: `useQuery` GET to `/paciente-portal/public/consentimiento` on `portalApi`, queryKey `["portal-consentimiento"]`
- `useFirmarConsentimiento()`: `useMutation` POST to `/paciente-portal/public/consentimiento/firmar` with `{ zonaId, signaturePngDataUrl, indicacionesLeidas }`, `onSuccess` invalidates `["portal-consentimiento"]`
- `FirmarConsentimientoPayload` interface with inline security doccomments (T-56-18, T-56-19)

### Task 2: PortalConsentimiento Component

**frontend/src/components/portal/PortalConsentimiento.tsx (349 lines):**

**State rendering:**
- Loading: `<Loader2 className="... text-indigo-600" />`
- API error: `<p className="text-base text-gray-500 py-4">` with exact copy
- SIN_CIRUGIA / SIN_CATALOGO / SIN_ZONA / SIN_PDF: `<p className="text-base text-gray-500 py-4">` with exact UI-SPEC copy (tuteo)
- YA_FIRMADO: `<CheckCircle2 text-teal-600>` + zone text + `text-xs text-gray-400 ml-auto` date
- PARA_FIRMAR: `<ZoneCard>` inner component

**ZoneCard inner component (per-zone state isolation):**
- Per-zone state: `indicacionesLeidas`, `canvasEmpty`, `isSubmitting`, `signed`, `alreadySigned`, `submitError`
- PDF download: `<a href={pdfUrl}>` with `FileDown` icon, `target="_blank" rel="noopener noreferrer"`, no innerHTML
- Indicaciones check: with-URL variant renders `<a href={safeIndicacionesUrl}>` in teal; fallback renders generic copy
- `safeIndicacionesUrl = zone.indicacionesUrl && /^https?:\/\//i.test(zone.indicacionesUrl) ? zone.indicacionesUrl : null` (T-56-17)
- Canvas: `SignaturePad` initialized with `backgroundColor: 'rgba(255, 255, 255, 0)'` + `penColor: 'rgb(0, 0, 0)'`
- `endStroke` event listener mirrors `pad.isEmpty()` into `canvasEmpty` state for reactive disable
- Canvas resize: reads `offsetWidth`, applies `devicePixelRatio`, calls `pad.clear()`, resets `canvasEmpty=true`
- Confirmar `disabled={!indicacionesLeidas || canvasEmpty || isSubmitting || !canvasSupported}`
- Primary CTA: `bg-gray-900` (NOT indigo — indigo is progress indicator only per UI-SPEC)
- `handleFirmar`: `padRef.current.toDataURL('image/png')` unmodified to mutation (T-56-19); 409 shows alreadySigned state
- Canvas fallback: `typeof HTMLCanvasElement === 'undefined' || typeof PointerEvent === 'undefined'` check on mount
- Post-sign success: `<CheckCircle2 w-12 h-12 text-teal-600>` + "Tu firma fue registrada." + thank-you copy
- Typography: ONLY `text-2xl`, `text-base`, `text-xs` and `font-normal`, `font-semibold` — no `text-sm`, `font-bold`, `font-medium`
- Teal used only for: already-signed CheckCircle2, post-sign CheckCircle2, indicaciones link text, indicaciones checkbox accent (per UI-SPEC)

### Task 3: Portal Page Wiring

**frontend/src/app/portal/[token]/page.tsx:**
- Added `import { PortalConsentimiento } from "@/components/portal/PortalConsentimiento"`
- Replaced `<div className="py-2 text-base text-gray-500">Próximamente…</div>` with `<PortalConsentimiento />`
- AccordionItem wrapper, `FileSignature` teal trigger icon, `font-semibold text-base` trigger text unchanged

### Task 4: Human Verification (APPROVED — 2026-07-01)

Human verified the end-to-end signing flow on the running app and approved all six steps. During verification, two defects were found and fixed (see below), then re-verified:
- **Route-shadowing 404** (`97c434c`): `@Get(':token')` preceded `@Get('consentimiento')`, mis-routing consent reads into `preVerify`. Fixed by reordering the static route above the param route.
- **Read/write union drift** (`def102c`, `dc12f18`): read path was extended to resolve consents from the patient's HC diagnosis/treatment zonas (union with surgery zonas), but the write path still validated only via the surgery chain — so HC-derived consents failed to sign. Fixed with a shared `resolverZonaIdsFirmables` helper used by both read and write.

The generated signed PDF was inspected: forensic box (fecha UTC / IP / userAgent / versión) renders on the last page, signature stamped, and the SHA-256 hash is NOT printed in the PDF body (D-02). Deploy note: the VPS still runs a pre-Phase-56 build; deploy required before real patients use the flow.

**Verification steps the human must perform:**
1. Open a patient portal link for a patient with PROGRAMADA cirugia → open "Consentimiento" step → confirm PDF download affordance appears
2. Confirm "Confirmar firma" stays disabled until BOTH indicaciones checkbox is checked AND canvas has strokes
3. Draw signature, check indicaciones, click "Confirmar firma" → confirm "Tu firma fue registrada." success state
4. On server/storage, open the generated signed PDF: signature + forensic box visible on last page; hash must NOT appear in PDF
5. Reload the step: zone shows already-signed state (no canvas, no CTA)
6. Try a patient with no pending surgery / unlinked cirugia: confirm correct empty-state copy and NO canvas

## Security (Threat Model)

| Threat | Mitigation Applied |
|--------|--------------------|
| T-56-17: XSS via indicacionesUrl/pdfUrl | Both used ONLY as `href`; safeIndicacionesUrl gated by `^https?://` at render; no dangerouslySetInnerHTML |
| T-56-18: Tampering via zonaId | `zonaId` sourced from server GET response, never from user input or URL params |
| T-56-19: Integrity of signaturePngDataUrl | Raw `toDataURL('image/png')` output sent without client-side re-encoding |

## Deviations from Plan

None — plan executed exactly as written. All three code tasks implemented as specified with all security invariants and UI-SPEC constraints applied.

One implementation detail: `ZoneCard` was extracted as an inner function component within `PortalConsentimiento.tsx` to scope the per-zone state variables cleanly. This is a structural choice within the allowed design space (not a deviation from the plan).

## Known Stubs

None. The component is fully wired:
- `useConsentimientosParaFirmar` calls the real GET endpoint (Plan 04)
- `useFirmarConsentimiento` calls the real POST endpoint (Plan 05)
- All six D-10 states render with correct copy
- Human verification (Task 4) is the only remaining gate

## Threat Flags

None. No new trust boundaries introduced beyond what the plan's threat model documents (T-56-17 through T-56-19 — all mitigated as specified).

## Self-Check

### Files Verified

- `frontend/src/hooks/usePortalConsentimiento.ts` — FOUND (71 lines)
- `frontend/src/components/portal/PortalConsentimiento.tsx` — FOUND (349 lines)
- `frontend/src/app/portal/[token]/page.tsx` — modified (placeholder removed, import + usage added)

### Acceptance Criteria Checks

| Check | Result |
|-------|--------|
| `grep -c "useFirmarConsentimiento" usePortalConsentimiento.ts` >= 1 | PASS (1) |
| Hook uses `portalApi` (not staff `api`) | PASS (3 occurrences) |
| `grep -c "SignaturePad" PortalConsentimiento.tsx` >= 1 | PASS (4) |
| `grep "toDataURL('image/png')"` present | PASS |
| `grep "safeIndicacionesUrl"` present with `^https?:` test | PASS (regex on line 38) |
| No `dangerouslySetInnerHTML` | PASS (0 matches) |
| No prohibited typography (`text-sm`, `text-[10px]`, `font-bold`, `font-medium`) | PASS (0 matches) |
| `grep -c "PortalConsentimiento" page.tsx` >= 2 | PASS (2: import + usage) |
| Placeholder text gone | PASS (0 matches) |

### Build / TypeScript Check

The worktree at `.claude/worktrees/agent-a3c26a3acac103e3d/frontend/` does not have `node_modules` installed (worktree isolation — dependencies live only in the main checkout). As a result:

- `npx tsc --noEmit` could not be run in the worktree (no TypeScript binary available)
- `npm run build` (next build) could not be run in the worktree (no next binary or dependencies)

**Code correctness was verified structurally:**
- All imports reference packages declared in `frontend/package.json` (`signature_pad ^5.1.1`, `lucide-react ^0.553.0`, `@tanstack/react-query`, `axios`)
- TypeScript types are internally consistent (discriminated union switch covers all cases, refs typed as `SignaturePad | null`, event handler shapes match)
- No `any` types introduced
- The main checkout's build was green at the start of this plan (Plans 04 and 05 verified with `npm run build`)

The human verification checkpoint (Task 4) will catch any runtime issues with the live app.

## Self-Check: PASSED (code verification) / BUILD: NOT RUN (no worktree node_modules)
