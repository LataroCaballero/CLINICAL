# Phase 38: Stepper Interactions + Contextual Actions - Context

**Gathered:** 2026-05-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Hacer el EtapaStepper del CardActionsSheet interactivo: cada step es clickeable y mueve al paciente a esa etapa con la misma warning logic que el drag-and-drop. PERDIDO abre LossReasonModal. Cada step contextual (PRESUPUESTO_ENVIADO, CONSULTADO, PROCEDIMIENTO_REALIZADO) tiene un botón de acción que aparece debajo de su label.

</domain>

<decisions>
## Implementation Decisions

### Botones contextuales — placement
- Sub-fila debajo del label: el botón aparece indentado bajo el texto del label, en su propia línea
- variant='outline' size='sm' con icono relevante (ExternalLink para presupuesto, FilePlus para HC, CheckCircle para realizado)
- El botón reemplaza el padding del label: label con pb-1 (mínimo) + botón con mb-3 (el mismo espacio que antes usaba el label con pb-3 solo). El stepper no crece innecesariamente
- PROCEDIMIENTO_REALIZADO tiene botón contextual "Marcar como realizado" (aunque el comportamiento es idéntico a hacer click en el step — el botón lo hace más explícito por ser el último paso del flujo)

### Visibilidad de botones contextuales
- Los botones siempre son visibles en su step, sin importar la etapa actual del paciente (no condicional a patient.etapaCRM)
- Excepción: "Marcar como realizado" NO aparece cuando el paciente ya está en PROCEDIMIENTO_REALIZADO (ya está realizado, el botón sería un no-op confuso)
- Steps clickeables visualmente (cursor pointer + hover state): todos EXCEPTO el step actual — el step de la etapa actual no tiene hover ni cursor pointer (no tiene sentido moverse a sí mismo)
- PERDIDO: hover state en rojo/destructive — background rojo sutil al hover para indicar que es una acción especial/destructiva

### Ver/Crear presupuesto — navegación
- Al hacer click en "Ver/Crear presupuesto": cierra el sheet (onOpenChange(false)) y abre el PatientDrawer en tab 'presupuestos'
- No navega a /finanzas/presupuestos — el usuario queda en el kanban con el drawer abierto
- Implementación: nuevo prop `onOpenDrawerWithView(id: string, view: DrawerView)` en CardActionsSheet (adicional al onOpenDrawer existente). KanbanBoard pasa una función que setea drawerPatientId + drawerInitialView='presupuestos'

### Stepper click — UX de transición
- Optimistic update: igual que drag-and-drop — el stepper actualiza visualmente de inmediato, la API llama en background
- State local en CardActionsSheet: `useState<EtapaCRM | null>(null)` para la etapa optimista. Si es non-null, EtapaStepper usa ese valor en lugar de patient.etapaCRM. Al onSettled, se limpia
- En caso de error: toast.error('No se pudo guardar el movimiento. Intentá de nuevo.') + rollback visual (limpiar optimistic state). Mismo mensaje que el drag-and-drop
- La warning logic (getEtapaWarning de crm-warnings.ts) se ejecuta igual que en drag-and-drop: warning toast no bloqueante ANTES de confirmar la transición, la transición siempre procede

### Claude's Discretion
- Exact hover background color for PERDIDO (ej. hover:bg-red-50 vs hover:bg-red-100)
- Tamaño exacto del icono en los botones contextuales (h-3 w-3 vs h-4 w-4)
- Si usar `useUpdateEtapaCRM` hook directamente en CardActionsSheet o elevarlo a KanbanBoard via callback

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/lib/crm-warnings.ts:getEtapaWarning(patient, targetEtapa)` — retorna `string | null`. Reutilizar sin cambios para los clicks del stepper
- `frontend/src/components/crm/LossReasonModal.tsx` — props: `{ open, onConfirm, onCancel }`. Montar dentro de CardActionsSheet (mismo patrón que KanbanBoard). onConfirm recibe MotivoPerdidaCRM
- `frontend/src/components/crm/EtapaStepper.tsx` — actualmente sin onClick handlers. Needs `onClickEtapa?: (etapa: EtapaCRM) => void` prop y prop para etapa optimista `optimisticEtapa?: EtapaCRM | null`
- `frontend/src/components/patient/PatientDrawer/views/HCCreatorDialog.tsx` — wrapper listo: `{ open, onOpenChange, pacienteId, profesionalId, obraSocialId? }`. Reutilizar directamente desde CardActionsSheet
- `frontend/src/components/crm/CardActionsSheet.tsx` — archivo a modificar: agregar state local optimistic, LossReasonModal, HCCreatorDialog, y los botones contextuales en EtapaStepper
- `frontend/src/components/crm/KanbanBoard.tsx:drawerInitialView` — state ya existe para navegar el drawer a tab presupuestos. Solo necesita ser wired al nuevo prop de CardActionsSheet

### Established Patterns
- Dialog sobre Sheet: `LossReasonModal` ya usa DialogPortal → document.body, sin z-index/focus-trap conflicts con el Sheet. Mismo patrón para HCCreatorDialog (human-verified en Phase 37)
- `toast.warning` (4s, no bloqueante) para warnings CRM — patrón de Phase 36
- `toast.error` para errores de red — mismo mensaje que drag-and-drop
- `useUpdateEtapaCRM` hook — ya existente en KanbanBoard, sin cambios en el hook
- ETAPA_LABELS ya en `useCRMKanban.ts` — el EtapaStepper ya los usa, sin duplicar

### Integration Points
- `EtapaStepper.tsx` — agregar prop `onClickEtapa`, `optimisticEtapa`, y lógica de hover/cursor según si es etapa actual
- `CardActionsSheet.tsx` — agregar: useState optimistic, LossReasonModal state, HCCreatorDialog state, prop onOpenDrawerWithView, invoke useUpdateEtapaCRM
- `KanbanBoard.tsx` — pasar nuevo prop `onOpenDrawerWithView` a CardActionsSheet, wired a setDrawerInitialView + setActionPatient
- `HCCreatorFormProps` necesita `profesionalId` — obtener de `useEffectiveProfessionalId` hook dentro de CardActionsSheet (ya disponible en el codebase)

</code_context>

<specifics>
## Specific Ideas

- El botón contextual "Marcar como realizado" es esencialmente la misma acción que hacer click en el step PROCEDIMIENTO_REALIZADO — el botón es un CTA explícito para el último paso del flujo, no una acción diferente
- PERDIDO en el stepper: click → LossReasonModal se abre → usuario selecciona motivo → onConfirm(motivo) → updateEtapaCRM({ etapa: 'PERDIDO', motivoPerdida: motivo }) → stepper actualiza optimísticamente
- "Ver/Crear presupuesto": si patient.presupuesto es null (no existe), el PatientDrawer en tab presupuestos permite crear uno. Si existe, lo muestra directamente. La lógica de crear/ver ya está en el drawer existente
- El layout visual del step con botón:
  ```
  [ ○ ] Consulta Realizada       <- pb-1 en el label
           [ 📄 Registrar HC ]   <- mb-3, alineado con el label (indentado ~gap-3 del círculo)
     |  <- connector line continúa
  ```

</specifics>

<deferred>
## Deferred Ideas

- Animaciones de transición en el stepper al cambiar etapa — v1.x (STEP-03)
- Indicador de tiempo en etapa por step (días en CONFIRMADO, etc.) — v1.x (STEP-01)

</deferred>

---

*Phase: 38-stepper-interactions-contextual-actions*
*Context gathered: 2026-05-27*
