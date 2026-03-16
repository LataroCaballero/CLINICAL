---
phase: 06-crm-data-wiring-fixes
verified: 2026-03-02T23:10:00Z
status: passed
score: 4/4 must-haves verified
re_verification: false
---

# Phase 06: CRM Data Wiring Fixes — Verification Report

**Phase Goal:** Los tres gaps de datos criticos del audit v1.0 quedan cerrados: `registradoPorId` se escribe en cada `ContactoLog` para habilitar atribucion real por coordinador, y `PROCEDIMIENTO_REALIZADO` aparece en el embudo de conversion del dashboard.
**Verified:** 2026-03-02T23:10:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Al crear un ContactoLog via POST /pacientes/:id/contactos, el campo `registradoPorId` queda persistido con el userId del llamante | VERIFIED | `pacientes.controller.ts` line 123: `const registradoPorId = req.user?.userId as string | undefined;` passed as 4th arg; `pacientes.service.ts` line 785: `registradoPorId: registradoPorId ?? null` in `tx.contactoLog.create()` data block |
| 2 | `getCoordinatorPerformance()` retorna filas reales por coordinador, no solo la fila Sin asignar | VERIFIED | `crm-dashboard.service.ts` lines 199-251: fetches `registradoPorId` from `contactoLog`, groups by `log.registradoPorId ?? 'sin-asignar'`, joins `registradoPor` user for `nombre`. Real attribution rows will appear for new ContactoLogs created after this fix. |
| 3 | El embudo de conversion incluye `PROCEDIMIENTO_REALIZADO` entre `PRESUPUESTO_ENVIADO` y `CONFIRMADO` | VERIFIED | `crm-dashboard.service.ts` lines 5-12: `ETAPAS_FUNNEL` array contains `EtapaCRM.PROCEDIMIENTO_REALIZADO` at position 4 (index), between `PRESUPUESTO_ENVIADO` (index 3) and `CONFIRMADO` (index 5). |
| 4 | `CRMFunnelWidget` muestra el label "Procedimiento realizado" para esa etapa | VERIFIED | `CRMFunnelWidget.tsx` line 11: `PROCEDIMIENTO_REALIZADO: "Procedimiento realizado"` present in `ETAPAS_LABELS`. Fallback `ETAPAS_LABELS[etapa.etapa] ?? etapa.etapa` at line 75 will never fall back for this stage. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Level 1: Exists | Level 2: Substantive | Level 3: Wired | Status |
|----------|---------|----------------|---------------------|---------------|--------|
| `backend/src/modules/pacientes/pacientes.controller.ts` | Extraction of `req.user.userId` passed as 4th arg to `createContacto()` | Yes | Yes — line 123 extracts `registradoPorId`, line 124 passes as 4th arg | Yes — called in POST `:id/contactos` handler, wired to service | VERIFIED |
| `backend/src/modules/pacientes/pacientes.service.ts` | Write of `registradoPorId` to Prisma data block in `createContacto()` | Yes | Yes — lines 770 signature has `registradoPorId?: string`, line 785 writes `registradoPorId: registradoPorId ?? null` | Yes — called from controller with 4th arg, writes to `tx.contactoLog.create()` | VERIFIED |
| `backend/src/modules/reportes/services/crm-dashboard.service.ts` | `PROCEDIMIENTO_REALIZADO` in `ETAPAS_FUNNEL` between `PRESUPUESTO_ENVIADO` and `CONFIRMADO` | Yes | Yes — line 10: `EtapaCRM.PROCEDIMIENTO_REALIZADO` at correct position in constant array | Yes — `ETAPAS_FUNNEL` drives `getFunnelSnapshot()` at line 65 via `.map()` | VERIFIED |
| `frontend/src/app/dashboard/components/CRMFunnelWidget.tsx` | Display label for `PROCEDIMIENTO_REALIZADO` stage | Yes | Yes — line 11: `PROCEDIMIENTO_REALIZADO: "Procedimiento realizado"` in `ETAPAS_LABELS` | Yes — `ETAPAS_LABELS[etapa.etapa]` used at line 75 in JSX render loop | VERIFIED |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `pacientes.controller.ts` | `pacientes.service.ts` | 4th argument `registradoPorId` passed to `createContacto()` | WIRED | Line 124: `this.pacientesService.createContacto(pacienteId, profesionalId, dto, registradoPorId)` — matches required pattern. `registradoPorId` extracted at line 123 from `req.user?.userId`. |
| `pacientes.service.ts` | `prisma.contactoLog.create()` | `registradoPorId` in Prisma data block | WIRED | Line 785: `registradoPorId: registradoPorId ?? null` inside `tx.contactoLog.create({ data: { ... } })`. Field backed by schema FK to `Usuario` with `onDelete: SetNull` (schema.prisma lines 1045-1046). |
| `crm-dashboard.service.ts` | funnel query result | `ETAPAS_FUNNEL` constant drives the WHERE clause | WIRED | `ETAPAS_FUNNEL` at lines 5-12 is consumed by `getFunnelSnapshot()` line 65 via `ETAPAS_FUNNEL.map((etapa) => ({ etapa, count: countMap.get(etapa) ?? 0 }))`. `PROCEDIMIENTO_REALIZADO` at index 4 between `PRESUPUESTO_ENVIADO` and `CONFIRMADO`. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| LOG-01 | 06-01-PLAN.md | El coordinador puede registrar una interaccion con un paciente con fecha, tipo y nota | SATISFIED | `createContacto()` in service now writes `registradoPorId` from the calling user's JWT payload. Every new `ContactoLog` will have coordinator attribution. |
| DASH-05 | 06-01-PLAN.md | El coordinador ve su performance de seguimiento: interacciones registradas, pacientes contactados esta semana | SATISFIED | `getCoordinatorPerformance()` groups `contactoLog` rows by `registradoPorId` (line 223). Once `registradoPorId` is populated (via LOG-01 fix), this produces per-coordinator breakdown instead of all rows under "Sin asignar". Backend and frontend widget are fully implemented. |
| DASH-01 | 06-01-PLAN.md | El profesional ve el embudo de conversion con cantidad de pacientes por etapa CRM y tasa de paso entre etapas | SATISFIED | `PROCEDIMIENTO_REALIZADO` added to `ETAPAS_FUNNEL` (backend) and `ETAPAS_LABELS` (frontend). The complete 6-stage funnel `NUEVO_LEAD → TURNO_AGENDADO → CONSULTADO → PRESUPUESTO_ENVIADO → PROCEDIMIENTO_REALIZADO → CONFIRMADO` is now visible. |

No orphaned requirements: REQUIREMENTS.md traceability table maps LOG-01, DASH-05, and DASH-01 exclusively to Phase 6, and all three are claimed in the plan frontmatter.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `CRMFunnelWidget.tsx` | 31 | `return null` | Info | Loading state guard when `data` is undefined — correct behavior, not a stub. Not a blocker. |

No blockers. No stub implementations. No TODO/FIXME comments in any of the four modified files.

### Human Verification Required

#### 1. Coordinator Attribution in Production Data

**Test:** Log a new ContactoLog for a patient (POST /pacientes/:id/contactos) as a SECRETARIA or PROFESIONAL user. Then query GET /reportes/crm (coordinator performance) for the same period.
**Expected:** The coordinator performance table shows the calling user's name with at least 1 interaction logged. The "Sin asignar" row does not appear for new contacts (only for pre-existing historical rows).
**Why human:** Requires a live JWT session and database state to confirm end-to-end. Cannot verify `req.user.userId` propagation through the auth guard stack without running the server.

#### 2. Funnel Stage Rendering in Dashboard UI

**Test:** Navigate to the dashboard as a PROFESIONAL. Check the CRM funnel widget.
**Expected:** The funnel shows "Procedimiento realizado" as the 5th stage bar between "Presupuesto enviado" and "Confirmado". If any patients are in `PROCEDIMIENTO_REALIZADO` CRM stage, their count appears in that bar. If none exist, the bar shows count 0 with a properly labeled entry.
**Why human:** Visual rendering and stage ordering require browser inspection. Cannot verify UI layout from code alone.

### Gaps Summary

No gaps. All four must-haves are verified at all three levels (exists, substantive, wired). All three requirement IDs from the plan frontmatter are satisfied with direct code evidence.

**Known limitation (by design, not a gap):** Historical `ContactoLog` rows with `registradoPorId = null` will continue to appear under "Sin asignar" in `CoordinatorPerformanceWidget`. This is the explicit STATE.md design decision — no backfill was intended. Only new ContactoLogs created after commit `be7a961` will have coordinator attribution.

---

_Verified: 2026-03-02T23:10:00Z_
_Verifier: Claude (gsd-verifier)_
