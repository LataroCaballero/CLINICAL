---
gsd_state_version: 1.0
milestone: v1.16
milestone_name: Alta de Paciente sin Fricción
status: executing
stopped_at: "Plan 67-04 completado (TEL-01: reportes financieros + presupuestos.service.ts generatePdf() sin casts, auditoria de 12 sitios cerrada)"
last_updated: "2026-08-18T22:13:14.525Z"
last_activity: 2026-08-18
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 5
  completed_plans: 4
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-17 al iniciar el milestone v1.16)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Phase 67 — tel-fono-opcional-y-guards-de-env-o-backend

## Current Position

Phase: 67 (tel-fono-opcional-y-guards-de-env-o-backend)
Plan: 5 of 5 (Plans 1-2/5 complete — TEL-01)
Status: Ready to execute
Last activity: 2026-08-18

Progress: [████████░░] 80%

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

Last session: 2026-08-18T22:13:14.522Z
Stopped at: Plan 67-04 completado (TEL-01: reportes financieros + presupuestos.service.ts generatePdf() sin casts, auditoria de 12 sitios cerrada)
Resume file: 

## Operator Next Steps

- Continuar con el plan 67-03 (wave 2, guard de teléfono en los 4 paths de envío de `WhatsappService` + presupuestos).
- Research salteado en este milestone (feature sobre código existente, blast radius mapeado en el roadmap).
- Plan 67-02 completado: `normalizeTelefono()` centraliza la validación (create/update/updateContacto), `suggest()` es NULL-safe vía `COALESCE`. El guard de envío WA de 67-03 puede apoyarse en el criterio D-03 (falsy tras trim), sin necesidad de reusar `normalizeTelefono()`.
