---
phase: 62-portal-staff-frontend-gate-de-firma-secciones-separadas-y-si
reviewed: 2026-07-21T15:49:08Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - backend/src/modules/pacientes/pacientes.service.ts
  - frontend/src/app/portal/[token]/page.tsx
  - frontend/src/components/crm/CardActionsSheet.tsx
  - frontend/src/components/crm/EtapaStepper.tsx
  - frontend/src/components/portal/PortalConsentimiento.tsx
  - frontend/src/components/portal/PortalIndicaciones.tsx
  - frontend/src/hooks/useCRMKanban.ts
  - frontend/src/hooks/usePortalConsentimiento.ts
findings:
  critical: 3
  warning: 4
  info: 2
  total: 9
status: issues_found
---

# Phase 62: Code Review Report

**Reviewed:** 2026-07-21T15:49:08Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Reviewed the phase-62 diff (splitting "Indicaciones" into its own portal step, the new open-PDF signing gate, and the `indicacionesLeidasAt` display in the CRM stepper) plus the full content of the 8 files in scope, cross-referencing `crm-steps.helper.ts` and `paciente-portal.service.ts` to verify the semantics of `indicacionesLeidasAt`.

The diff itself is small and mostly correct (type wiring for the new field is consistent end-to-end, the indicaciones/consentimiento separation is real, `zonaId` still never comes from user input). The main problems found are: (1) pre-existing but in-scope PII/PHI logging via `console.log`/`console.error` in `pacientes.service.ts`, which is a real exposure risk for a clinical system, and (2) a data-modeling gap, newly surfaced by this phase's UI, where a single patient-level `indicacionesLeidasAt` timestamp is displayed per-zone in the stepper as if it confirmed that zone's indications were read — for multi-zone surgeries this can show a false "completo" (read) state. Several smaller robustness/consistency issues are also listed below.

## Critical Issues

### CR-01: Patient PII/PHI written to console.log in `create()`

**File:** `backend/src/modules/pacientes/pacientes.service.ts:54` and `:69`
**Issue:** `create()` logs the entire incoming `CreatePacienteDto` (name, DNI, phone, email, and potentially clinical fields such as `diagnostico`/`tratamiento`) via `console.log('DTO RECIBIDO:', dto)`, and logs the raw Prisma error object via `console.log('ERROR CAPTURADO EN CATCH:', error)`. In production this data typically flows into centralized log aggregation without redaction. For a medical/clinical system this is a real PHI exposure and compliance risk (Argentina's Ley 25.326 / general clinical-data handling expectations), not just a debug artifact.
**Fix:**
```ts
// Remove entirely, or replace with a scoped, PII-free Logger call:
private readonly logger = new Logger(PacientesService.name);
// ...
this.logger.debug(`create() invoked for dni=${dto.dni?.slice(-4)}`); // no full PII
```

### CR-02: Search query and raw errors written to console.log/console.error in `suggest()`

**File:** `backend/src/modules/pacientes/pacientes.service.ts:339`, `:383`, `:388`
**Issue:** `suggest()` logs the raw autocomplete query (`console.log('>>> SUGGEST START', query)` — the query is very often a patient's name or DNI being typed by staff) and logs the full error object on failure (`console.error('❌ ERROR EN SUGGEST:', err)`). Same PHI-exposure concern as CR-01, plus the emoji-prefixed `console.error` is a leftover debug artifact that should not ship.
**Fix:** Remove the three `console.*` calls, or replace with a structured `Logger` call that never includes the raw query/PII, e.g. `this.logger.error('suggest() failed', err.stack)`.

### CR-03: Global `indicacionesLeidasAt` timestamp is displayed as a per-zone "read" confirmation

**File:** `frontend/src/components/crm/EtapaStepper.tsx:227-230`, cross-referenced with `backend/src/modules/pacientes/pacientes.service.ts:745,754`, `backend/src/modules/pacientes/crm-steps.helper.ts:101-108`, and `backend/src/modules/paciente-portal/paciente-portal.service.ts:668-678`
**Issue:** `Paciente.indicacionesLeidasAt` is a **single, patient-level, set-once** column (confirmed in `paciente-portal.service.ts:668-678`: "Set-once + global: the FIRST call stamps `Paciente.indicacionesLeidasAt`"). It is stamped the first time the patient opens **any one** zone's indicaciones link (`PortalIndicaciones.tsx` fires the same global `useAcusarIndicaciones()` mutation for every zone). `computePasosCrm()` treats this field as the **primary** source for `pasos.indicacionesPreop` (`crm-steps.helper.ts:105-108`), and the new phase-62 stepper UI renders it as a green dot plus `"Indicaciones preop · leídas {date}"` (`EtapaStepper.tsx:221-230`).
For a patient with **multiple surgery zones**, opening the indicaciones link for zone A marks the *entire patient* as `indicacionesPreop: 'completo'` — the stepper will show a green "read" indicator with a date even for zone B, whose indications were never opened. For a clinical consent-tracking feature this is a materially misleading signal to staff (and, if relied upon for compliance, to the practice) about which indications were actually reviewed.
**Fix:** Either (a) make `indicacionesLeidasAt` per-zone (store it on `ConsentimientoZona`/`ConsentimientoFirmado` and require all zones' indicaciones to be read before `pasos.indicacionesPreop` reports `'completo'`), or (b) if the global set-once behavior is an intentional simplification, the stepper label should not read as an unqualified "read" confirmation for a specific zone — e.g. drop the per-zone framing or add a caveat when the patient has more than one zone.

## Warnings

### WR-01: `useAcusarIndicaciones()` failures are silently swallowed

**File:** `frontend/src/components/portal/PortalIndicaciones.tsx:89-92`, `frontend/src/hooks/usePortalConsentimiento.ts:73-86`
**Issue:** `handleAbrir` calls `acusar.mutate()` with no `onError` handler, and `useAcusarIndicaciones()` itself defines no `onError`. If the acuse POST fails (network error, 401 expired portal token, 5xx), the patient gets no feedback at all — the link still opens the PDF in a new tab, so the failure is invisible, and `pasos.indicacionesPreop` will silently stay `'pendiente'` server-side.
**Fix:**
```ts
const handleAbrir = () => {
  acusar.mutate(undefined, {
    onError: () => toast.error("No pudimos registrar que abriste las indicaciones. Volvé a intentar."),
  });
};
```

### WR-02: `zone.pdfUrl` rendered as `href` without the protocol allow-list applied to `indicacionesUrl`

**File:** `frontend/src/components/portal/PortalConsentimiento.tsx:155-164`
**Issue:** The same GET response that returns `indicacionesUrl` (guarded with `/^https?:\/\//i` in `PortalIndicaciones.tsx:20-23` as "defense-in-depth on top of the server-side validation") also returns `pdfUrl`, which is used directly as `<a href={zone.pdfUrl}>` with no equivalent client-side guard. Both fields originate from the same server payload and the same trust boundary; treating one as needing defense-in-depth and the other as unconditionally safe is an inconsistent security posture. If a future change ever lets `pdfUrl` be influenced by unsanitized input (e.g. a different storage provider, a redirect param), this path has no client-side backstop.
**Fix:** Apply the same `^https?:\/\//` guard to `pdfUrl` before using it as `href`, or extract a shared `isSafeHttpUrl()` helper used by both fields.

### WR-03: `PacientesService.search()` is dead code and unlike `suggest()` has no tenant scoping

**File:** `backend/src/modules/pacientes/pacientes.service.ts:260-323` (compare to `suggest()` at `:330-392`)
**Issue:** `search()` (labeled "RF-008 — Búsqueda avanzada") is not wired to any route in `pacientes.controller.ts` (verified — no `@Get`/`@Post` decorator calls it anywhere in the codebase), so it is currently unreachable dead code. More importantly, if/when it is wired up, it has **no `profesionalId` filter** at all — unlike its sibling `suggest()`, which explicitly supports scoping results with `Prisma.sql\`AND p."profesionalId" = ${profesionalId}\``. Shipping this method as-is (e.g. exposed later behind a generic search route) would leak all patients across all professionals in this multi-tenant system, violating the project's multi-tenant/role requirement (CLAUDE.md "Mantener multi-tenant/roles cuando aplique").
**Fix:** Either delete the unused method, or bring it in line with `suggest()` by adding an optional `profesionalId` scope before it is wired to a controller route.

### WR-04: Patient section-update handlers accept `data: any` with inconsistent/partial validation

**File:** `backend/src/modules/pacientes/pacientes.service.ts:419-531` (`updateContacto`, `updateEmergencia`, `updateCobertura`, `updateClinica`, `updateEstado`, `updatePersonales`)
**Issue:** The file's own comment on `EMAIL_SHAPE` (line 38-41) notes there is no global `ValidationPipe`, so DTO decorators are inert and each handler must manually validate. Several of these handlers don't follow that discipline: `updateClinica` persists `alergias`/`condiciones` straight from `data.alergias ?? []` / `data.condiciones ?? []` without checking they are arrays; `updateCobertura` doesn't validate `plan`; `updateEstado` writes `data.estado` directly into the `estado` column with no allow-list check against the `EstadoPaciente` enum. A malformed section-update payload can either persist bad data or throw an unhandled Prisma error that surfaces as a raw 500.
**Fix:** Add the same kind of explicit runtime checks already used for `updateContacto`/`updateEmergencia` (or better, enable a per-route `ValidationPipe` with proper DTOs per section, consistent with the pattern already used in `paciente-portal` module's `FirmarConsentimientoPortalDto`).

## Info

### IN-01: Duplicate URL-safety guard between parent filter and child component

**File:** `frontend/src/components/portal/PortalIndicaciones.tsx:20-23` and `:73-78`
**Issue:** The `^https?:\/\//i` regex check on `zone.indicacionesUrl` is duplicated verbatim: once in the `zonasConIndicaciones` filter in `PortalIndicaciones()`, and again inside `IndicacionesLink`. Any future change to the guard (e.g. tightening to a specific host allow-list) risks being applied in only one place.
**Fix:** Extract a small `isSafeHttpUrl(url: string | null): url is string` helper shared by both call sites (and reused by `PortalConsentimiento.tsx` per WR-02).

### IN-02: Unvalidated date parsing can render "Invalid Date" to patients/staff

**File:** `frontend/src/components/crm/EtapaStepper.tsx:228-229`
**Issue:** `` `· leídas ${new Date(indicacionesLeidasAt).toLocaleDateString("es-AR")}` `` does not check that `indicacionesLeidasAt` parses to a valid `Date` before formatting. If the backend ever sends a malformed value, `new Date(...).toLocaleDateString()` renders the literal string `"Invalid Date"` in the CRM UI.
**Fix:**
```ts
const leidasDate = indicacionesLeidasAt ? new Date(indicacionesLeidasAt) : null;
const leidasLabel = leidasDate && !isNaN(leidasDate.getTime())
  ? ` · leídas ${leidasDate.toLocaleDateString("es-AR")}`
  : "";
```

---

_Reviewed: 2026-07-21T15:49:08Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
