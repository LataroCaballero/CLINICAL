# Phase 69: Consistencia de Teléfono Opcional (Frontend) - Pattern Map

**Mapped:** 2026-08-20
**Files analyzed:** 24 (modificados) + 2 helpers nuevos (analog: molde de Phase 68) + 1 línea de backend
**Analogs found:** 24 / 24 (todos los archivos a modificar son a la vez su propio "analog" — esta fase extiende patrones existentes en el mismo archivo, no importa patrones de otro módulo, salvo los 2 helpers nuevos y los 2 schemas Zod que calcan `InlineCreatePaciente.tsx`)

**Nota de verificación de líneas:** todos los números de línea de `69-CONTEXT.md` fueron re-verificados con `rg`/`Read` el 2026-08-20 (misma fecha del context). Desviaciones encontradas y su detalle están en la sección "Desviaciones respecto a CONTEXT.md" al final. Ninguna es bloqueante; son corrimientos de 1 línea o hallazgos adicionales (interfaces `CalendarEvent` duplicadas) que el planner debe conocer.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/src/lib/utils.ts` (o `lib/telefono.ts` nuevo) | utility | transform | `frontend/src/lib/estadoTurno.ts` | role-match (helper puro con JSDoc) |
| `frontend/src/app/dashboard/pacientes/components/PacienteDetails.tsx` | component | request-response | — (patrón canónico, se auto-referencia) | exact |
| `frontend/src/app/dashboard/turnos/AppointmentDetailModal.tsx` | component | request-response | `PacienteDetails.tsx:311-328` | exact (mismo patrón Tooltip) |
| `frontend/src/components/patient/PatientDrawer/views/PresupuestosView.tsx` | component | request-response | `PacienteDetails.tsx:311-328` | exact (mismo patrón Tooltip) |
| `frontend/src/components/whatsapp/WAThreadView.tsx` (botón template) | component | request-response | `PacienteDetails.tsx:311-328` | role-match (misma librería Tooltip, estructura ternaria distinta) |
| `frontend/src/components/whatsapp/WAThreadView.tsx` (free-text) | component | request-response | `WAThreadView.tsx:205-234` (el propio botón template, mismo archivo) | partial (hoy sin Tooltip — hay que construirlo) |
| `frontend/src/app/dashboard/pacientes/components/NewPacienteModal.tsx` | component/form | CRUD | `frontend/src/components/InlineCreatePaciente.tsx:42-51` | exact (schema Zod a calcar) |
| `frontend/src/components/patient/PatientDrawer/views/DatosCompletos.tsx` | component/form | CRUD | `frontend/src/components/InlineCreatePaciente.tsx:42-51` | exact (schema Zod a calcar) |
| `frontend/src/components/AutocompletePaciente.tsx` | component | request-response | — (edición puntual de línea) | exact |
| `frontend/src/components/live-turno/tabs/DatosPacienteTab.tsx` | component | request-response | `PacienteDetails.tsx:185-187` | exact (mismo `\|\| "-"` a migrar) |
| `frontend/src/components/crm/ListaEsperaSheet.tsx` | component | request-response | — (edición puntual) | exact |
| `frontend/src/app/dashboard/reportes/financieros/cuentas/page.tsx` | component | CRUD | `TablaReporte.tsx:34-49` (`render:` en otras columnas) | exact |
| `frontend/src/app/dashboard/reportes/operativos/ausentismo/page.tsx` | component | CRUD | `TablaReporte.tsx:34-49` | exact |
| `frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx` | component | request-response | — (plumbing existente de `whatsappOptIn`) | exact |
| `frontend/src/components/patient/PatientDrawer/views/MensajesView.tsx` | component | request-response | — (plumbing existente de `whatsappOptIn`) | exact |
| `frontend/src/app/dashboard/turnos/CalendarGrid.tsx` | component | CRUD | — | exact |
| `frontend/src/app/dashboard/turnos/page.tsx` | component | request-response | — | exact |
| `backend/src/modules/turnos/turnos.service.ts` | service | CRUD | — (único cambio de backend) | exact |
| `frontend/src/types/pacients.ts` | model/types | transform | — | exact |
| `frontend/src/types/reportes.ts` | model/types | transform | — | exact |
| `frontend/src/hooks/useReportesFinancieros.ts` | model/types | transform | — | exact |
| `frontend/src/hooks/useListaEspera.ts` | model/types | transform | — | exact |

**Archivos verificados como NO-OP (no se tocan, ver D-06/D-10/D-11 del CONTEXT):**
`pacientes/components/columns.tsx`, `components/data-table/data-table.tsx`, `pacientes/components/PatientFormModal.tsx`, `whatsapp/SendWAMessageModal.tsx`.

---

## Pattern Assignments

### 1. Patrón del botón WhatsApp deshabilitado (ENVIO-03, D-11/D-14/D-15/D-17)

#### Patrón canónico: `frontend/src/app/dashboard/pacientes/components/PacienteDetails.tsx:311-328`

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <span>
      <Button
        variant="outline"
        className="flex flex-col items-center justify-center p-3 border rounded-md hover:bg-muted transition text-sm min-h-[70px] w-full h-auto"
        disabled={!(paciente as any).whatsappOptIn}
        onClick={() => setWaModalOpen(true)}
      >
        <MessageSquare className="w-5 h-5 text-green-600 mb-1" />
        WhatsApp
      </Button>
    </span>
  </TooltipTrigger>
  {!(paciente as any).whatsappOptIn && (
    <TooltipContent>El paciente no tiene opt-in para WhatsApp</TooltipContent>
  )}
</Tooltip>
```

**Cómo computa hoy `disabled`:** `!(paciente as any).whatsappOptIn` — negación directa, sin memo/función.
**Cómo computa hoy el tooltip:** un solo string hardcodeado, condicionado por el mismo booleano invertido (`!whatsappOptIn && <TooltipContent>...`).
**Dato en scope (D-13):** `paciente.telefono` ya está disponible en este componente (se usa en línea 186 para el display). Cero plumbing — sólo extender el predicado y el texto.

**Aplicación de D-14/D-15 aquí (patrón a replicar en los 4 sitios):**
```tsx
// D-15: un motivo por vez, string | null
const motivoBloqueoWA = getMotivoBloqueoWhatsApp(paciente.telefono, (paciente as any).whatsappOptIn);
// disabled={!!motivoBloqueoWA}
// {motivoBloqueoWA && <TooltipContent>{motivoBloqueoWA}</TooltipContent>}
```

---

#### `frontend/src/app/dashboard/turnos/AppointmentDetailModal.tsx`

**Líneas reales verificadas:** el bloque Tooltip es **366-386** (CONTEXT.md dice 367-386 — desvío de 1 línea, el `{event.pacienteId && (` de apertura está en 367, el `<Tooltip>` en 368). `Props.whatsappOptIn` está en línea **56**, dentro de una `interface CalendarEvent` que ocupa **51-62** (ver "Desviaciones" — este archivo tiene su PROPIA copia de `CalendarEvent`, no la importa).

```tsx
{/* WhatsApp send shortcut — only shown when pacienteId is available */}
{event.pacienteId && (
  <Tooltip>
    <TooltipTrigger asChild>
      <span>
        <Button
          variant="outline"
          className="w-full"
          disabled={!event.whatsappOptIn}
          onClick={() => setWaModalOpen(true)}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          WhatsApp
        </Button>
      </span>
    </TooltipTrigger>
    {!event.whatsappOptIn && (
      <TooltipContent>El paciente no tiene opt-in para WhatsApp</TooltipContent>
    )}
  </Tooltip>
)}
```

**Cómo computa `disabled` hoy:** `!event.whatsappOptIn` (sobre el objeto `CalendarEvent`, no sobre `paciente` directo — dato viene del mapeo de `page.tsx`).
**Plumbing del teléfono (D-13):** requiere, en este orden:
1. `backend/src/modules/turnos/turnos.service.ts` — agregar `telefono: true` al `select.paciente` de `obtenerTurnosPorRango`.
2. `frontend/src/app/dashboard/turnos/page.tsx:290` — agregar `telefono: t.paciente?.telefono ?? null,` junto a la línea de `whatsappOptIn`.
3. Ensanchar **las 3 interfaces `CalendarEvent`** (ver "Desviaciones"): `CalendarGrid.tsx:15-28`, `page.tsx:41-56` y `AppointmentDetailModal.tsx:51-62`, todas con `telefono?: string | null;`.
4. Recién ahí tocar el `disabled`/`TooltipContent` de este bloque.

---

#### `frontend/src/components/patient/PatientDrawer/views/PresupuestosView.tsx`

**Líneas reales:** `Props` en **43-48** (`pacienteOptIn?: boolean;` en línea 46, CONTEXT dice `:59` que es la firma de la función, ambas correctas — la prop está declarada en el `type Props` de 43-48 y desestructurada en la firma de línea 59). Bloque Tooltip: **214-245** (CONTEXT dice 213-245, el `<Tooltip>` real abre en 214; el `{` de apertura condicional puede estar en 213).

```tsx
type Props = {
  pacienteId: string;
  pacienteEmail?: string;
  pacienteOptIn?: boolean;
  onBack: () => void;
};
...
export default function PresupuestosView({ pacienteId, pacienteEmail = "", pacienteOptIn = false, onBack }: Props) {
```

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <span>
      <Button
        ...
        disabled={!pacienteOptIn || sendingWAId === p.id}
        onClick={...}
      >
        ...
        Enviar por WhatsApp
      </Button>
    </span>
  </TooltipTrigger>
  {!pacienteOptIn && (
    <TooltipContent>El paciente no tiene opt-in para WhatsApp</TooltipContent>
  )}
</Tooltip>
```

**Cómo computa `disabled` hoy:** `!pacienteOptIn || sendingWAId === p.id` — el guard de teléfono se suma con `||` al principio, sin tocar la condición de loading.
**Plumbing (D-13):** prop nueva `pacienteTelefono?: string | null` (nombre a discreción del planner), pasada desde `PatientDrawer.tsx:131-137` al lado de `pacienteOptIn={(paciente as any).whatsappOptIn ?? false}` (línea 134).

---

#### `frontend/src/components/whatsapp/WAThreadView.tsx` — DOS controles, patrones distintos entre sí

**Props reales:** `type Props` en **26-32** (`whatsappOptIn: boolean;` en línea 29). Coincide con CONTEXT.md.

**Control 1 — botón "Enviar mensaje"/template, líneas 204-235 (no 205-243 como dice CONTEXT — ver Desviaciones):**

```tsx
<div className="flex items-center gap-2">
  {whatsappOptIn ? (
    <Button
      variant="outline"
      size="sm"
      className="text-green-700 border-green-300 hover:bg-green-50"
      onClick={() => setShowTemplateModal(true)}
    >
      <MessageSquare className="h-4 w-4 mr-1" />
      Enviar mensaje
    </Button>
  ) : (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button
            variant="outline"
            size="sm"
            className="text-muted-foreground border-dashed"
            disabled
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Enviar mensaje
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        El paciente no tiene opt-in para WhatsApp
      </TooltipContent>
    </Tooltip>
  )}
</div>
```

**IMPORTANTE — este control NO usa el mismo patrón que los otros 3.** En vez de `disabled={predicado}` sobre un único `<Button>`, es un ternario `whatsappOptIn ? <Button habilitado> : <Tooltip><Button disabled hardcodeado>`. Para incorporar el motivo D-15 (`string | null`), lo más fiel al patrón existente es cambiar la condición del ternario de `whatsappOptIn` a `!motivoBloqueoWA` y renderizar `{motivoBloqueoWA}` dentro del `TooltipContent` en vez del string fijo. No hace falta convertirlo al patrón `disabled={}` de los otros 3 — el ternario ya cumple la misma función visual.

**Control 2 — Textarea + botón Send de free-text, líneas 244-275. Este control HOY NO TIENE TOOLTIP.**

```tsx
<Textarea
  value={freeText}
  onChange={(e) => setFreeText(e.target.value)}
  placeholder={
    canSendFreeText
      ? 'Responder directamente...'
      : 'Sin ventana de 24h activa'
  }
  className="resize-none min-h-[40px] max-h-[100px] text-sm"
  disabled={!canSendFreeText || !whatsappOptIn}
  onKeyDown={...}
/>
<Button
  size="icon"
  className="h-9 w-9 shrink-0"
  disabled={
    !freeText.trim() ||
    !canSendFreeText ||
    !whatsappOptIn ||
    sendFreeText.isPending
  }
  onClick={handleSendFreeText}
>
  <Send className="h-4 w-4" />
</Button>
```

**Líneas exactas de los predicados citados en D-11:** `:254` es efectivamente el `disabled={!canSendFreeText || !whatsappOptIn}` del `Textarea` — coincide con CONTEXT.md. `:268` es la línea `!whatsappOptIn,` dentro del array multilínea del `disabled` del botón `Send` — también coincide.

**Nota para el planner:** D-17 dice "el patrón visual se reusa tal cual, los 4 sitios ya lo hacen bien" — eso es cierto para el botón template y los otros 3 archivos, pero **no** para este segundo control: no hay `Tooltip`/`TooltipContent` que envolver hoy, sólo `disabled` crudo sin explicación visual. Si D-15/D-16 aplican también acá (mostrar motivo), hay que **construir** el wrapper `Tooltip > TooltipTrigger asChild > <span>` alrededor del botón `Send` (el `Textarea` deshabilitado normalmente no lleva tooltip propio en el resto del repo — no hay analog para eso). El patrón a copiar para el wrapper nuevo es el del Control 1 de este mismo archivo (líneas 216-233).

---

### 2. Cadena de plumbing de `whatsappOptIn` → molde para `telefono` (D-13)

**`frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx:129-146`** (verificado, coincide con CONTEXT):

```tsx
{view === "presupuestos" && paciente &&
  <PresupuestosView
    pacienteId={paciente.id}
    pacienteEmail={paciente.email ?? ""}
    pacienteOptIn={(paciente as any).whatsappOptIn ?? false}
    onBack={() => setView("default")}
  />
}
{view === "mensajes" && paciente &&
  <MensajesView
    pacienteId={paciente.id}
    pacienteNombre={paciente.nombreCompleto}
    whatsappOptIn={(paciente as any).whatsappOptIn ?? false}
    onBack={() => setView("default")}
  />
}
```

Molde exacto para la prop nueva: agregar `pacienteTelefono={(paciente as any).telefono ?? null}` (o el nombre que el planner elija) al lado de cada línea de `whatsappOptIn`/`pacienteOptIn`.

**`frontend/src/components/patient/PatientDrawer/views/MensajesView.tsx`** (archivo completo, 23 líneas, coincide con CONTEXT `:8, :12-20`):

```tsx
type Props = {
  pacienteId: string;
  pacienteNombre?: string;
  whatsappOptIn?: boolean;
  onBack: () => void;
};

export default function MensajesView({ pacienteId, pacienteNombre, whatsappOptIn = false, onBack }: Props) {
  return (
    <div className="h-[60vh] -mx-6 -mb-4">
      <WAThreadView
        pacienteId={pacienteId}
        pacienteNombre={pacienteNombre}
        whatsappOptIn={whatsappOptIn}
        onBack={onBack}
      />
    </div>
  );
}
```

Es un eslabón puro: agregar `pacienteTelefono?: string | null;` a `Props`, desestructurarlo, pasarlo a `WAThreadView`.

**`frontend/src/components/whatsapp/WAThreadView.tsx:26-32`** (Props, verificado):

```tsx
type Props = {
  pacienteId: string;
  pacienteNombre?: string;
  whatsappOptIn: boolean;
  onBack: () => void;
  pacienteEmail?: string;
};
```

**`backend/src/modules/turnos/turnos.service.ts:567-572`** (el único cambio de backend, verificado línea por línea):

```ts
select: {
  id: true,
  inicio: true,
  fin: true,
  estado: true,
  observaciones: true,
  paciente: {
    select: {
      id: true,
      nombreCompleto: true,
      whatsappOptIn: true,
      // AGREGAR: telefono: true,
    },
  },
  ...
```

**`frontend/src/app/dashboard/turnos/page.tsx:282-298`** (mapeo turnos→CalendarEvent, verificado):

```tsx
const mapped: CalendarEvent[] = (turnosRango as any[])
  .filter((t) => t.estado !== "CANCELADO")
  .map((t) => ({
  id: t.id,
  title: `${t.tipoTurno?.nombre ?? "Turno"} – ${t.paciente?.nombreCompleto ?? ""}`,
  paciente: t.paciente?.nombreCompleto ?? "",
  pacienteId: t.pacienteId ?? undefined,
  whatsappOptIn: t.paciente?.whatsappOptIn ?? false,
  // AGREGAR aquí: telefono: t.paciente?.telefono ?? null,
  start: new Date(t.inicio),
  end: new Date(t.fin),
  ...
```

---

### 3. Schema Zod de teléfono opcional (D-08/D-09) — molde de Phase 68

**Analog canónico:** `frontend/src/components/InlineCreatePaciente.tsx:42-51` (verificado, ya resuelto y en producción desde Phase 68):

```ts
const schema = z.object({
  nombreCompleto: z.string().min(3, "Mínimo 3 caracteres"),
  dni: z.string().min(7, "Mínimo 7 dígitos"),
  telefono: z
    .string()
    .optional()
    .refine((v) => !v || v.trim() === "" || v.trim().length >= 6, {
      message: "Teléfono inválido",
    }),
});
```

#### Sitio a relajar 1: `frontend/src/app/dashboard/pacientes/components/NewPacienteModal.tsx`

Líneas verificadas — **coinciden exacto con CONTEXT.md**:

```ts
// :34 — hoy obligatorio, migrar a la forma de arriba
telefono: z.string().min(6, "Teléfono inválido"),

// :70 — default, se deja igual (correcto según D-08)
defaultValues: { dni: "", nombreCompleto: "", telefono: "", email: "", obraSocialId: "", plan: "" },

// :87 — crash latente con undefined, cambiar a data.telefono?.trim() ?? ""
telefono: data.telefono.trim(),
```

Bloque de label (D-08 "pierde el asterisco, gana `(opcional)`"), líneas **167-180** verificadas exacto:

```tsx
{/* Teléfono */}
<div className="grid gap-1.5">
  <label className="text-sm font-medium text-muted-foreground">
    Teléfono <span className="text-destructive">*</span>
  </label>
  <PhoneInput
    value={watch("telefono") || ""}
    onChange={(v: string) => setValue("telefono", v)}
  />
  {errors.telefono && (
    <Alert variant="destructive" className="py-2">
      <AlertDescription>{errors.telefono.message}</AlertDescription>
    </Alert>
  )}
</div>
```

#### Sitio a relajar 2: `frontend/src/components/patient/PatientDrawer/views/DatosCompletos.tsx`

Líneas verificadas — **coinciden exacto con CONTEXT.md**:

```ts
// :106-108 — contactoSchema, telefono obligatorio hoy
const contactoSchema = z.object({
    telefono: z.string().min(6, "Teléfono inválido").max(20, "Teléfono inválido"),
    telefonoAlternativo: z.string().min(6).max(20).optional().nullable(), // NO TOCAR (D-09)
    email: z.string().email("Email inválido").optional().nullable(),
});
```

```ts
// :27 y :185 — seeds, ya null-safe, NO TOCAR
telefono: paciente.telefono ?? "",
```

```tsx
// :587-596 — FieldRow del bloque Contacto (submit vía EditableInput)
<FieldRow
    label="Teléfono"
    value={
        <EditableInput
            disabled={!isEditing("contacto") || saving}
            value={contactoForm.telefono}
            onChange={(v) => setContactoForm((f) => ({ ...f, telefono: v }))}
            error={contactoErrors.telefono}
        />
    }
/>
```

---

### 4. Helpers nuevos — convención de `frontend/src/lib/`

`frontend/src/lib/utils.ts` actual (archivo completo, 5 líneas, sin JSDoc — sólo re-exporta `cn`):

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Mejor analog de convención para un helper nuevo con lógica propia:** `frontend/src/lib/estadoTurno.ts` (28 líneas completas) — JSDoc corto arriba de la función, "módulo TypeScript puro" sin imports de framework, comentarios inline donde hace falta contexto:

```ts
/**
 * Helper puro: mapea un valor de EstadoTurno a { label, className }.
 * Cubre los 7 valores reales del enum + fallback neutro.
 * Sin imports de React ni NestJS — módulo TypeScript puro.
 */
export function getEstadoTurnoChip(estado: string): { label: string; className: string } {
  switch (estado) {
    case "CONFIRMADO":
      return { label: "Confirmado", className: "bg-green-100 text-green-700" };
    ...
    default:
      return { label: estado, className: "bg-gray-100 text-gray-500" };
  }
}
```

**Molde sugerido para los 3 helpers de D-02/D-12/D-15** (nombre y ubicación exacta a discreción del planner — ver `<decisions>` "Claude's Discretion"):

```ts
/**
 * Placeholder de teléfono ausente (Phase 69 TEL-03).
 * Mismo criterio "falsy tras trim" de Phase 67 D-03.
 */
export function formatTelefono(value: string | null | undefined): string {
  return value?.trim() ? value : "-";
}

/**
 * Guard de envío WhatsApp (Phase 69 ENVIO-03, D-12).
 * No mira telefonoAlternativo (67 D-04: no es canal de envío).
 */
export function tieneTelefono(value: string | null | undefined): boolean {
  return !!value?.trim();
}

/**
 * Motivo de bloqueo del control de WhatsApp (D-14/D-15/D-16).
 * El teléfono tiene precedencia sobre el opt-in.
 */
export function getMotivoBloqueoWhatsApp(
  telefono: string | null | undefined,
  whatsappOptIn: boolean | undefined,
): string | null {
  if (!tieneTelefono(telefono)) return "El paciente no tiene teléfono cargado";
  if (!whatsappOptIn) return "El paciente no tiene opt-in para WhatsApp";
  return null;
}
```

**Analog backend del criterio "falsy tras trim" y del mensaje largo (sólo lectura, NO se replica el texto):**
`backend/src/modules/whatsapp/whatsapp.service.ts:189-198`:
```ts
private requireTelefonoParaEnvio(
  telefono: string | null | undefined,
): string {
  if (!telefono || !telefono.trim()) {
    throw new BadRequestException(
      'El paciente no tiene un número de teléfono cargado. Agregá un teléfono en su ficha para poder enviarle mensajes de WhatsApp.',
    );
  }
  return telefono.trim();
}
```
(D-16: el tooltip usa deliberadamente un texto más corto — no copiar este string.)

---

### 5. Sitios de display de teléfono (TEL-03, D-01..D-05)

**`frontend/src/app/dashboard/pacientes/components/PacienteDetails.tsx:186`** (verificado):
```tsx
<Phone className="w-4 h-4" /> {paciente.telefono || "-"}
```
→ migrar a `{formatTelefono(paciente.telefono)}`.

**`frontend/src/components/live-turno/tabs/DatosPacienteTab.tsx:198`** (verificado, mismo patrón):
```tsx
<Phone className="w-4 h-4 text-gray-400" />
{paciente.telefono || '-'}
```
`:204` `telefonoAlternativo` — NO TOCAR (D-07 nota):
```tsx
{(paciente as any).telefonoAlternativo || '-'}
```

**`frontend/src/components/AutocompletePaciente.tsx:190`** (verificado, coincide exacto):
```tsx
<span className="text-xs text-gray-500">
  DNI: {pac.dni} — Tel: {pac.telefono}
</span>
```
→ D-03: cuando no hay teléfono, cae el segmento entero (`— Tel: ...`), no `formatTelefono`. Patrón sugerido: `DNI: {pac.dni}{pac.telefono ? ` — Tel: ${pac.telefono}` : ""}`.

**`frontend/src/components/crm/ListaEsperaSheet.tsx:90-97`** (verificado exacto):
```tsx
<a
  href={`tel:${p.telefono}`}
  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
>
  <Phone className="h-3 w-3" />
  {p.telefono}
</a>
```
→ D-04: envolver en condicional — con teléfono, `<a href="tel:...">`; sin teléfono, `<span>` inerte con mismo ícono `Phone` en gris + `formatTelefono(p.telefono)` (que dará `-`).

**`frontend/src/app/dashboard/reportes/components/TablaReporte.tsx`** — SOLO LECTURA, no se modifica. Interfaz de escape verificada en **16-22** y **90-101**:
```ts
export interface ColumnDef<T> {
  key: keyof T | string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}
```
```tsx
{col.render ? col.render(value, row) : value}
```

**Analog de `render:` a copiar literal** (`cuentas/page.tsx:34-39`, con `CurrencyCell`):
```ts
{
  key: "saldoActual",
  header: "Saldo Actual",
  align: "right",
  render: (value: number) => <CurrencyCell value={value} />,
},
```

**Las 3 columnas a modificar** (verificadas exacto):
- `frontend/src/app/dashboard/reportes/financieros/cuentas/page.tsx:33`: `{ key: "telefono", header: "Teléfono" },` → agregar `render: (v) => formatTelefono(v),`
- `frontend/src/app/dashboard/reportes/financieros/cuentas/page.tsx:60`: ídem, segunda tabla (morosidad)
- `frontend/src/app/dashboard/reportes/operativos/ausentismo/page.tsx:26`: ídem

---

## Shared Patterns

### Tooltip de control deshabilitado (ENVIO-03)
**Source:** `frontend/src/app/dashboard/pacientes/components/PacienteDetails.tsx:311-328`
**Apply to:** `AppointmentDetailModal.tsx`, `PresupuestosView.tsx`, `WAThreadView.tsx` (control template — el free-text no tiene tooltip hoy, ver nota arriba)
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <span>
      <Button disabled={!!motivo} ...>...</Button>
    </span>
  </TooltipTrigger>
  {motivo && <TooltipContent>{motivo}</TooltipContent>}
</Tooltip>
```
**Regla obligatoria (D-17):** el `<span>` intermedio no se puede omitir — un `<Button disabled>` no dispara eventos de puntero y el tooltip nunca aparecería sin el wrapper.

### Placeholder de dato ausente
**Source:** `formatTelefono` (nuevo, ver sección 4) + patrón previo en `PacienteDetails.tsx:186` / `DatosPacienteTab.tsx:198`
**Apply to:** todos los sitios de display de la sección 5, salvo `AutocompletePaciente.tsx` (D-03, cae el segmento) y `ListaEsperaSheet.tsx` (D-04, condicional de link)

### Predicado de habilitación de envío
**Source:** `tieneTelefono` (nuevo) + `whatsappOptIn` existente
**Apply to:** los 5 controles de la sección 1, combinados vía `getMotivoBloqueoWhatsApp`

### Schema Zod de teléfono opcional
**Source:** `frontend/src/components/InlineCreatePaciente.tsx:42-51` (Phase 68, ya en producción)
**Apply to:** `NewPacienteModal.tsx:34`, `DatosCompletos.tsx:106`

### `ColumnDef.render` para transformar celdas sin tocar el componente genérico
**Source:** `frontend/src/app/dashboard/reportes/components/TablaReporte.tsx:16-22, 90-101` (sólo lectura)
**Apply to:** `cuentas/page.tsx:33,60`, `ausentismo/page.tsx:26`

---

## No Analog Found

Ninguno. Todos los 24 archivos objetivo tienen o bien su propio patrón interno a extender (mismo archivo, línea vecina), o un analog exacto en otro archivo de la misma lista (los 4 sitios de Tooltip se referencian entre sí; los 2 schemas Zod comparten el molde de `InlineCreatePaciente.tsx`).

---

## Desviaciones respecto a CONTEXT.md (verificadas 2026-08-20)

1. **`AppointmentDetailModal.tsx`** — el bloque Tooltip completo es **366-386**, no 367-386 (desvío de 1 línea, el comentario `{/* WhatsApp send shortcut... */}` está en 366, el `{event.pacienteId && (` en 367). No afecta el contenido citado.
2. **`AppointmentDetailModal.tsx` tiene su PROPIA `interface CalendarEvent` en líneas 51-62**, no sólo la línea 56 mencionada en CONTEXT.md. Esta interfaz **no se importa** de `CalendarGrid.tsx` — es una copia local independiente con los mismos campos. CONTEXT.md D-13 sólo cita `AppointmentDetailModal.tsx:56` (la línea de `whatsappOptIn` dentro de esa interfaz) y `CalendarGrid.tsx:15-28`, pero **no menciona que hay una TERCERA copia** en `frontend/src/app/dashboard/turnos/page.tsx:41-56` (también local, tampoco importada). **Las tres deben ensancharse con `telefono?: string | null;`** para que el plumbing tipe de punta a punta; si sólo se toca una, TypeScript no va a fallar (son interfaces estructuralmente compatibles y el campo es opcional) pero el dato no fluirá al componente que falte.
3. **`PresupuestosView.tsx`** — el bloque Tooltip real empieza en línea **214** (el `<Tooltip>` en sí), CONTEXT.md dice 213 (que es la línea del `{condición && (` de apertura, un nivel afuera). Coincide en sustancia.
4. **`WAThreadView.tsx`** — el botón template ocupa líneas **204-235** en la lectura real (`<div className="flex items-center gap-2">` en 204 hasta el cierre del `Tooltip` + `</div>` en 235), CONTEXT.md dice `:205-243`. La cifra `243` de CONTEXT.md parece incluir de más — el bloque real del control template termina en 235; de 237 en adelante ya es la sección "Free-text reply area" (comentario en línea 237, código empieza en 238). **Hallazgo importante:** el control template usa un patrón *ternario* (`whatsappOptIn ? <Button> : <Tooltip>...`), distinto de `disabled={predicado}` de los otros 3 sitios — documentado en la sección 1 arriba.
5. **`WAThreadView.tsx` control free-text — confirmado que HOY NO TIENE Tooltip/TooltipContent.** Los predicados citados por CONTEXT.md (`:254`, `:268`) son correctos línea por línea, pero no hay wrapper visual que "extender" — hay que construirlo si D-15/D-16 aplican a este control también. Esto no está explícito en D-11/D-17 y el planner debe decidir si el motivo se muestra ahí o si el free-text se deja con `disabled` mudo (sin tooltip) como está hoy.
6. **Todo lo demás verificado línea por línea coincide exacto con CONTEXT.md**: `PacienteDetails.tsx` (186, 311-328), `NewPacienteModal.tsx` (34, 70, 87, 167-180), `DatosCompletos.tsx` (106-107, 185-186, 203-212, 587-596 — CONTEXT dice 588-608, el bloque real de `FieldRow` de teléfono es 586-596, y el de `telefonoAlternativo` 598-610, dentro del rango citado), `PatientDrawer.tsx` (129-146), `MensajesView.tsx` (8, 12-20), `CalendarGrid.tsx` (15-28), `turnos.service.ts` (561-588, select en 567-572), `turnos/page.tsx` (280-301, línea 290 exacta), `AutocompletePaciente.tsx` (190), `DatosPacienteTab.tsx` (198, 204), `ListaEsperaSheet.tsx` (90-97), `TablaReporte.tsx` (16-22, 100), `cuentas/page.tsx` (33, 60), `ausentismo/page.tsx` (26), los 4 archivos de tipos (`pacients.ts:6,38`; `reportes.ts:84`; `useReportesFinancieros.ts:60,77`; `useListaEspera.ts:7`), `PatientFormModal.tsx` (33, 96) y `SendWAMessageModal.tsx` (23-28, `Props` sin `telefono`).

---

## Metadata

**Analog search scope:** `frontend/src/app/dashboard/pacientes`, `frontend/src/app/dashboard/turnos`, `frontend/src/app/dashboard/reportes`, `frontend/src/components/patient`, `frontend/src/components/whatsapp`, `frontend/src/components/crm`, `frontend/src/components/live-turno`, `frontend/src/lib`, `frontend/src/types`, `frontend/src/hooks`, `backend/src/modules/turnos`, `backend/src/modules/whatsapp`, `backend/src/modules/pacientes`
**Files scanned:** 24 archivos objetivo + 3 analogs de referencia (`InlineCreatePaciente.tsx`, `estadoTurno.ts`, `whatsapp.service.ts`) + 2 archivos no-op verificados (`PatientFormModal.tsx`, `SendWAMessageModal.tsx`)
**Pattern extraction date:** 2026-08-20
