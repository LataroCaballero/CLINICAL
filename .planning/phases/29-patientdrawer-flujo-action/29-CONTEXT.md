# Phase 29: PatientDrawer Flujo Action - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Agregar un control de cambio de flujo en el PatientDrawer: un PencilIcon junto al FlujoBadge que abre un modal de confirmación. El cambio se aplica de forma optimista, con efectos CRM automáticos en el backend (etapaCRM → SIN_CLASIFICAR + contacto auto-registrado).

</domain>

<decisions>
## Implementation Decisions

### Placement del trigger
- PencilIcon pequeño (Lucide, w-3 h-3) junto al FlujoBadge en `PacienteDetails`, en el bloque del nombre/info básica
- Siempre visible para cualquier flujo (PENDIENTE, CIRUGIA, TRATAMIENTO) — el profesional puede reclasificar en cualquier momento
- Después del cambio exitoso: el drawer permanece abierto mostrando el nuevo FlujoBadge (actualización optimista visible inmediatamente)

### Contenido del modal de confirmación
- El modal muestra los efectos automáticos explícitamente: "El paciente quedará en la etapa Sin Clasificar y se registrará un contacto automático."
- Tono de acción normal (primario/azul), no destructivo — el cambio es reversible
- La nota del contacto automático es fija: "Paciente pendiente de clasificación" — sin campo editable en el modal

### Selector de flujo en el modal
- 3 cards/botones seleccionables con los colores del FlujoBadge existente: azul (CIRUGÍA), verde (TRATAMIENTO), ámbar (PENDIENTE)
- El flujo actual del paciente viene pre-seleccionado
- El botón "Confirmar" permanece deshabilitado si la selección no cambia respecto al flujo actual (previene noop calls al backend)
- Al seleccionar un flujo diferente → botón se habilita → click → optimistic update → llamada al backend

### Caché post-cambio y feedback
- Queries a invalidar en TanStack Query al cambio exitoso: `['paciente', id]`, `['pacientes']`, `['kanban']`
- Toast sonner: "✓ Flujo actualizado a CIRUGÍA" + link "Ver en CRM →" (navega al Kanban CRM)
- En caso de error de backend: revert del optimistic update + toast de error (PAC-03)

### Claude's Discretion
- Copy exacto del modal (título, descripción, label de botones)
- Diseño del hover state del PencilIcon (visible siempre vs solo en hover del área del badge)
- Loading state del botón Confirmar mientras espera respuesta del backend
- Tipo de Lucide icon para el PencilIcon (Pencil, PencilLine, Edit2, etc.)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FlujoBadge` (`frontend/src/app/dashboard/pacientes/components/FlujoBadge.tsx`) — colores exactos: blue-100/blue-700 para CIRUGIA, green-100/green-700 para TRATAMIENTO, amber-100/amber-700 para PENDIENTE. Reutilizar estos colores en las cards del selector del modal.
- `PacienteDetails.tsx` — FlujoBadge se renderiza en la línea ~80 dentro del bloque `<div className="flex flex-col justify-center">`. El PencilIcon se agrega junto al badge en ese mismo bloque.
- `PatientDrawer.tsx` — patrón de botón en header ya existe (`+ Nueva HC`). El trigger de flujo NO va en el header sino inline en PacienteDetails.
- `backend/src/modules/pacientes/pacientes.controller.ts:212` — `PATCH /pacientes/:id/flujo` ya existe pero solo actualiza el campo `flujo`. Necesita extenderse para los efectos CRM (etapaCRM + contacto).
- `sonner` toast — patrón establecido desde Phase 27. Usar para feedback de éxito y error.
- shadcn `Dialog` — usar para el modal de confirmación (mismo patrón que otros modals en la app).

### Established Patterns
- Optimistic updates en TanStack Query: aplicar el cambio localmente antes de la respuesta, revertir en `onError` — PAC-03 ya lo define.
- `useEffectiveProfessionalId` para contexto profesional — los contactos auto-registrados deben llevar el `profesionalId` correcto.
- `$transaction` para operaciones atómicas en el service de Prisma — el `updateFlujo` debe extenderse para hacer `flujo update + etapaCRM update + createContacto` en una transacción.
- Hooks en `frontend/src/hooks/` — crear `useUpdateFlujo.ts` con `useMutation` de TanStack Query.

### Integration Points
- `backend/src/modules/pacientes/pacientes.service.ts:952` — método `updateFlujo` actual solo hace `prisma.paciente.update({ data: { flujo } })`. Extender para: `$transaction([update flujo + etapaCRM SIN_CLASIFICAR, create Contacto])`.
- `frontend/src/app/dashboard/pacientes/components/PacienteDetails.tsx` — agregar PencilIcon + onClick handler junto al FlujoBadge (línea ~80).
- `PatientDrawer.tsx` — pasar el `pacienteId` y el `flujo` actual a `PacienteDetails` para que el modal pueda abrir con la selección pre-cargada.
- TanStack Query invalidations: `queryClient.invalidateQueries(['paciente', id])`, `['pacientes']`, `['kanban']` en el `onSuccess` del hook.

</code_context>

<specifics>
## Specific Ideas

- Las 3 cards del selector deben usar los mismos colores exactos del FlujoBadge: azul, verde, ámbar. Consistencia visual total.
- El modal debe decir explícitamente los side effects para que el profesional no se sorprenda cuando vea el Kanban resetear la etapa del paciente.
- El link "Ver en CRM →" en el toast es importante: después de cambiar el flujo, el paso natural es ir a clasificar al paciente en el Kanban.

</specifics>

<deferred>
## Deferred Ideas

None — la discusión se mantuvo dentro del scope de Phase 29.

</deferred>

---

*Phase: 29-patientdrawer-flujo-action*
*Context gathered: 2026-04-29*
