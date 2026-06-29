---
phase: 53-storage-upload-consent-config
plan: "03"
subsystem: frontend-consent-config
tags: [consent, pdf-upload, tanstack-query, shadcn-ui, configuracion-tab, multi-tenant]
dependency_graph:
  requires: [ConsentimientosModule (53-02), PATCH /catalogo-hc/zonas/:id/indicaciones (53-02), StorageService (53-01)]
  provides: [GestionConsentimientos component, useConsentimientos hook, useConsentimientosMutations hooks, Consentimientos tab in Configuración]
  affects: [frontend/src/app/dashboard/configuracion/page.tsx]
tech_stack:
  added: []
  patterns: [TanStack Query (useQuery+useMutation), sonner toast, shadcn/ui Card+Input+Button+Label, FormData multipart upload, inline fallback state pattern]
key_files:
  created:
    - frontend/src/types/consentimientos.ts
    - frontend/src/hooks/useConsentimientos.ts
    - frontend/src/hooks/useConsentimientosMutations.ts
    - frontend/src/app/dashboard/configuracion/components/GestionConsentimientos.tsx
  modified:
    - frontend/src/app/dashboard/configuracion/page.tsx
decisions:
  - "D-12: Consentimientos tab added as new top-level tab in Configuración (NOT nested in Catálogo HC) for both PROFESIONAL and SECRETARIA views"
  - "Inline fallback pattern for controlled input: indicacionesUrls[id] ?? zona.indicacionesUrl ?? '' avoids useEffect+setState (react-hooks/set-state-in-effect) and render-phase ref access (react-hooks/refs)"
  - "useUpdateIndicaciones invalidates both CATALOGO_HC_QUERY_KEY and CONSENTIMIENTOS_QUERY_KEY since indicacionesUrl lives on ZonaHC"
  - "File input accept=application/pdf,.pdf is UX-only; authoritative validation is server-side magic-byte check (53-02, T-53-06)"
metrics:
  duration: "~18 minutes"
  completed: "2026-06-29"
  tasks_completed: 2
  files_count: 5
---

# Phase 53 Plan 03: Frontend Consentimientos Tab Summary

**One-liner:** Consentimientos top-level tab in Configuración for PROFESIONAL and SECRETARIA: per-zona consent PDF upload (vigente file + date + PDF link shown), indicaciones URL save with persistence — consuming the 53-02 backend endpoints via TanStack Query hooks mirroring the useCatalogoHC pattern.

## What Was Built

### Task 1: Types + TanStack Query hooks (commit a3a5398)

`frontend/src/types/consentimientos.ts`:
- `ConsentimientoZonaArchivo`: id, zonaId, path, nombreOriginal, uploadedAt (ISO string), vigente, url? (public URL from StorageService.getPublicUrl)
- `ZonaConConsentimiento`: id, nombre, orden, esSistema, indicacionesUrl: string | null, consentimientoVigente: ConsentimientoZonaArchivo | null

`frontend/src/hooks/useConsentimientos.ts`:
- Exports `CONSENTIMIENTOS_QUERY_KEY = 'consentimientos-zonas'`
- `useConsentimientos(profesionalId?, options?)`: GET /consentimientos/zonas, queryKey [CONSENTIMIENTOS_QUERY_KEY, profesionalId], staleTime 5min, gcTime 30min — exact useCatalogoHC pattern

`frontend/src/hooks/useConsentimientosMutations.ts`:
- `useUploadConsentimiento(profesionalId?)`: FormData POST /consentimientos/zonas/:zonaId/pdf with Content-Type: multipart/form-data header, onSuccess invalidates CONSENTIMIENTOS_QUERY_KEY
- `useUpdateIndicaciones(profesionalId?)`: PATCH /catalogo-hc/zonas/:zonaId/indicaciones, onSuccess invalidates both CATALOGO_HC_QUERY_KEY + CONSENTIMIENTOS_QUERY_KEY

### Task 2: GestionConsentimientos component + Configuración tab wiring (commit c657328)

`frontend/src/app/dashboard/configuracion/components/GestionConsentimientos.tsx`:
- `'use client'` component with `{ profesionalId?: string }` prop
- Fetches via `useConsentimientos` (all zonas with vigente consent + indicacionesUrl in one call — no separate useCatalogoHC call needed)
- Loading (Loader2 spinner), error (red text), empty ("No hay zonas configuradas") states per GestionCatalogoHC pattern
- Per zona Card: indicaciones URL `<Input>` + Save button (useUpdateIndicaciones), file `<input accept="application/pdf,.pdf">` + Upload button (useUploadConsentimiento with Loader2 while pending), vigente consent display (nombreOriginal + formatted uploadedAt + ExternalLink anchor to PDF url when present)
- Toast success/error from sonner on all mutations

`frontend/src/app/dashboard/configuracion/page.tsx`:
- Import `GestionConsentimientos` added
- PROFESIONAL view: `grid-cols-11` → `grid-cols-12`, `TabsTrigger value="consentimientos"` + `TabsContent` with `<GestionConsentimientos />` (no profesionalId — PROFESIONAL has their own context)
- SECRETARIA view: `grid-cols-6` → `grid-cols-7`, `TabsTrigger value="consentimientos"` + `TabsContent` with `<GestionConsentimientos profesionalId={selectedProfesional.id} />` scoped to the selected professional
- Tab is NOT nested inside Catálogo HC (D-12 compliant)

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` (new files) | PASSED — 0 errors |
| `npx eslint` (new files only) | PASSED — 0 errors |
| `npm run build` (Node v20) | PASSED — all routes compiled |

## Success Criteria Status

- [x] Consentimientos tab present in Configuración (both PROFESIONAL and SECRETARIA roles), not nested in Catálogo HC (D-12)
- [x] Per-zona consent PDF upload works — shows current vigente filename + date + PDF link (CONS-01, SC#1 frontend)
- [x] Per-zona indicaciones URL saves and will persist after reload — PATCH /catalogo-hc/zonas/:id/indicaciones wired (CONS-02, SC#3)
- [~] Human checkpoint: upload visible, non-PDF rejected (server-side), URL persists — PENDING (checkpoint below)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced render-phase ref access with inline fallback state pattern**
- **Found during:** Task 2 — `npx eslint GestionConsentimientos.tsx` reported `react-hooks/refs` error: "Cannot access refs during render"
- **Issue:** Original implementation wrote to a `useRef<Set<string>>` during the render phase to track initialized zonas, then called `setState` inside the same render. Both the `react-hooks/refs` and `react-hooks/set-state-in-effect` rules rejected this pattern.
- **Fix:** Removed `initializedZonas` ref and `useEffect` initialization entirely. Input `value` now uses inline fallback: `zona.id in indicacionesUrls ? indicacionesUrls[zona.id] : (zona.indicacionesUrl ?? '')`. `handleSaveIndicaciones` receives `currentServerUrl` as a parameter. This avoids any side effects during render.
- **Files modified:** `GestionConsentimientos.tsx`
- **Commit:** `c657328`

## Known Stubs

None — all methods fully implemented and wired. Vigente consent display is conditional on `zona.consentimientoVigente` being non-null (shows "Sin consentimiento cargado" when null).

## Threat Flags

No new threat surface beyond what the plan's threat model documents:
- T-53-12 (client file-type filter): `accept=".pdf,application/pdf"` applied — UX-only, server-side magic-byte validation is authoritative (53-02)
- T-53-13 (profesionalId scope): passed as query param only; backend resolves/authorizes via JWT + getProfesionalId

## Self-Check

Files created:
- frontend/src/types/consentimientos.ts ✓
- frontend/src/hooks/useConsentimientos.ts ✓
- frontend/src/hooks/useConsentimientosMutations.ts ✓
- frontend/src/app/dashboard/configuracion/components/GestionConsentimientos.tsx ✓

Files modified:
- frontend/src/app/dashboard/configuracion/page.tsx ✓

Commits:
- a3a5398: feat(53-03): add consentimientos types + TanStack Query hooks ✓
- c657328: feat(53-03): add Consentimientos tab to Configuración (D-12) ✓

## Self-Check: PASSED

---

## Checkpoint Reached (Task 3 — human-verify)

Tasks 1-2 are complete. The checkpoint below pauses for browser verification.
