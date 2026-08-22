---
gsd_state_version: 1.0
milestone: v1.16
milestone_name: Alta de Paciente sin Fricción
status: Awaiting next milestone
stopped_at: Milestone v1.16 archivado y tagueado
last_updated: "2026-08-22T18:04:06.876Z"
last_activity: 2026-08-22 — Milestone v1.16 completed and archived
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 21
  completed_plans: 21
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-22 tras cerrar el milestone v1.16)

**Core value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible
**Current focus:** Planificando el próximo milestone — arrancar con `/gsd:new-milestone`

## Current Position

Phase: Milestone v1.16 complete
Plan: —
Status: Awaiting next milestone
Last activity: 2026-08-22 — Milestone v1.16 completed and archived

### Roadmap v1.16

| Fase | Nombre | Requisitos | Depende de |
|------|--------|-----------|------------|
| 67 | Teléfono Opcional y Guards de Envío (Backend) | TEL-01, ENVIO-01, ENVIO-02 | — |
| 68 | Creación Inline en el Autosuggest (Frontend) | ALTA-01..07 | 67 |
| 69 | Consistencia de Teléfono Opcional (Frontend) | TEL-02, TEL-03, ENVIO-03 | 67 |

Las fases 68 y 69 son independientes entre sí y pueden ejecutarse en paralelo tras la 67.

## Accumulated Context

### Decisions

Full decision log en `.planning/PROJECT.md` (Key Decisions). Las decisiones de v1.16 quedaron consolidadas ahí y en `.planning/milestones/v1.16-ROADMAP.md`; las de v1.13/v1.14/v1.15 en sus archivos de milestone respectivos.

### Known Tech Debt (carry-forward)

**Prioritario de v1.16 — deuda pre-existente que quedó en el camino crítico de requisitos recién shippeados** (detalle completo en `.planning/milestones/v1.16-MILESTONE-AUDIT.md`):

- **TD-02 — `await` faltante en `pacientes.service.ts:75`.** El `return this.prisma.paciente.create()` sin await deja muerta la rama `P2002 → ConflictException` en español (`:94-96`); el error sube crudo al `PrismaClientExceptionFilter`. ALTA-05 pasa sólo porque `InlineCreatePaciente.tsx:167` chequea `status === 409` sin mirar el mensaje. **Fix de una palabra.**
- **TD-01 — `POST /pacientes` sin `ValidationPipe`.** No hay pipe global (cero `APP_PIPE` en `backend/src`, `main.ts` sólo registra `PrismaClientExceptionFilter`) ni per-route en `pacientes.controller.ts:48-51`. El `@IsOptional()` de `CreatePacienteDto` nunca corre — TEL-01 funciona por `normalizeTelefono()`. Además el spread `{...dto}` de `:57` permite mass-assignment (`usuarioId`, `whatsappOptIn`, `scoreConversion`, `crmArchivado`, `temperatura`, `motivoPerdida`). El patrón de fix está en `paciente-portal.controller.ts` (`ValidationPipe({ whitelist: true })` per-route, 4 rutas).
- **TD-08 — sin tests sobre ALTA-01..07.** No hay test para `InlineCreatePaciente.tsx` ni `AutocompletePaciente.tsx`. Infra ya instalada (Vitest + Testing Library, 69-09).

**Advisory de v1.16 (0 blockers):**

- Override firmado de ALTA-06: `canOfferCreate` no exige `profesionalIdParaAlta`, así que ADMIN/SECRETARIA en vista global puede crear un paciente inline con `profesionalId = null` (firmado 2026-08-19, reconfirmado en 68-05 y 68-06).
- Los 3 modales de turno no se desmontan al cerrar — causa raíz estructural de las 3 rondas de gap-closure sobre carreras de alta inline; el reset de `NewAppointmentModal` está atado a la identidad inestable de `selectedEvent` y su protección anti-carrera es incidental (TD-09).
- `reset()` sin argumentos ahora corre en el montaje inicial de `SurgeryAppointmentModal` — la fecha por defecto depende enteramente del seed de `defaultDate` (TD-10).
- `DatosCompletos.tsx` en modo lectura usa el fallback em-dash de `EditableInput` en vez del SSOT `formatTelefono` — segunda definición de placeholder (TD-13).
- `frontend/src/types/finanzas.ts:77` declara `telefono: string` sin ensanchar a `string | null` — sin consumidores hoy, trampa latente (TD-16).
- `PatientFilters.tsx` es código muerto (importado en ningún lado) y su `PatientFormModal.tsx:47-50` es un mock que hace `console.log` en vez de POST (TD-12).
- Validación de largo de teléfono duplicada con límites divergentes en 3 formularios (TD-15).
- `search()` quedó con tipo `telefono: string` stale y `LIKE` sin `COALESCE` (sólo `suggest()` fue migrado) (TD-06).
- Portal puede persistir `telefono: ''` — `UpdateContactoPortalDto` sin min-length (TD-03).
- 44 errores de lint pre-existentes en 21 archivos del backend (TD-05).
- Nyquist: 0/3 fases con `*-VALIDATION.md` (`nyquist_validation_enabled: false` en `config.json`) — decisión de configuración, no gap.

**Advisory de v1.15 (sigue abierta):**

- D-06 gatea el reset cíclico del embudo en el string mágico `tipoTurno.nombre === 'Consulta'` (`turnos.service.ts:147`) — frágil a rename/variante, sin flag en el schema.
- Los leads con `flujo=null` no son promovidos a CIRUGIA por la auto-clasificación genérica por tipo de turno (`turnos.service.ts:159-162`) ni por el branch CONSULTA_CIRUGIA de HC — ambos siguen gateados en `=== 'PENDIENTE'`.
- `listarTratamientosDeContenido` sin guard contra JSONB malformado (elementos null en el array).
- Ventana TOCTOU angosta entre el pre-fetch de `turnoCtx` y `tx.turno.update` — hoy inalcanzable en prod.
- `esCirugia: destino.esCirugia` es no-op con el seed actual — footgun latente si cambia el seeding del catálogo.
- El guard `hasAny` de `HCEntryChips` omite `estudiosComplementarios` (`HCEntryContent.tsx:149-154`).
- IDOR sobre `dto.turnoId` pre-aceptado bajo el modelo single-tenant (T-65-01).
- TipoTurno "Pre-Quirúrgico" seedeado con `flujoPaciente=CIRUGIA` y `esCirugia:false`.

**Carried de milestones previos:**

- **v1.13 (advisory):** `crearTurno` degrada etapas avanzadas a `TURNO_AGENDADO` en cualquier turno (intencional); el paso 'cirugia' cuenta cirugías CANCELADA/SUSPENDIDA como completas.
- HistorialClinicoPanel y TurnoHCModal no migrados a `HCEntryContent.tsx` (diferido desde v1.11; HCUI-02 sólo agregó el branch pre-quirúrgico).
- AppointmentDetailModal y CalendarGrid no migrados a `getEstadoTurnoChip` (diferido).
- STOCK-03: FACTURADOR excluido del backend de ordenes-consumo pero accede desde frontend.
- EncryptionService dev fallback key — configurar `ENCRYPTION_KEY` en .env prod.
- `console.log('DTO RECIBIDO')` + `console.log('ERROR CAPTURADO EN CATCH:')` en `pacientes.service.ts` — exponen PII / error crudo en logs.
- **Gate legal pre-go-live (v1.12):** revisión del flujo de consentimiento (Ley 25506 / Ley 26529) antes del primer paciente quirúrgico real.

## Blockers

Ninguno abierto. Los tres blockers que detuvieron el plan 67-01 (conectividad de base de datos, drift de historial de migraciones pre-existente, y el P3006 de orden temporal en `20260415221758_flujo_paciente` contra el shadow database) quedaron resueltos entre los commits `d7d59f4`/`e450793` y verificados end-to-end: la migración `telefono_opcional` aplicó exactamente `ALTER TABLE "Paciente" ALTER COLUMN "telefono" DROP NOT NULL;`, sin sentencias destructivas, con `TEL_BASELINE=TEL_AFTER=424`.

## Deferred Items

Ninguno abierto. El audit de artefactos previo al cierre de v1.16 (2026-08-22) dio *all clear*: 0 debug sessions, quick tasks, threads, todos, seeds, UAT gaps, verification gaps y context questions. Segundo cierre consecutivo sin ítems diferidos.

## Session Continuity

Last session: 2026-08-22 — cierre de milestone
Stopped at: v1.16 archivado, tagueado y committeado

- Milestone v1.16 completo: 3 fases (67–69), 21 planes, 53 tareas, 13/13 requisitos. Las 3 fases verificadas `passed`; 68 y 69 requirieron rondas de gap-closure antes de cerrar.
- `/gsd:audit-milestone` corrido antes de archivar: status `tech_debt`, 13/13 reqs, 13/13 seams WIRED, 1/1 flujo E2E, 0 blockers, 0 flujos rotos.
- Archivos en `.planning/milestones/`: `v1.16-ROADMAP.md`, `v1.16-REQUIREMENTS.md`, `v1.16-MILESTONE-AUDIT.md`. Los directorios de fase quedaron en `.planning/phases/` (no archivados) — usar `/gsd:cleanup` si se quieren mover.
- `.planning/REQUIREMENTS.md` eliminado vía `git rm` — el próximo milestone crea uno fresco.
- Research salteado en v1.16 (feature sobre código existente). El audit sugiere que un pase de research sobre `pacientes` habría levantado la asimetría del `ValidationPipe` antes de que TEL-01 se apoyara en un decorator muerto.

## Operator Next Steps

- Arrancar el próximo milestone con `/gsd:new-milestone` (incluye questioning → research → requirements → roadmap)
- Considerar meter TD-02 / TD-01 / TD-08 como requisitos del próximo ciclo (ver Known Tech Debt arriba)
