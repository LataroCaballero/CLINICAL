# Phase 51: Schema Foundation + Chat Fix - Context

**Gathered:** 2026-06-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Una sola release atómica que entrega dos cosas:

1. **Schema Foundation** — Deja migrado **todo** el schema del milestone v1.12 en una única migración (big-bang): las columnas/modelos que consumirán las fases 52–56 (campos de Paciente, catálogos por profesional, tokens de portal hasheados, campos de staging del portal, metadata de consentimiento, etc.). No hay cambio funcional visible para el usuario en esta fase; sólo deja la base lista para que las fases siguientes construyan features sin nuevas migraciones bloqueantes.
2. **Chat Fix (CHAT-01 + CHAT-02)** — Corta de forma permanente el spam diario del scheduler de "Seguimiento CRM" (guard `notificada`) y limpia el flood histórico acumulado, ambos en la **misma** migración/release (atomicidad — SC#3).

**Fuera de scope (pertenecen a otras fases):** el formulario HC Prequirúrgico y el uso de los catálogos (Fase 52), upload de consentimiento/StorageService (Fase 53), backend/frontend del portal (Fases 54–55), firma y estampado de PDF (Fase 56), distinción `origenPaciente` en el chat usada por el portal (Fase 55/56). Esta fase **crea** esas columnas pero **no las usa**.

</domain>

<decisions>
## Implementation Decisions

### Limpieza del chat (CHAT-02)
- **D-01:** La limpieza del flood histórico se hace con un **`DELETE FROM "MensajeInterno" WHERE "esSistema" = true`** (hard delete, no soft-hide). Justificación verificada en código: el **único** creador de `esSistema:true` en producción es el scheduler bugueado (`seguimiento-scheduler.service.ts:55`); ningún mensaje legítimo usa ese flag. Los mensajes valiosos de presupuestos (`presupuestos.service.ts:628/703/776` — "PRESUPUESTO ACEPTADO", "el paciente tiene una duda") se crean con `esSistema` en `false` por default → **no se tocan**.
- **D-02:** El `DELETE` debe ser **idempotente** y **cascade-safe**. Verificado: `MensajeLectura.mensaje` tiene `onDelete: Cascade` → borrar un `MensajeInterno` borra automáticamente sus read-receipts, sin huérfanos y sin tocar receipts de mensajes legítimos.
- **D-03:** El `DELETE` captura tanto las alertas dateadas "Seguimiento CRM — han pasado N días…" como las del tipo PERSONALIZADA del scheduler ("Tarea de seguimiento personalizada con…") — ambas usan `esSistema:true` y ambas se re-spamean, así que un filtro por texto `LIKE 'Seguimiento CRM%'` sería **incompleto** y fue descartado.

### Guard del scheduler (CHAT-01)
- **D-04:** Política tras la primera alerta: **una sola alerta por tarea, luego silencio hasta que el profesional la marque completa** (coincide con SC#1: "un solo mensaje sin importar cuántos días pasen"). Se descartó explícitamente el re-nudge periódico para esta release — sería un cambio deliberado de SC#1 y queda anotado como idea futura, no como parte del fix.
- **D-05:** Mecanismo del guard: usar los campos nuevos `notificada Boolean @default(false)` + `notificadaEn DateTime?` en `TareaSeguimiento`. El fix del servicio: agregar `notificada: false` al `WHERE` del `findMany`, y tras crear cada `MensajeInterno`, hacer `update({ notificada: true, notificadaEn: <now> })` sobre la tarea. La tarea sigue `completada:false` (el profesional la cierra manualmente cuando contacta) — sólo se marca como ya-notificada.

### Atomicidad del deploy (SC#3)
- **D-06:** El guard del scheduler (cambio de código) **y** la migración de limpieza deben desplegarse en la **misma release**. No puede existir una ventana donde el flood esté limpiado pero el guard no esté activo (regrows en un solo ciclo de cron). La migración de limpieza no debe correr a las 9am (hora del cron); correr off-peak en el deploy.

### Seed de catálogos
- **D-07:** Los modelos nuevos `AlergiaCatalogoPro` y `MedicamentoCatalogoPro` arrancan con seed **idempotente** (`esSistema: true`, no editables/borrables como sistema):
  - Alergias: **Penicilina, Látex, AINEs, Yodo, Contraste**
  - Medicación: **Anticoagulantes, Corticoides, Metformina, Levotiroxina, Aspirina, Enalapril**
- **D-08:** Patrón a reusar: seguir el mismo patrón de `ZonaHC`/`DiagnosticoHC`/`TratamientoHC` del módulo `catalogo-hc` (modelo con `esSistema`, `activo`, `profesionalId` FK, `@@unique([nombre, profesionalId])`, y `catalogo-hc.seed-data.ts` para el seed idempotente).

### Forma de almacenar estudios complementarios (PREOP-09)
- **D-09:** **DESVIACIÓN del research.** El research (SUMMARY.md §Phase 3) proponía embeber estudios dentro del blob `contenido` JSONB libre de la entrada HC (`estudiosResumen[{nombre, entregado}]`). **Decisión:** usar en su lugar un **campo `Json` dedicado y consultable** en la entrada de HC (shape estable, ej. `{ laboratorio: bool, ecg: bool, imagenes: string[] }`), separado del blob `contenido` libre, para satisfacer PREOP-09 ("almacenado de forma consultable") vía operadores JSON de Postgres **sin requerir backfill futuro** cuando se construya el reporte de estudios pendientes (FUT-04). Se descartó una tabla relacional `EstudioComplementario` dedicada por ser over-engineering para un checklist en v1.12.
- **Nota para researcher/planner:** definir la ubicación exacta del campo (`HistoriaClinicaEntrada` vs. otro) y el shape final del Json. La intención fija es: **campo Json propio, consultable, fuera del `contenido` libre.** Esta desviación debe reflejarse en cualquier definición de schema que el research haya propuesto para estudios.

### Claude's Discretion
- Nombre exacto y ubicación de los campos/columnas nuevos del schema (más allá de lo nombrado arriba), forma del migration file, orden de operaciones dentro de la migración.
- Resto de las columnas del milestone listadas en SUMMARY.md §Phase 1 (medicacion[], adicciones[], consentimientoFirmadoAt, portalToken hasheado, campos de staging del portal, `origenPaciente` en MensajeInterno, `autorId` nullable) — se arrastran tal cual del research salvo donde D-09 indica lo contrario.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning / requisitos del milestone
- `.planning/ROADMAP.md` §"Phase 51: Schema Foundation + Chat Fix" — goal, depends-on (Phase 50), requirements (CHAT-01, CHAT-02), success criteria 1–4.
- `.planning/REQUIREMENTS.md` — CHAT-01, CHAT-02 (fase 51) + el resto de los requisitos del milestone (PREOP/PORTAL/CONS/INFRA) que el schema big-bang debe habilitar; sección "Out of Scope" y "v2 Requirements" (FUT-04 = reporte de estudios pendientes).

### Research del milestone (el schema foundation está casi todo especificado acá)
- `.planning/research/SUMMARY.md` §"Phase 1 — Schema Foundation" — lista completa de columnas/modelos del milestone a migrar; §"Phase 2 — Seguimiento Scheduler Fix + Chat Cleanup" — fix de 3 líneas + DELETE idempotente. **OJO:** la propuesta de estudios en JSONB embebido (§Phase 3) queda sobreescrita por D-09.
- `.planning/research/PITFALLS.md` — pitfalls 1 (token hasheado desde creación), 10/11 (campo notificada), 13 (campos de staging definidos antes de que el portal escriba).
- `.planning/research/ARCHITECTURE.md` — referencia de arquitectura; **NOTA:** su §7/§1.1 proponía `portalToken` en texto plano — REchazado, el research lo corrige a SHA-256 hasheado (ver SUMMARY §Conflicts).

### Código a tocar / reusar
- `backend/src/prisma/schema.prisma` — schema existente (modelos Paciente, TareaSeguimiento, MensajeInterno, MensajeLectura, catálogos ZonaHC/DiagnosticoHC/TratamientoHC, ConfigClinica).
- `backend/src/modules/pacientes/seguimiento-scheduler.service.ts` — sitio del bug y del fix (CHAT-01).
- `backend/src/modules/mensajes-internos/mensajes-internos.service.ts` — queries del chat (verificar que la limpieza no rompe `findChats`/`findByPaciente`/contadores no-leídos).
- `backend/src/modules/catalogo-hc/catalogo-hc.seed-data.ts` y `catalogo-hc.service.ts` — patrón a copiar para los nuevos catálogos (AlergiaCatalogoPro, MedicamentoCatalogoPro) y su seed.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Módulo `catalogo-hc`** (`catalogo-hc.service.ts`, `catalogo-hc.seed-data.ts`): patrón establecido de catálogo por-profesional con `esSistema`/`activo`/`profesionalId` + `@@unique([nombre, profesionalId])` + seed idempotente. Reusar 1:1 para `AlergiaCatalogoPro` y `MedicamentoCatalogoPro`.
- **`Paciente.alergias String[]` y `Paciente.condiciones String[]`** ya existen (schema.prisma:162-163). `medicacion String[]` es el campo nuevo (PREOP-07).
- **Cascade `MensajeLectura.onDelete: Cascade`** ya definido → habilita el DELETE de limpieza sin lógica extra de read-receipts.

### Established Patterns
- Migraciones Prisma estándar (patrón probado en v1.6/v1.8/v1.9). Todas las columnas nuevas llevan `DEFAULT`; el único drop NOT NULL (`MensajeInterno.autorId`) es seguro vía `ALTER COLUMN ... DROP NOT NULL`.
- Schedulers con `@Cron(CronExpression...)` + `PrismaService` (patrón en `seguimiento-scheduler.service.ts`).

### Integration Points
- El fix del scheduler escribe en `TareaSeguimiento` (nuevos campos `notificada`/`notificadaEn`) y lee/crea `MensajeInterno`.
- La migración de limpieza borra filas de `MensajeInterno` → impacta las vistas de chat en `mensajes-internos.service.ts` (validar contadores no-leídos y orden por último mensaje tras la purga).

</code_context>

<specifics>
## Specific Ideas

- El usuario quiere que la limpieza sea **completa pero sin daño colateral**: aprovechar que `esSistema=true` es exclusivo del scheduler bugueado para purgar de un saque, en vez de filtros de texto frágiles.
- Preferencia explícita por **consultabilidad real** de los estudios (campo Json propio) por encima de la simplicidad de embeberlos en el blob libre — pensando en el reporte futuro FUT-04 sin pagar un backfill.

</specifics>

<deferred>
## Deferred Ideas

- **Re-nudge periódico de tareas de seguimiento** (re-alertar cada N días una tarea pendiente para que no se olvide). Choca con SC#1 de esta fase (un solo mensaje). Si se quiere, es un ajuste deliberado de criterio para un milestone futuro, no parte del fix actual.
- **Reporte/vista de estudios complementarios pendientes** (FUT-04) — fuera de v1.12; esta fase sólo deja el campo Json consultable para habilitarlo después sin migración.
- **Endpoint admin opcional para archivar/limpiar spam** (mencionado en research) — diferido; la migración one-shot alcanza para esta release.

</deferred>

---

*Phase: 51-schema-foundation-chat-fix*
*Context gathered: 2026-06-25*
