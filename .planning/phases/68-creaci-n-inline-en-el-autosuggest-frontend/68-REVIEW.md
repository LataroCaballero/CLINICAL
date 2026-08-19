---
phase: 68-creaci-n-inline-en-el-autosuggest-frontend
reviewed: 2026-08-19T22:26:36Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - frontend/src/app/dashboard/components/QuickAppointment.tsx
  - frontend/src/app/dashboard/turnos/NewAppointmentModal.tsx
  - frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx
  - frontend/src/components/AutocompletePaciente.tsx
  - frontend/src/components/InlineCreatePaciente.tsx
  - frontend/src/hooks/useCreatePaciente.ts
findings:
  critical: 2
  warning: 11
  info: 8
  total: 21
status: issues_found
---

# Phase 68: Code Review Report

**Reviewed:** 2026-08-19T22:26:36Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Segunda pasada adversarial sobre la creación inline de pacientes en el autosuggest,
posterior a la ejecución del plan 68-04 (`mutateAsync` + `try/catch` local,
`onPendingChange`, guarda `isPending` en `handleKeyDown`, y el early-return
`if (createPending)` en `onEscapeKeyDown`).

Evaluación general: el mecanismo nuevo de 68-04 es **correcto en su núcleo**. Tracé
el ciclo de vida completo del flag `createPending`:

- `isPending` false→true: el effect corre `cleanup(false)` y luego `onPendingChange(true)`
  en el mismo commit; React batchea y el padre queda en `true`. OK.
- Éxito: la notificación del `MutationObserver` (microtask) y la continuación del
  `await` (`onCreated` → `setCreating(false)`) caen en el mismo lote; el hijo se
  desmonta y la cleanup deja `createPending=false`. **No queda pegado en `true`.**
- Error: `isPending`→false dispara el effect antes del desmontaje. OK.
- Desmontaje del padre (Dialog cerrado en vuelo): React siempre corre la cleanup del
  hijo, y el `setCreatePending(false)` resultante sobre un padre desmontado es un
  no-op en React 18+. **Sin warnings ni fuga.**
- `setError("dni")` post-desmontaje: RHF escribe en su store interno y notifica por
  Subject; no hay `setState` sobre un árbol desmontado. **No es un defecto real.**

Dicho eso, la fase **no está limpia**. Encontré dos defectos bloqueantes (uno de
estado fantasma no removible en `QuickAppointment`, otro de callejón sin salida
multi-tenant por el `@unique` global de `dni`), más once warnings — entre ellos una
ventana de carrera de doble submit que la guarda `isPending` de 68-04 **no cierra**,
porque `handleSubmit` es asíncrono.

**Disposiciones previas respetadas (no re-abiertas):** ALTA-06 / paciente huérfano
(`canOfferCreate` sin gate sobre `profesionalIdParaAlta` y `profesionalId ?? undefined`
sin guarda) está aceptado vía `overrides:` firmado en `68-VERIFICATION.md`. La
atribución `stopPropagation()` vs `isHighestLayer` + `preventDefault()` ya fue
corregida en los comentarios por 68-04 y la verifiqué correcta contra el
comportamiento de `DismissableLayer` de `@radix-ui/react-popover ^1.1.15`.

**Nota sobre substrato estructural:** el prompt no incluyó bloque
`<structural_findings>`, así que no hay pre-pass estructural que reportar. Todos los
hallazgos de abajo son narrativos, derivados de lectura directa.

---

## Critical Issues

### CR-01: `QuickAppointment` deja un paciente fantasma imposible de quitar

**File:** `frontend/src/app/dashboard/components/QuickAppointment.tsx:373-379` (montaje), `:352` (Dialog), `:419` (Cancelar), `:224-229` (único reset)
**Issue:**
`QuickAppointment` monta `<AutocompletePaciente>` **sin pasar `onClear`**, a
diferencia de `NewAppointmentModal.tsx:219-223` y `SurgeryAppointmentModal.tsx:228-232`
que sí lo pasan. En `AutocompletePaciente.tsx:90-99` el botón X ejecuta
`onClear?.()` (no-op acá) y `setQuery("")`, pero `value` viene de
`paciente?.nombreCompleto` en el padre y nunca se limpia: **el chip del paciente
seleccionado es irremovible**.

Se combina con un segundo defecto en el mismo archivo: el Dialog resetea `paciente`
**sólo en el camino de éxito** (`:224-229`). Ni `onOpenChange={setOpen}` (`:352`) ni
el botón Cancelar (`:419`) lo limpian.

La fase 68 convierte esto de molestia en riesgo clínico, porque ahora hay un camino
que setea `paciente` **con el Dialog ya cerrado**: si el POST de alta inline está en
vuelo y el usuario cierra el Dialog (Escape sobre la capa del Dialog u overlay — el
guard `createPending` sólo protege la capa del Popover, no la del Dialog), el
`DialogContent` se desmonta, pero `QuickAppointment` sigue montado y la continuación
del `await` en `InlineCreatePaciente.tsx:147-149` ejecuta `onCreated` →
`onSelect(pac)` → `setPaciente(p)`. Secuencia resultante:

1. El usuario abre el Dialog y crea un paciente inline; cierra el Dialog en vuelo.
2. `paciente` queda seteado sobre un Dialog cerrado (sin toast visible en contexto).
3. Más tarde abre el Dialog para **otro** paciente y ve un chip pre-seleccionado.
4. Hace clic en la X → no pasa nada. No hay forma de deseleccionar sin recargar.
5. Si no advierte el chip, `confirmarTurno()` (`:209-216`) postea el turno con el
   `pacienteId` equivocado.

**Fix:**
```tsx
// QuickAppointment.tsx
<AutocompletePaciente
  onSelect={(p) => setPaciente(p)}
  value={paciente?.nombreCompleto}
  avatarUrl={paciente?.fotoUrl}
  onClear={() => setPaciente(null)}        // <-- faltante
  allowCreate
  profesionalIdParaAlta={profesionalId}
/>

// y resetear el formulario al cerrar, no sólo al confirmar:
function resetForm() {
  setPaciente(null);
  setTipoTurnoId("");
  setObservaciones("");
  setSelectedTime(null);
}

<Dialog
  open={open}
  onOpenChange={(o) => {
    setOpen(o);
    if (!o) resetForm();
  }}
>
```
(El `resetForm()` en `confirmarTurno` pasa a ser redundante y se puede colapsar.)

---

### CR-02: Callejón sin salida multi-tenant — DNI globalmente `@unique` + `suggest` filtrado por profesional

**File:** `frontend/src/components/AutocompletePaciente.tsx:53-58` (`canOfferCreate`), `frontend/src/components/InlineCreatePaciente.tsx:155-158` (manejo del 409)
**Issue:**
Tres hechos que sólo colisionan a partir de esta fase:

1. `Paciente.dni` es `@unique` **global**, no por profesional
   (`backend/src/prisma/schema.prisma:156`).
2. `GET /pacientes/suggest` filtra por `profesionalId`
   (`pacientes.service.ts:389-391`: `AND p."profesionalId" = ${profesionalId}`),
   así que un paciente de otro profesional **no aparece nunca** en el autosuggest.
3. `canOfferCreate` ofrece "Crear paciente" precisamente cuando la búsqueda no
   devolvió coincidencias visibles.

Camino garantizado a fallar, con datos reales de una clínica multi-profesional:

- Secretaria en el contexto del profesional B busca "Juan Pérez", que existe pero
  está asignado al profesional A → `suggest` devuelve `[]`.
- Aparece la fila "Crear paciente: …" (comportamiento por diseño, D-03).
- Completa el DNI → Prisma tira P2002 → `PrismaClientExceptionFilter` lo mapea a 409
  → la UI muestra "Este DNI ya está registrado" **en un formulario donde el paciente
  no es visible ni buscable por ningún medio**.
- No hay afordancia de recuperación: ni "ver paciente existente", ni "asignármelo",
  ni link al listado global. El usuario queda trabado y no puede agendar el turno.

Esta es la única salida de error posible para un caso de uso frecuente, y la feature
completa de la fase 68 (agendar sin salir del modal) es inalcanzable en él. El
modelo de tenancy es preexistente, pero esta fase es la que expone el dead-end como
único resultado.

**Fix (mínimo aceptable, sin tocar el modelo):** al recibir 409, resolver el
paciente existente y ofrecer seleccionarlo, en vez de dejar sólo el error de campo.
```tsx
if (status === 409) {
  setError("dni", {
    message:
      "Ese DNI ya existe en el sistema (posiblemente bajo otro profesional). " +
      "Buscalo desde Pacientes o pedí que te lo asignen.",
  });
  return;
}
```
**Fix (correcto):** exponer un lookup por DNI no filtrado por profesional
(p. ej. `GET /pacientes/by-dni/:dni`, autorizado por rol) y, ante el 409, ofrecer un
botón "Usar paciente existente" que dispare `onCreated(pacienteExistente)`. Si el
negocio requiere aislamiento real por profesional, el `@unique` de `dni` debe pasar
a `@@unique([dni, profesionalId])` con su migración.

---

## Warnings

### WR-01: Escape es completamente inerte mientras el dropdown está abierto (diferido por 68-04)

**File:** `frontend/src/components/AutocompletePaciente.tsx:70` (`<Popover open={showDropdown}>` sin `onOpenChange`), `:121-137`
**Issue:** Re-reporte del hallazgo diferido, ampliado tras trazar `DismissableLayer`.
El `open` del Popover es state-driven y `<Popover>` **no recibe `onOpenChange`**.
Cuando `creating === false`, el handler `onEscapeKeyDown` hace `return` sin
`preventDefault()`, con lo cual Radix ejecuta su rama por defecto:
`event.preventDefault(); onDismiss();`. El `onDismiss` intenta cerrar vía
`onOpenChange` — que no existe → **no-op**. Y como Radix ya llamó a
`preventDefault()` y la capa del Popover es la más alta, el Dialog contenedor
tampoco recibe el Escape.

Resultado: con el dropdown abierto (con resultados, o con la fila "Crear paciente"
visible pero el mini-form aún cerrado), **Escape no hace absolutamente nada**: ni
cierra el dropdown, ni cierra el modal de turno. El usuario percibe la app como
trabada.

**Fix:** hacer que la capa del Popover consuma Escape sólo cuando tiene algo que
cerrar, y devolver el estado explícitamente:
```tsx
onEscapeKeyDown={(e) => {
  if (creating) {
    e.preventDefault();
    if (createPending) return;
    setCreating(false);
    return;
  }
  if (query.length > 0) {
    e.preventDefault();
    setQuery("");     // cierra el dropdown por vía de estado
    return;
  }
  // sin nada que cerrar: dejar burbujear para que el Dialog se cierre
}}
```

---

### WR-02: La guarda `isPending` de 68-04 no cierra la ventana de doble submit

**File:** `frontend/src/components/InlineCreatePaciente.tsx:163-171` y `:238`
**Issue:** `handleKeyDown` verifica `if (isPending) return` **antes** de
`handleSubmit(onSubmit)()`, pero `handleSubmit` de RHF es asíncrono: hace
`await resolver(values, ...)` (zodResolver) antes de invocar `onSubmit`, y
`onSubmit` recién ahí llama a `mutateAsync`, que es cuando `isPending` pasa a
`true`. Dos Enter (o dos clics rápidos, `:238`, mismo problema con
`disabled={isPending}`) dentro del mismo tick ven ambos `isPending === false` y
disparan **dos POST /pacientes**.

Con `dni @unique` el segundo devuelve 409, así que no se duplica la fila; pero el
primero ya resolvió `onCreated` → desmontaje, y el `setError("dni")` del segundo
cae sobre un componente desmontado: el usuario no ve nada y el segundo request
queda como ruido de error en el backend. Si en el futuro el `@unique` se relaja
(ver CR-02), esto pasa a crear pacientes duplicados.

**Fix:** guardia síncrona con `useRef`, que no depende del ciclo de render:
```tsx
const submittingRef = useRef(false);

async function onSubmit(data: FormValues) {
  if (submittingRef.current) return;
  submittingRef.current = true;
  try {
    // ... mutateAsync / toast / onCreated
  } catch (err) {
    // ...
  } finally {
    submittingRef.current = false;
  }
}
```

---

### WR-03: El campo DNI no pasa por `register()`, así que el error del 409 no se limpia al retipear (diferido por 68-04)

**File:** `frontend/src/components/InlineCreatePaciente.tsx:199-208`
**Issue:** Re-reporte del hallazgo diferido. El input de DNI usa
`value={watch("dni")}` + `setValue("dni", ..., { shouldValidate: false })` y
`ref={dniRef}`; **nunca se llama `register("dni")`** para ese input. Consecuencias
concretas:

1. `setError("dni", { message: "Este DNI ya está registrado" })` (`:156`) queda
   pegado: al corregir el DNI, `shouldValidate: false` impide revalidar y RHF no
   limpia errores de campos no registrados por cambio de valor. El usuario ve el
   error de duplicado sobre un DNI nuevo y correcto.
2. El campo queda fuera del ciclo de `mount`/`unmount` de RHF; funciona hoy porque
   `defaultValues` siembra `_formValues` y `setValue` lo actualiza, pero es un
   contrato no documentado de RHF.

**Fix:** registrar el campo y sanitizar en el `onChange` registrado, conservando el
filtro numérico:
```tsx
const dniField = register("dni");
// ...
<Input
  {...dniField}
  ref={(el) => { dniField.ref(el); dniRef.current = el; }}
  onChange={(e) => {
    e.target.value = e.target.value.replace(/\D/g, "");
    void dniField.onChange(e);
    clearErrors("dni");            // limpia el 409 manual
  }}
  inputMode="numeric"
/>
```

---

### WR-04: `buildPrefill` precarga un teléfono en el campo DNI

**File:** `frontend/src/components/InlineCreatePaciente.tsx:68-74`, placeholder en `AutocompletePaciente.tsx:106`
**Issue:** `buildPrefill` decide "todo dígitos ⇒ es un DNI" (D-09). Pero el
placeholder del autosuggest invita explícitamente a buscar **"por nombre, DNI o
teléfono"**, y `suggest` efectivamente busca por teléfono. Un usuario que busca
`"1122334455"`, no encuentra al paciente y hace clic en "Crear paciente" obtiene el
**teléfono precargado en el campo DNI**, con el campo Teléfono vacío. Como
`stripSeparators` también come espacios, puntos y guiones, `"11 2233-4455"` cae en la
misma rama. La validación (`min(7)`) acepta 10 dígitos sin objetar.

Es un registro clínico con DNI inválido, difícil de detectar después y que además
consume el `@unique` global de `dni` (agravando CR-02).

**Fix:** desambiguar por longitud típica de DNI argentino y, ante ambigüedad,
precargar teléfono en vez de DNI:
```ts
export function buildPrefill(query: string) {
  const stripped = stripSeparators(query);
  const esNumerico = stripped.length > 0 && /^\d+$/.test(stripped);
  if (esNumerico && stripped.length >= 7 && stripped.length <= 8) {
    return { dni: stripped, telefono: "", nombreCompleto: "" };
  }
  if (esNumerico) {
    // 9+ dígitos: casi seguro un teléfono
    return { dni: "", telefono: stripped, nombreCompleto: "" };
  }
  return { dni: "", telefono: "", nombreCompleto: capitalizarNombre(query.trim()) };
}
```
(Requiere sumar `telefono` a `defaultValues` y ajustar el foco inicial de D-04.)

---

### WR-05: El `try` de 68-04 abarca también los callbacks de éxito

**File:** `frontend/src/components/InlineCreatePaciente.tsx:146-160`
**Issue:** `toast.success(...)` y `onCreated(creado)` viven **dentro** del `try`. Si
cualquiera de los dos lanza — hoy el caso más plausible es una respuesta inesperada
donde `creado` sea `null` y `creado.nombreCompleto` tire `TypeError`, o un
`onSelect` de un consumidor futuro que falle — el `catch` lo trata como fallo de
alta: `status` es `undefined`, `message` es el texto del error de JS, y se muestra
`toast.error("Cannot read properties of null…")`. El paciente **sí fue creado**, pero
la UI dice lo contrario e invita al reintento (que chocará con el 409 de CR-02).

**Fix:** acotar el `try` a la llamada de red y sacar la continuación afuera.
```tsx
let creado: PacienteCreado;
try {
  creado = (await mutateAsync(payload)) as PacienteCreado;
} catch (err) {
  const error = err as ApiError;
  const status = error?.response?.status;
  const message = error?.response?.data?.message || error?.message;
  if (status === 409) { setError("dni", { message: "Este DNI ya está registrado" }); return; }
  toast.error(message || "Error al crear el paciente");
  return;
}
toast.success(`${creado?.nombreCompleto ?? "Paciente"} creado correctamente`);
onCreated(creado);
```

---

### WR-06: Cast sin validación de la respuesta del alta

**File:** `frontend/src/components/InlineCreatePaciente.tsx:147`, `frontend/src/hooks/useCreatePaciente.ts:8-11`
**Issue:** `useCreatePaciente` tipa `mutationFn: async (data: any)` y devuelve
`response.data` sin tipo; `InlineCreatePaciente` hace
`(await mutateAsync(payload)) as PacienteCreado`. El cast es una aserción, no una
verificación: si el backend deja de devolver `id`/`nombreCompleto` (envoltura de
respuesta, DTO de salida, etc.), `onCreated` propaga `undefined` a
`setValue("pacienteId", undefined)` (`NewAppointmentModal.tsx:225`) y a
`setPaciente({...})` con `nombreCompleto` undefined → `value` cae a falsy → el chip
nunca aparece y el paciente queda creado pero **no seleccionado, en silencio**. El
compilador no protege nada porque el origen es `any`.

**Fix:** tipar el hook y validar el mínimo en el punto de uso.
```ts
// useCreatePaciente.ts
export type PacienteCreadoDTO = { id: string; nombreCompleto: string; fotoUrl?: string | null };
return useMutation<PacienteCreadoDTO, unknown, CreatePacienteInput>({ ... });

// InlineCreatePaciente.tsx
if (!creado?.id || !creado?.nombreCompleto) {
  toast.error("El paciente se creó pero la respuesta fue inesperada. Buscalo manualmente.");
  return;
}
```

---

### WR-07: El mini-form no asocia labels con inputs (a11y rota)

**File:** `frontend/src/components/InlineCreatePaciente.tsx:176-178`, `:196-198`, `:217-219`
**Issue:** Los tres `<label>` no tienen `htmlFor`, los `<Input>` no tienen `id`, y
los inputs no están anidados dentro del label. Un lector de pantalla anuncia tres
campos de texto sin nombre accesible. Se agrava porque el mini-form vive dentro de
un `PopoverPrimitive.Portal` con `onOpenAutoFocus` cancelado (`AutocompletePaciente.tsx:120`):
la única señal de contexto que recibe el usuario de lector de pantalla es el foco
programático a 50 ms, sin `role`/`aria-label` en el contenedor.

Los `Alert` de error tampoco están enlazados vía `aria-describedby` ni marcados con
`aria-invalid`.

**Fix:**
```tsx
const nombreId = useId();
// ...
<label htmlFor={nombreId} className="...">Nombre completo <span aria-hidden>*</span></label>
<Input id={nombreId} aria-invalid={!!errors.nombreCompleto}
       aria-describedby={errors.nombreCompleto ? `${nombreId}-err` : undefined} ... />
{errors.nombreCompleto && (
  <Alert id={`${nombreId}-err`} role="alert" variant="destructive" className="py-2"> ... </Alert>
)}
```
Y en `PopoverContent`, cuando `creating`, agregar `role="dialog"` +
`aria-label="Crear paciente"`.

---

### WR-08: `onPendingChange` en el array de dependencias es un foot-gun de render infinito

**File:** `frontend/src/components/InlineCreatePaciente.tsx:118-123`
**Issue:** El effect declara `[isPending, onPendingChange]` y su cleanup invoca
`onPendingChange?.(false)`. Hoy funciona porque el único consumidor pasa
`setCreatePending` (`AutocompletePaciente.tsx:156`), que es una referencia estable de
`useState`. Pero el contrato público de la prop no lo exige: cualquier consumidor
que pase una lambda inline (`onPendingChange={(p) => setAlgo(p)}`) entra en bucle:
identidad nueva por render → cleanup `(false)` → setState en el padre → re-render →
lambda nueva → cleanup `(false)` + effect `(true)` → setState → … Ese es exactamente
el patrón que un dev escribiría sin leer el comentario.

Además, la cleanup emite un `false` espurio en **cada** cambio de `isPending`
(false→true dispara `cleanup(false)` seguido de `(true)`); hoy React lo batchea, pero
es ruido innecesario en el contrato.

**Fix:** estabilizar el callback vía ref y sacarlo de las deps.
```tsx
const onPendingChangeRef = useRef(onPendingChange);
useEffect(() => { onPendingChangeRef.current = onPendingChange; });

useEffect(() => {
  onPendingChangeRef.current?.(isPending);
}, [isPending]);

useEffect(() => () => { onPendingChangeRef.current?.(false); }, []); // sólo al desmontar
```

---

### WR-09: `canOfferCreate` depende del orden de llamada de dos hooks independientes

**File:** `frontend/src/components/AutocompletePaciente.tsx:43` y `:49`
**Issue:** El comentario dice "mismo delay converge al mismo valor", pero no
convergen en el mismo commit: son dos `useDebounce` distintos con dos `setTimeout`
distintos, y los callbacks de `setTimeout` son **macrotasks separadas**, sin batching
compartido. Lo que hoy salva a `canOfferCreate` es puro orden de declaración: como
`usePacienteSuggest(query)` (línea 43) se llama antes que `useDebounce(query, 300)`
(línea 49), su effect registra el timer primero y dispara primero, así que el
`queryKey` cambia (y `isSuccess` cae a `false`) **antes** de que `debouncedQuery` se
actualice.

Invertir esas dos líneas — un reordenamiento de imports/hooks completamente
inocente — abre un render intermedio con `debouncedQuery` nuevo e `isSuccess`/`data`
todavía del query anterior: la fila "Crear paciente" aparece (o desaparece)
incorrectamente y el usuario puede alcanzar a clickearla. Es un acoplamiento
invisible y sin test que lo proteja.

**Fix:** eliminar el debounce duplicado exponiendo el valor debounceado desde el
hook dueño de la búsqueda, que además es la única fuente de verdad:
```ts
// usePacienteSuggest.ts
export function usePacienteSuggest(query: string) {
  const debounced = useDebounce(query, 300);
  const result = useQuery({ ... });
  return { ...result, debouncedQuery: debounced };
}

// AutocompletePaciente.tsx
const { data = [], isFetching, isSuccess, debouncedQuery } = usePacienteSuggest(query);
```

---

### WR-10: `profesionalIdParaAlta` es un id de tenant controlado por el cliente contra un endpoint sin validación

**File:** `frontend/src/components/AutocompletePaciente.tsx:29`/`:149`, `frontend/src/components/InlineCreatePaciente.tsx:135`
**Issue:** La fase abre un **nuevo camino de escritura** a `POST /pacientes` desde
tres modales, enviando `profesionalId` tal cual desde el cliente. Verifiqué el lado
servidor:

- `backend/src/main.ts` **no registra `ValidationPipe` global** (ni `useGlobalPipes`,
  ni `APP_PIPE` en `app.module.ts`): los decoradores de `CreatePacienteDto`
  (`@IsString`, `@IsEnum`, etc.) **nunca se ejecutan**. Toda la validación de
  `nombreCompleto`/`dni` que la fase agrega vive **sólo en el zod del cliente**
  (`InlineCreatePaciente.tsx:42-51`) y es trivialmente evitable con un request directo.
- `PacientesController` está anotado
  `@Auth('ADMIN','PROFESIONAL','SECRETARIA','FACTURADOR')` y `create()` pasa el DTO a
  `prisma.paciente.create` sin verificar que el `profesionalId` recibido pertenezca al
  tenant/usuario que llama. Un `SECRETARIA` puede sembrar pacientes bajo cualquier
  profesional del sistema.

La causa raíz es de backend y preexistente, pero esta fase es la que amplía la
superficie (tres nuevos puntos de entrada, con el id de profesional viajando como
prop desde el cliente). No debería darse por cerrada la fase sin registrar la deuda.

**Fix (backend, fuera de estos archivos pero requerido):**
```ts
// main.ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

// pacientes.service.ts create()
// derivar profesionalId del usuario autenticado, o validar pertenencia:
if (dto.profesionalId && !(await this.puedeAsignar(userId, dto.profesionalId))) {
  throw new ForbiddenException('Profesional no permitido');
}
```

---

### WR-11: El input de búsqueda sigue activo mientras el mini-form está abierto

**File:** `frontend/src/components/AutocompletePaciente.tsx:104-111` vs `:146-157`
**Issue:** Con `creating === true` el `<Input>` de búsqueda se sigue renderizando y
es editable (sólo se oculta cuando `value` es truthy). Efectos concretos:

- Cada tecla dispara nuevas `usePacienteSuggest` cuyos resultados **nunca se muestran**
  (la rama `creating ?` los reemplaza por el mini-form): requests al backend cuya
  respuesta se descarta siempre.
- `prefill` se congela en el montaje (`InlineCreatePaciente.tsx:85`), así que el texto
  visible arriba y los campos de abajo se desincronizan sin señal alguna para el
  usuario.
- Es alcanzable por teclado: `Shift+Tab` desde el campo Nombre lleva el foco fuera del
  mini-form al input de búsqueda, sin trap ni indicación de que el foco salió del
  formulario de alta.

**Fix:** desactivar la búsqueda mientras se crea.
```tsx
{!value && (
  <Input
    placeholder="Buscar paciente por nombre, DNI o teléfono"
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    disabled={creating}
    className={...}
  />
)}
```

---

## Info

### IN-01: `register("nombreCompleto")` se invoca dos veces para el mismo input

**File:** `frontend/src/components/InlineCreatePaciente.tsx:180-184`
**Issue:** El spread `{...register("nombreCompleto")}` ya aporta un `ref`, que queda
sobrescrito por el `ref` explícito, y dentro de ese callback se vuelve a llamar
`register("nombreCompleto")` en cada invocación del ref. Funciona (la segunda llamada
toma la rama "field ya existe"), pero es trabajo redundante en fase de commit y
oscurece la intención.
**Fix:** destructurar una sola vez —
`const nombreField = register("nombreCompleto");` y usar
`{...nombreField} ref={(el) => { nombreField.ref(el); nombreRef.current = el; }}`.

### IN-02: `setTimeout` de foco sin `clearTimeout` y con número mágico

**File:** `frontend/src/components/InlineCreatePaciente.tsx:106-113`
**Issue:** El effect de foco crea un `setTimeout(..., 50)` y no lo cancela en la
cleanup. No revienta (los refs quedan en `null` al desmontar y hay `?.`), pero deja un
timer huérfano y el `50` no está explicado — es un workaround del
`onOpenAutoFocus={e => e.preventDefault()}` del padre.
**Fix:** `const t = setTimeout(...); return () => clearTimeout(t);` y extraer
`const FOCUS_DELAY_MS = 50;` con comentario.

### IN-03: `message?.includes("DNI")` es una rama muerta

**File:** `frontend/src/components/InlineCreatePaciente.tsx:155`
**Issue:** El fallback por texto nunca se cumple contra este backend:
`PrismaClientExceptionFilter` devuelve el mensaje crudo de Prisma
(`Unique constraint failed on the fields: (\`dni\`)`), en minúscula, y `includes` es
case-sensitive. La rama sólo sobrevive por el `status === 409` que la precede.
**Fix:** eliminar el fallback (el 409 alcanza) o hacerlo case-insensitive:
`message?.toLowerCase().includes("dni")`.

### IN-04: `any` en las fronteras de datos del flujo nuevo

**File:** `frontend/src/components/AutocompletePaciente.tsx:18` y `:167`, `frontend/src/hooks/useCreatePaciente.ts:8`, `frontend/src/components/InlineCreatePaciente.tsx:19`
**Issue:** `onSelect: (paciente: any)`, `data.map((pac: any) => …)`,
`mutationFn: async (data: any)` y el index signature `[key: string]: unknown` de
`PacienteCreado` desactivan toda verificación de tipos en el camino
alta → selección → payload del turno. Es lo que permite que WR-06 pase inadvertido.
**Fix:** definir un `PacienteSuggestItem`/`PacienteCreadoDTO` en `frontend/src/types/`
y usarlo en las tres firmas.

### IN-05: `<img>` de sugerencia sin `alt`

**File:** `frontend/src/components/AutocompletePaciente.tsx:178-181`
**Issue:** La foto del paciente en la lista de resultados no tiene atributo `alt`
(el `<img>` del chip seleccionado, `:77-81`, sí lo tiene). Inconsistente y ruidoso
para lectores de pantalla.
**Fix:** `alt={pac.nombreCompleto}` o `alt=""` si se considera decorativa.

### IN-06: El label del botón usa `query` en vivo pero la condición usa `debouncedQuery`

**File:** `frontend/src/components/AutocompletePaciente.tsx:53-58` vs `:206`
**Issue:** `canOfferCreate` se evalúa sobre `debouncedQuery` (≥3), pero el texto
`Crear paciente: "${query}"` y el `query` que se le pasa a `InlineCreatePaciente`
(`:148`) son el valor inmediato. Durante los 300 ms de debounce el usuario puede
borrar hasta `"J"`, ver la fila todavía ofrecida como `Crear paciente: "J"` y
clickearla, obteniendo un prefill de un carácter que falla la validación `min(3)`.
**Fix:** usar `debouncedQuery` tanto para el label como para el `query` que recibe el
mini-form.

### IN-07: `creating` no se resetea si `value` pasa a truthy por una vía externa

**File:** `frontend/src/components/AutocompletePaciente.tsx:41`, `:62-64`
**Issue:** `setCreating(false)` sólo ocurre en `onCreated`, `onCancel` y Escape. Si el
padre setea `value` por otro camino mientras `creating === true` (p. ej. el `reset()`
por cambio de `selectedEvent` en `NewAppointmentModal.tsx:101-124` con el modal
abierto), `showDropdown` cae a `false` por el `!value`, el mini-form se desmonta y
`creating` **queda en `true`**; si después se limpia el paciente con la X, el
dropdown reabre directo en el mini-form con un `query` obsoleto. Hoy es latente
(los consumidores desmontan el `DialogContent` al cerrar), pero es una máquina de
estados sin invariante.
**Fix:** `useEffect(() => { if (value) setCreating(false); }, [value]);`

### IN-08: Valores del payload de alta hardcodeados en el componente

**File:** `frontend/src/components/InlineCreatePaciente.tsx:131-139`
**Issue:** `estado: "ACTIVO"`, `consentimientoFirmado: false`, `indicacionesEnviadas: false`
son literales embebidos en la UI que duplican defaults que **ya existen en el schema**
(`schema.prisma:172-175`: `@default(false)` y `@default(ACTIVO)`). Enviarlos es
redundante y crea dos fuentes de verdad; `"ACTIVO"` además es un string suelto contra
un enum de Prisma, sin chequeo de tipos (no hay `ValidationPipe`, ver WR-10).
**Fix:** omitir los tres campos del payload y dejar que el default del schema gobierne;
si se necesitan explícitos, importarlos desde un tipo compartido en vez de literales.

---

_Reviewed: 2026-08-19T22:26:36Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
