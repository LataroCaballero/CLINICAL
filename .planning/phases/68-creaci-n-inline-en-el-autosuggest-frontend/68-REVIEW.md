---
phase: 68-creaci-n-inline-en-el-autosuggest-frontend
reviewed: 2026-08-20T00:00:00Z
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
  warning: 10
  info: 8
  total: 20
status: issues_found
---

# Phase 68: Code Review Report

**Reviewed:** 2026-08-20T00:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Tercera pasada adversarial, posterior al plan 68-05 (guard de generación de sesión
`dialogSessionRef` en los tres call sites + candado síncrono `submittingRef` en
`InlineCreatePaciente`).

**Lo que sí quedó cerrado (verificado línea por línea, no aceptado por reporte):**

- El candado `submittingRef` (`InlineCreatePaciente.tsx:96,140-141,172-174`) **sí**
  cierra la ventana de doble submit que `isPending` no cerraba: la escritura del ref
  ocurre en el mismo tick síncrono en que entra `onSubmit`, después del `await` del
  resolver de zod, así que dos eventos del mismo tick ven `true` en el segundo. El
  `finally` lo libera en las tres salidas (éxito, 409 con `return` temprano, error
  genérico). Sin fugas.
- El guard de generación en `QuickAppointment.tsx` **sí** cierra la carrera que
  reportó `gaps[0]`: `abrirDialogTurno()` (:225-230) incrementa ref y state en el
  mismo handler batcheado, así que `dialogSession` y `dialogSessionRef.current` sólo
  divergen para closures congelados en el árbol que Radix desmontó al cerrar el
  `DialogContent`. Además ahora sí pasa `onClear` (:418) y sí resetea en
  `onOpenChange` (:390-393), los dos `missing` del gap.

**Lo que NO quedó cerrado.** El guard se portó a los otros dos modales de forma
mecánica, sin re-derivar el ciclo de vida de cada uno, y en `SurgeryAppointmentModal`
protege exactamente el caso que ya era inofensivo y deja abierto el que importa: ese
modal **no tiene reset en la apertura** (sólo en el cierre), así que un alta que
aterriza con el Dialog cerrado escribe en el form y el chip fantasma sobrevive a la
siguiente apertura sin que el guard llegue a compararse. Es el mismo defecto CR-01 de
la ronda anterior, migrado de archivo. En `QuickAppointment` está cubierto porque
`abrirDialogTurno()` resetea; en `NewAppointmentModal` está cubierto por accidente,
porque su efecto de reset lleva `open` en las dependencias.

Segundo bloqueante, nuevo y no relacionado con el guard: el `handleKeyDown` del
mini-form hace `preventDefault()` sobre **todo** Enter del subárbol, lo que mata la
activación nativa del botón *Cancelar* y a continuación dispara el submit — Enter
sobre Cancelar **crea el paciente**.

Además quedan 10 warnings, varios heredados sin resolver (a11y, DNI fuera de
`register()`, prefill de teléfono en DNI) y tres nuevos derivados de esta ronda
(el `useEffect` post-paint del guard, el toast que miente cuando descarta una
selección de la lista, y `canOfferCreate` confiando en un `isSuccess` que el backend
produce también cuando la búsqueda falló).

## Structural Findings (fallow)

No se recibió `<structural_findings>` para esta revisión: no hubo pre-pasada
estructural. Todo lo que sigue es narrativo.

## Narrative Findings (AI reviewer)

Hallazgos derivados de lectura directa de los 6 archivos en scope, con verificación
cruzada contra `frontend/src/hooks/usePacienteSuggest.ts`,
`frontend/src/app/dashboard/turnos/page.tsx`,
`backend/src/modules/pacientes/pacientes.service.ts`,
`backend/src/modules/pacientes/dto/create-paciente.dto.ts`,
`backend/src/prisma-client-exception/prisma-client-exception.filter.ts` y
`backend/src/main.ts`.

## Critical Issues

### CR-01: `SurgeryAppointmentModal` no resetea al abrir — el chip fantasma sobrevive al guard y puede programar una cirugía al paciente equivocado

**File:** `frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx:139-161` (efectos), `:259-269` (guard)
**Severity:** BLOCKER

**Issue:** El guard de generación sólo puede descartar un `onSelect` tardío **si la
generación ya avanzó**, y en este modal la generación avanza únicamente en la
apertura (`:156-161`). La ventana peligrosa es la que va del cierre a la siguiente
apertura, y ahí ref y state todavía coinciden, así que el guard deja pasar la
escritura. El único reset del formulario está condicionado a `!open` (`:139-144`),
o sea que corre **antes** de que aterrice el POST y ya no vuelve a correr al reabrir.

Traza completa (todos los pasos son alcanzables a mano; el botón *Cancelar* del
`DialogFooter` (:410-416) no está deshabilitado durante el alta y cerrar por ahí no
lo bloquea ni `onPointerDownOutside` ni `onEscapeKeyDown` de `AutocompletePaciente`,
que sólo defienden el Popover):

1. `open=true` → efecto `:156` deja `ref=1`, `dialogSession=1`.
2. El usuario abre el mini-form, submitea; `POST /pacientes` en vuelo (red lenta).
3. El usuario cierra el Dialog con *Cancelar* → efecto `:139` corre `reset()` +
   `setPacienteFotoUrl(null)`. `ref` y `dialogSession` siguen en 1.
4. El POST resuelve. La continuación del `await` (`InlineCreatePaciente.tsx:159-161`)
   llama a `onCreated` → `onSelect(pac)`. Guard: `1 !== 1` es **falso** → pasa.
   Se ejecutan `setValue("pacienteId", X)`, `setValue("pacienteNombre", ...)`,
   `setPacienteFotoUrl(...)` sobre el form de un modal cerrado.
5. El usuario reabre el modal para otra cirugía. Corren los efectos `:125`, `:132`
   y `:156` — **ninguno resetea**. El chip del paciente del paso 2 aparece
   pre-seleccionado y `data.pacienteId` ya está poblado, así que la validación de
   `onSubmit` (`:209-212`) no lo detiene.
6. El usuario completa procedimiento/fecha y postea `POST /turnos/cirugia` con el
   `pacienteId` equivocado.

`QuickAppointment` no tiene el problema (`abrirDialogTurno()` llama `resetForm()`) y
`NewAppointmentModal` tampoco (su efecto de reset lleva `open` en deps y corre
también en la apertura). Este modal es el único de los tres sin reset de apertura, y
es justo al que se le portó el guard suponiendo simetría.

**Fix:** No alcanza con el guard; hay que resetear en la apertura. Unificar el efecto
de sesión con un reset incondicional, dejando el seed de `defaultDate`/`pacienteIdProp`
después:

```tsx
// SurgeryAppointmentModal.tsx — reemplaza el efecto :139-144 y el :156-161
useEffect(() => {
  if (open) {
    // reset ANTES de sellar la generación nueva: mata cualquier escritura
    // tardía que haya aterrizado con el modal cerrado (chip fantasma).
    reset();
    setPacienteFotoUrl(null);
    dialogSessionRef.current += 1;
    setDialogSession(dialogSessionRef.current);
  } else {
    reset();
    setPacienteFotoUrl(null);
  }
}, [open, reset]);
```

Y verificar que los efectos de seed (`:125-129` y `:132-137`) queden declarados
**después** de este, para que el `setValue("fecha")` / `setValue("pacienteId")` del
flujo CRM no sea pisado por el `reset()`. Nota adicional: `reset()` sin argumentos
restaura los `defaultValues` capturados en el primer render, con el `defaultDate`
inicial — por eso el seed de fecha tiene que correr después.

---

### CR-02: Enter sobre el botón *Cancelar* del mini-form crea el paciente

**File:** `frontend/src/components/InlineCreatePaciente.tsx:177-185`
**Severity:** BLOCKER

**Issue:** `handleKeyDown` está montado en el `<div>` contenedor (`:188`) y hace
`e.preventDefault()` sobre **cualquier** Enter que burbujee, sin mirar el target:

```tsx
function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
  if (e.key !== "Enter") return;
  e.preventDefault();   // <-- mata la activación nativa del <button> enfocado
  e.stopPropagation();
  if (isPending) return;
  void handleSubmit(onSubmit)();   // <-- y submitea igual
}
```

La activación de un `<button>` con Enter es la **acción por defecto del keydown**
(el `click` se sintetiza como default action). `preventDefault()` la cancela. Por lo
tanto, un usuario que tabula hasta *Cancelar* (`:249-251`) y presiona Enter:

1. no dispara `onCancel` (el click nunca se sintetiza), y
2. dispara `handleSubmit(onSubmit)` → `POST /pacientes`.

Es decir: la tecla que el usuario usa para **descartar** ejecuta la escritura. En un
sistema clínico con `dni @unique` global eso deja un `Paciente` real, no removible
desde este flujo, atribuido al profesional del turno. Aplica también a *Cancelar* del
teclado en los tres modales, y es 100 % determinista (no es una carrera).

**Fix:** No interceptar Enter cuando el foco está sobre un control que ya tiene
semántica propia de activación:

```tsx
function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
  if (e.key !== "Enter") return;
  const target = e.target as HTMLElement;
  // Los botones (y textareas, si se agregan) manejan Enter por su cuenta.
  if (target.closest("button")) return;
  e.preventDefault();
  e.stopPropagation();
  if (isPending || submittingRef.current) return;
  void handleSubmit(onSubmit)();
}
```

(Notar que el early-return usa `isPending`, que es state y llega tarde; conviene
sumar `submittingRef.current`, que ya existe y es síncrono.)

## Warnings

### WR-01: `canOfferCreate` no distingue "no hay resultados" de "la búsqueda falló"

**File:** `frontend/src/components/AutocompletePaciente.tsx:53-58`
**Severity:** WARNING

**Issue:** `canOfferCreate` exige `isSuccess && !isFetching`, con el argumento (D-03)
de que eso evita el falso negativo de la ventana pre-fetch. Pero el backend
(`backend/src/modules/pacientes/pacientes.service.ts:440-447`) **traga cualquier
excepción del `suggest` y devuelve `[]`**:

```ts
} catch (err) {
  console.error('❌ ERROR EN SUGGEST:', err);
  return [];   // 200 OK con array vacío
}
```

Un fallo de la query raw (p. ej. la extensión `unaccent`/`pg_trgm` no disponible, o un
timeout de pool) se le presenta a TanStack Query como éxito con 0 filas → `isSuccess`
true, `data.length === 0` → aparece "Crear paciente: …". El usuario, que ve un
paciente existente reportado como inexistente, lo re-crea. Si tipea el DNI exacto
choca con el `@unique` (409), pero si lo tipea con un dígito distinto o desde una
búsqueda por nombre, **crea un duplicado real de un paciente vivo**.

**Fix:** Que la oferta de alta dependa de una respuesta positivamente vacía, no de la
ausencia de error. Mínimo, en el frontend, no ofrecer alta cuando la query trae
`isError` y exigir que el backend deje de enmascarar; el arreglo correcto es hacer que
`suggest` propague el error (`throw`) en vez de `return []`, y acá:

```tsx
const { data = [], isFetching, isSuccess, isError } = usePacienteSuggest(query);

const canOfferCreate =
  allowCreate && !creating && !isError &&
  debouncedQuery.trim().length >= 3 && !isFetching && isSuccess;
```

---

### WR-02: la fila "Crear paciente" deja el Popover abierto y Escape queda completamente inerte

**File:** `frontend/src/components/AutocompletePaciente.tsx:62-64`, `:121-137`
**Severity:** WARNING

**Issue:** `showDropdown` sumó `|| canOfferCreate`, así que ahora el Popover queda
abierto también en el caso "query ≥ 3 y 0 resultados", que antes lo cerraba. Con el
Popover abierto es la capa más alta del stack de Radix, y su `onEscapeKeyDown`
(`:121-137`) hace `if (!creating) return;` — sin `preventDefault()`. Consecuencia en
cadena:

1. Radix dispara `onDismiss` del Popover, pero `open={showDropdown}` es controlado y
   no hay `onOpenChange` en el `<Popover>` (`:70`) → el Popover no se cierra.
2. El Dialog del turno **no recibe el Escape**, porque no es la capa más alta
   (`isHighestLayer` corta antes).

Resultado: con la fila de alta visible, Escape no cierra nada. Antes de esta fase, en
ese mismo estado (0 resultados) el dropdown estaba cerrado y Escape sí cerraba el
Dialog. Es una regresión de comportamiento introducida por la nueva condición, no sólo
el WR-01 heredado.

**Fix:** hacer que Escape sin `creating` cierre el dropdown de verdad, limpiando la
query, que es lo único que lo mantiene abierto:

```tsx
onEscapeKeyDown={(e) => {
  e.preventDefault();
  e.stopPropagation();
  if (creating) {
    if (createPending) return;
    setCreating(false);
    return;
  }
  setQuery("");   // cierra el dropdown: showDropdown pasa a false
}}
```

---

### WR-03: `NewAppointmentModal` resetea el formulario ante cualquier re-render del padre, incluido el paciente recién creado

**File:** `frontend/src/app/dashboard/turnos/NewAppointmentModal.tsx:110-133`
**Severity:** WARNING

**Issue:** El efecto de reset depende de `selectedEvent`, y el padre
(`frontend/src/app/dashboard/turnos/page.tsx:502-506`) construye ese prop como
**objeto literal nuevo en cada render**:

```tsx
selectedEvent={listaEsperaPacienteId ? { pacienteId: listaEsperaPacienteId }
  : newSlotDate ? { fecha: ..., hora: ... } : null}
```

Con el modal abierto desde un slot del calendario (`newSlotDate` seteado, el camino
más usado), cualquier re-render de `turnos/page.tsx` cambia la identidad del objeto,
el efecto vuelve a correr y hace `reset({...})`: se pierde el tipo de turno, la hora,
las observaciones y — lo relevante para esta fase — el `pacienteId`/`pacienteNombre`
que acaba de escribir el alta inline. El guard de generación no protege de esto: la
escritura fue legítima y el borrado viene después.

Mitigado hoy sólo por `refetchOnWindowFocus: false` + `staleTime: 30_000`
(`frontend/src/app/providers.tsx:12-13`), no por diseño.

**Fix:** estabilizar la identidad en el padre y, defensivamente, no atar el reset a un
prop de identidad inestable:

```tsx
// turnos/page.tsx
const selectedEventForNewModal = useMemo(
  () => (listaEsperaPacienteId ? { pacienteId: listaEsperaPacienteId }
      : newSlotDate ? { fecha: newSlotDate.toISOString(), hora: ... } : null),
  [listaEsperaPacienteId, newSlotDate]
);
```

---

### WR-04: el incremento de generación corre después del paint y el toast de descarte miente cuando la selección vino de la lista

**File:** `frontend/src/app/dashboard/turnos/NewAppointmentModal.tsx:145-150`, `:250-256`; `frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx:156-161`, `:259-265`
**Severity:** WARNING

**Issue:** Dos defectos del mismo guard portado:

1. `useEffect` corre **después** del paint de la apertura, así que existe una ventana
   (documentada en el comentario como "inalcanzable a mano") en la que
   `dialogSessionRef.current` ya avanzó y `dialogSession` todavía no. El propio
   comentario admite el agujero y lo acepta; es innecesario aceptarlo, porque
   `useLayoutEffect` lo cierra por completo (corre antes del paint y su `setState`
   se flushea sincrónicamente), sin cambiar ninguna otra semántica.
2. El mensaje del descarte es una afirmación de hecho — *"El paciente se creó…"* —
   pero `onSelect` es el **mismo** callback que usa el click sobre una sugerencia
   existente (`AutocompletePaciente.tsx:171-174`). Si el guard descarta esa rama, el
   sistema le informa al usuario una creación que nunca ocurrió. En un sistema
   clínico, un mensaje que afirma la existencia de un registro que no existe es
   peor que un mensaje genérico.

**Fix:**

```tsx
useLayoutEffect(() => {
  if (open) {
    dialogSessionRef.current += 1;
    setDialogSession(dialogSessionRef.current);
  }
}, [open]);
```

y desacoplar el mensaje del origen — por ejemplo pasando el motivo desde
`AutocompletePaciente` (`onSelect(pac, { origin: "create" | "list" })`), o usando un
texto neutro: `"Ese turno ya se había cerrado. Volvé a buscar al paciente."`.

---

### WR-05: `buildPrefill` mete un teléfono en el campo DNI y el DNI no tiene cota superior

**File:** `frontend/src/components/InlineCreatePaciente.tsx:42-51`, `:67-74`
**Severity:** WARNING

**Issue:** El input de búsqueda anuncia explícitamente "Buscar paciente por nombre,
DNI **o teléfono**" (`AutocompletePaciente.tsx:106`), y el backend efectivamente
matchea por teléfono (`pacientes.service.ts:430`). Pero `buildPrefill` clasifica
*cualquier* query 100 % dígitos como DNI:

- `"1122334455"` (celular sin separadores) → precarga **DNI = 1122334455**.
- `"+54 11 2233 4455"` → el `+` sobrevive a `stripSeparators`, así que cae en la rama
  de nombre y precarga **Nombre = "+54 11 2233 4455"**.

El schema sólo exige `min(7)` y el input filtra no-dígitos sin `maxLength`, así que un
número de 10-11 dígitos pasa la validación del cliente; el backend tampoco valida
longitud (`@IsString()` a secas en `CreatePacienteDto`). El DNI es la clave de
identidad `@unique` global del paciente: una vez creado con un teléfono adentro, el
registro queda ocupando ese DNI para siempre y el duplicado real del paciente será
imposible de crear después.

**Fix:** acotar el rango plausible de DNI argentino y no precargar cuando la longitud
delata un teléfono:

```ts
const schema = z.object({
  // ...
  dni: z.string().min(7, "Mínimo 7 dígitos").max(9, "Máximo 9 dígitos"),
});

export function buildPrefill(query: string) {
  const stripped = stripSeparators(query);
  if (/^\d{7,9}$/.test(stripped)) return { dni: stripped, nombreCompleto: "" };
  return { dni: "", nombreCompleto: capitalizarNombre(query.trim()) };
}
```

y `maxLength={9}` en el input de DNI (`:213-222`).

---

### WR-06: el alta inline postea campos controlados por el cliente contra un endpoint sin validación de DTO

**File:** `frontend/src/hooks/useCreatePaciente.ts:8-11`; `frontend/src/components/InlineCreatePaciente.tsx:143-151`
**Severity:** WARNING

**Issue:** `backend/src/main.ts` **no registra ningún `ValidationPipe` global** (no hay
`useGlobalPipes`), así que los decoradores de `CreatePacienteDto` no corren nunca y
`PacientesService.create` hace `prisma.paciente.create({ data: { ...dto } })`
(`pacientes.service.ts:56-77`). El body llega crudo a Prisma: cualquier columna del
modelo `Paciente` es escribible desde el cliente (incluido `usuarioId`, que es
`@unique` y vincula al paciente con una cuenta de usuario). Este es el clásico
mass-assignment.

El hook de esta fase agrava la superficie porque `mutationFn: async (data: any)`
acepta cualquier forma y el componente ya envía flags de negocio armados en la UI
(`estado: "ACTIVO"`, `consentimientoFirmado: false`, `indicacionesEnviadas: false`,
`profesionalId`), normalizando que el cliente sea la fuente de verdad de esos campos.

Marcado como preexistente/backend en `68-VERIFICATION.md` (WR-10, diferido). Se
re-levanta porque sigue abierto y porque esta fase agrega un nuevo punto de entrada
público al endpoint (antes el alta era sólo el formulario completo de pacientes).

**Fix (backend, fuera del scope de archivos de esta fase pero requerido antes de
producción):**

```ts
// backend/src/main.ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
```

y tipar el hook: `mutationFn: async (data: CreatePacienteInput) => ...`.

---

### WR-07: los labels del mini-form no están asociados a sus inputs

**File:** `frontend/src/components/InlineCreatePaciente.tsx:190-192`, `:210-212`, `:231-233`
**Severity:** WARNING

**Issue:** Los tres campos usan `<label className="...">` sin `htmlFor`, y los
`<Input>` no tienen `id`. No hay asociación programática: lectores de pantalla anuncian
los inputs sin nombre accesible, y el click sobre el texto del label no enfoca el
campo. El mini-form vive dentro de un Popover dentro de un Dialog, donde la
orientación por teclado/lector es justamente la más frágil. Reportado en la ronda
anterior (WR-07) y no corregido.

**Fix:**

```tsx
const nombreId = useId();
// ...
<label htmlFor={nombreId} className="...">Nombre completo *</label>
<Input id={nombreId} {...register("nombreCompleto")} ... />
```

---

### WR-08: el campo DNI evita `register()`; el error del 409 queda pegado al retipear

**File:** `frontend/src/components/InlineCreatePaciente.tsx:213-222`, `:167-170`
**Severity:** WARNING

**Issue:** El input de DNI se maneja con `value={watch("dni")}` +
`setValue(..., { shouldValidate: false })`, sin `register()`. `setError("dni", ...)`
del camino 409 (`:167-170`) escribe un error sobre un campo no registrado: como no hay
validación en cambio, el mensaje *"Este DNI ya está registrado"* permanece en pantalla
mientras el usuario corrige el número, y sólo desaparece cuando vuelve a submitear.
El usuario ve simultáneamente un DNI nuevo y el cartel de que ese DNI ya existe.
Reportado en la ronda anterior (WR-03), diferido, sigue abierto.

**Fix:** registrar el campo con normalización y limpiar el error al tipear:

```tsx
<Input
  {...register("dni", {
    onChange: (e) => {
      e.target.value = e.target.value.replace(/\D/g, "");
      clearErrors("dni");
    },
  })}
  ref={(el) => { register("dni").ref(el); dniRef.current = el; }}
  inputMode="numeric"
  maxLength={9}
/>
```

---

### WR-09: mientras el POST está en vuelo el mini-form no se puede cerrar por ninguna vía, y no hay timeout

**File:** `frontend/src/components/AutocompletePaciente.tsx:132-136`, `:138-144`; `frontend/src/components/InlineCreatePaciente.tsx:249-254`
**Severity:** WARNING

**Issue:** Con `createPending === true` quedan bloqueadas las tres salidas del
mini-form a la vez: Escape (`if (createPending) return`), click afuera
(`onPointerDownOutside` → `preventDefault()`) y el botón *Cancelar*
(`disabled={isPending}`). La instancia de axios (`frontend/src/lib/api.ts`) no define
`timeout`, y la mutación no usa `AbortSignal`. Si la request queda colgada (proxy que
no responde, red que se cae sin RST), `isPending` no vuelve nunca a `false` y el
mini-form queda inmovilizado hasta que el usuario cierre el Dialog completo — que es
la única salida que quedó, y sólo funciona porque `preventDefault()` del Popover no
cancela el click nativo sobre el botón *Cancelar* del `DialogFooter`.

**Fix:** poner un techo temporal y una salida de emergencia:

```ts
// lib/api.ts
export const api = axios.create({ baseURL: ..., timeout: 30_000 });
```

y permitir cancelar el mini-form tras el timeout (o mantener *Cancelar* habilitado,
descartando el resultado con el mismo guard de generación que ya existe en los
padres).

---

### WR-10: `any` en la frontera del paciente creado + cast sin validar → `pacienteId: undefined` puede llegar a `POST /turnos`

**File:** `frontend/src/components/AutocompletePaciente.tsx:18`; `frontend/src/components/InlineCreatePaciente.tsx:159`; `frontend/src/app/dashboard/components/QuickAppointment.tsx:163`
**Severity:** WARNING

**Issue:** La cadena completa del dato nuevo está sin tipar de punta a punta:
`mutationFn: async (data: any)` devuelve `any` → `(await mutateAsync(payload)) as PacienteCreado`
es una aserción, no una validación → `onSelect: (paciente: any) => void` → los tres
call sites leen `pac.id` / `pac.nombreCompleto` sin chequear. Si el backend cambia la
forma de la respuesta (o devuelve un envelope `{ data: ... }`), no falla nada visible:
`pac.id` queda `undefined`, el chip muestra `undefined`, y `confirmarTurno()`
(`QuickAppointment.tsx:248`) postea `pacienteId: undefined`. TypeScript no puede
ayudar porque el `any` desactiva todos los chequeos. El repo ya tiene Zod como
dependencia (se usa acá mismo, `:42-51`).

**Fix:** validar la respuesta en el borde y tipar `onSelect`:

```ts
const pacienteCreadoSchema = z.object({
  id: z.string(),
  nombreCompleto: z.string(),
  fotoUrl: z.string().nullable().optional(),
});
const creado = pacienteCreadoSchema.parse(await mutateAsync(payload));
```

```ts
// AutocompletePaciente.tsx
type PacienteSeleccionado = { id: string; nombreCompleto: string; fotoUrl?: string | null };
type Props = { onSelect: (paciente: PacienteSeleccionado) => void; /* ... */ };
```

## Info

### IN-01: `register("nombreCompleto")` se invoca dos veces por cada callback de ref

**File:** `frontend/src/components/InlineCreatePaciente.tsx:193-198`
**Issue:** El spread `{...register("nombreCompleto")}` ya registra el campo, y dentro
del callback de `ref` se vuelve a llamar `register("nombreCompleto").ref(el)` — o sea
una registración extra por cada invocación del ref (montaje, desmontaje, cada cambio
de identidad del callback).
**Fix:** destructurar una vez, como recomienda RHF:
`const { ref: rhfRef, ...nombreField } = register("nombreCompleto");` y luego
`<Input {...nombreField} ref={(el) => { rhfRef(el); nombreRef.current = el; }} />`.

### IN-02: `setTimeout` de foco sin `clearTimeout` y con número mágico

**File:** `frontend/src/components/InlineCreatePaciente.tsx:115-122`
**Issue:** El efecto de foco programa un `setTimeout(..., 50)` y no lo limpia. No
crashea (los refs son opcionales y quedan `null`), pero deja un timer huérfano si el
mini-form se desmonta en los primeros 50 ms, y el `50` es un número mágico atado a la
animación del Popover.
**Fix:** `const t = setTimeout(...); return () => clearTimeout(t);` y extraer
`const FOCUS_DELAY_MS = 50;` con un comentario que explique a qué animación responde.

### IN-03: el debounce está duplicado y acopla el componente a las internas del hook

**File:** `frontend/src/components/AutocompletePaciente.tsx:49`
**Issue:** `usePacienteSuggest` ya hace `useDebounce(query, 300)` internamente y el
componente lo repite con el mismo delay, apoyándose en que ambos timers convergen. Es
correcto hoy sólo porque los dos delays son idénticos y se programan en el mismo
commit: cambiar el 300 en un solo lado desincroniza `canOfferCreate` de la query real.
**Fix:** que `usePacienteSuggest` devuelva su `debounced` y consumirlo acá, en vez de
recomputarlo.

### IN-04: dos toasts contradictorios en el camino de descarte

**File:** `frontend/src/components/InlineCreatePaciente.tsx:160`; call sites del guard
**Issue:** El éxito dispara `toast.success("... creado correctamente")` y acto seguido
el guard del padre dispara `toast.info("... ese turno ya se había cerrado")`. Los dos
quedan apilados en pantalla diciendo cosas distintas sobre el mismo evento.
**Fix:** que el toast de éxito lo emita quien decide el desenlace (el padre), o
suprimirlo cuando el padre descarta.

### IN-05: valores de negocio hardcodeados en el payload del componente de UI

**File:** `frontend/src/components/InlineCreatePaciente.tsx:143-151`
**Issue:** `estado: "ACTIVO"`, `consentimientoFirmado: false`, `indicacionesEnviadas: false`
son defaults de dominio embebidos en un componente de presentación; el backend ya
impone sus propios defaults (`etapaCRM: NUEVO_LEAD`, `flujo: null`). Dos fuentes de
verdad para el estado inicial de un paciente.
**Fix:** no enviarlos y dejar que el default del schema/servicio gobierne.

### IN-06: `capitalizarNombre` destruye mayúsculas internas

**File:** `frontend/src/components/InlineCreatePaciente.tsx:59-65`
**Issue:** `palabra.slice(1).toLowerCase()` convierte `"McDonald"` → `"Mcdonald"` y
`"D'Angelo"` → `"D'angelo"`. Es sólo un prefill editable, pero en un campo de identidad
el usuario tiende a no corregir lo que ya viene "formateado".
**Fix:** capitalizar sólo si la palabra viene toda en minúsculas o toda en mayúsculas,
y dejar intacto cualquier casing mixto.

### IN-07: `errors` desestructurado y nunca usado en `NewAppointmentModal`

**File:** `frontend/src/app/dashboard/turnos/NewAppointmentModal.tsx:96`
**Issue:** `formState: { errors }` se extrae pero no se referencia en ningún punto del
JSX (la validación es manual con `toast.error` dentro de `onSubmit`). Suscribirse a
`formState.errors` en RHF tiene costo de re-render por proxy y sugiere una validación
declarativa que no existe.
**Fix:** eliminar la desestructuración, o usarla y mover las validaciones de
`onSubmit:156-175` a reglas de `register`/resolver.

### IN-08: `<img>` de sugerencia sin `alt`

**File:** `frontend/src/components/AutocompletePaciente.tsx:177-181`
**Issue:** La foto del paciente en la lista de sugerencias no tiene `alt` (la del chip
seleccionado sí, `:79`). Un lector de pantalla anuncia la URL de la imagen.
**Fix:** `alt=""` (decorativa, el nombre ya está en el texto contiguo) o
`alt={pac.nombreCompleto}`.

---

_Reviewed: 2026-08-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
