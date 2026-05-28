# Phase 37: Sheet Redesign — Layout y Stepper UI - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Rediseño del sheet lateral del kanban. El sheet muestra el nombre del paciente + FlujoBadge en el header, el EtapaStepper como elemento visual principal, y un footer compacto con dos botones (Registrar contacto y Lista de espera). El panel de acciones rápidas actual (dar turno, crear presupuesto) desaparece. El stepper en esta phase es ESTÁTICO — las interacciones (click para mover etapa) quedan para Phase 38.

</domain>

<decisions>
## Implementation Decisions

### FlujoBadge en el header
- Labels completos: 'Cirugía' / 'Tratamiento' / 'Pendiente' — no abreviados (CIR/TRAT/PEND)
- El `FlujoBadge` existente en `/pacientes/components/FlujoBadge.tsx` necesita una variante o prop para labels completos (o se crea uno nuevo en el componente crm/)
- El campo `flujo` ya está disponible en `KanbanPatient` desde Phase 36 — sin fetch extra

### EtapaStepper — diseño visual
- Orientación: **vertical** — cada etapa es una fila
- Marcación de etapa actual: **círculo relleno color primario + label en negrita** (pasadas: círculo sólido tenue o check; futuras: círculo vacío gris)
- Labels: **completos siempre** — "Consulta Realizada", "Presupuesto Enviado", etc. (no abreviados)
- PERDIDO: **separado al final, visualmente distinto** — después de la cadena principal, con un divider o espacio, en rojo/gris. Si el paciente está PERDIDO, ese nodo se destaca
- El stepper es solo visual en Phase 37 — no tiene click handlers (eso es Phase 38)
- No existe ningún componente Stepper — construir desde cero con divs + Tailwind

### Layout y orden del sheet
- Estructura: **Header → Stepper (full height, scrollable) → Footer fijo con acciones**
- El stepper ocupa la mayor parte del sheet (flex-1 + overflow-y-auto)
- Footer fijo en la parte inferior con dos botones lado a lado
- "Ver perfil completo" puede ir como link pequeño en el footer o dentro del header

### Footer — botones lado a lado
- Botón izquierdo: **outline con icono + texto "Registrar contacto"** (abre ContactoRapidoModal)
- Botón derecho: **lista de espera** — cambia visual según estado:
  - Sin lista de espera: outline neutro "Agregar a lista de espera"
  - En lista de espera: borde amber "⏰ En lista de espera"

### ContactoRapidoModal
- Contenedor: **Dialog pequeño** (no Sheet anidado) — centrado, ancho pequeño
- Contenido: **mismo que el form actual** — selector de tipo (Llamada/Mensaje/Presencial) + Textarea nota opcional + botón Registrar
- Al registrar: **solo cierra el Dialog, el sheet queda abierto** — la secretaria puede seguir viendo el stepper
- El botón trigger en el footer es outline con icono + texto "Registrar contacto"

### Lista de espera (dialog)
- El botón abre un **pequeño Dialog** con el campo de comentario
- Si el paciente ya está en lista de espera: el Dialog se abre pre-llenado con el comentario actual y tiene opción de editar o "Quitar de lista de espera"
- Si no está en lista de espera: Dialog con campo de comentario vacío + botón "Agregar a lista de espera"
- El comentario es importante para la secretaria — no se elimina del flujo

### Panel de acciones rápidas — eliminado
- Los botones "Dar un turno" y "Crear presupuesto" del panel actual desaparecen del sheet (SHEET-09)
- Estas acciones quedan accesibles desde el PatientDrawer completo ("Ver perfil completo")

### Claude's Discretion
- Exactamente cómo mostrar el "Ver perfil completo" (link en footer, dentro del header, o botón ghost debajo del footer)
- Tamaño exacto del Dialog de ContactoRapidoModal
- Espaciado y tipografía interna del stepper
- Si las etapas "pasadas" muestran un check (✓) o un círculo sólido tenue

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/app/dashboard/pacientes/components/FlujoBadge.tsx` — FlujoBadge existente con labels abreviados. Necesita variante para labels completos o se crea `CRMFlujoBadge` en `/crm/`
- `frontend/src/components/ui/dialog.tsx` — Dialog de shadcn/ui disponible, listo para usar en ContactoRapidoModal y ListaEsperaDialog
- `frontend/src/hooks/useCreateContacto.ts` — hook ya existente, sin cambios (misma mutación que usa el form actual)
- `frontend/src/hooks/useUpdateListaEspera.ts` — hook ya existente para el toggle de lista de espera
- `frontend/src/components/crm/LossReasonModal.tsx` — patrón de referencia para "dialog desde sheet"
- `KanbanPatient.flujo` — campo disponible desde Phase 36, sin fetch extra necesario
- `KanbanPatient.etapaCRM` — campo existente, la etapa actual del paciente para destacar en el stepper

### Established Patterns
- Dialog sobre Sheet: `LossReasonModal` ya abre un Dialog desde dentro del kanban — mismo patrón para ContactoRapidoModal y ListaEsperaDialog
- Focus mode (`useUIStore.focusModeEnabled`) — el sheet actual no tiene focus mode styling en el SheetContent, pero PatientCard sí. Mantener consistencia con el sistema de focus mode si aplica
- El Sheet actual usa `sm:max-w-sm` — mantener el mismo ancho
- `toast.success` / `toast.error` de sonner — patrón establecido para feedback de acciones

### Integration Points
- `frontend/src/components/crm/KanbanBoard.tsx` — maneja `actionPatient` y `setActionPatient`. El `CardActionsSheet` se reemplaza por el nuevo `PatientActionsSheet` (o se renombra/modifica el existente)
- `frontend/src/components/crm/CardActionsSheet.tsx` — archivo a rediseñar completamente (mantener mismo nombre o renombrar a `PatientActionsSheet.tsx`)
- `frontend/src/hooks/useCRMKanban.ts:ETAPA_LABELS` — labels de etapas ya definidos, reutilizar en el stepper

</code_context>

<specifics>
## Specific Ideas

- El stepper vertical con círculo + línea conectora es el patrón visual esperado (similar a un timeline vertical)
- PERDIDO separado con un divider — si el paciente está en PERDIDO, ese nodo se destaca en rojo; si está en la cadena normal, PERDIDO aparece en gris tenue al final para indicar que existe pero no es el estado actual
- Al registrar un contacto, el sheet queda abierto — la secretaria puede seguir navegando el stepper sin tener que reabrir todo
- Los labels del stepper usan `ETAPA_LABELS` de `useCRMKanban.ts` (ya definidos: "Sin clasificar", "Nuevo Lead", "Consulta Agendada", "Consulta Realizada", "Presupuesto Enviado", "Confirmado", "Procedimiento Realizado")

</specifics>

<deferred>
## Deferred Ideas

- Click en etapa del stepper para mover al paciente — Phase 38
- PERDIDO en el stepper abre LossReasonModal — Phase 38
- Indicador de tiempo en etapa por paso (días en CONFIRMADO, etc.) — deferred a v1.x (STEP-01)
- Animaciones de transición en el stepper — deferred a v1.x (STEP-03)

</deferred>

---

*Phase: 37-sheet-redesign-layout-y-stepper-ui*
*Context gathered: 2026-05-26*
