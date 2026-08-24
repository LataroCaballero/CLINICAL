# Phase 64: Indicadores de Pendientes y Planilla Legible (Frontend) - Context

**Gathered:** 2026-07-31
**Status:** Ready for planning

<domain>
## Phase Boundary

La secretaria ve de un vistazo qué acción falta por paciente en el kanban, y la planilla de tratamientos muestra la información completa sin truncarse silenciosamente. Dos entregables:

1. **CONTACTO-03 / CONTACTO-04** — Badge de pendiente por etapa en la zona inferior de la card del kanban: "Dar turno" para `NUEVO_LEAD`, "Ser atendido" para `TURNO_AGENDADO`.
2. **TRAT-07** — La columna "Último tratamiento" de la planilla muestra **todos** los tratamientos del turno (no "primero +N-1"), truncados en la celda por CSS, con tooltip (hover) que revela el texto completo.

**Nominalmente "Frontend", pero TRAT-07 exige un touch mínimo de backend:** el colapso `"primero +N-1"` se arma en el backend (`formatearResumen`) y el frontend hoy solo recibe el string ya colapsado. Para mostrar todos los nombres el backend debe exponer la lista completa.

**Recontacto ("Cirugía cancelada") NO es scope de esta fase** — ya está cubierto por Phase 63 (ver Deferred).
</domain>

<decisions>
## Implementation Decisions

### CONTACTO-03/04 — Badge de pendiente en la card
- **D-01 (estilo):** Usar el componente **shadcn `Badge`** (`frontend/src/components/ui/badge.tsx`) para el pendiente. Esto introduce `Badge` en `PatientCard.tsx` (hoy los badges de esa card son `<span>` con Tailwind a mano) — decisión explícita del usuario, no reusar el patrón de spans para este indicador.
- **D-02 (textos):** `NUEVO_LEAD` → "Dar turno"; `TURNO_AGENDADO` → "Ser atendido". Textos fijos por requisito.
- **D-03 (ubicación):** En la "zona de registro de contacto inferior" de la card (el bloque de badges/pendientes de la mitad inferior de `PatientCard.tsx`, junto a Espera / Aut. pendiente / Última interacción).
- **D-04 (condición de render):** La card ya ramifica por `columnId` (`"NUEVO_LEAD"`, `"TURNO_AGENDADO"`, `"CONFIRMADO"`…). Usar ese mismo mecanismo para condicionar el badge por columna/etapa (planner: confirmar `columnId` vs `patient.etapaCRM`; hoy la card branchea mayormente por `columnId`).

### TRAT-07 — Planilla legible (celda + tooltip)
- **D-05 (display de celda):** Todos los nombres de tratamiento en una línea, coma-separados, **truncados por CSS** al ancho de la celda (patrón `truncate` actual).
- **D-06 (tooltip):** Reemplazar el `title` nativo actual por el **componente Radix `Tooltip`** (`frontend/src/components/ui/tooltip.tsx`, ya existe y se usa en ~10 archivos). Al hover revela la **lista completa** de tratamientos. Cumple Success Criteria #3 y #4.
- **D-07 (backend — exponer lista completa):** Agregar en el payload de `GET /turnos/rango` un **nuevo campo array** con la lista completa de nombres de tratamiento (p.ej. `tratamientos: string[]` / `ultimoTratamientoDetalle: string[]`), **manteniendo `ultimoTratamiento` sin cambios** para no romper consumidores. El frontend decide cómo mostrarlo (evita acoplar el formato al backend). No cambiar `formatearResumen` (sigue produciendo el string colapsado para compatibilidad).

### Recontacto (Phase 63 handoff) — NO se implementa aquí
- **D-08:** El pendiente "Cirugía cancelada, recontactar" **NO** se agrega como badge nuevo en la card. Ya está cubierto end-to-end por Phase 63: al cancelar una cirugía, `turnos.service.ts:281` crea automáticamente un `contactoLog` (`tipo=SISTEMA`, `nota='Cirugía cancelada — requiere recontacto'`) y `getKanban` lo expone vía `ultimoContactoNota` (`pacientes.service.ts:730`), por lo que la card ya lo muestra en "Última interacción" apenas ocurre la cancelación. Phase 64 solo lo **verifica en UAT**, sin código nuevo.

### Claude's Discretion
- Estructura concreta del nuevo campo array en el DTO/response de `/turnos/rango` (nombre del campo, tipo, dónde se arma en `turnos.service.ts`).
- Cómo obtener la lista completa de nombres en el backend: extender `resumirTratamientosDeContenido` o agregar un helper paralelo que devuelva `string[]` sin colapsar. **Ojo con la rama free-text**: para contenido de texto libre no hay array de nombres — decidir si el "detalle" en ese caso es el texto completo (sin el corte a `TEXTO_LIMITE`) o se omite.
- Manejo de estados vacíos: fila sin tratamientos (celda vacía / guion), un solo tratamiento (sin tooltip o tooltip con el mismo nombre).
- Estilo/variant exacto del `Badge` (outline/secondary/color) que mejor comunique "acción pendiente" dentro de la card.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos y roadmap
- `.planning/ROADMAP.md` § "Phase 64" — Goal, Success Criteria (4). Depends on: Phase 63.
- `.planning/REQUIREMENTS.md` — CONTACTO-03 (línea 19), CONTACTO-04 (línea 20), TRAT-07 (línea 24). Out of Scope líneas 57-61 (mantener origen por-turno de "Último tratamiento"; no nueva etapa/columna CRM).
- `.planning/phases/63-flujo-crm-autom-tico-backend/63-CONTEXT.md` — dependencia directa: define D-07 (recontacto) y cómo se poblan `NUEVO_LEAD`/`TURNO_AGENDADO`/`flujo=TRATAMIENTO`. El handoff del badge de recontacto se resuelve aquí como D-08 (no-op).

### Frontend — Badges en la card (CONTACTO-03/04)
- `frontend/src/components/crm/PatientCard.tsx` — card del kanban; zona inferior de badges (líneas ~104-156: Última interacción, Espera, Aut. pendiente); ya ramifica por `columnId`. Punto de inserción del nuevo `Badge`.
- `frontend/src/hooks/useCRMKanban.ts` — tipos `EtapaCRM` (líneas 4-12), `KanbanPatient` (36-64), `ETAPA_LABELS` (72-81, `TURNO_AGENDADO`→"Consulta Agendada"); hook `useCRMKanban` (96-111, `GET /pacientes/kanban`).
- `frontend/src/components/crm/KanbanColumn.tsx` — renderiza `PatientCard` (línea ~66), pasa `columnId`.
- `frontend/src/components/ui/badge.tsx` — componente `Badge` (CVA, variants default/secondary/destructive/outline) a usar (D-01).

### Frontend — Planilla de tratamientos (TRAT-07)
- `frontend/src/app/dashboard/pacientes/components/TratamientosTab.tsx` — tabla; header "Último tratamiento" (~222-224); celda con `truncate max-w-[200px]` + `title` nativo (~272-292) a reemplazar por Radix Tooltip.
- `frontend/src/hooks/useTurnosRangos.ts` — hook `useTurnosRango` (`GET /turnos/rango`); tipo `TurnoRango` (líneas 4-14, `ultimoTratamiento?: string | null`) — sumar aquí el nuevo campo array.
- `frontend/src/components/ui/tooltip.tsx` — `Tooltip/TooltipTrigger/TooltipContent/TooltipProvider` (Radix) a usar (D-06).

### Backend — Origen del "Último tratamiento" (touch de TRAT-07)
- `backend/src/modules/turnos/turnos.service.ts` — builder de `/turnos/rango` (select de `entradaHC.contenido` ~578-583; mapeo `ultimoTratamiento` vía `resumirTratamientosDeContenido` ~589-598). Agregar aquí el nuevo campo array (D-07).
- `backend/src/modules/historia-clinica/historia-clinica.contenido.helpers.ts` — `formatearResumen` (líneas 150-154, arma "primero +N-1"); `resumirTratamientosDeContenido` (líneas 93-142, colecta `nombres[]` y colapsa; 3 formas de contenido: v1.9 zona-grouped, legacy flat `tratamientos[]`, free-text). Fuente de la lista completa.
- `backend/src/modules/historia-clinica/historia-clinica.contenido.spec.ts` — tests que fijan el formato "+N" (p.ej. "Lipoaspiración +2"); actualizar/añadir cobertura para el nuevo campo array sin romper la salida colapsada existente.

### Recontacto (contexto, ya implementado — solo lectura)
- `backend/src/modules/turnos/turnos.service.ts:256-293` — `cancelarTurno` de cirugía: crea `contactoLog` SISTEMA con la nota de recontacto (D-08).
- `backend/src/modules/pacientes/pacientes.service.ts:655-661, 730-731` — `getKanban` expone `ultimoContactoNota` desde el último `contactoLog`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui/badge.tsx` y `components/ui/tooltip.tsx` ya existen y están probados en el repo — no hay que crear componentes nuevos, solo integrarlos.
- `resumirTratamientosDeContenido` ya colecta el array `nombres[]` internamente antes de colapsarlo con `formatearResumen`; exponer la lista completa es incremental (no re-parsear el contenido HC).
- La card ya tiene la infraestructura de "zona inferior de badges" y ramificación por `columnId` — el badge de pendiente se suma al patrón existente.

### Established Patterns
- Badges informativos actuales de `PatientCard` son `<span>` Tailwind a mano; **para este indicador el usuario eligió romper con ese patrón y usar el componente `Badge`** (D-01). Mantener coherencia visual pero vía el componente.
- Radix `Tooltip` requiere un `TooltipProvider` en el árbol — verificar si ya hay uno arriba de `TratamientosTab` o envolver localmente (patrón de los ~10 usos existentes).

### Integration Points
- `PatientCard.tsx` → nuevo `Badge` condicionado por etapa/`columnId` (CONTACTO-03/04).
- `TratamientosTab.tsx` → celda "Último tratamiento": render de lista completa (coma-separada, truncada) + Radix Tooltip; consumir el nuevo campo array de `TurnoRango`.
- `turnos.service.ts` (rango) + `historia-clinica.contenido.helpers.ts` → exponer `string[]` de tratamientos sin colapsar (manteniendo `ultimoTratamiento`).
- `useTurnosRangos.ts` (`TurnoRango`) → tipar el nuevo campo.

### Constraint
- **No cambiar el origen de datos** de "Último tratamiento": sigue derivándose por-turno de la HC del turno (Out of Scope REQUIREMENTS.md línea 58). Solo cambia qué se expone/muestra, no de dónde sale.

</code_context>

<specifics>
## Specific Ideas

- El indicador de pendiente debe "gritar" la acción que falta ("Dar turno" / "Ser atendido") para que la secretaria la resuelva de un vistazo desde el kanban.
- El recontacto de cirugía cancelada ya aparece solo en la card como "Última interacción" (auto-registrado por Phase 63); no requiere un segundo indicador.

</specifics>

<deferred>
## Deferred Ideas

- **Badge dedicado "Cirugía cancelada, recontactar" en la card** — descartado (D-08). Ya cubierto por el `contactoLog` automático de Phase 63 + render de `ultimoContactoNota`. Alternativas discutidas y NO elegidas: resaltar visualmente la nota SISTEMA, o prellenar el form `ContactoSheet`. Si en el futuro se quiere destacar recontacto vs. contactos normales, sería su propia mejora.
- **Vista/endpoint dedicado de planilla server-side** — heredado de Phase 63; no se agrega. TRAT-07 se resuelve con un campo extra en `/turnos/rango`, no con un endpoint nuevo.

### Reviewed Todos (not folded)
None — no había todos pendientes que matchearan esta fase.

</deferred>

---

*Phase: 64-Indicadores de Pendientes y Planilla Legible (Frontend)*
*Context gathered: 2026-07-31*
</content>
</invoke>
