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
Status: Blocked — `prisma migrate dev` fails P3006 against the shadow database due to a migration-history ordering bug in the just-restored `20260415221758_flujo_paciente` file (ver Blockers abajo)
Last activity: 2026-08-18 -- Plan 67-01 Task 2 aborted again: the two prior blockers (DB connectivity, missing-migration/undocumented-table drift) were resolved by the orchestrator in `d7d59f4`, and `npx prisma migrate status` / `migrate diff` both confirmed clean. Re-running `npx prisma migrate dev --name telefono_opcional` still fails, with a new root cause: P3006, "Migration `20260415221758_flujo_paciente` failed to apply cleanly to the shadow database — column \"flujo\" of relation \"Paciente\" does not exist". No SQL was applied to the live DB (shadow-db-only failure, confirmed by `migrate status` still reporting up to date afterward) and no new migration directory was created.

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

- **Plan 67-01, Task 2 (BLOCKING) — bug de orden temporal en la migración restaurada `20260415221758_flujo_paciente`, expuesto por el shadow database de `migrate dev`.** Los dos blockers previos (conectividad + drift de historial faltante/tablas no documentadas) fueron resueltos por el orquestador en el commit `d7d59f4` y quedaron verificados de forma independiente en esta corrida:
  - `npx prisma migrate status` reporta "55 migrations found" / "Database schema is up to date!".
  - `npx prisma migrate diff --from-schema-datasource ... --to-schema-datamodel ...` devuelve exactamente una sentencia: `ALTER TABLE "Paciente" ALTER COLUMN "telefono" DROP NOT NULL;` — confirma que no hay drift adicional pendiente contra la base real.
  - `TEL_BASELINE` re-medido en esta corrida: **424** (coincide con la medición previa).

  Pese a eso, `npx prisma migrate dev --name telefono_opcional` vuelve a fallar, con una causa raíz distinta y nueva:
  - Error `P3006`: *"Migration `20260415221758_flujo_paciente` failed to apply cleanly to the shadow database. Error: column \"flujo\" of relation \"Paciente\" does not exist"*.
  - Causa: el archivo `20260415221758_flujo_paciente/migration.sql` restaurado desde git en `d7d59f4` contiene su contenido SQL **original y roto** (`ALTER TABLE "Paciente" ALTER COLUMN "flujo" SET DEFAULT ...` + 2 `CREATE INDEX`), que corre *antes* — por orden de timestamp — que `20260416000000_flujo_paciente`, la migración que en realidad crea la columna `flujo`. El propio comentario de cabecera de `20260416000001_flujo_paciente_defaults/migration.sql` documenta este bug explícitamente: *"Moved here from 20260415221758_flujo_paciente which had a timestamp ordering bug (it ran before 20260416000000_flujo_paciente which actually creates the column)"* — esa migración posterior ya reimplementa el mismo efecto con `IF NOT EXISTS`, precisamente para ser un reemplazo idempotente y bien ordenado.
  - Contra la base real esto nunca causó una falla histórica (por eso `migrate status` da "up to date" y el archivo se aplicó con éxito en algún momento contra una base donde `flujo` ya existía), pero el **shadow database** que `migrate dev` construye desde cero SÍ repite el historial completo en orden estricto de timestamp, y ahí el bug de orden se manifiesta de inmediato, bloqueando la generación de cualquier migración nueva (incluida la de este plan) hasta que se resuelva.
  - No se ejecutó ninguna sentencia SQL contra la base real: `P3006` es una falla exclusiva del shadow database (temporal, descartado por Prisma al fallar). `npx prisma migrate status` corrido después de la falla sigue reportando "up to date". `git status` confirma que no se creó ningún directorio de migración nuevo.
  - Task 1 (schema + DTO nullable) sigue commiteado y verificado (`8ed5da9`). Task 2 sigue bloqueado; Task 3 depende del cliente Prisma regenerado tras la migración aplicada — ambos permanecen bloqueados.
  - **Acción requerida del usuario:** decidir cómo reconciliar el contenido de `20260415221758_flujo_paciente/migration.sql` sin ejecutar `migrate reset` ni `db push --accept-data-loss`. Candidatos a evaluar (decisión de historial de migraciones, no un auto-fix seguro para el ejecutor):
    1. Neutralizar el SQL de `20260415221758_flujo_paciente` a un no-op (su efecto real ya está duplicado, de forma idempotente, en `20260416000001_flujo_paciente_defaults`) — pero esto cambia el checksum de una migración ya marcada como aplicada en la base real, lo que Prisma probablemente reporte como modificación de un archivo ya aplicado y requiera `migrate resolve` adicional.
    2. Alguna otra vía de reconciliación de historial que el usuario prefiera (p.ej. renombrar/squash, o aceptar el checksum-mismatch resultante de la opción 1 y resolverlo explícitamente).
  - Tras resolver, re-ejecutar el plan 67-01 desde Task 2. El resto del plan (Task 2 pasos 2-6 y Task 3 completo) sigue pendiente.

## Deferred Items

Ninguno abierto. El audit de artefactos previo al cierre de v1.15 (2026-08-10) dio *all clear*: 0 debug sessions, quick tasks, threads, todos, seeds, UAT gaps, verification gaps y context questions.

Los 3 ítems diferidos al cierre de v1.14 quedaron resueltos durante v1.15:

| Category | Item | Resolución |
|----------|------|------------|
| uat_gap | 62-HUMAN-UAT (5 escenarios de portal) | cerrado |
| verification_gap | 62-VERIFICATION | cerrado |
| quick_task | 1-eliminar-dropdown-tipo-de-consulta-de-hc | completado en Phase 66 (HCUI-01) |

## Session Continuity

Last session: 2026-08-18T00:00:00.000Z
Stopped at: Plan 67-01 Task 2 aborted (segunda vez) — P3006 en shadow database por bug de orden en `20260415221758_flujo_paciente`
Resume file: .planning/phases/67-tel-fono-opcional-y-guards-de-env-o-backend/67-01-PLAN.md

## Operator Next Steps

- **Bloqueante inmediato:** decidir la reconciliación del contenido de `20260415221758_flujo_paciente/migration.sql` (ver Blockers arriba) — requiere juicio sobre el historial real de migraciones, no es auto-fixeable por el ejecutor. Tras resolver, volver a correr el plan 67-01 desde Task 2.
- Research salteado en este milestone (feature sobre código existente, blast radius mapeado en el roadmap).
- Ojo en la Phase 67: el `LIKE` sobre `p.telefono` en `suggest()` devuelve NULL (no false) con teléfono nulo — verificar filtro y score.
