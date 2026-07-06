# Phase 59: Stepper Accionable - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-04
**Phase:** 59-stepper-accionable
**Areas discussed:** Modelo del stepper, Navegación de etapa, Presupuesto prellenado, Agenda de cirugía

---

## Modelo del stepper

| Option | Description | Selected |
|--------|-------------|----------|
| Recolorear etapas mapeadas | Mantener cadena de 7 etapas; solo las mapeadas pintan verde/naranja | |
| Rediseñar como checklist de pasos | Reemplazar cadena por checklist de 5 pasos canónicos | (elegido inicialmente, luego corregido) |
| Híbrido: etapas + pasos | Cadena de etapas + checklist accionable en secciones separadas | |

**User's choice:** Inicialmente "Rediseñar como checklist", **corregido por el usuario** a
"enriquecer el stepper actual, NO reemplazarlo". Resultado final: mantener la estructura de
7 etapas y sumar el estado verde/naranja + acciones encima.
**Notes:** Corrección textual del usuario: *"la idea es enriquecer el stepper que tenemos
actualmente, no te equivoques con eso"*. La navegación de etapa y el nodo PERDIDO se conservan.

### Sub-decisión — Filtrado por flujo

| Option | Description | Selected |
|--------|-------------|----------|
| Filtrar por flujo | En TRATAMIENTO ocultar cirugía/consentimiento/indicaciones | ✓ |
| Mostrar siempre los 5 | Usar el payload tal cual sin lógica de flujo | |
| Vos decidís | Delegar al planner/researcher | |

**User's choice:** Filtrar por flujo (client-side con `patient.flujo`).

### Sub-decisión — Pasos sin etapa (consentimiento / indicaciones preop)

| Option | Description | Selected |
|--------|-------------|----------|
| Fuera de esta fase | No mostrarlos aún | |
| Colgarlos de Confirmado | Sub-indicadores verde/naranja bajo Confirmado, sin acción | ✓ |
| Vos decidís | Delegar ubicación al planner | |

**User's choice:** Colgarlos de Confirmado como estado visual sin acción.

---

## Navegación de etapa

**Resuelta implícitamente por la corrección del modelo:** al no reemplazar la estructura del
stepper, la navegación manual de etapa (click → `updateEtapaCRM`) y el nodo PERDIDO se
conservan intactos. No se presentó pregunta final (la pregunta original quedó obsoleta tras
la aclaración del usuario).

---

## Presupuesto prellenado

### Fuente del prefill

| Option | Description | Selected |
|--------|-------------|----------|
| El procedimiento de la ficha | Prellenar con el string `procedimiento` | |
| Catálogo estructurado del paciente | Prellenar desde catálogo estructurado de la ficha | ✓ |
| No estoy seguro / verificar | Delegar al researcher | |

**User's choice:** Catálogo estructurado (researcher confirma ubicación en backend).

### Modal

| Option | Description | Selected |
|--------|-------------|----------|
| Reusar 'Nuevo Presupuesto' del drawer | Abrir el diálogo existente prellenado | ✓ |
| Modal nuevo dedicado en el sheet | Modal propio tipo HCCreatorDialog | |
| Vos decidís | Delegar al planner | |

**User's choice:** Reusar el diálogo "Nuevo Presupuesto" de PresupuestosView, prellenado.

---

## Agenda de cirugía

| Option | Description | Selected |
|--------|-------------|----------|
| Modal inline (NuevoTurnoModal) | Abrir NuevoTurnoModal desde el sheet | ✓ |
| Navegar al calendario | Cerrar sheet y llevar a la página de agenda | |
| Vos decidís | Delegar al planner | |

**User's choice:** Modal inline (NuevoTurnoModal) con paciente pre-seleccionado.
**Notes:** Punto técnico marcado (no preguntado al usuario): crear el turno debe registrar un
`Cirugia` para que `pasos.cirugia` pase a verde. El backend ya lo hace vía tipo de turno con
`esCirugia = true` (`turnos.service.ts` ~677-728). El researcher lo confirma.

---

## Claude's Discretion

- Estilos exactos verde/naranja y jerarquía visual con el highlight de "etapa actual".
- Edge case de flujo `PENDIENTE`/`null`.
- Orden/ubicación exacta de los sub-indicadores de consentimiento/indicaciones bajo Confirmado.

## Deferred Ideas

- Acciones (quick-actions) para consentimiento e indicaciones preop — futura fase.
- `cr-01-indicaciones-url-validation` (todo cruzado) — blocker de Phase 54, no folded.
