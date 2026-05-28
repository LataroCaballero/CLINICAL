# Phase 37: Sheet Redesign — Layout y Stepper UI - Research

**Researched:** 2026-05-26
**Domain:** React component redesign — shadcn/ui Sheet + Dialog, vertical stepper (custom Tailwind), kanban CRM
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- FlujoBadge en header: labels completos ('Cirugía' / 'Tratamiento' / 'Pendiente'), no abreviados (CIR/TRAT/PEND). Variante nueva en el componente o nuevo `CRMFlujoBadge` en `/crm/`
- EtapaStepper: orientación **vertical**, círculo relleno color primario + label en negrita para etapa actual; pasadas círculo sólido tenue o check; futuras círculo vacío gris
- Labels stepper: completos siempre desde `ETAPA_LABELS` — "Consulta Realizada", "Presupuesto Enviado", etc.
- PERDIDO: separado al final con divider, en rojo/gris. Si el paciente está PERDIDO, ese nodo se destaca
- EtapaStepper es ESTÁTICO en Phase 37 — sin click handlers (eso es Phase 38)
- Stepper construido desde cero con divs + Tailwind (no existe componente existente)
- Layout: Header → Stepper (flex-1, scrollable) → Footer fijo con dos botones
- Footer: botón izquierdo = outline + icono "Registrar contacto" (abre ContactoRapidoModal); botón derecho = lista de espera con estado visual
- Lista de espera sin estado: outline neutro "Agregar a lista de espera"; en lista: borde amber "⏰ En lista de espera"
- ContactoRapidoModal: Dialog pequeño (NO Sheet anidado), contenido igual al form actual
- Al registrar contacto: cierra solo el Dialog, el Sheet queda abierto
- Lista de espera: Dialog pequeño, pre-llenado si ya está en lista (con opción editar o quitar), campo de comentario vacío si no está
- Panel de acciones rápidas ("Dar un turno", "Crear presupuesto") ELIMINADO (SHEET-09)
- Sheet ancho: mantener `sm:max-w-sm`

### Claude's Discretion
- Exactamente cómo mostrar "Ver perfil completo" (link en footer, dentro del header, o botón ghost debajo del footer)
- Tamaño exacto del Dialog de ContactoRapidoModal
- Espaciado y tipografía interna del stepper
- Si las etapas "pasadas" muestran un check (✓) o un círculo sólido tenue

### Deferred Ideas (OUT OF SCOPE)
- Click en etapa del stepper para mover al paciente — Phase 38
- PERDIDO en el stepper abre LossReasonModal — Phase 38
- Indicador de tiempo en etapa por paso — v1.x (STEP-01)
- Animaciones de transición en el stepper — v1.x (STEP-03)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SHEET-01 | El sheet muestra nombre del paciente y badge de flujo (CIRUGIA/TRATAMIENTO/PENDIENTE) en el header | FlujoBadge existente usa labels abreviados; necesita variante o nuevo CRMFlujoBadge. `KanbanPatient.flujo` ya disponible sin fetch extra. |
| SHEET-02 | "Registrar contacto" es un botón compacto que abre un modal pequeño (Dialog, no Sheet nested) | `useCreateContacto` hook existente. Dialog de shadcn/ui disponible en `/components/ui/dialog.tsx`. Patrón de LossReasonModal como referencia. |
| SHEET-03 | Botón compacto activa/desactiva opt-in de lista de espera del paciente | `useUpdateListaEspera` hook existente. Dialog pequeño con comentario. Lógica de estado visual (amber si activo). |
| SHEET-04 | El sheet incluye un stepper con las 6 etapas CRM indicando la etapa actual | `ETAPA_LABELS` y `ETAPA_ORDER` en `useCRMKanban.ts`. Stepper custom con divs + Tailwind. `KanbanPatient.etapaCRM` como etapa actual. |
| SHEET-09 | El panel de acciones rápidas actual es removido del sheet | Eliminar sección "Acciones rápidas" de `CardActionsSheet.tsx`. Limpieza de props: `onOpenNuevoTurno`, `onOpenPresupuestos`. |
</phase_requirements>

---

## Summary

Phase 37 es un rediseño de componente puro — no requiere cambios en backend, no requiere nuevos hooks, y no introduce nuevas dependencias. El trabajo es refactorizar `CardActionsSheet.tsx` con un nuevo layout (Header + Stepper + Footer fijo) y extraer dos piezas de UI a Dialogs separados (`ContactoRapidoModal` y `ListaEsperaDialog`).

El **EtapaStepper** es el elemento central: construido desde cero con divs + Tailwind. El patrón de "timeline vertical" (círculo + línea conectora) es la forma idiomática de representarlo en CSS/Tailwind sin dependencias externas. PERDIDO se separa visualmente con un divider. Todo el stepper es estático en esta phase — sin interactividad.

Los dos Dialogs reutilizan infraestructura ya existente: el componente `Dialog` de shadcn/ui, los hooks `useCreateContacto` y `useUpdateListaEspera`, y el patrón establecido en `LossReasonModal` (dialog abierto desde dentro de un Sheet sin z-index conflicts gracias a `DialogPortal`).

**Primary recommendation:** Refactorizar `CardActionsSheet.tsx` in-place manteniendo el mismo nombre de archivo y la misma interfaz de props hacia `KanbanBoard.tsx`, eliminando solo `onOpenNuevoTurno` y `onOpenPresupuestos` de la firma.

---

## Standard Stack

### Core (ya instalado, sin cambios)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui Dialog | instalado | Container para ContactoRapidoModal y ListaEsperaDialog | Evita z-index issues con Sheet anidado; Radix DialogPortal se monta en document.body |
| shadcn/ui Sheet | instalado | Container principal del panel lateral | Ya en uso, mantener `sm:max-w-sm` |
| Tailwind CSS | instalado | Stepper visual con divs | Único approach declarado en CONTEXT.md |
| Lucide React | instalado | Iconos (Phone, MessageCircle, Users, Clock, CheckCircle) | Ya en uso en CardActionsSheet |
| Sonner (toast) | instalado | Feedback de acciones | Patrón establecido en el proyecto |
| useCreateContacto | existente | Mutation para registrar contacto | Sin cambios necesarios |
| useUpdateListaEspera | existente | Mutation para toggle lista espera | Sin cambios necesarios |

### No se instala nada nuevo
Cero dependencias nuevas. Todo disponible en el proyecto.

---

## Architecture Patterns

### Recommended File Structure (cambios mínimos)
```
frontend/src/components/crm/
├── CardActionsSheet.tsx        ← REFACTORIZAR in-place (layout + stepper)
├── ContactoRapidoModal.tsx     ← NUEVO — Dialog con form contacto
├── ListaEsperaDialog.tsx       ← NUEVO — Dialog con form lista espera
├── EtapaStepper.tsx            ← NUEVO — Stepper visual estático
├── CRMFlujoBadge.tsx           ← NUEVO — FlujoBadge con labels completos
└── [archivos existentes sin cambio]

frontend/src/app/dashboard/pacientes/components/
└── FlujoBadge.tsx              ← SIN CAMBIOS (mantener labels abreviados para /pacientes)
```

### Pattern 1: Dialog abierto desde dentro de un Sheet (patrón LossReasonModal)
**What:** Un `Dialog` de Radix UI se monta en `document.body` via `DialogPortal`, por lo que no tiene conflicto de z-index ni focus-trap con el Sheet que lo invoca.
**When to use:** Siempre que necesitás un modal secundario desde el Sheet (ContactoRapidoModal, ListaEsperaDialog).
**Ejemplo (LossReasonModal existente):**
```tsx
// Source: frontend/src/components/crm/LossReasonModal.tsx
export function LossReasonModal({ open, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm">
        {/* content */}
      </DialogContent>
    </Dialog>
  );
}
// Se renderiza en KanbanBoard: <LossReasonModal open={!!pendingDrop} ... />
// El Sheet sigue abierto mientras el Dialog está visible
```

### Pattern 2: EtapaStepper vertical con divs + Tailwind
**What:** Timeline vertical con círculo + línea conectora. La línea conectora se logra con `before:` o con un `div` absoluto que ocupa el espacio entre nodos.
**When to use:** Siempre para el stepper — sin dependencias externas.

```tsx
// Patrón recomendado: relative positioning en el nodo, línea como div hermano
function StepNode({ label, status }: { label: string; status: 'done' | 'current' | 'future' }) {
  return (
    <div className="flex items-start gap-3">
      {/* Círculo indicador */}
      <div className="flex flex-col items-center">
        <div className={cn(
          "h-5 w-5 rounded-full border-2 flex-shrink-0",
          status === 'current' && "border-primary bg-primary",
          status === 'done'    && "border-primary/40 bg-primary/20",
          status === 'future'  && "border-gray-300 bg-transparent",
        )} />
        {/* Línea conectora — excepto en el último nodo */}
        <div className="w-0.5 flex-1 min-h-[20px] bg-gray-200 mt-0.5" />
      </div>
      {/* Label */}
      <span className={cn(
        "text-sm pt-0.5",
        status === 'current' && "font-bold text-foreground",
        status === 'done'    && "text-muted-foreground",
        status === 'future'  && "text-muted-foreground",
      )}>
        {label}
      </span>
    </div>
  );
}
```

**PERDIDO separado:**
```tsx
{/* Cadena principal */}
{ETAPA_ORDER_SIN_PERDIDO.map(etapa => <StepNode ... />)}

{/* Divider + PERDIDO */}
<div className="my-3 border-t border-dashed border-gray-200" />
<div className="flex items-center gap-3">
  <div className={cn(
    "h-5 w-5 rounded-full border-2 flex-shrink-0",
    esPerdido ? "border-red-500 bg-red-500" : "border-gray-200 bg-transparent"
  )} />
  <span className={cn("text-sm", esPerdido ? "font-bold text-red-600" : "text-gray-300")}>
    Perdido
  </span>
</div>
```

### Pattern 3: Layout Sheet con footer fijo
**What:** SheetContent usa `flex flex-col gap-0 p-0` (ya así en el componente actual). Header con `border-b`, cuerpo central con `flex-1 overflow-y-auto`, footer fijo con `border-t`.
**Key insight:** El footer fijo funciona porque SheetContent ya tiene `flex flex-col` en su definición base.

```tsx
<SheetContent side="right" className="w-full sm:max-w-sm flex flex-col gap-0 p-0">
  {/* Header */}
  <SheetHeader className="px-5 pt-5 pb-4 border-b flex-shrink-0">
    <div className="flex items-center gap-2">
      <SheetTitle className="text-base font-semibold">{patient.nombreCompleto}</SheetTitle>
      <CRMFlujoBadge flujo={patient.flujo} />
    </div>
  </SheetHeader>

  {/* Stepper — ocupa todo el espacio disponible */}
  <div className="flex-1 overflow-y-auto px-5 py-4">
    <EtapaStepper etapaActual={patient.etapaCRM} />
  </div>

  {/* Footer fijo */}
  <div className="border-t px-5 py-4 flex gap-2 flex-shrink-0">
    <Button variant="outline" className="flex-1" onClick={() => setContactoOpen(true)}>
      <Phone className="h-4 w-4 mr-2" />
      Registrar contacto
    </Button>
    <Button
      variant="outline"
      className={cn("flex-1", patient.enListaEspera && "border-amber-400 text-amber-700")}
      onClick={() => setListaEsperaOpen(true)}
    >
      {patient.enListaEspera ? "⏰ En lista de espera" : "Agregar a lista de espera"}
    </Button>
  </div>
</SheetContent>
```

### Pattern 4: CRMFlujoBadge — variante con labels completos
**What:** Nuevo componente en `/crm/` con labels completos. No modificar el `FlujoBadge` de `/pacientes/` (puede romper otras vistas).

```tsx
// frontend/src/components/crm/CRMFlujoBadge.tsx
type FlujoPaciente = 'CIRUGIA' | 'TRATAMIENTO' | 'PENDIENTE' | null;

const CRM_FLUJO_CONFIG = {
  CIRUGIA:     { label: 'Cirugía',     className: 'bg-blue-100 text-blue-700' },
  TRATAMIENTO: { label: 'Tratamiento', className: 'bg-green-100 text-green-700' },
  PENDIENTE:   { label: 'Pendiente',   className: 'bg-amber-100 text-amber-700' },
};

export function CRMFlujoBadge({ flujo }: { flujo: FlujoPaciente }) {
  const config = flujo ? CRM_FLUJO_CONFIG[flujo] : null;
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
      config ? config.className : 'bg-gray-100 text-gray-500'
    }`}>
      {config ? config.label : '—'}
    </span>
  );
}
```

### Anti-Patterns to Avoid
- **Sheet anidado para ContactoRapidoModal:** Radix Dialog/Sheet anidados comparten el mismo z-index tree y pueden generar focus-trap conflicts. Usar `Dialog` siempre para modales secundarios desde un Sheet.
- **Lógica de lista de espera inline en CardActionsSheet:** Mantiene el estado del dialog separado en `ListaEsperaDialog.tsx` para claridad.
- **Modificar FlujoBadge.tsx de /pacientes/:** Rompe la vista de pacientes que usa labels abreviados. Crear `CRMFlujoBadge` en `/crm/` independiente.
- **click handlers en EtapaStepper:** Explícitamente fuera de scope Phase 37. El planner debe verificar que el componente NO tenga `onClick` en los nodos.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal con overlay y focus trap | Custom overlay + portal | shadcn/ui Dialog | Radix maneja accesibilidad, escape, focus trap, portal automático |
| Feedback de mutation | Custom state + UI | `toast.success/error` de Sonner | Ya establecido en el proyecto |
| Form de contacto | Nuevo hook de datos | `useCreateContacto` (existente) | Hook ya tiene cache invalidation correcto |
| Toggle lista espera | Nueva llamada a API | `useUpdateListaEspera` (existente) | Hook ya invalida `crm-kanban` y `crm-metrics` |

---

## Common Pitfalls

### Pitfall 1: Dialog z-index menor que Sheet
**What goes wrong:** Si se intenta un Sheet anidado, el segundo Sheet/Dialog puede quedar detrás del overlay del Sheet padre.
**Why it happens:** Radix usa stacking contexts y gestiona z-index internamente. Dos Sheet roots compiten.
**How to avoid:** Siempre usar `Dialog` (no `Sheet`) para los modales secundarios. `DialogPortal` se monta en `document.body` y obtiene z-index correcto.
**Warning signs:** El modal aparece pero el overlay del Sheet lo cubre.

### Pitfall 2: Footer fijo pierde posición si SheetContent no tiene flex layout correcto
**What goes wrong:** El footer "sube" y no queda pegado al bottom.
**Why it happens:** Si el contenedor flex no tiene `min-h-0` en el hijo scrollable, el flex item no colapsa correctamente.
**How to avoid:** SheetContent ya usa `flex flex-col` en su definición base (verificado en `sheet.tsx`). El stepper contenedor necesita `flex-1 overflow-y-auto` y el footer `flex-shrink-0`.

### Pitfall 3: ETAPA_ORDER incluye PERDIDO al final pero el stepper lo trata aparte
**What goes wrong:** Iterar `ETAPA_ORDER` tal cual para el stepper incluiría PERDIDO en la cadena principal.
**Why it happens:** `ETAPA_ORDER` en `useCRMKanban.ts` es: `[SIN_CLASIFICAR, NUEVO_LEAD, TURNO_AGENDADO, CONSULTADO, PRESUPUESTO_ENVIADO, CONFIRMADO, PERDIDO]`
**How to avoid:** En EtapaStepper, filtrar PERDIDO de la cadena principal y renderizarlo por separado con divider. Derivar `ETAPA_ORDER_CHAIN = ETAPA_ORDER.filter(e => e !== 'PERDIDO')` localmente.
**Note:** `PROCEDIMIENTO_REALIZADO` NO está en `ETAPA_ORDER` (oculto del kanban por decisión de diseño). Según SHEET-04 el stepper muestra "6 etapas CRM" — verificar si incluir PROCEDIMIENTO_REALIZADO o no. CONTEXT.md enumera: "Sin clasificar, Nuevo Lead, Consulta Agendada, Consulta Realizada, Presupuesto Enviado, Confirmado" = 6 de la cadena normal, más PERDIDO aparte.

### Pitfall 4: Props en KanbanBoard al modificar CardActionsSheet
**What goes wrong:** Si se eliminan `onOpenNuevoTurno` y `onOpenPresupuestos` de la firma de `CardActionsSheet`, TypeScript reporta error en KanbanBoard donde se pasan.
**Why it happens:** KanbanBoard pasa estas props y mantiene estado de `turnoPatientId`.
**How to avoid:** Eliminar la prop de la interfaz Y el handler en KanbanBoard simultáneamente. El `NuevoTurnoModal` en KanbanBoard puede quedar (lo usa PatientDrawer indirectamente), o eliminarse si no tiene otros callers — verificar antes de eliminar.

### Pitfall 5: Estado del form de contacto al cerrar y reabrir
**What goes wrong:** El Dialog ContactoRapidoModal mantiene tipo/nota del intento anterior al reabrirse.
**Why it happens:** React preserva estado del componente si no se unmount.
**How to avoid:** Dialog usa `open` prop controlado — cuando `open=false` Radix unmounts el contenido automáticamente si se usa `DialogContent`. Verificar que el reset de `nota` y `tipo` ocurra en `onSuccess` (ya en el CardActionsSheet actual: `setNota("")`).

### Pitfall 6: KanbanPatient.etapaCRM puede ser null
**What goes wrong:** `patient.etapaCRM` es `EtapaCRM | null` — si es null, el stepper no tiene etapa actual que destacar.
**Why it happens:** Pacientes legacy o sin clasificar pueden no tener etapaCRM asignado.
**How to avoid:** Tratar `null` como `SIN_CLASIFICAR` en el stepper, o simplemente no destacar ninguna etapa (todos en `future` state visualmente).

---

## Code Examples

### EtapaStepper — estructura mínima verificada
```tsx
// Derivado del patrón descrito en CONTEXT.md + inspección de ETAPA_LABELS
import { ETAPA_LABELS, ETAPA_ORDER, EtapaCRM } from "@/hooks/useCRMKanban";
import { cn } from "@/lib/utils";

const CHAIN_ETAPAS = ETAPA_ORDER.filter(e => e !== 'PERDIDO');

type StepStatus = 'done' | 'current' | 'future';

function getStatus(etapa: EtapaCRM, etapaActual: EtapaCRM | null): StepStatus {
  if (!etapaActual || etapaActual === 'PERDIDO') return 'future';
  const currentIdx = CHAIN_ETAPAS.indexOf(etapaActual);
  const thisIdx = CHAIN_ETAPAS.indexOf(etapa);
  if (thisIdx < currentIdx) return 'done';
  if (thisIdx === currentIdx) return 'current';
  return 'future';
}

export function EtapaStepper({ etapaActual }: { etapaActual: EtapaCRM | null }) {
  const esPerdido = etapaActual === 'PERDIDO';

  return (
    <div className="py-2">
      {CHAIN_ETAPAS.map((etapa, idx) => {
        const status = getStatus(etapa, etapaActual);
        const isLast = idx === CHAIN_ETAPAS.length - 1;
        return (
          <div key={etapa} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={cn(
                "h-5 w-5 rounded-full border-2 flex-shrink-0",
                status === 'current' && "border-primary bg-primary",
                status === 'done'    && "border-primary/40 bg-primary/10",
                status === 'future'  && "border-gray-300 bg-transparent",
              )} />
              {!isLast && <div className="w-0.5 flex-1 min-h-[24px] bg-gray-200 mt-1" />}
            </div>
            <span className={cn(
              "text-sm pt-0.5 pb-3",
              status === 'current' && "font-semibold text-foreground",
              status !== 'current' && "text-muted-foreground",
            )}>
              {ETAPA_LABELS[etapa]}
            </span>
          </div>
        );
      })}

      {/* Separador + PERDIDO */}
      <div className="my-2 border-t border-dashed border-gray-200" />
      <div className="flex items-center gap-3">
        <div className={cn(
          "h-5 w-5 rounded-full border-2 flex-shrink-0",
          esPerdido ? "border-red-500 bg-red-500" : "border-gray-200 bg-transparent",
        )} />
        <span className={cn(
          "text-sm",
          esPerdido ? "font-semibold text-red-600" : "text-gray-300",
        )}>
          {ETAPA_LABELS['PERDIDO']}
        </span>
      </div>
    </div>
  );
}
```

### ContactoRapidoModal — estructura mínima
```tsx
// Mismo contenido que CardActionsSheet actual, extraído a Dialog
// Source: CardActionsSheet.tsx sección "Registrar contacto" + LossReasonModal.tsx pattern
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ContactoRapidoModal({
  open,
  onOpenChange,
  patient,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patient: KanbanPatient | null;
}) {
  const [tipo, setTipo] = useState<TipoContacto>("LLAMADA");
  const [nota, setNota] = useState("");
  const { mutate, isPending } = useCreateContacto(patient?.id ?? "");

  function handleSubmit() {
    if (!patient) return;
    mutate(
      { tipo, nota: nota.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Contacto registrado");
          setNota("");
          onOpenChange(false); // solo cierra el Dialog, el Sheet queda abierto
        },
        onError: () => toast.error("No se pudo registrar el contacto"),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar contacto</DialogTitle>
        </DialogHeader>
        {/* selector tipo + textarea nota + botón */}
      </DialogContent>
    </Dialog>
  );
}
```

### ListaEsperaDialog — lógica de estado
```tsx
// Dialog pre-llenado si patient.enListaEspera = true
export function ListaEsperaDialog({ open, onOpenChange, patient }) {
  const estaEnEspera = patient?.enListaEspera ?? false;
  const [comentario, setComentario] = useState(patient?.comentarioListaEspera ?? "");
  const { mutate, isPending } = useUpdateListaEspera();

  useEffect(() => {
    setComentario(patient?.comentarioListaEspera ?? "");
  }, [patient?.id, open]);

  function handleAgregar() {
    mutate({ pacienteId: patient.id, enListaEspera: true, comentarioListaEspera: comentario.trim() || undefined }, {
      onSuccess: () => { toast.success("Agregado a lista de espera"); onOpenChange(false); },
      onError: () => toast.error("No se pudo actualizar"),
    });
  }

  function handleQuitar() {
    mutate({ pacienteId: patient.id, enListaEspera: false }, {
      onSuccess: () => { toast.success("Quitado de lista de espera"); onOpenChange(false); },
    });
  }
  // ...
}
```

### Modificación de KanbanBoard — limpieza de props
```tsx
// Eliminar de KanbanBoard.tsx:
// - Estado turnoPatientId y setTurnoPatientId
// - onOpenNuevoTurno prop a CardActionsSheet
// - onOpenPresupuestos prop a CardActionsSheet
// - El NuevoTurnoModal render (verificar si tiene otros callers primero)

// Nueva firma de CardActionsSheet:
interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patient: KanbanPatient | null;
  onOpenDrawer: (pacienteId: string) => void;
  // ELIMINADO: onOpenNuevoTurno, onOpenPresupuestos
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Todo inline en CardActionsSheet (contacto + lista espera + acciones) | Layout stepper-centric + sub-dialogs para acciones | Phase 37 | Sheet queda abierto después de acciones; mejor UX para secretaria |
| FlujoBadge con labels abreviados (CIR/TRAT/PEND) | CRMFlujoBadge con labels completos en el sheet | Phase 37 | Más legible en el contexto del sheet sin necesitar hover |
| Acciones rápidas (dar turno, crear presupuesto) en el sheet | Solo accesibles desde PatientDrawer ("Ver perfil completo") | Phase 37 (SHEET-09) | Sheet más enfocado en contexto CRM |

---

## Open Questions

1. **¿Incluir PROCEDIMIENTO_REALIZADO en el stepper?**
   - What we know: `ETAPA_ORDER` en `useCRMKanban.ts` excluye `PROCEDIMIENTO_REALIZADO` ("hidden from kanban per user decision"). `ETAPA_LABELS` sí lo define como "Procedimiento Realizado". SHEET-04 dice "6 etapas CRM".
   - What's unclear: Si las "6 etapas" del stepper deben ser las 6 de la cadena normal (sin PROCEDIMIENTO_REALIZADO) o incluirlo.
   - Recommendation: Usar `ETAPA_ORDER` como fuente de verdad (excluye PROCEDIMIENTO_REALIZADO). El planner debería consultar con el usuario o resolver usando la cadena normal de 6 + PERDIDO aparte.

2. **¿Eliminar NuevoTurnoModal de KanbanBoard o solo la prop?**
   - What we know: `NuevoTurnoModal` en KanbanBoard.tsx se activa por `turnoPatientId` que solo se seteaba desde CardActionsSheet via `onOpenNuevoTurno`.
   - What's unclear: ¿Algún otro componente en el tree de KanbanBoard llama a ese modal?
   - Recommendation: Al eliminar la prop, el estado `turnoPatientId` queda orphan. Limpiar el estado y el render del modal en KanbanBoard en el mismo task que elimina la prop de CardActionsSheet.

3. **¿Dónde mostrar "Ver perfil completo"?**
   - Marcado como Claude's Discretion en CONTEXT.md.
   - Recommendation: Link pequeño (`text-muted-foreground underline text-xs`) en el footer, debajo de los dos botones principales. Menos visual weight que un botón ghost, evita confusión con las acciones principales.

---

## Sources

### Primary (HIGH confidence)
- Inspección directa de `CardActionsSheet.tsx` — layout actual, props, lógica de estado
- Inspección directa de `LossReasonModal.tsx` — patrón Dialog-desde-Sheet confirmado funcionando
- Inspección directa de `useCRMKanban.ts` — `ETAPA_LABELS`, `ETAPA_ORDER`, `KanbanPatient` type
- Inspección directa de `FlujoBadge.tsx` — labels actuales, estructura del componente
- Inspección directa de `dialog.tsx` y `sheet.tsx` — APIs disponibles de shadcn/ui
- Inspección directa de `useCreateContacto.ts` y `useUpdateListaEspera.ts` — firmas y cache invalidation

### Secondary (MEDIUM confidence)
- `KanbanBoard.tsx` — estructura de props pasadas a CardActionsSheet, estado de modals
- `PatientCard.tsx` — uso de `useUIStore.focusModeEnabled` como referencia de patrón

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — todo el stack es código existente inspeccionado directamente
- Architecture: HIGH — patrón Dialog-desde-Sheet confirmado en LossReasonModal existente
- Component patterns: HIGH — código verificado line-by-line
- Open question PROCEDIMIENTO_REALIZADO: LOW — requiere confirmación del usuario

**Research date:** 2026-05-26
**Valid until:** N/A — investigación sobre código propio del proyecto, no dependencias externas
