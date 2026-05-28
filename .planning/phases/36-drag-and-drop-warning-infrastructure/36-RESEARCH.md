# Phase 36: Drag-and-Drop + Warning Infrastructure - Research

**Researched:** 2026-05-24
**Domain:** Frontend React — @dnd-kit drag event handling, sonner toast warnings, optimistic UI rollback, TypeScript type extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Warning toast style**
- `toast.warning` (sonner) — amber/amarillo, no alarming
- El movimiento ya se completó cuando aparece el toast, por lo que rojo (`toast.error`) sería semánticamente incorrecto
- Duración: 4 segundos (default de sonner)
- Sin deduplicación: cada drag muestra su propio warning aunque el toast anterior aún esté visible

**Warning text (locked by requirements)**
- PRESUPUESTO_ENVIADO sin presupuesto: `"No hay presupuesto enviado a este paciente"`
- CONFIRMADO sin presupuesto aceptado: `"Ningún presupuesto fue aceptado — verificá antes de confirmar"`
- Los warnings se disparan después del move optimista, simultáneamente con la actualización del backend

**Warning check logic**
- La verificación se hace client-side usando `patient.presupuesto` ya disponible en `KanbanPatient`
- PRESUPUESTO_ENVIADO: warning si `patient.presupuesto === null`
- CONFIRMADO: warning si `patient.presupuesto?.estado !== 'ACEPTADO'`
- La lógica debe estar en una función utilitaria reutilizable (Phase 38 stepper usará la misma lógica)

**flujo field en KanbanPatient**
- Agregar `flujo: 'CIRUGIA' | 'TRATAMIENTO' | 'PENDIENTE' | null` al tipo `KanbanPatient` en `useCRMKanban.ts`
- Sin cambios en la UI de `PatientCard` — Phase 37 rediseña el card y sheet, flujo se mostrará ahí
- El tipo debe estar disponible para que Phase 37 pueda acceder al campo sin modificar el tipo

**Error rollback UX**
- Cuando el backend falla: `toast.error("No se pudo guardar el movimiento. Intentá de nuevo.")`
- Sin feedback visual en la card (sin shake, sin border rojo) — el snap-back automático + toast es suficiente
- El snap-back ya funciona via `onSettled` que limpia `pendingMoves`, disparando re-render con datos originales

### Claude's Discretion
- Estructura interna de la función utilitaria de warnings (inline en KanbanBoard vs archivo separado)
- Exactamente cuándo disparar el toast (antes del `updateEtapa` call o en el `onSuccess` callback)

### Deferred Ideas (OUT OF SCOPE)
- flujo badge visual en PatientCard — Phase 37 (rediseño completo del card y sheet)
- Deduplicación de toasts de warning — no necesario según decisión
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CRM-01 (parte frontend) | El usuario puede mover un paciente a cualquier etapa del kanban mediante drag-and-drop sin restricciones de negocio | Backend ya sin restricciones (Phase 35); frontend: `handleDragEnd` ya optimista; solo actualizar el texto del `toast.error` en `onError` |
| CRM-02 | Al mover a PRESUPUESTO_ENVIADO sin presupuesto existente, aparece toast no bloqueante | Función `getEtapaWarning(patient, targetEtapa)` inyectada en `handleDragEnd` después del move optimista; usa `patient.presupuesto === null` como condición |
| CRM-03 | Al mover a CONFIRMADO sin presupuesto aceptado, aparece toast no bloqueante | Misma función `getEtapaWarning`; condición `patient.presupuesto?.estado !== 'ACEPTADO'` |
</phase_requirements>

---

## Summary

Phase 36 es trabajo frontend puro. El backend ya está completamente listo (Phase 35): `updateEtapaCRM` acepta cualquier transición sin restricciones, y `GET /kanban` devuelve el campo `flujo`. El trabajo consiste en tres cambios quirúrgicos bien localizados en dos archivos frontend:

1. **Extender el tipo `KanbanPatient`** en `useCRMKanban.ts` con el campo `flujo` que el backend ya entrega (pero que el tipo frontend todavía no declara).
2. **Crear la función utilitaria `getEtapaWarning(patient, targetEtapa)`** que retorna `string | null` — usada en Phase 36 para drag-and-drop y reutilizada en Phase 38 para el stepper.
3. **Integrar la lógica de warning en `handleDragEnd`** de `KanbanBoard.tsx`, reemplazando también el texto del `toast.error` en el caso de error de red.

Todo el stack necesario ya está instalado: `@dnd-kit/core` ^6.3.1, `sonner` ^2.0.7, el hook `useUpdateEtapaCRM`, y el patrón de optimistic update (`pendingMoves` + `onSettled`) ya existen y funcionan. No se instala nada nuevo.

**Primary recommendation:** Colocar `getEtapaWarning` en un archivo separado `frontend/src/lib/crm-warnings.ts` — el CONTEXT.md dice que Phase 38 importará esta misma función; un archivo dedicado es más limpio que inline y evita acoplamiento entre componentes.

---

## Standard Stack

### Core (todo ya instalado — sin cambios de dependencias)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | ^6.3.1 | Drag-and-drop: `DndContext`, `DragEndEvent`, `PointerSensor` | Ya en uso en `KanbanBoard.tsx` |
| sonner | ^2.0.7 | Toast notifications: `toast.warning`, `toast.error`, `toast.success` | Ya importado en `KanbanBoard.tsx` |
| React / TypeScript | proyecto | Tipos, componentes | Stack del proyecto |
| TanStack Query | proyecto | `useUpdateEtapaCRM` mutation con callbacks | Ya en uso |

### Sin nuevas instalaciones

Esta fase no requiere `npm install` de ningún paquete. Todo el tooling necesario existe.

---

## Architecture Patterns

### Recommended File Structure (cambios de Phase 36)

```
frontend/src/
├── lib/
│   └── crm-warnings.ts          # NUEVO — función getEtapaWarning reutilizable
├── hooks/
│   └── useCRMKanban.ts          # MODIFICAR — agregar campo flujo a KanbanPatient
└── components/crm/
    └── KanbanBoard.tsx           # MODIFICAR — integrar warning logic en handleDragEnd
```

### Pattern 1: Función utilitaria `getEtapaWarning`

**What:** Función pura que recibe un `KanbanPatient` y una `EtapaCRM` destino, y retorna `string | null`. Null significa "sin warning"; un string es el mensaje a mostrar con `toast.warning`.

**When to use:** En `handleDragEnd` de `KanbanBoard.tsx` (Phase 36) y en el click handler del stepper (Phase 38). La misma función, mismo archivo.

**Signature:**
```typescript
// Source: 36-CONTEXT.md decisions + REQUIREMENTS.md text exacto
// File: frontend/src/lib/crm-warnings.ts

import { KanbanPatient, EtapaCRM } from "@/hooks/useCRMKanban";

export function getEtapaWarning(
  patient: KanbanPatient,
  targetEtapa: EtapaCRM
): string | null {
  if (
    targetEtapa === "PRESUPUESTO_ENVIADO" &&
    patient.presupuesto === null
  ) {
    return "No hay presupuesto enviado a este paciente";
  }

  if (
    targetEtapa === "CONFIRMADO" &&
    patient.presupuesto?.estado !== "ACEPTADO"
  ) {
    return "Ningún presupuesto fue aceptado — verificá antes de confirmar";
  }

  return null;
}
```

**Key design note:** La condición para CONFIRMADO es `presupuesto?.estado !== 'ACEPTADO'` — esto es `true` tanto cuando `presupuesto === null` (sin presupuesto) como cuando existe pero no está aceptado. Cubre ambos casos correctamente con una sola condición.

### Pattern 2: Integración en `handleDragEnd`

**What:** Después de validar que el target no es la columna origen y no es PERDIDO, disparar el warning (si aplica) simultáneamente con el move optimista y el `updateEtapa` call.

**Integration point:** `KanbanBoard.tsx:handleDragEnd`, justo después de `setPendingMoves(...)` y antes/junto con `updateEtapa(...)`.

**Timing decision (Claude's Discretion resuelto):** Disparar el toast **inmediatamente después de `setPendingMoves`**, antes del `updateEtapa` call. Razón: el CONTEXT.md dice "Los warnings se disparan después del move optimista, simultáneamente con la actualización del backend" — el move optimista es `setPendingMoves`, el toast debe ser visible de inmediato, no esperar el callback de `onSuccess`.

```typescript
// Source: 36-CONTEXT.md + código actual de KanbanBoard.tsx
// En handleDragEnd, reemplazar el bloque de movimiento actual:

// Mover optimistamente
setPendingMoves((prev) => ({ ...prev, [patient.id]: targetColumn }));

// Warning check — simultáneo con el move optimista
const warning = getEtapaWarning(patient, targetColumn);
if (warning) toast.warning(warning);

updateEtapa(
  { pacienteId: patient.id, etapaCRM: targetColumn },
  {
    onSettled: () =>
      setPendingMoves((prev) => {
        const next = { ...prev };
        delete next[patient.id];
        return next;
      }),
    onError: () =>
      toast.error("No se pudo guardar el movimiento. Intentá de nuevo."),
    // onSuccess: no se agrega — el toast.warning ya se mostró
  }
);
```

**Nota:** El texto de `onError` cambia de `"No se pudo mover el paciente. Verificá los requisitos."` a `"No se pudo guardar el movimiento. Intentá de nuevo."` — el anterior menciona "requisitos" que ya no existen en el backend libre de restricciones.

### Pattern 3: Extensión del tipo `KanbanPatient`

**What:** Agregar el campo `flujo` al tipo `KanbanPatient` en `useCRMKanban.ts`. El backend ya devuelve este campo desde Phase 35 Plan 01 (`flujo: p.flujo ?? null` en el mapping de `getKanban`).

```typescript
// Source: 36-CONTEXT.md + backend/src/modules/pacientes/pacientes.service.ts línea 149
// En useCRMKanban.ts, extender KanbanPatient:

export interface KanbanPatient {
  id: string;
  nombreCompleto: string;
  fotoUrl: string | null;
  etapaCRM: EtapaCRM | null;
  temperatura: TemperaturaPaciente | null;
  scoreConversion: number;
  procedimiento: string | null;
  ultimoContactoNota: string | null;
  ultimoContactoFecha: string | null;
  ultimoTurno: string | null;
  presupuesto: {
    total: number;
    estado: string;
    fechaEnviado: string | null;
  } | null;
  diasDesdePresupuesto: number | null;
  enListaEspera: boolean;
  comentarioListaEspera?: string | null;
  pendingAutorizaciones?: number;
  flujo: 'CIRUGIA' | 'TRATAMIENTO' | 'PENDIENTE' | null; // NUEVO — Phase 36
}
```

**Nota TypeScript:** El backend mapea `flujo: p.flujo ?? null` — puede ser `null` para pacientes legacy. La unión con `null` es correcta. El enum de Prisma es `FlujoPaciente { CIRUGIA, TRATAMIENTO, PENDIENTE }`, correspondiente a los tres valores no-null.

### Anti-Patterns to Avoid

- **Disparar el toast en `onSuccess`:** El CONTEXT.md dice simultáneo con el move optimista — el usuario debe ver el warning de inmediato, no esperar el round-trip HTTP.
- **Verificar el presupuesto haciendo un fetch adicional:** La data de `patient.presupuesto` ya está en el KanbanPatient — no hay fetch extra necesario.
- **Colocar `getEtapaWarning` inline en `KanbanBoard.tsx`:** Phase 38 necesita la misma función; si está inline, Phase 38 tendría que importarla de un componente, lo cual es antipatrón.
- **Bloquear el drag si faltan prerequisitos:** Explícitamente fuera de scope. El drag SIEMPRE se persiste; el warning es informativo.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom notification component | `sonner` (ya instalado) | Ya integrado en el proyecto, estilo consistente |
| Drag-and-drop | Custom drag events / HTML5 drag | `@dnd-kit/core` (ya en uso) | El board ya usa DndContext — no romper la infraestructura existente |
| Optimistic rollback | Custom state reconciliation | Patrón `pendingMoves` + `onSettled` ya existente | Funciona, está probado, no tocar |

---

## Common Pitfalls

### Pitfall 1: Condición `estado !== 'ACEPTADO'` para CONFIRMADO cubre el caso `presupuesto === null`

**What goes wrong:** El desarrollador escribe `patient.presupuesto !== null && patient.presupuesto.estado !== 'ACEPTADO'` pensando que el caso "sin presupuesto" ya está cubierto por PRESUPUESTO_ENVIADO. En realidad, CONFIRMADO también debe advertir cuando no hay presupuesto.

**Why it happens:** La condición para PRESUPUESTO_ENVIADO es distinta (`presupuesto === null`). Es tentador pensar que las dos condiciones son mutually exclusive.

**How to avoid:** La condición `patient.presupuesto?.estado !== 'ACEPTADO'` con optional chaining ya evalúa a `true` cuando `presupuesto === null` (porque `undefined !== 'ACEPTADO'`). Usar esta forma directa, sin el `!== null` guard previo.

### Pitfall 2: Snapshot stale del `patient` en el closure de `handleDragEnd`

**What goes wrong:** El `patient` capturado en el closure de `handleDragEnd` es el objeto al momento del drag start (via `active.data.current`). Si el kanban se actualiza via polling/refetch durante el drag, el objeto podría estar stale.

**Why it happens:** `active.data.current` se fija al inicio del drag, no se actualiza.

**How to avoid:** En la práctica no es un problema — el `staleTime` del query es 30 segundos, y los drags duran milisegundos. La condición de presupuesto se verifica sobre el mismo `patient` que el usuario está arrastrando visualmente, que es el comportamiento correcto. No hay acción preventiva necesaria.

### Pitfall 3: El rollback del snap-back ya funciona — no romperlo

**What goes wrong:** Al agregar el warning, el desarrollador agrega un `onError` diferente que modifica el flujo de `pendingMoves` sin usar `onSettled`.

**Why it happens:** Confusión entre `onError` y `onSettled`. El rollback depende de que `onSettled` siempre se llame (éxito y error).

**How to avoid:** Mantener `onSettled` como el único punto donde se limpia `pendingMoves`. El `onError` solo muestra el toast de error. La limpieza de `pendingMoves` en `onSettled` dispara automáticamente el re-render con los datos originales del servidor — ese es el snap-back.

### Pitfall 4: Olvidar actualizar el texto de `toast.error` en `handleLossConfirm`

**What goes wrong:** Se actualiza el `toast.error` en la rama principal de `handleDragEnd` pero no en el path de `handleLossConfirm` (movimiento a PERDIDO con modal de motivo). Los textos quedan inconsistentes.

**Why it happens:** Hay dos call sites de `updateEtapa`: el bloque principal de `handleDragEnd` y `handleLossConfirm`. Es fácil ver solo el primero.

**How to avoid:** El texto de error de PERDIDO (`"No se pudo actualizar el estado"`) en `handleLossConfirm` es aceptable como está — no menciona "requisitos". Verificar ambos call sites al hacer el cambio.

---

## Code Examples

Verified patterns from existing codebase:

### Estructura actual de `handleDragEnd` (antes de Phase 36)
```typescript
// Source: frontend/src/components/crm/KanbanBoard.tsx (líneas 148-183)
function handleDragEnd(event: DragEndEvent) {
  setActivePatient(null);
  setActiveColumn(null);

  const { over, active } = event;
  if (!over) return;

  const targetColumn = over.id as EtapaCRM;
  const { patient, fromColumn } = active.data.current as {
    patient: KanbanPatient;
    fromColumn: string;
  };

  if (targetColumn === fromColumn) return;

  if (targetColumn === "PERDIDO") {
    setPendingDrop({ pacienteId: patient.id, targetColumn });
    return;
  }

  // Mover optimistamente
  setPendingMoves((prev) => ({ ...prev, [patient.id]: targetColumn }));
  updateEtapa(
    { pacienteId: patient.id, etapaCRM: targetColumn },
    {
      onSettled: () =>
        setPendingMoves((prev) => {
          const next = { ...prev };
          delete next[patient.id];
          return next;
        }),
      onError: () =>
        toast.error("No se pudo mover el paciente. Verificá los requisitos."),
        // ^^^^^^^^^ CAMBIAR en Phase 36: "No se pudo guardar el movimiento. Intentá de nuevo."
    }
  );
}
```

### `toast.warning` con sonner (v2.x)
```typescript
// Source: sonner ^2.0.7 — API estable desde v1.x
// Duración default de sonner es 4000ms (4 segundos) — no hace falta pasarlo explícitamente
import { toast } from "sonner";

toast.warning("Mensaje de advertencia");
// Produce toast amber/amarillo, auto-dismiss a los 4 segundos
```

### Verificación del campo `flujo` en el backend response
```typescript
// Source: backend/src/modules/pacientes/pacientes.service.ts línea 149 y 685
// El backend ya mapea:
flujo: p.flujo ?? null,
// p.flujo es de tipo FlujoPaciente | null (Prisma)
// FlujoPaciente = CIRUGIA | TRATAMIENTO | PENDIENTE
// Por eso el tipo frontend es: 'CIRUGIA' | 'TRATAMIENTO' | 'PENDIENTE' | null
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `toast.error` para cualquier fallo (incluyendo validaciones de negocio) | `toast.warning` para prerequisitos no bloqueantes, `toast.error` solo para errores de red | Phase 36 | UX más precisa: el usuario entiende que el movimiento se hizo y el warning es informativo |
| Texto de error mencionando "requisitos" (`"No se pudo mover el paciente. Verificá los requisitos."`) | Texto neutral (`"No se pudo guardar el movimiento. Intentá de nuevo."`) | Phase 36 | Consistente con el nuevo modelo donde no hay restricciones de negocio |
| `KanbanPatient` sin campo `flujo` (backend entregaba el dato, frontend no lo declaraba) | `KanbanPatient.flujo: 'CIRUGIA' \| 'TRATAMIENTO' \| 'PENDIENTE' \| null` | Phase 36 | Tipo correcto — Phase 37 puede usar el campo sin modificar el tipo |

---

## Open Questions

1. **Placement de `getEtapaWarning`: `frontend/src/lib/crm-warnings.ts` vs otro path**
   - What we know: Phase 38 importará la misma función; el proyecto tiene `frontend/src/lib/` para utilidades (ej. `api.ts`, `utils.ts`)
   - What's unclear: No hay convención explícita de "lib vs utils" en el proyecto para funciones de dominio específico
   - Recommendation: `frontend/src/lib/crm-warnings.ts` — consistente con la estructura existente de `lib/`. Alternativa aceptable: `frontend/src/hooks/useCRMKanban.ts` como función exportada (no hook), pero mezclar lógica pura con el hook de datos es menos limpio.

2. **Cuándo exactamente disparar el toast en relación al `updateEtapa` call**
   - What we know: CONTEXT.md dice "simultáneamente con la actualización del backend"
   - Recommendation: Disparar el toast justo después de `setPendingMoves`, antes del `updateEtapa` call en el mismo tick síncrono. Esto garantiza visibilidad inmediata sin esperar el resultado de la mutación.

---

## Sources

### Primary (HIGH confidence)
- `/Users/laucaballero/Desktop/Lautaro/AndesCode/CLINICAL/frontend/src/components/crm/KanbanBoard.tsx` — código actual completo leído directamente
- `/Users/laucaballero/Desktop/Lautaro/AndesCode/CLINICAL/frontend/src/hooks/useCRMKanban.ts` — tipo `KanbanPatient` actual leído directamente
- `/Users/laucaballero/Desktop/Lautaro/AndesCode/CLINICAL/frontend/src/hooks/useUpdateEtapaCRM.ts` — hook actual leído directamente
- `/Users/laucaballero/Desktop/Lautaro/AndesCode/CLINICAL/backend/src/modules/pacientes/pacientes.service.ts` — verificado `flujo: p.flujo ?? null` en líneas 149 y 685
- `.planning/phases/36-drag-and-drop-warning-infrastructure/36-CONTEXT.md` — decisiones de diseño acordadas

### Secondary (MEDIUM confidence)
- `.planning/phases/35-backend-foundation/35-01-SUMMARY.md` — confirmación de Phase 35 completada y `flujo` disponible en el endpoint
- `.planning/phases/35-backend-foundation/35-02-SUMMARY.md` — confirmación del guard forward-only implementado
- `frontend/package.json` — versiones exactas: `@dnd-kit/core ^6.3.1`, `sonner ^2.0.7`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — todo el stack leído directamente del codebase, sin dependencias nuevas
- Architecture: HIGH — código actual leído completamente; los puntos de integración son exactos
- Pitfalls: HIGH — identificados a partir del código real y las decisiones del CONTEXT.md

**Research date:** 2026-05-24
**Valid until:** Estable — sin dependencias externas nuevas, sin cambios de API. Válido hasta que KanbanBoard.tsx o useCRMKanban.ts se reescriban (Phase 37 los modifica, pero solo la capa de UI).
