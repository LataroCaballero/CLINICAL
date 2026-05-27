# Phase 38: Stepper Interactions + Contextual Actions - Research

**Researched:** 2026-05-27
**Domain:** React interactive stepper with optimistic updates, contextual action buttons, and modal orchestration inside a Radix Sheet
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Botones contextuales — placement**
- Sub-fila debajo del label: el botón aparece indentado bajo el texto del label, en su propia línea
- variant='outline' size='sm' con icono relevante (ExternalLink para presupuesto, FilePlus para HC, CheckCircle para realizado)
- El botón reemplaza el padding del label: label con pb-1 (mínimo) + botón con mb-3 (el mismo espacio que antes usaba el label con pb-3 solo). El stepper no crece innecesariamente
- PROCEDIMIENTO_REALIZADO tiene botón contextual "Marcar como realizado" (aunque el comportamiento es idéntico a hacer click en el step — el botón lo hace más explícito por ser el último paso del flujo)

**Visibilidad de botones contextuales**
- Los botones siempre son visibles en su step, sin importar la etapa actual del paciente (no condicional a patient.etapaCRM)
- Excepción: "Marcar como realizado" NO aparece cuando el paciente ya está en PROCEDIMIENTO_REALIZADO (ya está realizado, el botón sería un no-op confuso)
- Steps clickeables visualmente (cursor pointer + hover state): todos EXCEPTO el step actual — el step de la etapa actual no tiene hover ni cursor pointer (no tiene sentido moverse a sí mismo)
- PERDIDO: hover state en rojo/destructive — background rojo sutil al hover para indicar que es una acción especial/destructiva

**Ver/Crear presupuesto — navegación**
- Al hacer click en "Ver/Crear presupuesto": cierra el sheet (onOpenChange(false)) y abre el PatientDrawer en tab 'presupuestos'
- No navega a /finanzas/presupuestos — el usuario queda en el kanban con el drawer abierto
- Implementación: nuevo prop `onOpenDrawerWithView(id: string, view: DrawerView)` en CardActionsSheet (adicional al onOpenDrawer existente). KanbanBoard pasa una función que setea drawerPatientId + drawerInitialView='presupuestos'

**Stepper click — UX de transición**
- Optimistic update: igual que drag-and-drop — el stepper actualiza visualmente de inmediato, la API llama en background
- State local en CardActionsSheet: `useState<EtapaCRM | null>(null)` para la etapa optimista. Si es non-null, EtapaStepper usa ese valor en lugar de patient.etapaCRM. Al onSettled, se limpia
- En caso de error: toast.error('No se pudo guardar el movimiento. Intentá de nuevo.') + rollback visual (limpiar optimistic state). Mismo mensaje que el drag-and-drop
- La warning logic (getEtapaWarning de crm-warnings.ts) se ejecuta igual que en drag-and-drop: warning toast no bloqueante ANTES de confirmar la transición, la transición siempre procede

### Claude's Discretion
- Exact hover background color for PERDIDO (ej. hover:bg-red-50 vs hover:bg-red-100)
- Tamaño exacto del icono en los botones contextuales (h-3 w-3 vs h-4 w-4)
- Si usar `useUpdateEtapaCRM` hook directamente en CardActionsSheet o elevarlo a KanbanBoard via callback

### Deferred Ideas (OUT OF SCOPE)
- Animaciones de transición en el stepper al cambiar etapa — v1.x (STEP-03)
- Indicador de tiempo en etapa por step (días en CONFIRMADO, etc.) — v1.x (STEP-01)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CRM-05 | El usuario puede mover un paciente a cualquier etapa usando el stepper del sheet (mismo warning logic que drag-and-drop) | `getEtapaWarning` ya en `lib/crm-warnings.ts`, reutilizar directamente. `useUpdateEtapaCRM` hook ya existe. Optimistic state local en `CardActionsSheet` |
| SHEET-05 | Click en etapa del stepper mueve al paciente a esa etapa; PERDIDO abre LossReasonModal | `EtapaStepper` necesita `onClickEtapa` prop. `LossReasonModal` ya listo con props correctos. Montar dentro de `CardActionsSheet` igual que en `KanbanBoard` |
| SHEET-06 | En etapa PRESUPUESTO_ENVIADO del stepper aparece acción "Ver/Crear presupuesto" | Botón contextual en `EtapaStepper`. Acción: llama `onOpenDrawerWithView(patient.id, 'presupuestos')` + cierra sheet. `KanbanBoard` ya tiene `drawerInitialView` state listo |
| SHEET-07 | En etapa CONSULTADO del stepper aparece acción "Registrar HC" abriendo HCCreatorForm | `HCCreatorDialog` en `PatientDrawer/views/HCCreatorDialog.tsx` ya listo. Necesita `profesionalId` de `useEffectiveProfessionalId`. Montar en `CardActionsSheet` |
| SHEET-08 | En etapa PROCEDIMIENTO_REALIZADO del stepper aparece acción "Marcar como realizado" (etapa clickeable como las demás) | Botón contextual oculto cuando `patient.etapaCRM === 'PROCEDIMIENTO_REALIZADO'`. Comportamiento idéntico a click en step |
</phase_requirements>

---

## Summary

Phase 38 es 100% frontend — no hay cambios de backend. Todos los assets necesarios existen y están verified en el codebase. La implementación se reduce a tres modificaciones coordinadas: (1) `EtapaStepper.tsx` recibe nuevos props para interactividad y botones contextuales, (2) `CardActionsSheet.tsx` agrega state de optimismo, LossReasonModal, HCCreatorDialog y un nuevo prop de navegación, (3) `KanbanBoard.tsx` pasa el nuevo prop de navegación a `CardActionsSheet`.

El patrón de optimistic update ya existe en `KanbanBoard` para drag-and-drop. La diferencia es que en el sheet el state optimista es LOCAL (`CardActionsSheet`) en lugar de compartido (`pendingMoves` en `KanbanBoard`). Esto es más simple porque el sheet solo maneja un paciente a la vez.

La decisión de Claude's Discretion sobre "dónde invocar `useUpdateEtapaCRM`" se resuelve con evidencia: invocarlo directamente en `CardActionsSheet` es el approach más simple y consistente — evita elevar props adicionales a `KanbanBoard` y aísla la lógica de la sheet en un solo componente.

**Primary recommendation:** Implementar en tres archivos únicamente (`EtapaStepper.tsx`, `CardActionsSheet.tsx`, `KanbanBoard.tsx`), en ese orden, sin crear nuevos archivos ni hooks.

---

## Standard Stack

### Core (ya en el proyecto, sin instalación adicional)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React `useState` | React 19 | Estado local para optimistic update y modal state | Nativo, sin overhead |
| `useUpdateEtapaCRM` | interno | Mutación PATCH `/pacientes/:id/etapa-crm` | Ya existe, invalidates `crm-kanban` query |
| `getEtapaWarning` | interno | Warning logic compartida con drag-and-drop | Diseñada en Phase 36 para ser reutilizada |
| `LossReasonModal` | interno | Dialog de motivo de pérdida | Ya funciona montado sobre Sheet (verified) |
| `HCCreatorDialog` | interno | Dialog wrapper para `HCCreatorForm` | Listo con props correctos |
| `useEffectiveProfessionalId` | interno | Obtener profesionalId en contexto actual | Patrón estándar del codebase |
| `toast` (sonner) | en proyecto | Feedback de warning/error | Patrón de Phase 36 |
| lucide-react | en proyecto | Iconos (ExternalLink, FilePlus, CheckCircle) | shadcn/ui standard |

### No se instala nada nuevo
Todos los assets ya existen. La fase es pura reorganización y wiring de piezas existentes.

---

## Architecture Patterns

### Patrón 1: Optimistic State Local en CardActionsSheet

El drag-and-drop usa `pendingMoves: Record<string, EtapaCRM>` en `KanbanBoard` porque maneja múltiples pacientes simultáneamente. El sheet solo maneja un paciente, por lo que el state optimista es local:

```typescript
// En CardActionsSheet.tsx
const [optimisticEtapa, setOptimisticEtapa] = useState<EtapaCRM | null>(null);
const { mutate: updateEtapa } = useUpdateEtapaCRM();

const displayEtapa = optimisticEtapa ?? patient.etapaCRM;

function handleStepClick(targetEtapa: EtapaCRM) {
  if (targetEtapa === patient.etapaCRM || targetEtapa === optimisticEtapa) return;

  if (targetEtapa === 'PERDIDO') {
    setLossReasonOpen(true);
    return;
  }

  const warning = getEtapaWarning(patient, targetEtapa);
  if (warning) toast.warning(warning);

  setOptimisticEtapa(targetEtapa);
  updateEtapa(
    { pacienteId: patient.id, etapaCRM: targetEtapa },
    {
      onSettled: () => setOptimisticEtapa(null),
      onError: () => toast.error('No se pudo guardar el movimiento. Intentá de nuevo.'),
    }
  );
}
```

**Source:** Patrón derivado de `KanbanBoard.tsx` (Phase 36), adaptado a state local.

### Patrón 2: EtapaStepper con Props de Interactividad

El componente actual solo recibe `etapaActual`. Se extiende con props opcionales que no rompen callers existentes:

```typescript
interface EtapaStepperProps {
  etapaActual: EtapaCRM | null;
  // Nuevos props opcionales — no rompe callers existentes
  optimisticEtapa?: EtapaCRM | null;
  onClickEtapa?: (etapa: EtapaCRM) => void;
  onPresupuestoClick?: () => void;
  onHCClick?: () => void;
}
```

La etapa efectiva a mostrar es `optimisticEtapa ?? etapaActual`. El prop `etapaActual` se mantiene para determinar cuál step NO es clickeable (el step de la etapa real del paciente, no el optimista).

### Patrón 3: Layout de Step con Botón Contextual

El layout actual del step (label con `pb-3`) se ajusta cuando hay botón contextual (label con `pb-1` + botón con `mb-3`):

```
[ ○ ] Consulta Realizada       ← label className: "pt-0.5 pb-1"
       [ 📄 Registrar HC ]     ← Button variant='outline' size='sm', ml ajustado a indentación
  |  ← connector line continúa debajo del botón
```

El conector vertical debe abarcar tanto el label como el botón para que el stepper mantenga su ritmo visual.

### Patrón 4: Dialog sobre Sheet (ya verificado en Phase 37)

`LossReasonModal` y `HCCreatorDialog` ambos usan Radix `DialogPortal` que monta en `document.body` — fuera del `SheetContent`. No hay conflictos de z-index ni focus-trap. El pattern fue human-verified en Phase 37 con `ContactoRapidoModal` y `ListaEsperaDialog`.

### Patrón 5: Nuevo Prop onOpenDrawerWithView en CardActionsSheet

```typescript
// Tipo de DrawerView (ya existe en PatientDrawer.tsx)
type DrawerView = "default" | "datos" | "historia" | "turnos" | "mensajes" | "cuenta" | "presupuestos";

// Prop nuevo en CardActionsSheet
interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patient: KanbanPatient | null;
  onOpenDrawer: (pacienteId: string) => void;
  onOpenDrawerWithView: (pacienteId: string, view: DrawerView) => void; // nuevo
}

// En KanbanBoard.tsx — función que se pasa
onOpenDrawerWithView={(id, view) => {
  setDrawerInitialView(view);
  setDrawerPatientId(id);
}}
```

El handler en `CardActionsSheet` para el botón "Ver/Crear presupuesto":
```typescript
function handlePresupuestoClick() {
  onOpenChange(false);
  onOpenDrawerWithView(patient.id, 'presupuestos');
}
```

### Patrón 6: PERDIDO Click Flow con LossReasonModal

```typescript
// State en CardActionsSheet
const [lossReasonOpen, setLossReasonOpen] = useState(false);

function handleLossConfirm(motivo: MotivoPerdidaCRM) {
  setLossReasonOpen(false);
  setOptimisticEtapa('PERDIDO');
  updateEtapa(
    { pacienteId: patient.id, etapaCRM: 'PERDIDO', motivoPerdida: motivo },
    {
      onSettled: () => setOptimisticEtapa(null),
      onSuccess: () => toast.success('Paciente marcado como perdido'),
      onError: () => toast.error('No se pudo actualizar el estado'),
    }
  );
}

// En JSX
<LossReasonModal
  open={lossReasonOpen}
  onConfirm={handleLossConfirm}
  onCancel={() => setLossReasonOpen(false)}
/>
```

### Patrón 7: HCCreatorDialog en CardActionsSheet

```typescript
// State en CardActionsSheet
const [hcOpen, setHcOpen] = useState(false);
const profesionalId = useEffectiveProfessionalId();

// En JSX
<HCCreatorDialog
  open={hcOpen}
  onOpenChange={setHcOpen}
  pacienteId={patient.id}
  profesionalId={profesionalId ?? ''}
/>
```

`obraSocialId` es opcional en `HCCreatorDialog` — no se necesita pasar desde el sheet (no está disponible en `KanbanPatient`).

### Anti-Patterns a Evitar

- **No elevar el state optimista a KanbanBoard:** El sheet maneja un solo paciente — state local es más simple y no comparte superficie con `pendingMoves`
- **No bloquear la transición por el warning:** El toast de warning es informativo, igual que en drag-and-drop. La transición siempre procede
- **No esconder el step actual del stepper:** El step actual sigue visible, solo pierde el cursor pointer y el hover state
- **No usar `patient.etapaCRM` como etapa efectiva del display cuando hay optimistic:** Usar `optimisticEtapa ?? patient.etapaCRM` para EtapaStepper, pero `patient.etapaCRM` para determinar qué step no es clickeable

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Warning logic | Re-implementar condiciones | `getEtapaWarning` de `lib/crm-warnings.ts` | Ya tiene los dos casos (PRESUPUESTO_ENVIADO + CONFIRMADO), fue diseñado para ser compartido |
| Modal de pérdida | Nuevo dialog inline | `LossReasonModal` existente | Tiene todos los motivos, Radio group, validación de selección |
| Crear HC | Formulario nuevo | `HCCreatorDialog` de `PatientDrawer/views/` | Wrappea `HCCreatorForm` completo con datepicker |
| Invalidación de queries | `queryClient.invalidateQueries` manual | Ya en `useUpdateEtapaCRM.onSuccess` | Invalida `crm-kanban` y `pacientes` automáticamente |
| DrawerView type | Redefinir | Importar de `PatientDrawer.tsx` si se exporta, o duplicar el string literal | El type `DrawerView` es local al componente — crear prop tipado con `'default' | 'presupuestos'` suficiente para este caso |

**Key insight:** Esta fase es casi completamente "wiring" de piezas existentes. El riesgo principal no es implementar algo nuevo sino NO usar lo que ya existe y crear duplicación.

---

## Common Pitfalls

### Pitfall 1: Invalidar el step actual en el stepper optimista
**What goes wrong:** Si se usa `optimisticEtapa` para determinar cuál step no es clickeable, el usuario puede hacer click en el step de la etapa real del paciente después de un movimiento optimista (porque el step optimista cambió pero el real no).
**Why it happens:** Confundir la etapa de display con la etapa de "estado actual real".
**How to avoid:** Usar `etapaActual` (prop original sin optimismo) para determinar cuál step tiene `cursor-default` + sin hover. Usar `optimisticEtapa ?? etapaActual` solo para el display visual (círculo activo, label bold).
**Warning signs:** Un step muestra visual de "activo" pero sigue siendo clickeable.

### Pitfall 2: Focus trap con HCCreatorDialog sobre el Sheet
**What goes wrong:** El Dialog de HC compite por el focus con el Sheet, produciendo comportamiento extraño al cerrar.
**Why it happens:** Si `HCCreatorDialog` no usa Radix `DialogPortal` montado en `document.body`.
**How to avoid:** `HCCreatorDialog` ya usa Radix `Dialog` que internamente usa `DialogPortal` — esto ya está resuelto. No custom-wrappear.
**Warning signs:** Al cerrar el dialog de HC, el Sheet también se cierra o pierde focus.

### Pitfall 3: El Sheet cierra antes de abrir el drawer al presupuesto
**What goes wrong:** `onOpenChange(false)` y `onOpenDrawerWithView(...)` se llaman sincrónicamente, pero el drawer puede no abrir si el Sheet tiene animación de cierre que interfiere.
**Why it happens:** Estado de animación del Sheet puede bloquear renders concurrentes.
**How to avoid:** El patrón ya existe: `CardActionsSheet` llama a `onOpenChange(false)` + `onOpenDrawer(patient.id)` en el footer "Ver perfil completo" y funciona. Aplicar el mismo pattern para `onOpenDrawerWithView`.
**Warning signs:** Al hacer click en "Ver/Crear presupuesto", el drawer no abre o abre en tab incorrecto.

### Pitfall 4: `profesionalId` null en HCCreatorDialog
**What goes wrong:** `useEffectiveProfessionalId()` puede retornar `null` si el contexto no está inicializado.
**Why it happens:** Admin sin professional seleccionado, o timing de carga.
**How to avoid:** Deshabilitar el botón "Registrar HC" cuando `profesionalId` es null. O bien, pasar el string vacío `''` y dejar que el form lo valide internamente — revisar comportamiento de `HCCreatorForm` con profesionalId vacío.
**Warning signs:** Error 400/500 al guardar HC sin profesionalId.

### Pitfall 5: Cleanup de state optimista al cerrar el sheet
**What goes wrong:** Si el sheet se cierra mientras hay un movimiento optimista en vuelo, al reabrirse puede mostrar la etapa optimista del movimiento anterior.
**Why it happens:** `optimisticEtapa` state persiste entre aperturas si no se limpia.
**How to avoid:** Reset de `optimisticEtapa` en el `useEffect` que detecta `open` pasando a `false`, o simplemente confiar en que `onSettled` siempre se llama (incluso si el usuario cierra el sheet). Si el sheet se abre con un `patient` diferente, el state anterior no importa porque aplica al id previo. Si es el mismo paciente, `onSettled` limpiará el optimismo eventualmente.
**Warning signs:** El stepper muestra una etapa diferente a la real al reabrir el sheet.

---

## Code Examples

### Estructura final de EtapaStepper (con interactividad)

```typescript
// Source: derivado de EtapaStepper.tsx actual + decisions de CONTEXT.md
interface EtapaStepperProps {
  etapaActual: EtapaCRM | null;
  optimisticEtapa?: EtapaCRM | null;       // para display visual
  onClickEtapa?: (etapa: EtapaCRM) => void;
  onPresupuestoClick?: () => void;
  onHCClick?: () => void;
}

// La etapa efectiva para display
const displayEtapa = optimisticEtapa ?? etapaActual;

// En cada step del CHAIN map:
const isClickable = !!onClickEtapa && etapa !== etapaActual; // no clickeable si ES la etapa actual real
const isPerdidoHover = etapa === 'PERDIDO'; // hover destructivo

// className del step container:
cn(
  "flex items-start gap-3 rounded-md px-1",
  isClickable && "cursor-pointer",
  isClickable && !isPerdidoHover && "hover:bg-muted/50",
  isClickable && isPerdidoHover && "hover:bg-red-50"
)
```

### Botón contextual inline — CONSULTADO

```typescript
// En EtapaStepper, dentro del map para etapa === 'CONSULTADO'
{etapa === 'CONSULTADO' && onHCClick && (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onHCClick(); }}
    className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded px-2 py-1 hover:bg-muted/50 mb-3"
  >
    <FilePlus className="h-3 w-3" />
    Registrar HC
  </button>
)}
```

Nota: usar `e.stopPropagation()` para evitar que el click en el botón también dispare `onClickEtapa` del container.

---

## Architecture Overview

### Archivos a modificar (exactamente 3)

```
frontend/src/components/crm/
├── EtapaStepper.tsx        ← MODIFICAR: agregar props interactividad + botones contextuales
├── CardActionsSheet.tsx    ← MODIFICAR: agregar state optimistic, modales, nuevo prop
└── KanbanBoard.tsx         ← MODIFICAR: pasar onOpenDrawerWithView a CardActionsSheet
```

### Flujo de datos completo

```
KanbanBoard
  ├── drawerInitialView (state existente)
  ├── setDrawerInitialView (setter existente)
  └── onOpenDrawerWithView={(id, view) => {
        setDrawerInitialView(view);  // 'presupuestos'
        setDrawerPatientId(id);
      }}
        ↓ prop
CardActionsSheet
  ├── optimisticEtapa: EtapaCRM | null  (state local)
  ├── lossReasonOpen: boolean           (state local)
  ├── hcOpen: boolean                   (state local)
  ├── useUpdateEtapaCRM()              (hook local)
  ├── useEffectiveProfessionalId()     (hook local)
  └── handleStepClick(etapa)
        ↓ prop
EtapaStepper
  ├── onClickEtapa → handleStepClick
  ├── onPresupuestoClick → handlePresupuestoClick
  └── onHCClick → () => setHcOpen(true)
```

### Estado de modalización en CardActionsSheet

| State | Tipo | Propósito |
|-------|------|-----------|
| `optimisticEtapa` | `EtapaCRM \| null` | Display optimista en EtapaStepper |
| `lossReasonOpen` | `boolean` | Control de LossReasonModal |
| `hcOpen` | `boolean` | Control de HCCreatorDialog |
| `contactoOpen` | `boolean` | Ya existe |
| `listaEsperaOpen` | `boolean` | Ya existe |

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| EtapaStepper estático (Phase 37) | EtapaStepper interactivo con onClick + botones | Click en step = movimiento inmediato con optimistic update |
| updateEtapaCRM solo en KanbanBoard | useUpdateEtapaCRM también en CardActionsSheet | El hook es stateless y reutilizable — no hay problema de duplicar llamadas |
| DrawerInitialView fijo en 'default' desde sheet | 'presupuestos' pasado via prop | Sheet puede navegar el drawer a tab específico |

---

## Open Questions

1. **¿Exportar el type `DrawerView` desde PatientDrawer.tsx?**
   - What we know: `DrawerView` está definido localmente como type en `PatientDrawer.tsx`, no exportado
   - What's unclear: Si `CardActionsSheet` necesita tipar el param `view` del prop `onOpenDrawerWithView`
   - Recommendation: Usar inline literal type `'default' | 'presupuestos'` en el prop de `CardActionsSheet` para no crear dependencia de módulo innecesaria. `KanbanBoard` ya conoce el type completo.

2. **¿Deshabilitar botón "Registrar HC" cuando profesionalId es null?**
   - What we know: `useEffectiveProfessionalId()` retorna `null` para admins sin professional seleccionado
   - What's unclear: Si el contexto del CRM siempre tiene un profesional seleccionado (el CRM filtra por profesional, así que debería ser siempre non-null)
   - Recommendation: Agregar `disabled={!profesionalId}` en el botón "Registrar HC" como defensive coding. Si el contexto CRM garantiza profesionalId, el botón nunca estará disabled en práctica.

---

## Sources

### Primary (HIGH confidence)
- `frontend/src/components/crm/EtapaStepper.tsx` — estado actual exacto del componente, props interface
- `frontend/src/components/crm/CardActionsSheet.tsx` — props actuales, state existente, pattern de modales
- `frontend/src/components/crm/KanbanBoard.tsx` — pattern de optimistic update, LossReasonModal, drawerInitialView state
- `frontend/src/components/crm/LossReasonModal.tsx` — interface Props exacta, `onConfirm(motivo)` signature
- `frontend/src/lib/crm-warnings.ts` — signature de `getEtapaWarning(patient, targetEtapa): string | null`
- `frontend/src/hooks/useUpdateEtapaCRM.ts` — mutationFn, payload type, onSuccess invalidation
- `frontend/src/hooks/useCRMKanban.ts` — `EtapaCRM` union type, `ETAPA_ORDER`, `ETAPA_LABELS`, `KanbanPatient` interface
- `frontend/src/hooks/useEffectiveProfessionalId.ts` — return type `string | null`, hook implementation
- `frontend/src/components/patient/PatientDrawer/views/HCCreatorDialog.tsx` — `HCCreatorDialogProps` exactas
- `frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx` — `DrawerView` type, `initialView` prop handling

### Secondary (MEDIUM confidence)
- `.planning/phases/38-stepper-interactions-contextual-actions/38-CONTEXT.md` — decisions locked por el usuario, code context pre-verified

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — todos los archivos leídos directamente del codebase
- Architecture: HIGH — patterns derivados del código existente verificado, no de suposiciones
- Pitfalls: HIGH — identificados de los patterns actuales y edge cases del código real

**Research date:** 2026-05-27
**Valid until:** Esta fase no depende de librerías externas que puedan cambiar — válido hasta cambios en los archivos base (estable)
