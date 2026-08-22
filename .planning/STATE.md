---
gsd_state_version: 1.0
milestone: v1.16
milestone_name: Alta de Paciente sin Fricción
status: executing
stopped_at: Completed 69-10-PLAN.md
last_updated: "2026-08-22T02:30:18.747Z"
last_activity: 2026-08-22
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 21
  completed_plans: 19
  percent: 67
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-17 al iniciar el milestone v1.16)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Phase 69 — consistencia-de-tel-fono-opcional-frontend

## Current Position

Phase: 69 (consistencia-de-tel-fono-opcional-frontend) — EXECUTING
Plan: 3 of 10
Status: Ready to execute
Last activity: 2026-08-22

Progress: [█████████░] 90%

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

- [Phase 67]: TEL-01 aplicado end-to-end: Paciente.telefono nullable en schema, migracion aplicada (TEL_BASELINE=TEL_AFTER=424), DTO y 6 declaraciones de tipo ensanchadas a string | null
- [Phase 67-02]: normalizeTelefono() en PacientesService como unica definicion de teléfono valido (D-01/D-02/D-05/D-06); suggest() usa COALESCE(p.telefono, '') para ser NULL-safe, verificado con probe en transaccion con rollback (424==424)
- [Phase 67-03]: requireTelefonoParaEnvio() en WhatsappService guarda los 4 paths (sendTemplateMessage, sendFreeText, sendPresupuestoPdf, retryMessage) que empujan telefono a la cola BullMQ — falsy-tras-trim sin fallback a telefonoAlternativo, BadRequestException plano en espanol; retryMessage se guardea despues del check de ownership y antes de mutar estado, para preservar NotFoundException anti-enumeracion y errorMsg original
- [Phase 67-04]: Reportes financieros y presupuestos.service.ts::generatePdf() propagan telefono nullable sin as any ni placeholders; auditoria de 12 sitios del ROADMAP + presupuesto-pdf.service.ts:143 como precedente cerrada en 67-04-SUMMARY.md
- [Phase 67-05]: requireTelefonoParaEnvio y normalizeTelefono cubiertos con 33 tests nuevos (pacientes/whatsapp/presupuestos); fix Rule 1: create() enmascaraba BadRequestException de telefono invalido como 500, corregido con rethrow explicito. Suite completa: 4 failed/18 failed tests, identico a la baseline preexistente. paciente-portal.service.spec.ts (WR-02) sin editar.
- [Phase 68]: 68-04 cerrado: alta inline resistente al desmontaje (mutateAsync+await) y guard de createPending bloquea Escape mientras el POST /pacientes esta en vuelo (gap #2 de 68-VERIFICATION.md); Task 3 aprobada por el usuario con 'approved' sin desglose granular por escenario
- [Phase 68-05]: gap BLOCKER (gaps[0]/CR-01) y gap WARNING (WR-02) de 68-VERIFICATION.md cerrados: guard de generacion de sesion (dialogSessionRef+dialogSession) portado a los 3 call sites de turno (QuickAppointment/NewAppointmentModal/SurgeryAppointmentModal), corrigiendo la premisa falsa de 68-VERIFICATION.md:257 de que solo QuickAppointment estaba expuesto; candado sincrono submittingRef en InlineCreatePaciente cierra la garantia de un solo POST /pacientes por submit; verificacion humana itemizada (A/B/C/D: PASS) aprobada por el usuario
- [Phase 68-06]: 2 gaps BLOCKER remanentes de 68-VERIFICATION.md cerrados (gaps[0]/CR-01 y gaps[1]/CR-02). SurgeryAppointmentModal.tsx: los dos efectos separados (reset solo al cerrar, sello de sesion solo al abrir) se unificaron en un unico useEffect declarado antes de los seeds de defaultDate/pacienteIdProp — el reset() corre ahora en ambas transiciones del Dialog, cerrando la ventana donde un alta abandonada podia sobrevivir a la reapertura y viajar en POST /turnos/cirugia. InlineCreatePaciente.tsx: handleKeyDown ya no cancela el Enter dirigido a un boton enfocado (closest("button") antes de preventDefault), asi que Cancelar vuelve a cancelar sin crear un Paciente real. Checkpoint humano de Task 3 respondido con aprobacion GLOBAL ("todo ok", sin desglose por escenario ni detalle de Network/modal) — registrado asi en 68-06-SUMMARY.md sin inventar detalle no observado. Fase 68 (6/6 planes ejecutados) queda pendiente de re-verificacion por /gsd:verify-phase; no se marca Complete en STATE.md ni ROADMAP.md por decision del orquestador
- [Phase 69]: Plan 69-09: runner de tests vitest+Testing Library instalado en frontend/, verificado con smoke test de lib/telefono.ts (11 tests) y dos pruebas negativas (assertion falsa, alias roto) — Los planes 07 y 08 necesitan poder assertar comportamiento de render/DOM en vez de leer el fuente; npm run build/tsc verificados bajo Node 20 via nvm (entorno default tiene Node 18, insuficiente para Next 16, deuda preexistente no introducida por este plan)
- [Phase 69-10]: IDOR de GET /turnos/rango (T-69-16) cerrado: obtenerPorRango resuelve el scope con resolveScope igual que findAll; guard explicito ante scope.profesionalId falsy (T-69-28); PROFESIONAL ya no puede leer la agenda de otro via query string, ADMIN/SECRETARIA sin cambios (probado con test negativo: revertir el fix hace fallar el test 1 y no afecta el test 2)

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

Ninguno abierto. Los tres blockers que detuvieron el plan 67-01 (conectividad de base de datos, drift de historial de migraciones pre-existente, y el bug de orden temporal P3006 en `20260415221758_flujo_paciente` contra el shadow database) quedaron todos resueltos entre los commits `d7d59f4`/`e450793` (reconciliación de historial) y verificados end-to-end en esta corrida: `npx prisma migrate dev --name telefono_opcional` aplicó exactamente `ALTER TABLE "Paciente" ALTER COLUMN "telefono" DROP NOT NULL;`, sin sentencias destructivas, con `TEL_BASELINE=TEL_AFTER=424`. Ver `.planning/phases/67-tel-fono-opcional-y-guards-de-env-o-backend/67-01-SUMMARY.md` para el detalle completo.

## Deferred Items

Ninguno abierto. El audit de artefactos previo al cierre de v1.15 (2026-08-10) dio *all clear*: 0 debug sessions, quick tasks, threads, todos, seeds, UAT gaps, verification gaps y context questions.

Los 3 ítems diferidos al cierre de v1.14 quedaron resueltos durante v1.15:

| Category | Item | Resolución |
|----------|------|------------|
| uat_gap | 62-HUMAN-UAT (5 escenarios de portal) | cerrado |
| verification_gap | 62-VERIFICATION | cerrado |
| quick_task | 1-eliminar-dropdown-tipo-de-consulta-de-hc | completado en Phase 66 (HCUI-01) |

## Session Continuity

Last session: 2026-08-22T02:30:18.744Z
Stopped at: Completed 69-10-PLAN.md
Resume file: .planning/phases/69-consistencia-de-tel-fono-opcional-frontend/69-10-SUMMARY.md

- Fase 67 (backend) completa — 5/5 planes ejecutados, TEL-01/ENVIO-01/ENVIO-02 cubiertos con tests automatizados que trazan los 5 success criteria del ROADMAP. Ready for verification.
- Fase 68 (Creación Inline en el Autosuggest) — 6/6 planes ejecutados (68-01..68-06). Los 2 gaps BLOCKER que dejó abiertos la ronda anterior de /gsd:verify-phase (68-VERIFICATION.md gaps[0]/CR-01 y gaps[1]/CR-02) quedaron cerrados en 68-06. Pendiente: re-correr /gsd:verify-phase contra el código actual antes de marcar la fase Complete.
- Fase 69 (Consistencia de Teléfono Opcional Frontend) no iniciada — depende únicamente de la fase 67, ya cerrada.
- Research salteado en este milestone (feature sobre código existente, blast radius mapeado en el roadmap).
