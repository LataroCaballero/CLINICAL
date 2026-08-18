---
gsd_state_version: 1.0
milestone: v1.16
milestone_name: Alta de Paciente sin Fricción
status: executing
stopped_at: Phase 67 context gathered
last_updated: "2026-08-17T23:11:05.951Z"
last_activity: 2026-08-17 -- Phase 67 execution started
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 5
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-17 al iniciar el milestone v1.16)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Phase 67 — tel-fono-opcional-y-guards-de-env-o-backend

## Current Position

Phase: 67 (tel-fono-opcional-y-guards-de-env-o-backend) — BLOCKED
Plan: 1 of 5 (Task 1/3 done, Task 2 blocked)
Status: Blocked — schema drift on live DB detected by `prisma migrate dev` (ver Blockers abajo)
Last activity: 2026-08-18 -- Plan 67-01 Task 2 aborted: DB reconnected OK, but `migrate dev` detected drift (missing local migration `20260415221758_flujo_paciente` + undocumented `OrdenConsumo`/`OrdenConsumoInsumo` tables) and offered only `migrate reset`; executor aborted per plan's explicit no-reset rule

Progress: [░░░░░░░░░░] 0% (0/3 fases)

### Roadmap v1.16

| Fase | Nombre | Requisitos | Depende de |
|------|--------|-----------|------------|
| 67 | Teléfono Opcional y Guards de Envío (Backend) | TEL-01, ENVIO-01, ENVIO-02 | — |
| 68 | Creación Inline en el Autosuggest (Frontend) | ALTA-01..07 | 67 |
| 69 | Consistencia de Teléfono Opcional (Frontend) | TEL-02, TEL-03, ENVIO-03 | 67 |

Las fases 68 y 69 son independientes entre sí y pueden ejecutarse en paralelo tras la 67.

## Accumulated Context

### Decisions

Full decision log en `.planning/PROJECT.md` (Key Decisions). Las decisiones de v1.15 quedaron consolidadas ahí y en `.planning/milestones/v1.15-ROADMAP.md`; las de v1.13/v1.14 en sus archivos de milestone respectivos.

### Known Tech Debt (carry-forward)

**Advisory de v1.15 (del audit, 0 blockers):**

- D-06 gatea el reset cíclico del embudo en el string mágico `tipoTurno.nombre === 'Consulta'` (`turnos.service.ts:147`) — frágil a rename/variante, sin flag en el schema.
- Los leads con `flujo=null` no son promovidos a CIRUGIA por la auto-clasificación genérica por tipo de turno (`turnos.service.ts:159-162`) ni por el branch CONSULTA_CIRUGIA de HC — ambos siguen gateados en `=== 'PENDIENTE'`. Latente, no afecta los SC de v1.15.
- `listarTratamientosDeContenido` sin guard contra JSONB malformado (elementos null en el array) — segundo call site sobre un path pre-existente sin proteger.
- Ventana TOCTOU angosta entre el pre-fetch de `turnoCtx` y `tx.turno.update` — hoy inalcanzable en prod (no hay path de borrado de turno); hardening opcional vía `tx.turno.updateMany`.
- `esCirugia: destino.esCirugia` es no-op con el seed actual (los 3 destinos de sync tienen `esCirugia:false`) — footgun latente si cambia el seeding del catálogo.
- El guard `hasAny` de `HCEntryChips` omite `estudiosComplementarios` (`HCEntryContent.tsx:149-154`) — una entrada con sólo estudios muestra "(sin contenido)" en la card, aunque el detalle renderiza bien.
- IDOR sobre `dto.turnoId` pre-aceptado bajo el modelo single-tenant (T-65-01).
- TipoTurno "Pre-Quirúrgico" seedeado con `flujoPaciente=CIRUGIA` y `esCirugia:false` — ortogonal a los seams auditados, flagueado para awareness de semántica del kanban.
- Nyquist: 0/4 fases con `*-VALIDATION.md` (validación deshabilitada en `config.json`).

**Carried de milestones previos:**

- **v1.13 (advisory):** `crearTurno` degrada etapas avanzadas a `TURNO_AGENDADO` en cualquier turno (intencional); el paso 'cirugia' cuenta cirugías CANCELADA/SUSPENDIDA como completas.
- HistorialClinicoPanel y TurnoHCModal no migrados a `HCEntryContent.tsx` (diferido desde v1.11; HCUI-02 sólo agregó el branch pre-quirúrgico).
- AppointmentDetailModal y CalendarGrid no migrados a `getEstadoTurnoChip` (diferido).
- STOCK-03: FACTURADOR excluido del backend de ordenes-consumo pero accede desde frontend.
- EncryptionService dev fallback key — configurar `ENCRYPTION_KEY` en .env prod.
- `console.log('DTO RECIBIDO')` + `console.log('ERROR CAPTURADO EN CATCH:')` en `pacientes.service.ts` — exponen PII / error crudo en logs.
- **Gate legal pre-go-live (v1.12):** revisión del flujo de consentimiento (Ley 25506 / Ley 26529) antes del primer paciente quirúrgico real.

## Blockers

- **Plan 67-01, Task 2 (BLOCKING) — drift de schema detectado por Prisma en la base viva.** La conectividad a la DB fue restablecida y verificada (`npx prisma migrate status` reportó "53 migrations found" / "Database schema is up to date!" antes de correr `migrate dev`, y `TEL_BASELINE` se capturó en 424 pacientes). Al ejecutar `npx prisma migrate dev --name telefono_opcional`, Prisma detectó drift entre el historial de migraciones local y el schema real de la base:
  - Tablas/enum presentes en la base pero no reflejados como esperado por el historial: `OrdenConsumo`, `OrdenConsumoInsumo`, enum `EstadoOrdenConsumo` (con sus índices y FKs).
  - Migración aplicada en la base pero **ausente del directorio local** `backend/src/prisma/migrations/`: `20260415221758_flujo_paciente`.
  - Prisma CLI ofreció como única salida `prisma migrate reset` ("We need to reset the 'public' schema... You may use prisma migrate reset to drop the development database. All data will be lost.") — **el ejecutor abortó sin ejecutar `migrate reset`** ni ninguna variante destructiva, por regla explícita del plan (T-67-01/T-67-02). No se generó ningún archivo de migración (`git status` confirma el directorio `migrations/` limpio); no hubo pérdida ni riesgo de pérdida de datos.
  - Task 1 (schema + DTO nullable) sigue commiteado y verificado (`8ed5da9`). Task 2 no puede continuar sin resolver el drift; Task 3 depende del cliente Prisma regenerado tras la migración aplicada — ambos quedan bloqueados.
  - **Acción requerida del usuario:** investigar por qué falta `20260415221758_flujo_paciente` en el repo (¿se aplicó manualmente contra la base sin commitear el archivo? ¿otro entorno/rama la generó?) y decidir el camino de reconciliación — candidatos típicos son recuperar/commitear el archivo de migración faltante, o usar `prisma migrate resolve --applied 20260415221758_flujo_paciente` (y evaluar si `OrdenConsumo`/`OrdenConsumoInsumo` también necesitan una migración de baseline) **sin** pasar por `migrate reset`. Ninguna de estas acciones es responsabilidad del ejecutor automatizado — requiere una decisión informada sobre el historial real de la base. Tras resolver el drift, re-ejecutar el plan 67-01 desde Task 2.

## Deferred Items

Ninguno abierto. El audit de artefactos previo al cierre de v1.15 (2026-08-10) dio *all clear*: 0 debug sessions, quick tasks, threads, todos, seeds, UAT gaps, verification gaps y context questions.

Los 3 ítems diferidos al cierre de v1.14 quedaron resueltos durante v1.15:

| Category | Item | Resolución |
|----------|------|------------|
| uat_gap | 62-HUMAN-UAT (5 escenarios de portal) | cerrado |
| verification_gap | 62-VERIFICATION | cerrado |
| quick_task | 1-eliminar-dropdown-tipo-de-consulta-de-hc | completado en Phase 66 (HCUI-01) |

## Session Continuity

Last session: 2026-08-17T22:20:13.879Z
Stopped at: Phase 67 context gathered
Resume file: .planning/phases/67-tel-fono-opcional-y-guards-de-env-o-backend/67-CONTEXT.md

## Operator Next Steps

- **Bloqueante inmediato:** restablecer la conexión a la base (ver Blockers arriba) y volver a correr el plan 67-01 desde Task 2.
- Research salteado en este milestone (feature sobre código existente, blast radius mapeado en el roadmap).
- Ojo en la Phase 67: el `LIKE` sobre `p.telefono` en `suggest()` devuelve NULL (no false) con teléfono nulo — verificar filtro y score.
