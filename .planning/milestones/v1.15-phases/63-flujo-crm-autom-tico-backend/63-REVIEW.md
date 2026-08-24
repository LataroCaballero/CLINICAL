---
phase: 63-flujo-crm-autom-tico-backend
reviewed: 2026-07-31T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - backend/src/modules/historia-clinica/historia-clinica.flujo.helpers.ts
  - backend/src/modules/historia-clinica/historia-clinica.flujo.spec.ts
  - backend/src/modules/historia-clinica/historia-clinica.service.ts
  - backend/src/modules/pacientes/pacientes.service.spec.ts
  - backend/src/modules/pacientes/pacientes.service.ts
  - backend/src/modules/turnos/turnos.service.spec.ts
  - backend/src/modules/turnos/turnos.service.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 63: Code Review Report

**Reviewed:** 2026-07-31
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Reviewed the phase 63 CRM funnel automation changes: patient-create defaults
(`etapaCRM=NUEVO_LEAD`, `flujo=null`), HC-entry-driven `flujo`/`etapaCRM`
transitions, the selective etapa-degradation guard on `crearTurno`, the surgery
lifecycle writes on `crearTurnoCirugia`/`cancelarTurno`, and the recontacto
branch added to `getListaAccion`.

The transaction handling in `crearTurnoCirugia` (single tx, no nested tx) and
`cancelarTurno` (batch `$transaction` array) is correct, and the new pure helper
`resolverTipoEntrada` is well-tested. No security vulnerabilities or data-loss
risks were found (0 Critical).

However, the change to seed new patients with `flujo=null` interacts poorly with
two `=== 'PENDIENTE'` gates that were **not** updated in lock-step, silently
disabling turno/HC-driven `flujo` classification for every newly created lead
(WR-02). A business-critical branch also depends on an exact display-name string
match (WR-01), and a debug `console.log` that dumps full error objects remains in
the patient-create error path (WR-03).

## Warnings

### WR-01: Cyclic-funnel reset depends on hardcoded display name `'Consulta'`

**File:** `backend/src/modules/turnos/turnos.service.ts:147`
**Issue:** The guard that decides whether a new turno resets an advanced etapa
(`CONFIRMADO`/`PROCEDIMIENTO_REALIZADO`) back to `TURNO_AGENDADO` keys off
`tipoTurno.nombre === 'Consulta'`. This is a magic string comparing against a
user-editable display name. Any variation — different casing (`'consulta'`),
accent/whitespace, a renamed or additional consultation type
(`'Consulta inicial'`, `'Primera consulta'`) — silently breaks the "cirugía
cíclica restarts with a Consulta" business rule. Note the surgery `tipoTurno` is
auto-created with `nombre: 'Cirugía'` (line 747), showing names are treated as
data, not stable identifiers.
**Fix:** Match on a stable schema attribute rather than the display label. E.g.
add a boolean/enum flag on `TipoTurno` (mirroring the existing `esCirugia`
column) and test `tipoTurno.esConsulta === true`, or gate on `flujoPaciente`.
```ts
// prefer a schema flag over a display name
const esConsulta = tipoTurno.esConsulta === true; // D-06
```

### WR-02: New leads (`flujo=null`) never receive turno/HC-driven `flujo` classification

**File:** `backend/src/modules/turnos/turnos.service.ts:159-162` and `backend/src/modules/pacientes/pacientes.service.ts:70`
**Issue:** `create()` now seeds every new patient with `flujo: null` (overriding
the schema default `PENDIENTE`). But the turno-type auto-classification in
`crearTurno` only fires when `pacienteCRM?.flujo === FlujoPaciente.PENDIENTE`
(line 161). Since new leads are now `null`, booking a turno whose
`tipoTurno.flujoPaciente` is set (e.g. a surgical-consult type → `CIRUGIA`) no
longer classifies the lead — the branch is effectively dead for all newly
created records. The HC helper `resolverNuevoFlujo` **was** updated to treat
`null` like `PENDIENTE`, but only for `TRATAMIENTO`; `CONSULTA_CIRUGIA + null`
still returns `null` (helpers line 26). Net effect: a brand-new lead can reach
`CONFIRMADO` (via `crearTurnoCirugia`, which sets `etapaCRM` but never `flujo`)
while `flujo` stays `null` forever, and there is no code path that moves a new
lead into `flujo=CIRUGIA`. This asymmetry between the create default and the two
`=== PENDIENTE` gates looks like an oversight rather than a deliberate design.
**Fix:** Decide the intended behavior and make the gates consistent with the new
`null` default. If turno-type classification should apply to new leads, broaden
the condition:
```ts
if (
  tipoTurno.flujoPaciente &&
  (pacienteCRM?.flujo === FlujoPaciente.PENDIENTE || pacienteCRM?.flujo == null)
) { ... }
```
and likewise reconsider the `CONSULTA_CIRUGIA` branch in
`resolverNuevoFlujo`. If `null` leads are intentionally left unclassified,
document it explicitly and remove/annotate the now-unreachable `PENDIENTE` path.

### WR-03: Debug `console.log` dumps full error object in patient-create catch

**File:** `backend/src/modules/pacientes/pacientes.service.ts:76`
**Issue:** This edit removed the `console.log('DTO RECIBIDO:', dto)` at the top
of `create()` but left `console.log('ERROR CAPTURADO EN CATCH:', error)` in the
catch block. This logs the entire Prisma/error object (which can include query
parameters and patient PII) to stdout on every create failure, is inconsistent
with the module's `Logger` usage elsewhere, and is a leftover debug artifact.
**Fix:** Use the injected `Logger` and log a scrubbed message, not the raw error
object:
```ts
} catch (error: any) {
  this.logger.error(`Error al crear paciente: ${error?.code ?? 'unknown'}`);
  if (error.code === 'P2002' && error.meta?.target?.includes('dni')) {
    throw new ConflictException('El DNI ingresado ya está registrado.');
  }
  throw new InternalServerErrorException('Error interno al crear paciente');
}
```
(Note: the same `console.log('>>> SUGGEST ...')` debug artifacts exist at lines
346/390 but are outside this phase's diff.)

## Info

### IN-01: `catch (error: any)` weakens type safety in create()

**File:** `backend/src/modules/pacientes/pacientes.service.ts:75`
**Issue:** The catch binds `error: any`, defeating type checking on the
subsequent `error.code`/`error.meta` access. Pre-existing but in the function
edited this phase.
**Fix:** Type as `unknown` and narrow, or use `Prisma.PrismaClientKnownRequestError`
via `instanceof` before reading `.code`.

### IN-02: `getListaAccion` over-fetches `cirugias` for all patients

**File:** `backend/src/modules/pacientes/pacientes.service.ts:935-937`
**Issue:** The `cirugias` include has no `where`, so every returned patient loads
all surgery rows even though `requiereRecontacto` is only meaningful for the
`CONFIRMADO` recontacto branch. Correctness is fine (the JS recompute mirrors the
where clause), but the recomputation duplicates the DB filter logic — future
edits must keep both in sync. Consider scoping the include
(`where: { estado: { in: [...] } }`) or deriving `requiereRecontacto` from a
narrower selection to keep the two branches from drifting.

---

_Reviewed: 2026-07-31_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
