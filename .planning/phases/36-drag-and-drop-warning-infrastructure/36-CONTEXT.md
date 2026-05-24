# Phase 36: Drag-and-Drop + Warning Infrastructure - Context

**Gathered:** 2026-05-24
**Status:** Ready for planning

<domain>
## Phase Boundary

El kanban permite mover un paciente a cualquier etapa mediante drag-and-drop sin restricciones de negocio. Si el movimiento destino es PRESUPUESTO_ENVIADO sin presupuesto existente, o CONFIRMADO sin presupuesto aceptado, aparece un toast de advertencia no bloqueante — el movimiento siempre se persiste. Si el backend falla (error de red), la card hace snap-back a su columna original. Se agrega `flujo` al tipo `KanbanPatient` (expuesto por Phase 35 backend) pero sin cambios visuales en la card (UI queda para Phase 37).

</domain>

<decisions>
## Implementation Decisions

### Warning toast style
- `toast.warning` (sonner) — amber/amarillo, no alarming
- El movimiento ya se completó cuando aparece el toast, por lo que rojo (`toast.error`) sería semánticamente incorrecto
- Duración: 4 segundos (default de sonner)
- Sin deduplicación: cada drag muestra su propio warning aunque el toast anterior aún esté visible

### Warning text (locked by requirements)
- PRESUPUESTO_ENVIADO sin presupuesto: `"No hay presupuesto enviado a este paciente"`
- CONFIRMADO sin presupuesto aceptado: `"Ningún presupuesto fue aceptado — verificá antes de confirmar"`
- Los warnings se disparan después del move optimista, simultáneamente con la actualización del backend

### Warning check logic
- La verificación se hace client-side usando `patient.presupuesto` ya disponible en `KanbanPatient`
- PRESUPUESTO_ENVIADO: warning si `patient.presupuesto === null`
- CONFIRMADO: warning si `patient.presupuesto?.estado !== 'ACEPTADO'`
- La lógica debe estar en una función utilitaria reutilizable (Phase 38 stepper usará la misma lógica)

### flujo field en KanbanPatient
- Agregar `flujo: 'CIRUGIA' | 'TRATAMIENTO' | 'PENDIENTE' | null` al tipo `KanbanPatient` en `useCRMKanban.ts`
- Sin cambios en la UI de `PatientCard` — Phase 37 rediseña el card y sheet, flujo se mostrará ahí
- El tipo debe estar disponible para que Phase 37 pueda acceder al campo sin modificar el tipo

### Error rollback UX
- Cuando el backend falla: `toast.error("No se pudo guardar el movimiento. Intentá de nuevo.")`
- Sin feedback visual en la card (sin shake, sin border rojo) — el snap-back automático + toast es suficiente
- El snap-back ya funciona via `onSettled` que limpia `pendingMoves`, disparando re-render con datos originales

### Claude's Discretion
- Estructura interna de la función utilitaria de warnings (inline en KanbanBoard vs archivo separado)
- Exactamente cuándo disparar el toast (antes del `updateEtapa` call o en el `onSuccess` callback)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `KanbanBoard.tsx:handleDragEnd` — punto de integración principal: agregar check de warnings antes del `updateEtapa` call, después de validar que `targetColumn !== fromColumn` y `targetColumn !== 'PERDIDO'`
- `sonner:toast.warning` — disponible sin nueva dependencia (ya importado `toast` de `sonner`)
- `KanbanPatient.presupuesto: { total, estado, fechaEnviado } | null` — dato ya disponible en el tipo, sin necesidad de fetch extra
- `useUpdateEtapaCRM` hook — ya existente, sin cambios necesarios en el hook

### Established Patterns
- Optimistic update pattern: `setPendingMoves` + `onSettled` cleanup ya implementado en `KanbanBoard.tsx`
- `toast.error` ya usado en `handleDragEnd` para el caso de error de red — solo actualizar el texto
- `LossReasonModal` pattern: intercepción del drag para PERDIDO ya implementada — el warning flow es análogo pero sin modal (toast directo)
- `@dnd-kit/core` ya instalado: `DndContext`, `DragOverlay`, `DragStartEvent`, `DragEndEvent`, `PointerSensor` todos en uso

### Integration Points
- `frontend/src/components/crm/KanbanBoard.tsx:handleDragEnd` — agregar warning logic
- `frontend/src/hooks/useCRMKanban.ts:KanbanPatient` — agregar campo `flujo`
- `frontend/src/hooks/useCRMKanban.ts:KanbanColumn` — sin cambios (flujo no se muestra en Phase 36)

</code_context>

<specifics>
## Specific Ideas

- La función utilitaria de warnings (`getEtapaWarning(patient, targetEtapa)`) debe retornar `string | null` — null = no warning, string = mensaje a mostrar. Phase 38 (stepper) importará esta misma función para los clicks de etapa.
- El texto del error genérico cambia de "No se pudo mover el paciente. Verificá los requisitos." a "No se pudo guardar el movimiento. Intentá de nuevo." — el anterior menciona "requisitos" que ya no existen en el backend.

</specifics>

<deferred>
## Deferred Ideas

- flujo badge visual en PatientCard — Phase 37 (rediseño completo del card y sheet)
- Deduplicación de toasts de warning — no necesario según decisión; sin embargo podría ser útil si el usuario hace drag-and-drop muy rápido

</deferred>

---

*Phase: 36-drag-and-drop-warning-infrastructure*
*Context gathered: 2026-05-24*
