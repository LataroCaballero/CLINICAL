# Phase 57: Backend Foundation — Etapa y Payload Enriquecido - Pattern Map

**Mapped:** 2026-07-03
**Files analyzed:** 6 (2 new, 4 modified)
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/src/modules/pacientes/pacientes.service.ts` (MODIFY — extend `getKanban` @619) | service | CRUD / read-aggregation | itself (existing `getKanban`) | exact (self-extension) |
| `backend/src/modules/pacientes/cirugia-realizada-scheduler.service.ts` (NEW) | service (scheduler) | batch / scheduled (daily cron) | `backend/src/modules/pacientes/seguimiento-scheduler.service.ts` | exact |
| `backend/src/modules/pacientes/pacientes.module.ts` (MODIFY — register new scheduler) | config / module | — | itself (current `SeguimientoSchedulerService` registration) | exact |
| `backend/src/modules/turnos/turnos.service.ts` (MODIFY — bypass guard @~162) | service | request-response / CRUD | itself (existing `crearTurno`) | exact (self-edit) |
| `backend/src/modules/pacientes/crm-steps.helper.ts` (NEW — optional, Claude's discretion for step-state computation) | utility | transform | `backend/src/modules/historia-clinica/historia-clinica.contenido.helpers.ts` (pure helper pattern) | role-match |
| `backend/src/modules/pacientes/cirugia-realizada-scheduler.service.spec.ts` (NEW — optional test) | test | — | `backend/src/modules/pacientes/seguimiento-scheduler.service.spec.ts` | exact |

> Shared-helper consolidation of `ETAPA_ORDEN` / `isAutoTransitionBlocked` (CONTEXT §Claude's Discretion) is OPTIONAL. If done, the new home would be something like `backend/src/modules/pacientes/crm-etapa.helper.ts` (or `common/`), sourced verbatim from the block below.

---

## Pattern Assignments

### `pacientes.service.ts` — extend `getKanban` (service, CRUD read-aggregation)

**Analog:** itself — `getKanban` at `backend/src/modules/pacientes/pacientes.service.ts:619-722`. This is a **self-extension**: add relations to the existing `select` and add computed step-state keys to the existing per-patient output map. Do NOT rewrite.

**Current `select` shape to extend** (lines 626-659) — add `cirugias`, `historiasClinicas` (entries), and `consentimientosFirmados` to feed the 5 steps:
```typescript
select: {
  id: true,
  nombreCompleto: true,
  // ...existing scalar fields...
  consentimientoFirmado: true,        // legacy Paciente flag (step 4 fallback)
  consentimientoFirmadoAt: true,
  indicacionesEnviadas: true,         // legacy Paciente flag (step 5 fallback)
  fechaIndicaciones: true,
  presupuestos: {                     // EXISTING — feeds step 2
    select: { total: true, estado: true, fechaEnviado: true },
    where: { estado: { not: 'RECHAZADO' } },
    orderBy: { createdAt: 'desc' },
  },
  turnos: { select: { inicio: true }, orderBy: { inicio: 'desc' }, take: 1 }, // EXISTING
  // NEW relations to add:
  cirugias: {                         // step 3 (turno de cirugía) + auto-move source
    select: { fecha: true, estado: true },
    orderBy: { fecha: 'desc' },
  },
  historiasClinicas: {                // step 1 (HC de consulta) — entries live under HistoriaClinica
    select: { entradas: { select: { id: true, tipoEntrada: true, status: true, fecha: true } } },
  },
  consentimientosFirmados: {          // step 4 & 5 (v1.12 portal/consent)
    select: { firmadoAt: true, indicacionesLeidasAt: true },
    take: 1,
    orderBy: { firmadoAt: 'desc' },
  },
  // ...existing contactos / autorizaciones...
},
```

**Per-patient output map to extend** (lines 685-720) — append the computed step payload inside the existing `items.map((p) => { ... return { ... } })`. Mirror the existing derived-field style (e.g. `diasDesdePresupuesto` at lines 708-714 which already computes a value inline):
```typescript
return {
  id: p.id,
  // ...all existing keys (nombreCompleto, etapaCRM, presupuesto, etc.)...
  // NEW: computed per-step state (D-04/D-05). Values are 'completo' | 'pendiente'.
  pasos: {
    hc:            /* HistoriaClinicaEntrada relevante existe */,
    presupuesto:   /* p.presupuestos has ENVIADO or ACEPTADO */,
    cirugia:       /* p.cirugias has a record with fecha */,
    consentimiento:/* consent signed */,
    indicacionesPreop: /* preop indications loaded */,
  },
  todosCompletos: /* all 5 === 'completo' — frontend hides patient (EMBUDO-04) */,
};
```

**Grouping map to update** (lines 662-680) — `PROCEDIMIENTO_REALIZADO` is currently NOT a key in `columnas`, so those patients fall into `SIN_CLASIFICAR` (see comment line 662). Per CONTEXT §"Established Patterns" line 122-124, the backend must at minimum NOT hide `PROCEDIMIENTO_REALIZADO` patients. Add its key to `columnas`:
```typescript
const columnas: Record<string, typeof pacientes> = {
  SIN_CLASIFICAR: [], NUEVO_LEAD: [], TURNO_AGENDADO: [], CONSULTADO: [],
  PRESUPUESTO_ENVIADO: [], CONFIRMADO: [],
  PROCEDIMIENTO_REALIZADO: [],   // NEW — was falling into SIN_CLASIFICAR
  PERDIDO: [],
};
```

**Data sources per step (D-05) — confirmed from schema:**

| Step | Source model / field | Location | "completo" condition |
|------|----------------------|----------|----------------------|
| 1. HC | `HistoriaClinicaEntrada` (`tipoEntrada TipoEntradaHC?`, `status EstadoEntradaHC`, `fecha`) via `Paciente.historiasClinicas[].entradas` | schema `:296-323`, `:186` | at least one relevant entry exists (planner defines "relevante" — likely `tipoEntrada` de consulta and/or `status = FINALIZED`) |
| 2. Presupuesto | `Presupuesto.estado` = `ENVIADO` or `ACEPTADO` | enum `EstadoPresupuesto` `:1071-1078`; already selected in getKanban `:639-643` | any presupuesto with estado ENVIADO/ACEPTADO |
| 3. Turno de cirugía | `Cirugia.fecha` (+ `estado EstadoCirugia`) | schema `:855-891`; relation `Paciente.cirugias` `:193` | a `Cirugia` record exists with a `fecha` |
| 4. Consentimiento firmado | **Primary (v1.12):** `ConsentimientoFirmado.firmadoAt` (per-zone signed doc). **Fallback (legacy):** `Paciente.consentimientoFirmado` Boolean + `consentimientoFirmadoAt` | schema `:1426-1446`; Paciente `:172,216,227` | a `ConsentimientoFirmado` row exists (`firmadoAt` set) OR legacy flag true |
| 5. Indicaciones preop | **Primary (v1.12):** `ConsentimientoFirmado.indicacionesLeidasAt` (set at signing, required). **Fallback (legacy):** `Paciente.indicacionesEnviadas` Boolean + `fechaIndicaciones` | schema `:1437`; Paciente `:173-174` | `indicacionesLeidasAt` present OR legacy flag true |

> **Under-specified area resolved (CONTEXT line 75):** v1.12 introduced the `ConsentimientoFirmado` model (`:1426`) as the semantic source for both consent AND preop indications (`indicacionesLeidasAt` is captured at signing). The legacy `Paciente.consentimientoFirmado` / `indicacionesEnviadas` booleans (written by `updatePortal`, service `:506-510`) predate it. Planner must decide primary-vs-fallback precedence; recommend `ConsentimientoFirmado` as source of truth with the legacy booleans as OR-fallback for pre-v1.12 patients.

---

### `cirugia-realizada-scheduler.service.ts` (NEW — service/scheduler, batch/daily-cron)

**Analog:** `backend/src/modules/pacientes/seguimiento-scheduler.service.ts` (EXACT — same module, `@nestjs/schedule` daily `@Cron`, iterates patient-related records, mutates `Paciente`, best-effort per-item try/catch + Logger).

> **Async-infra note:** Despite CONTEXT mentioning "BullMQ (ya hay Redis+BullMQ desde v1.0)", the codebase's daily-scan/cron pattern uses **`@nestjs/schedule` `@Cron`**, NOT BullMQ repeatable jobs. BullMQ (`whatsapp-message.processor.ts`, `caea-informar.processor.ts`) is used for **on-demand queued work**, while all recurring daily scans use `@Cron` (`seguimiento-scheduler.service.ts`, `cert-expiry.scheduler.ts`, `caea-prefetch.scheduler.ts`, `reportes-scheduler.service.ts`). Use the `@Cron` pattern — it is the established repo convention for exactly this kind of daily DB sweep and needs no queue plumbing.

**Full structural template** (from `seguimiento-scheduler.service.ts:1-79`):
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CirugiaRealizadaSchedulerService {
  private readonly logger = new Logger(CirugiaRealizadaSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)   // pick a daily expression; analog uses 9AM
  async moverCirugiasRealizadas(): Promise<void> {
    this.logger.log('Auto-move a PROCEDIMIENTO_REALIZADO por cirugía pasada...');
    const ahora = new Date();

    // Find patients with a Cirugia whose fecha has passed and not yet at/after order 6.
    const candidatos = await this.prisma.cirugia.findMany({
      where: { fecha: { lt: ahora } /*, estado filter per planner */ },
      select: { pacienteId: true, paciente: { select: { etapaCRM: true } } },
    });

    for (const c of candidatos) {
      try {
        // Forward-only: only advance if current order < 6 (guard PERMITS this; D-03).
        // Reuse etapaOrden/ETAPA_ORDEN (order PROCEDIMIENTO_REALIZADO = 6).
        await this.prisma.paciente.update({
          where: { id: c.pacienteId },
          data: { etapaCRM: EtapaCRM.PROCEDIMIENTO_REALIZADO },
        });
        this.logger.log(`Paciente ${c.pacienteId} movido a PROCEDIMIENTO_REALIZADO`);
      } catch (err) {
        this.logger.error(`Error moviendo paciente ${c.pacienteId}: ${err.message}`);
      }
    }
  }
}
```

**Key analog decisions to copy:**
- `@Cron(CronExpression.EVERY_DAY_AT_9AM)` — daily trigger (analog line 15).
- Per-item `try/catch` with `this.logger.error` so one bad row doesn't abort the batch (analog lines 38, 74-76).
- Start/count log lines (analog lines 17, 33-35).
- State is **persisted** to `Paciente.etapaCRM` (D-03) — mirrors analog's `paciente.update` write.
- Auto-move is **forward** (order 6) so the existing guard allows it without change (CONTEXT line 35); planner reuses `etapaOrden`/`ETAPA_ORDEN` (see Shared Patterns) to gate the update to patients below order 6.

---

### `pacientes.module.ts` (MODIFY — config/module)

**Analog:** itself — current registration of `SeguimientoSchedulerService`.

**Existing registration** (`backend/src/modules/pacientes/pacientes.module.ts:2,5,10,12`):
```typescript
import { ScheduleModule } from '@nestjs/schedule';
import { SeguimientoSchedulerService } from './seguimiento-scheduler.service';
// ...
imports: [ScheduleModule.forRoot(), WhatsappModule],
providers: [PacientesService, SeguimientoSchedulerService, PortalEmailService],
```
**Change:** add `CirugiaRealizadaSchedulerService` to `providers` (and its import). `ScheduleModule.forRoot()` is already present — no extra wiring needed.

---

### `turnos.service.ts` — bypass guard in `crearTurno` (service, request-response)

**Analog:** itself — `crearTurno` auto-transition block at `backend/src/modules/turnos/turnos.service.ts:156-168`.

**Current guarded block to relax** (lines 156-168):
```typescript
// 5) CRM auto-transition: avanzar a TURNO_AGENDADO si la etapa actual es menor (guard forward-only)
const pacienteCRM = await this.prisma.paciente.findUnique({
  where: { id: dto.pacienteId },
  select: { etapaCRM: true, profesionalId: true, flujo: true },
});
if (!isAutoTransitionBlocked(pacienteCRM?.etapaCRM, EtapaCRM.TURNO_AGENDADO)) {
  await this.prisma.paciente.update({
    where: { id: dto.pacienteId },
    data: { etapaCRM: EtapaCRM.TURNO_AGENDADO },
  });
}
```
**Change (D-09):** remove the `isAutoTransitionBlocked` gate on THIS path only — a new turno **always** moves the patient to `TURNO_AGENDADO`, reactivating the funnel from ANY stage including `PERDIDO` and `PROCEDIMIENTO_REALIZADO`. Keep the `pacienteCRM` read (still used for `flujo` at line 173 and `profesionalId` at line 188). The unconditional update replaces the `if`-guarded update:
```typescript
await this.prisma.paciente.update({
  where: { id: dto.pacienteId },
  data: { etapaCRM: EtapaCRM.TURNO_AGENDADO },
});
```
**Do NOT touch** the guard in any other auto-transition (D-10) — see Shared Patterns.

---

### `crm-steps.helper.ts` (NEW — optional utility, transform)

**Analog:** `backend/src/modules/historia-clinica/historia-clinica.contenido.helpers.ts` (pure helper module already imported by `turnos.service.ts:25` via `resumirTratamientosDeContenido`). Same pattern: a stateless exported function that maps raw DB rows to a derived shape.

If the planner extracts step-state computation into a helper (recommended for testability per D-04 "lógica de negocio centralizada y testeable"), export a pure function like `computePasosCrm(paciente): { pasos, todosCompletos }` and call it from the `getKanban` map. Keep it a plain module-level `export function` (no `@Injectable`) to match the existing helper convention.

---

## Shared Patterns

### CRM stage-order guard (`ETAPA_ORDEN` / `etapaOrden` / `isAutoTransitionBlocked`)
**Source:** `backend/src/modules/turnos/turnos.service.ts:27-50` (verbatim duplicate at `backend/src/modules/presupuestos/presupuestos.service.ts:25-45`).
**Apply to:** the new scheduler (forward-only gate for auto-move) and any consolidation work.
```typescript
// ADVERTENCIA: El enum EtapaCRM en Prisma NO está en orden lógico de avance.
// NO derivar el orden del enum — usar SIEMPRE ETAPA_ORDEN como fuente de verdad.
const ETAPA_ORDEN: Record<string, number> = {
  SIN_CLASIFICAR: 0,
  NUEVO_LEAD: 1,
  TURNO_AGENDADO: 2,
  CONSULTADO: 3,
  PRESUPUESTO_ENVIADO: 4,
  CONFIRMADO: 5,
  PROCEDIMIENTO_REALIZADO: 6,
};

function etapaOrden(e: EtapaCRM | null | undefined): number {
  return ETAPA_ORDEN[e ?? 'SIN_CLASIFICAR'] ?? 0;
}

// Returns true when the auto-transition should be SKIPPED
function isAutoTransitionBlocked(actual: EtapaCRM | null | undefined, destino: EtapaCRM): boolean {
  return etapaOrden(actual) >= etapaOrden(destino);
}
```
**Critical usage rules:**
- `PERDIDO` is intentionally NOT in `ETAPA_ORDEN` — it is handled via explicit protected-stage lists (see `presupuestos.service.ts:335,748`). The scheduler's forward-only gate must decide how to treat `PERDIDO` patients whose surgery date passed (planner's call; note that turno-creation reactivation D-09 explicitly reactivates PERDIDO, but the auto-move is a separate path).
- The guard STILL applies to presupuesto auto-transitions (D-10) — do not remove it from `presupuestos.service.ts` logic. Consolidation into a shared helper is OPTIONAL (CONTEXT line 72-74); if done, both services import the same function and behavior must stay byte-identical.

### Prisma read-before-conditional-update
**Source:** `presupuestos.service.ts:202-215` and `turnos.service.ts:157-168`.
**Apply to:** scheduler auto-move.
Established idiom: `findUnique({ select: { etapaCRM: true } })` first, then gate the `paciente.update` on `isAutoTransitionBlocked`. The turno path (D-09) is the only place this gate is being removed.

### Scheduler batch resilience
**Source:** `seguimiento-scheduler.service.ts:37-77`.
**Apply to:** new scheduler.
Per-record `try/catch` + `this.logger.error(...)` inside the loop; aggregate start/count `this.logger.log(...)` outside. Never let one failed row abort the daily sweep.

---

## No Analog Found

None. All 6 files map to strong analogs (4 are self-edits or same-module exact matches).

## Metadata

**Analog search scope:** `backend/src/modules/{pacientes,turnos,presupuestos,historia-clinica,finanzas,whatsapp,afip-config,reportes}`, `backend/src/prisma/schema.prisma`
**Files scanned:** ~14 (2 fully read: `seguimiento-scheduler.service.ts`, targeted reads of `pacientes.service.ts`, `turnos.service.ts`, `presupuestos.service.ts`, `schema.prisma`)
**Pattern extraction date:** 2026-07-03
