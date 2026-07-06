# Phase 59: Stepper Accionable - Context

**Gathered:** 2026-07-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Enriquecer (NO reemplazar) el stepper del sheet lateral del CRM
(`CardActionsSheet` → `EtapaStepper`) para que:
1. Los pasos muestren su **estado verde (completo) / naranja (pendiente)** usando el
   payload `pasos` que el backend ya expone en `getKanban` (construido en Phase 57).
2. Al hacer click en un paso **naranja** se abra el modal que lo resuelve:
   wizard de HC, presupuesto prellenado, o agenda de cirugía.

**Cubre:** STEPPER-01 a STEPPER-06 (frontend wiring del stepper + quick-actions).

**Fuera de esta fase:**
- Cambios de backend en el cómputo de `pasos` (ya hecho en Phase 57).
- Los conteos de estadísticas sobre registros reales (Phase 60).
- Acciones para `consentimiento`/`indicacionesPreop` (en esta fase solo estado visual).

**Restricción central (corrección del usuario):** NO se rediseña el stepper ni se
elimina la estructura actual. La cadena de 7 etapas, la navegación manual de etapa
(click → `updateEtapaCRM`) y el nodo PERDIDO **se conservan intactos**. Solo se
**agrega** encima el coloreo verde/naranja por paso y los botones de acción.
</domain>

<decisions>
## Implementation Decisions

### Modelo del stepper (enriquecer, no reemplazar)
- **D-01:** Se **mantiene** el stepper de 7 etapas actual (`EtapaStepper.tsx`) con su
  estructura, navegación por click de etapa y nodo PERDIDO. Phase 59 lo **enriquece**,
  no lo reescribe ni lo convierte en un checklist nuevo.
- **D-02:** Mapeo paso→etapa para el coloreo verde/naranja + acción. Solo 3 pasos tienen
  etapa donde "colgarse":
  - **Consulta Realizada** (`CONSULTADO`) ↔ paso `hc` → botón "Registrar HC"
  - **Presupuesto Enviado** (`PRESUPUESTO_ENVIADO`) ↔ paso `presupuesto` → botón presupuesto
  - **Confirmado** (`CONFIRMADO`) ↔ paso `cirugia` (turno de cirugía) → botón "Agendar cirugía"
- **D-03:** Semántica de color: para los 3 pasos mapeados, el círculo se pinta **verde si
  `pasos.<x> === 'completo'`** y **naranja si `=== 'pendiente'`** (STEPPER-01/02). El paso
  naranja muestra botón de acción; el verde no muestra botón (STEPPER-01). El estado del
  paso manda sobre la posición de embudo para estos 3 nodos. Las etapas que NO mapean a un
  paso (`SIN_CLASIFICAR`, `NUEVO_LEAD`, `TURNO_AGENDADO`, `PROCEDIMIENTO_REALIZADO`)
  conservan su coloreo de embudo actual (done/current/pending).
- **D-04:** `consentimiento` e `indicacionesPreop` no tienen etapa propia → se muestran como
  **sub-indicadores verde/naranja colgados debajo del paso "Confirmado"** (o de "Cirugía
  Realizada"), **solo estado visual, sin botón de acción** (las acciones no están en los
  requisitos STEPPER-03/04/05).
- **D-05:** **Filtrado por flujo.** Si el paciente es flujo `TRATAMIENTO`, ocultar los pasos
  que no aplican (los sub-indicadores de `cirugia`/`consentimiento`/`indicacionesPreop`) y
  mostrar solo `hc`/`presupuesto`. Se resuelve **client-side** con el campo
  `patient.flujo` que ya viene en el payload del kanban. (Edge case `PENDIENTE`/`null`:
  discreción del planner — recomendación: comportarse como CIRUGÍA/mostrar todo.)

### Navegación de etapa
- **D-06:** La navegación manual de etapa (mover al paciente por el embudo con click) y el
  nodo/acción PERDIDO **se conservan sin cambios** — al no tocar la estructura del stepper,
  esta funcionalidad queda intacta. El coloreo/acciones de pasos se **suman** a la
  interacción existente.

### Presupuesto prellenado (STEPPER-04)
- **D-07:** Fuente del prellenado: **catálogo estructurado del paciente** (tratamientos/
  cirugías cargados en la ficha clínica, no solo el string `procedimiento`). El researcher
  debe **confirmar dónde vive ese catálogo** en el backend antes de planificar.
- **D-08:** UX: **reusar el diálogo "Nuevo Presupuesto"** que ya existe en `PresupuestosView`
  (`frontend/src/components/patient/PatientDrawer/views/PresupuestosView.tsx`, modal ~línea
  262), abriéndolo **prellenado** con los ítems del catálogo. No crear un modal nuevo salvo
  que el researcher determine que el diálogo actual no soporta prellenado sin refactor grande.

### Agenda de cirugía (STEPPER-05/06)
- **D-09:** UX: **modal inline** — abrir el `NuevoTurnoModal` existente
  (`frontend/src/components/patient/PatientDrawer/views/NuevoTurnoModal.tsx`) desde el sheet
  con el paciente pre-seleccionado. No navegar fuera del CRM. Consistente con HC y presupuesto.
- **D-10:** Detección "tiene turno de cirugía" = `pasos.cirugia` (fuente de verdad = modelo
  `Cirugia`, Phase 57 D-07). Si `pasos.cirugia === 'completo'` → paso verde sin acción
  (STEPPER-06); si `pendiente` → naranja con acción "Agendar cirugía" (STEPPER-05).
- **D-11 (crítico para research):** Para que agendar haga pasar el paso a verde, el turno
  creado vía `NuevoTurnoModal` debe **quedar registrado como `Cirugia`**. El backend ya lo
  hace: `turnos.service.ts` (~líneas 677-728) busca el tipo de turno con `esCirugia = true`
  y ejecuta `tx.cirugia.create(...)`. El researcher debe confirmar que el modal permite/
  selecciona ese tipo de turno de cirugía (o adaptar el modal para forzarlo desde este flujo).

### HC wizard (STEPPER-03)
- **D-12:** Ya cableado en el sheet: el botón "Registrar HC" abre `HCCreatorDialog`
  (`profesionalId` requerido). Phase 59 solo condiciona su visibilidad al estado
  `pasos.hc === 'pendiente'` (naranja) y confirma que el wizard permite seleccionar la
  plantilla pertinente.

### Claude's Discretion
- Estilos exactos de verde/naranja (clases Tailwind), interacción entre el highlight de
  "etapa actual" (primary) y el nuevo color de paso en un nodo mapeado que además es el
  etapa current — el planner define la jerarquía visual.
- Comportamiento del edge case de flujo `PENDIENTE`/`null` (ver D-05).
- Ubicación/orden exacto de los sub-indicadores de consentimiento/indicaciones bajo Confirmado.

### Reviewed Todos (not folded)
- `cr-01-indicaciones-url-validation` (score 0.6) — **no folded.** Es un blocker de
  seguridad de **Phase 54** (XSS en `indicacionesUrl`), match débil por keyword "pre"/"phase".
  Sin relación con el wiring del stepper. Queda fuera de Phase 59.

### Plan-time confirmations (2026-07-04, aprobadas por el usuario en /gsd:plan-phase)
- **D-08 (revisado):** el prellenado del presupuesto usa **`GenerarPresupuestoModal`**
  (acepta `initialItems` + catalog picker) en lugar del diálogo interno de `PresupuestosView`
  (sin prop de prellenado). Cláusula de escape de D-08 activada. **Usuario aprobó.**
- **D-09 (revisado):** agendar cirugía usa **`SurgeryAppointmentModal`** (postea a
  `POST /turnos/cirugia` → crea `Cirugia` → `pasos.cirugia` verde) en lugar de
  `NuevoTurnoModal`, cuyo select excluye `esCirugia` y por diseño **no puede** crear un
  `Cirugia` (rompería STEPPER-06). D-11 ya anticipaba "adaptar el modal". **Usuario aprobó.**
- **D-07 (confirmado):** no existe hoy una fuente de procedimientos estructurados por-paciente
  en el frontend (`KanbanPatient` solo trae el string `procedimiento`). El prellenado matchea
  ese string contra el catálogo del profesional para adjuntar ítems con precio (fallback texto
  libre). **Usuario confirmó** que esta es la resolución de D-07 para Phase 59.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos y roadmap
- `.planning/REQUIREMENTS.md` — STEPPER-01 a STEPPER-06 (requisitos de esta fase)
- `.planning/ROADMAP.md` §"Phase 59: Stepper Accionable" — Goal y Success Criteria (4)
- `.planning/phases/57-backend-foundation-etapa-y-payload-enriquecido/57-CONTEXT.md` —
  cimientos de datos: definición de los 5 pasos (`D-05`), fuente del turno de cirugía
  = modelo `Cirugia` (`D-07`), payload de `getKanban`

### Frontend a tocar
- `frontend/src/components/crm/EtapaStepper.tsx` — stepper a enriquecer (círculos, botones
  contextuales; ya tiene `onPresupuestoClick`/`onHCClick`/`onClickEtapa`)
- `frontend/src/components/crm/CardActionsSheet.tsx` — sheet contenedor (orquesta modales:
  `HCCreatorDialog` ya montado; `handlePresupuestoClick`/`NuevoTurnoModal` a cablear)
- `frontend/src/hooks/useCRMKanban.ts` — tipos `PasosCrm` / `KanbanPatient.pasos` /
  `todosCompletos` / `flujo` (payload que dispara el coloreo)
- `frontend/src/components/patient/PatientDrawer/views/PresupuestosView.tsx` — diálogo
  "Nuevo Presupuesto" a reusar prellenado (modal ~línea 262; `useCreatePresupuesto`)
- `frontend/src/components/patient/PatientDrawer/views/NuevoTurnoModal.tsx` — modal de
  turno a reusar para agendar cirugía (props: `open`, `onOpenChange`, `pacienteId`)
- `frontend/src/components/patient/PatientDrawer/views/HCCreatorDialog.tsx` — wizard HC
  (ya cableado desde el sheet)

### Backend a verificar (research)
- `backend/src/modules/turnos/turnos.service.ts:~677-728` — crea `Cirugia` cuando el turno
  usa tipo con `esCirugia = true` (clave para que STEPPER-05 haga pasar `pasos.cirugia` a verde)
- Fuente del **catálogo estructurado** de tratamientos/cirugías del paciente para el
  prellenado del presupuesto (D-07) — ubicación a confirmar por el researcher

### Mapas de codebase
- `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/STRUCTURE.md`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EtapaStepper.tsx`: ya tiene botones contextuales para PRESUPUESTO_ENVIADO (`onPresupuestoClick`),
  CONSULTADO (`onHCClick`) y PROCEDIMIENTO_REALIZADO. Base lista para enriquecer con estado de pasos.
- `KanbanPatient.pasos` (`PasosCrm`) + `todosCompletos` + `flujo`: ya tipados y expuestos por el
  backend (Phase 57). El frontend solo lee y pinta.
- `HCCreatorDialog`: ya montado y cableado en `CardActionsSheet` (`hcOpen` state).
- `NuevoTurnoModal`: existe, recibe `pacienteId` — reutilizable para agendar cirugía.
- Diálogo "Nuevo Presupuesto" en `PresupuestosView` (`useCreatePresupuesto`, campos de
  procedimientos) — reutilizable con prellenado.

### Established Patterns
- Los modales de acción se montan dentro del `Sheet` vía `DialogPortal` (Radix) — sin
  conflicto de z-index (ver comentario en `CardActionsSheet.tsx:172`).
- El coloreo de círculos hoy deriva de la posición en `STEPPER_CHAIN` (funnel). Phase 59
  agrega una segunda dimensión (estado de paso) solo para los 3 nodos mapeados.
- El backend crea automáticamente un `Cirugia` al crear un turno de tipo `esCirugia`
  (`turnos.service.ts` ~677-728) — no hay que crear el `Cirugia` desde el frontend.

### Integration Points
- `CardActionsSheet` → `EtapaStepper` (props de estado de pasos + handlers de acción).
- `EtapaStepper` botón presupuesto → diálogo "Nuevo Presupuesto" prellenado.
- `EtapaStepper` botón cirugía → `NuevoTurnoModal` (tipo de turno cirugía).
- Estado de pasos proviene de `useCRMKanban` → `patient.pasos` / `patient.flujo`.

</code_context>

<specifics>
## Specific Ideas

- Corrección explícita del usuario: **"enriquecer el stepper que tenemos actualmente, no
  reemplazarlo"** — mantener la estructura de 7 etapas y sumar el estado accionable encima.
- Preview aprobado del estado por paso: verde ✅ = completo (sin botón), naranja 🟠 =
  pendiente (con botón de acción).

</specifics>

<deferred>
## Deferred Ideas

- Acciones (quick-actions) para los pasos `consentimiento` e `indicacionesPreop` — en Phase 59
  solo se muestran como estado visual bajo Confirmado. Cablear sus acciones sería una fase futura.

### Reviewed Todos (not folded)
- `cr-01-indicaciones-url-validation` — blocker de seguridad de Phase 54 (XSS en
  `indicacionesUrl`). Fuera del scope del stepper accionable; no folded.

</deferred>

---

*Phase: 59-stepper-accionable*
*Context gathered: 2026-07-04*
