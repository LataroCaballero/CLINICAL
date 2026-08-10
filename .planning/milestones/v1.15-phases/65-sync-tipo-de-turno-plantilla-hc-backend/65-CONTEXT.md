# Phase 65: Sync Tipo de Turno ↔ Plantilla HC (Backend) - Context

**Gathered:** 2026-08-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Al guardar una entrada de HC **sobre un turno** (LiveTurno), el `tipoTurno` del turno se ajusta automáticamente según la plantilla usada, sin que el profesional lo corrija a mano en la agenda:

1. **HCSYNC-01** — plantilla "Primera vez" → tipo turno **Consulta**.
2. **HCSYNC-02** — plantilla "Tratamiento en consultorio" → tipo turno **Tratamiento**.
3. **HCSYNC-03** — plantilla "Pre-quirúrgico" → tipo turno **Pre-Quirúrgico**.
4. **Guard (SC#4)** — si la HC se carga **sin turno asociado** (entrada retroactiva desde PatientDrawer, `dto.turnoId` ausente), **ningún** tipo de turno se modifica.

Backend puro sobre `crearEntrada`. No hay cambios de schema ni de frontend (la agenda lee el `tipoTurno` actualizado como ya lo hace). Las plantillas `control` / `practica` / `libre` quedan **fuera** del sync.
</domain>

<decisions>
## Implementation Decisions

### Modelo de sobrescritura — Escalera de prioridad numérica (order-independent)
- **D-01:** El comportamiento se modela como una **escalera de prioridad pura**: `Consulta (1) < Tratamiento (2) < Pre-Quirúrgico (3)`. La sincronización aplica el tipo destino **solo si su rango es mayor** que el rango del tipo actual del turno. Nunca **baja** un tipo ya avanzado.
- **D-02:** El tipo interno **`Cirugía` está protegido**: si el turno es de cirugía, **nunca** se toca su tipo (evita sacar un turno quirúrgico real de la agenda de cirugía). Detección: `turno.esCirugia === true` (el flag denormalizado ya se pre-fetchea en `crearEntrada`, ver code_context). Sirve como sentinel de máxima prioridad ("no tocar").
- **D-03:** Cualquier tipo **no mapeado** en la escalera (`Control`, `null`, u otro) cuenta como **rango 0** (lo más bajo) → puede ser sobrescrito por cualquiera de las 3 plantillas.
- **Resultado por plantilla frente al tipo actual:**
  - **Primera vez → Consulta:** dispara si `currentRank < 1` (o sea `Control`/`null`/no-mapeado). Si ya es Consulta → no-op. Si es Tratamiento/Pre-Quirúrgico → **no** dispara (no degrada). Cirugía → nunca.
  - **Tratamiento → Tratamiento:** dispara si `currentRank < 2` (`Consulta`, `Control`, `null`, no-mapeado). NO dispara sobre Pre-Quirúrgico (no degrada) ni Cirugía (protegido). Esto cubre HCSYNC-02 (`Consulta → Tratamiento`) **y** el extra razonable `Control → Tratamiento`. **Decisión explícita del usuario:** se prefirió "cualquier tipo por debajo (no protegido)" sobre el literal "solo desde Consulta", para que la escalera sea 100% numérica y totalmente independiente del orden.
  - **Pre-quirúrgico → Pre-Quirúrgico:** dispara siempre (es el tope) **excepto** si el turno es Cirugía. Si ya es Pre-Quirúrgico → no-op.

### Múltiples plantillas en una sesión — Independiente del orden
- **D-04:** El wizard de LiveTurno crea **entradas separadas** por plantilla (patrón confirmado en Phase 63 D-08): "Primera vez + Tratamiento en consultorio" = **dos** llamadas independientes a `crearEntrada` sobre el mismo turno. Con la escalera numérica pura (D-01/D-02/D-03) el tipo final **no depende del orden** de guardado: el rango mayor siempre queda (ej. Tratamiento gana sobre Consulta sin importar cuál entrada se guarde primero). No hace falta lógica cross-entrada.

### Alcance del cambio en el turno — Tipo + esCirugia, sin tocar flujo
- **D-05:** La sincronización escribe **`Turno.tipoTurnoId`** (FK al `TipoTurno` destino, buscado por `nombre`) y sincroniza el flag denormalizado **`Turno.esCirugia`** con el `esCirugia` del tipo destino (los 3 destinos son `false`, así que en la práctica hoy no cambia, pero deja el flag consistente).
- **D-06:** **NO** se re-disparan efectos sobre `Paciente.flujo` ni `etapaCRM`. El flujo del paciente ya lo maneja la lógica HC existente (`resolverNuevoFlujo` en `historia-clinica.flujo.helpers.ts`, tocada en Phase 63). Duplicarlo acá provocaría doble-fire / conflicto con Phase 63. Esta fase toca **solo el turno**.

### Discriminador y mapeo — Por `dto.tipo` (la plantilla)
- **D-07:** El sync se keyea por **`dto.tipo`** (la plantilla), NO por el enum `tipoEntrada`. Mapa:
  - `primera_vez` → `Consulta`
  - `tratamiento_en_consultorio` → `Tratamiento`
  - `pre_quirurgico` → `Pre-Quirúrgico`
  - `control` / `practica` / `libre` → **sin sync** (no tocan el tipo de turno)
- **D-08:** Los `TipoTurno` destino se resuelven por su `nombre` (`@unique`): `'Consulta'`, `'Tratamiento'`, `'Pre-Quirúrgico'` (nombres canónicos seedeados, ver canonical_refs). La comparación del tipo actual también es por `nombre`.

### Guard de turno (SC#4)
- **D-09:** Toda la lógica de sync está condicionada a que **`dto.turnoId` esté presente**. Sin `turnoId` (entrada retroactiva desde PatientDrawer) → no se ejecuta ningún query ni update de turno. Esto satisface el Success Criterion #4 sin lógica adicional.

### Claude's Discretion
- **Dónde vive la lógica:** se recomienda un helper puro y testeable — p.ej. `resolverTipoTurnoSync(plantilla: dto.tipo, currentTipoNombre, currentEsCirugia) → targetTipoNombre | null` — siguiendo el patrón de `resolverNuevoFlujo` (Phase 63, con suite de casos). La escalera + protecciones se prestan a TDD.
- **Atomicidad:** dónde ubicar el `prisma.turno.update` dentro de `crearEntrada` (idealmente dentro de la misma transacción/flujo que ya crea la entrada, para no dejar el turno desincronizado si algo falla después). Research/planner decide si `crearEntrada` ya envuelve en `$transaction`.
- **No-op idempotente:** saltear el `update` si el `tipoTurnoId` destino ya coincide con el actual (evita escrituras innecesarias).
- **Resolución del `TipoTurno.id`:** cachear/lookup por `nombre`; comportamiento defensivo si el tipo destino no existe en el entorno (skip silencioso del sync, **no** romper el guardado de la HC).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos y roadmap
- `.planning/ROADMAP.md` § "Phase 65: Sync Tipo de Turno ↔ Plantilla HC (Backend)" — Goal, 4 Success Criteria, Depends on: nada (independiente de 63/64).
- `.planning/REQUIREMENTS.md` — HCSYNC-01/02/03 (líneas 28-30, incluye el guard común "sin turno → no cambia"); Out of Scope (líneas 55-61: sin migración de enum, sin nuevos tipos personalizados).
- `.planning/PROJECT.md` § Core Value — "que el cirujano cierre más cirugías; todo automatizado y simple para no-técnicos" (esta fase elimina la corrección manual del tipo de turno).

### Contexto de la fase previa que toca el mismo código
- `.planning/phases/63-flujo-crm-autom-tico-backend/63-CONTEXT.md` — D-08 (el wizard crea entradas separadas), y la lógica de flujo (`resolverNuevoFlujo`) que **NO** debemos duplicar (D-06). `crearEntrada` líneas ~79-361 mapeadas ahí.

### Código a modificar / respetar (backend/)
- `backend/src/modules/historia-clinica/historia-clinica.service.ts` — `crearEntrada(pacienteId, dto, profesionalId?)` en **:82**. Hoy usa `dto.turnoId` solo para pre-fetch de `turno.esCirugia` (**:228-233**) y para estampar `OrdenConsumo.turnoId` (**:358**); **no escribe de vuelta al turno**. Aquí se agrega el `turno.update` del sync. `tipoEntrada` resuelto en :238-241, escrito en :258.
- `backend/src/modules/historia-clinica/dto/crear-entrada.dto.ts` — `CreateEntradaDto`: `tipo` (discriminador, :50-56: `primera_vez | pre_quirurgico | control | practica | tratamiento_en_consultorio | libre`), `turnoId?` (**:89**, presente desde LiveTurno / null desde PatientDrawer), `tipoEntrada?` (:99-104).
- `backend/src/modules/historia-clinica/historia-clinica.flujo.helpers.ts` — patrón de helper puro (`resolverTipoEntrada` :47-54, `resolverNuevoFlujo`); ubicación natural para `resolverTipoTurnoSync`. **No** re-disparar flujo desde el sync (D-06).
- `backend/src/prisma/schema.prisma` — `model TipoTurno` (**:792-803**: `nombre @unique`, `esCirugia`, `flujoPaciente`); `model Turno` (**:821-854**: `tipoTurnoId` :825, relación `tipoTurno` :849, `esCirugia` :832, `entradaHCId` :835); `HistoriaClinicaEntrada.tipoEntrada` :313, back-relation `Turno[]` :320; enum `TipoEntradaHC` :1199-1205, `FlujoPaciente` :1193.
- `backend/src/prisma/seed-tipos-turno.ts` — **:11-37** nombres canónicos: `Consulta`, `Control`, `Pre-Quirúrgico`, `Tratamiento`, `Cirugía` (`esCirugia:true`). Fuente de verdad de los strings del mapeo (D-07/D-08).
- `backend/src/prisma/migrations/20260608000000_migracion_tipos_turno_v18/migration.sql` — renombres a los nombres actuales ("Pre-operatorio"→"Pre-Quirúrgico", etc.); confirma que los strings del mapeo son estables.

### Referencia (patrones de update de turno, NO a duplicar)
- `backend/src/modules/turnos/turnos.service.ts` — patrones de `prisma.turno.update` (scoped solo por `{ id: turnoId }`, single-tenant), y **el anti-patrón a evitar**: `crearTurno` (:150-170) copia `flujoPaciente`→`paciente.flujo` y gatea etapa por `nombre==='Consulta'`. Esta fase **NO** replica esos efectos de paciente (D-06). `cerrarSesion` (:922-963) es donde se linkea `entradaHCId` al turno.

### Nota de arquitectura
- **Single-tenant:** no existe columna `clinicaId`/tenant en el schema; el scoping es solo por `profesionalId`. `TipoTurno` es **global** (no per-clínica), buscable por `nombre @unique` sin filtro de tenant.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `crearEntrada` ya pre-fetchea el turno y expone `turno.esCirugia` (:228-233) → la protección del tipo interno Cirugía (D-02) sale sin query extra.
- Patrón de helper puro `resolverTipoEntrada`/`resolverNuevoFlujo` (`historia-clinica.flujo.helpers.ts`) → plantilla directa para `resolverTipoTurnoSync` con suite de tests.
- `TipoTurno.nombre @unique` → lookup del id destino por nombre, sin ambigüedad ni tenant filter.

### Established Patterns
- Transiciones/efectos se hacen inline en los services con guards (estilo Phase 63), sin event bus.
- Updates de turno scoped solo por `{ id }` (single-tenant). `esCirugia` es un flag denormalizado que conviene mantener consistente con el tipo (D-05).

### Integration Points
- **Único punto de enganche:** `historia-clinica.service.ts::crearEntrada` — bajo guard `dto.turnoId` presente (D-09), tras resolver el tipo, un `prisma.turno.update` que setea `tipoTurnoId` (+`esCirugia`) según `resolverTipoTurnoSync`.
- No hay cambios en controller, DTO, schema ni frontend. La agenda ya lee `turno.tipoTurno` actualizado.

</code_context>

<specifics>
## Specific Ideas

- El modelo mental es una **escalera de prioridad clínica**: una primera consulta es el piso, un tratamiento la sube, un pre-quirúrgico es el techo; nada baja el tipo, y un turno de cirugía real es intocable. Esto hace el comportamiento predecible e independiente del orden con que se guarden las entradas.
- La decisión de que `Control → Tratamiento` también dispare (además de `Consulta → Tratamiento`) es intencional: si sobre un turno de control se cargó un tratamiento en consultorio, el turno *fue* un tratamiento.

</specifics>

<deferred>
## Deferred Ideas

- **Tipos de turno personalizados por profesional** (TIPO-F01) y **color por tipo en el calendario** (TIPO-F02) — diferidos de v1.8, fuera de esta fase. Si existieran tipos custom, quedarían como rango 0 (no mapeados) → sobrescribibles; se revisará cuando se implemente TIPO-F01.
- **Frontend/UX de HC** (wizard en PatientDrawer, render prequirúrgico) → **Phase 66** (HCUI-01/02). Esta fase es backend puro.

None — la discusión se mantuvo dentro del scope de la fase.

</deferred>

---

*Phase: 65-Sync Tipo de Turno ↔ Plantilla HC (Backend)*
*Context gathered: 2026-08-04*
</content>
</invoke>
