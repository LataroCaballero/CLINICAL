---
phase: 62-portal-staff-frontend-gate-de-firma-secciones-separadas-y-si
verified: 2026-07-21T15:54:23Z
status: human_needed
score: 21/21 must-haves verified (automated)
overrides_applied: 0
human_verification:
  - test: "Abrir el portal del paciente, expandir 'Consentimiento', confirmar visualmente que el botón de firma está deshabilitado hasta abrir el PDF y tildar el checkbox 'Leí el consentimiento'; confirmar que no aparece ningún link/checkbox de indicaciones en esta sección."
    expected: "Botón deshabilitado con ambas condiciones pendientes; sección sin rastro de indicaciones; firma funciona end-to-end una vez cumplidas ambas condiciones + firma dibujada."
    why_human: "Comportamiento visual/interactivo de un componente cliente — no verificable sólo por grep/build."
  - test: "Expandir la sección 'Indicaciones' del portal, hacer click en el link de indicaciones y confirmar en Network que se dispara POST /paciente-portal/public/indicaciones/acuse; confirmar que sin indicacionesUrl cargada se muestra el empty state y no se dispara ningún request."
    expected: "Request POST disparado al click, respuesta 200; empty state sin request cuando no hay indicacionesUrl."
    why_human: "Requiere inspección de Network tab del browser — no verificable estáticamente."
  - test: "Abrir el sheet de un paciente con indicaciones leídas en el board CRM y confirmar que el sub-indicador 'Indicaciones preop' muestra la fecha en formato es-AR; acusar indicaciones desde el portal (otra pestaña) y, sin recargar el board, volver el foco a la pestaña del board y confirmar que el dot pasa a verde con la fecha visible."
    expected: "Fecha visible en el stepper; board se refresca solo al recuperar foco, sin F5 manual."
    why_human: "Comportamiento de refetch-on-focus y estado visual del stepper requieren interacción real de browser con dos pestañas."
  - test: "DECISIÓN DE PRODUCTO REQUERIDA (hallazgo CR-03 del code review 62-REVIEW.md): `Paciente.indicacionesLeidasAt` es un campo global/set-once a nivel paciente (heredado de Phase 61), pero el nuevo stepper de esta fase lo muestra como si confirmara la lectura de indicaciones de la zona específica en pantalla. Para pacientes con múltiples zonas de cirugía, abrir el link de indicaciones de la zona A marca el paciente entero como 'completo', y el stepper mostrará 'Indicaciones preop · leídas {fecha}' en verde también para la zona B, cuyas indicaciones nunca se abrieron. Confirmar si este comportamiento es aceptable (caso de uso: mayoría de pacientes de una sola zona) o si requiere un plan de cierre para desambiguar el mensaje/derivación en pacientes multi-zona."
    expected: "Decisión explícita: aceptar como limitación conocida (agregar override) o crear plan de gap-closure."
    why_human: "Juicio de producto/legal sobre precisión de un indicador clínico — no es un defecto de código, es un gap de diseño heredado de una decisión de Phase 61 (INDIC-04) recién hecho visible por el nuevo stepper de Phase 62."
  - test: "Confirmar si el fallo silencioso de `useAcusarIndicaciones()` (hallazgo WR-01 del code review: sin `onError`, sin toast) es aceptable para v1.14 o requiere manejo de error visible al paciente."
    expected: "Decisión explícita: aceptar (backend reintentable, próximo click reintenta) o agregar manejo de error."
    why_human: "Trade-off de UX/confiabilidad — el link igual abre el PDF aunque el acuse falle, por lo que el paciente no percibe el fallo; requiere criterio de producto sobre si esto es aceptable para el registro legal de INDIC-02."
---

# Phase 62: Portal + Staff Frontend — Gate de Firma, Secciones Separadas y Sincronización — Verification Report

**Phase Goal:** El portal del paciente presenta consentimiento e indicaciones como secciones independientes con los gates correctos; el staff ve el estado de indicaciones en el stepper del sheet; y el board CRM refleja los cambios completados desde el portal sin recarga manual.
**Verified:** 2026-07-21T15:54:23Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | El paciente no puede firmar sin haber abierto su PDF — botón deshabilitado hasta abrirlo | ✓ VERIFIED | `PortalConsentimiento.tsx:159` `onClick={() => setPdfAbierto(true)}` on PDF `<a>`; `:208-214` `disabled={ !pdfAbierto \|\| !leiConsentimiento \|\| canvasEmpty \|\| isSubmitting \|\| !canvasSupported }` |
| 2 | Además debe marcar "Leí el consentimiento" para habilitar la firma | ✓ VERIFIED | `PortalConsentimiento.tsx:167-177` checkbox bound to `leiConsentimiento` state, included in `disabled` condition above |
| 3 | Sección de consentimiento muestra sólo PDFs por zona, sin indicaciones | ✓ VERIFIED | `grep -c "indicacionesLeidas\|indicacionesUrl" PortalConsentimiento.tsx` = 0; no indicaciones link/checkbox block remains (confirmed by full file read) |
| 4 | Indicaciones en sección propia, separada; abrirlas dispara acuse automáticamente sin paso extra | ✓ VERIFIED | `page.tsx:365-379` `AccordionItem value="indicaciones"` distinct from `value="consentimiento"` (line 350-363); `PortalIndicaciones.tsx:89-92` `handleAbrir` calls `acusar.mutate()` in the link's `onClick` |
| 5 | Stepper/sheet del staff muestra si el paciente leyó indicaciones, con fecha | ✓ VERIFIED | `EtapaStepper.tsx:228-229` `` {indicacionesLeidasAt && ` · leídas ${new Date(indicacionesLeidasAt).toLocaleDateString("es-AR")}`} ``; `CardActionsSheet.tsx:166` threads `indicacionesLeidasAt={patient.indicacionesLeidasAt}` |
| 6 | Board CRM refleja cambios sin recarga manual (refetch on window focus en `['crm-kanban']`) | ✓ VERIFIED | `useCRMKanban.ts:98,108-109` `queryKey: ["crm-kanban", profesionalId]`, `staleTime: 0`, `refetchOnWindowFocus: true` |

**Score:** 6/6 roadmap success criteria verified

### PLAN-level Must-Have Truths (all 3 plans)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| P1-1 | Firma deshabilitada hasta pdfAbierto && leiConsentimiento | ✓ VERIFIED | See SC#1/2 above |
| P1-2 | Sección consentimiento sin link/checkbox de indicaciones | ✓ VERIFIED | See SC#3 |
| P1-3 | Payload firmarConsentimiento sin indicacionesLeidas | ✓ VERIFIED | `usePortalConsentimiento.ts:31-36` interface has only `zonaId`/`signaturePngDataUrl`; `PortalConsentimiento.tsx:103-106` mutateAsync call matches |
| P1-4 | Firma funciona end-to-end una vez satisfechas ambas condiciones + firma dibujada | ✓ VERIFIED | `handleFirmar` (lines 89-120) unchanged flow besides payload; `npm run build` exit 0 |
| P1-5 (D-01) | Firma se habilita sólo con pdfAbierto && leiConsentimiento, reemplaza gate legacy | ✓ VERIFIED | Confirmed, `!indicacionesLeidas` gate fully removed (grep 0 matches) |
| P1-6 (D-02) | Checkbox legacy de indicaciones eliminado del ZoneCard + sección consentimiento sin indicaciones (CONS-12) | ✓ VERIFIED | Full-file read confirms no indicaciones content remains |
| P1-7 (D-06) | useAcusarIndicaciones definido (POST acuse vía portalApi, set-once) | ✓ VERIFIED | `usePortalConsentimiento.ts:73-86` |
| P2-1 | 5ª sección "Indicaciones" separada de "Consentimiento" | ✓ VERIFIED | `page.tsx` SECCIONES array + two distinct AccordionItems |
| P2-2 | Lista indicacionesUrl del response de consentimiento, sin endpoint nuevo | ✓ VERIFIED | `PortalIndicaciones.tsx:51` reuses `useConsentimientosParaFirmar(true)`; backend confirmed field origin at `paciente-portal.service.ts:459` |
| P2-3 | Click dispara POST indicaciones/acuse automáticamente | ✓ VERIFIED | `onClick={onAbrir}` → `acusar.mutate()` |
| P2-4 | Sin indicacionesUrl → empty state, sin acuse | ✓ VERIFIED | `PortalIndicaciones.tsx:81-87` early return before any mutate call |
| P2-5 | href guardado por ^https?:// | ✓ VERIFIED | `PortalIndicaciones.tsx:20-23` and `:73-78` (duplicated, see IN-01 below) |
| P3-1 (D-08) | getKanban expone indicacionesLeidasAt en el .map | ✓ VERIFIED | `pacientes.service.ts:745` sibling of `flujo` (line 743) |
| P3-2 | KanbanPatient tipa indicacionesLeidasAt: string \| null | ✓ VERIFIED | `useCRMKanban.ts:63` |
| P3-3 (D-09) | Stepper muestra fecha (es-AR) cuando != null | ✓ VERIFIED | See SC#5 |
| P3-4 | Dot verde/naranja sigue gobernado por pasos.indicacionesPreop | ✓ VERIFIED | `EtapaStepper.tsx:221-223` unchanged; `indicacionesLeidasAt` only affects the trailing date text |
| P3-5 (D-10) | refetchOnWindowFocus:true + staleTime bajo (0-5000) | ✓ VERIFIED | `staleTime: 0`, `refetchOnWindowFocus: true` |
| P3-6 (D-11) | queryKey ['crm-kanban', profesionalId] sin cambios | ✓ VERIFIED | Unchanged |

**Score:** 21/21 automated must-haves verified (6 roadmap SCs + 15 plan-specific truths, some overlapping)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/hooks/usePortalConsentimiento.ts` | Payload sin indicacionesLeidas + useAcusarIndicaciones | ✓ VERIFIED | Exports `useFirmarConsentimiento`, `useAcusarIndicaciones`, `useConsentimientosParaFirmar`; clean payload interface |
| `frontend/src/components/portal/PortalConsentimiento.tsx` | Doble gate, sin indicaciones | ✓ VERIFIED | `pdfAbierto`/`leiConsentimiento` states present; 0 matches for `indicacionesLeidas` |
| `frontend/src/components/portal/PortalIndicaciones.tsx` | Sección net-new con fetch reusado + acuse on-click + empty state | ✓ VERIFIED | 101 lines, `useAcusarIndicaciones` present, `^https?` guard present, no `SignaturePad`/`consentimiento/firmar` |
| `frontend/src/app/portal/[token]/page.tsx` | AccordionItem 'indicaciones' + entrada en SECCIONES | ✓ VERIFIED | `SECCIONES` includes `id: "indicaciones"`; `AccordionItem value="indicaciones"` renders `<PortalIndicaciones />` |
| `backend/src/modules/pacientes/pacientes.service.ts` | indicacionesLeidasAt en el .map de getKanban | ✓ VERIFIED | Line 745, sibling of `flujo` |
| `frontend/src/hooks/useCRMKanban.ts` | Campo tipado + refetchOnWindowFocus + staleTime bajo | ✓ VERIFIED | Lines 63, 108-109 |
| `frontend/src/components/crm/EtapaStepper.tsx` | Render de fecha en sub-indicador | ✓ VERIFIED | Lines 228-229 |
| `frontend/src/components/crm/CardActionsSheet.tsx` | Thread de indicacionesLeidasAt a EtapaStepper | ✓ VERIFIED | Line 166 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `PortalConsentimiento.tsx` | `useFirmarConsentimiento` | `mutateAsync({zonaId, signaturePngDataUrl})` | ✓ WIRED | No `indicacionesLeidas` field in call |
| `PortalConsentimiento.tsx` firma button | gate state | `disabled = !pdfAbierto \|\| !leiConsentimiento \|\| ...` | ✓ WIRED | Confirmed exact condition |
| `PortalIndicaciones.tsx` | `useConsentimientosParaFirmar` | reuso del GET /consentimiento existente (D-04) | ✓ WIRED | No new endpoint created; confirmed real backend field `indicacionesUrl` (paciente-portal.service.ts:459) |
| `PortalIndicaciones.tsx` | `useAcusarIndicaciones` | onClick del `<a href={safeIndicacionesUrl}>` | ✓ WIRED | `IndicacionesLink` receives `onAbrir` prop wired to `acusar.mutate()` |
| `page.tsx` | `PortalIndicaciones` | AccordionItem value=indicaciones | ✓ WIRED | Confirmed |
| backend getKanban `.map` | `KanbanPatient.indicacionesLeidasAt` | campo expuesto en el objeto de respuesta | ✓ WIRED | `indicacionesLeidasAt: p.indicacionesLeidasAt` |
| `CardActionsSheet.tsx` | `EtapaStepper` | prop `indicacionesLeidasAt={patient.indicacionesLeidasAt}` | ✓ WIRED | Confirmed |
| `useCRMKanban` query | board freshness | `refetchOnWindowFocus:true` + `staleTime` bajo | ✓ WIRED | Confirmed |
| backend `paciente-portal.controller.ts` | `POST indicaciones/acuse` route | Portal JWT reads pacienteId, no `@Body` | ✓ WIRED | Confirmed route exists at line 173, matches hook's call signature (no body) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `PortalIndicaciones.tsx` | `data` (zones) | `useConsentimientosParaFirmar` → `GET /paciente-portal/public/consentimiento` → `paciente-portal.service.ts` real Prisma query with real `indicacionesUrl` per zone | Yes | ✓ FLOWING |
| `EtapaStepper.tsx` | `indicacionesLeidasAt` | `CardActionsSheet` → `patient.indicacionesLeidasAt` → `useCRMKanban` query → `GET /pacientes/kanban` → `pacientes.service.ts getKanban` real Prisma select (line 662) | Yes | ✓ FLOWING |
| board board sync | `crm-kanban` query | `useQuery` with real `queryFn` hitting backend, not a static value | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Backend builds clean | `cd backend && npm run build` | exit 0 | ✓ PASS |
| Frontend builds clean (Node 20) | `cd frontend && nvm use 20 && npm run build` | exit 0, 33 routes generated incl. `/portal/[token]` | ✓ PASS |
| Backend route exists for acuse | `grep "@Post('indicaciones/acuse')" paciente-portal.controller.ts` | Found at line 173 | ✓ PASS |
| No `indicacionesLeidas` residue in consentimiento files | `grep -c "indicacionesLeidas" PortalConsentimiento.tsx usePortalConsentimiento.ts` | 0 both | ✓ PASS |
| All claimed commits exist in git history | `git log --oneline` | d9b26f1, 601d6ea, c2215fd, d90c474, d522b70, 975698b all found | ✓ PASS |

*Runtime interaction (opening the portal in a browser, watching Network requests, refocusing a tab) could not be executed by this verifier — those items are listed under Human Verification.*

### Probe Execution

SKIPPED (no probe scripts declared or found under `scripts/*/tests/probe-*.sh`, and none referenced in PLAN/SUMMARY files for this phase).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| CONS-09 | 62-01 | Botón de firma deshabilitado hasta abrir el PDF | ✓ SATISFIED | `pdfAbierto` gate |
| CONS-10 | 62-01 | Checkbox "Leí el consentimiento" requerido | ✓ SATISFIED | `leiConsentimiento` gate |
| CONS-12 | 62-01 | Sección de consentimiento sin contenido de indicaciones | ✓ SATISFIED | Full file read, 0 grep matches |
| INDIC-01 | 62-02 | Indicaciones en sección propia separada | ✓ SATISFIED | Distinct AccordionItem |
| INDIC-02 | 62-02 | Acuse automático al abrir, sin firma dibujada | ✓ SATISFIED | `onClick` → `mutate()`, no signature pad in file. *Caveat: silent-failure UX (WR-01), see human verification.* |
| INDIC-05 | 62-03 | Staff ve fecha de lectura en stepper | ✓ SATISFIED | Rendered in `EtapaStepper.tsx`. *Caveat: field is patient-level/global, not per-zone (CR-03), see human verification.* |
| EMBUDO-06 | 62-03 | Board refleja cambios sin recarga manual | ✓ SATISFIED | `refetchOnWindowFocus: true`, `staleTime: 0` |

No orphaned requirements — REQUIREMENTS.md traceability table maps CONS-09/10/12, INDIC-01/02/05, EMBUDO-06 to Phase 62 exclusively; CONS-11, INDIC-03, INDIC-04 are correctly attributed to Phase 61 and are out of scope here.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/src/app/portal/[token]/page.tsx` | 349 | Stale comment `{/* 3. Consentimiento — placeholder (Phase 56) */}` | ℹ️ Info | Misleading comment only — `PortalConsentimiento` is fully implemented, not a stub. No functional impact. |
| `frontend/src/app/portal/[token]/page.tsx` | 56 | Comment `// Active section tracker for "Paso X de 4"` is stale (now 5 sections) | ℹ️ Info | Cosmetic comment drift only; the actual "Paso X de N" logic correctly derives from `SECCIONES.length` (confirmed no hardcoded "4"). |
| `frontend/src/components/crm/EtapaStepper.tsx` (via 62-REVIEW.md CR-03) | 221-230 | `pasos.indicacionesPreop` / `indicacionesLeidasAt` is a patient-level global field displayed as if per-zone in a multi-zone-capable UI | ⚠️ Warning | Legitimate, already-flagged (code review) product-correctness gap for multi-zone patients. Not introduced as a new bug by this phase's code (the field's global/set-once semantics were defined in Phase 61 INDIC-04); this phase's contribution is exposing it for display exactly as specified in its own must-haves. Routed to human decision below. |
| `frontend/src/components/portal/PortalIndicaciones.tsx` (via 62-REVIEW.md WR-01) | 89-92 | `acusar.mutate()` called with no `onError` handler | ⚠️ Warning | If the acuse POST fails (network/auth error), the patient gets no feedback and the link still opens — failure is invisible. Routed to human decision below. |
| `backend/src/modules/pacientes/pacientes.service.ts` (pre-existing, via 62-REVIEW.md CR-01/CR-02) | 54, 69, 339, 383, 388 | PII/PHI logged via `console.log`/`console.error` in `create()`/`suggest()` | 🛑 Blocker-severity but **out of phase-62 scope** | These lines predate Phase 62 and are in methods (`create()`, `suggest()`) not touched by this phase's diff (which only added line 745 to `getKanban`'s `.map`). Not a Phase 62 regression — flagged here for visibility only, does not block this phase's goal. Recommend a dedicated cleanup plan. |

No unreferenced `TBD`/`FIXME`/`XXX` debt markers found in any of the 8 files modified by this phase.

### Human Verification Required

See YAML frontmatter `human_verification` for the structured list. Summary:

1. **Visual/interactive UAT of the double gate** (open PDF → checkbox → firma) — deferred to phase checkpoint per plan `<verification>` sections.
2. **Network-level UAT of the acuse trigger** (click → POST fires; empty state → no request) — deferred to phase checkpoint.
3. **Cross-tab UAT of board refetch-on-focus** — deferred to phase checkpoint.
4. **Product decision on CR-03** (multi-zone `indicacionesLeidasAt` displayed as if per-zone) — surfaced by `62-REVIEW.md`, unresolved (no fix commit found after the review was written at 2026-07-21T15:49:08Z).
5. **Product decision on WR-01** (silent acuse failure, no error feedback to patient) — surfaced by `62-REVIEW.md`, unresolved.

### Gaps Summary

No automated must-have failed. All 6 roadmap Success Criteria and all 15 plan-level must-have truths are verified in the actual codebase (not just claimed in SUMMARY.md) — code reads, greps, both `npm run build`s (backend + frontend, exit 0), and git log all corroborate the SUMMARY claims. Data flows end-to-end from real Prisma queries through to the UI in both the portal (indicaciones URL, acuse) and the staff board (indicacionesLeidasAt).

The reason this is not marked `passed` is twofold, per the decision tree in the verification process (human_needed takes priority over passed even when the score is N/N):

1. Each plan's own `<verification>` section explicitly defers browser-interactive UAT (opening the portal, watching Network tab, cross-tab focus behavior) to "checkpoint de fase" — this is exactly the kind of item that requires human testing and was never claimed to be automatable.
2. `62-REVIEW.md` (generated during this same phase, at 2026-07-21T15:49:08Z, status `issues_found`) flagged two findings — CR-03 (multi-zone `indicacionesLeidasAt` semantics shown as per-zone) and WR-01 (silent acuse failure) — that are directly relevant to the exact features this phase built (INDIC-05, INDIC-02) and have no fix commit after the review timestamp. These are legitimate escalation-worthy items: not code bugs invalidating the stated must-haves (the must-haves as literally written do not require per-zone accuracy or error handling), but real product/UX gaps a developer should explicitly accept or route to a gap-closure plan before considering the milestone fully closed.

---

_Verified: 2026-07-21T15:54:23Z_
_Verifier: Claude (gsd-verifier)_
