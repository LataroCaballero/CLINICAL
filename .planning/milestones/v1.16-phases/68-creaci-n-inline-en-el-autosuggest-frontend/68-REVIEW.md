---
phase: 68-creaci-n-inline-en-el-autosuggest-frontend
reviewed: 2026-08-20T23:10:00Z
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
  critical: 1
  warning: 13
  info: 11
  total: 25
status: issues_found
---

# Phase 68: Code Review Report

**Reviewed:** 2026-08-20T23:10:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Cuarta pasada adversarial, posterior al plan 68-06 (`4d5d18b` + `e53f456`), que dice
cerrar CR-01 y CR-02 de la ronda anterior.

**Veredicto sobre los dos BLOCKER previos: ambos cerrados.** No los acepté por reporte;
los re-derivé traza por traza y verifiqué la suposición de ordenamiento de efectos en la
que se apoya CR-01 (ver `## Verificación de CR-01 / CR-02`). El detalle de la verificación
incluye lo que la corrección **no** hace, para que no se confunda "el síntoma desapareció"
con "el mecanismo es robusto":

- **CR-01 cerrado.** El `reset()` en la apertura es lo que realmente mata el chip fantasma;
  el guard de generación queda como segunda línea (cubre el caso de reapertura previa al
  aterrizaje del POST). El invariante "reset antes que los seeds" **es correcto** pero está
  sostenido únicamente por un comentario y por el hecho accidental de que los tres efectos
  comparten `open` en sus deps (ver IN-09).
- **CR-02 cerrado.** El early-return por `closest("button")` restituye la activación nativa
  de *Cancelar*. Efecto colateral aceptable pero real: el keydown de Enter sobre los botones
  ya no se detiene (`stopPropagation` quedó después del return); es inocuo hoy sólo porque
  `PopoverContent` está portaleado fuera del `<form>` y ambos botones son `type="button"`.

**Lo que la ronda 68-06 no tocó y sigue abierto:** los 10 warnings y 8 infos de la ronda
anterior siguen presentes **en su totalidad** — ninguno fue corregido. Se re-verificaron uno
por uno contra el código actual y se re-emiten con los mismos IDs y las líneas actualizadas.

**Escalamiento de severidad:** WR-06 (mass assignment en `POST /pacientes`) se re-clasifica
como **BLOCKER (CR-03)**. No cambió el código: cambió la evidencia. Se verificó en esta pasada
que (a) `backend/src/main.ts` no registra ningún `ValidationPipe` — la única pipe del endpoint
es `SanitizeEmptyValuesPipe`, que no hace whitelist; (b) `PacientesService.create` hace
`prisma.paciente.create({ data: { ...dto } })`; (c) el modelo `Paciente` expone `usuarioId`
(`String? @unique`, FK a `Usuario`) y `profesionalId` como escalares escribibles; (d) el
controller es `@Auth('ADMIN','PROFESIONAL','SECRETARIA','FACTURADOR')`, o sea que cualquier
secretaria autenticada puede, con curl y su propio token, crear un `Paciente` atado a un
`Usuario` arbitrario o al `profesionalId` de otro profesional. Eso es una brecha de
autorización multi-tenant concreta, no una deuda estilística, y `CLAUDE.md` exige mantener
multi-tenant/roles. Se conserva la trazabilidad: **CR-03 supersedes WR-06**.

**Hallazgos nuevos de esta pasada (4 warnings, 3 infos):** Enter en el input de búsqueda del
autosuggest dispara el submit implícito del formulario de turno (WR-11); el `fecha` de
`SurgeryAppointmentModal` puede quedar prellenado con una fecha de una interacción anterior no
relacionada (WR-12); `duracionMinutos` no se resetea en `QuickAppointment` y contamina el
filtrado de slots de la siguiente sesión (WR-13); el autosuggest consume `@/lib/axios`, una
instancia **sin** el interceptor de refresh 401, contra lo que dicta `CLAUDE.md` (WR-14).

**Contexto aceptado, no re-abierto:** ALTA-06 / D-08 (`profesionalId` null cuando el
profesional no está resuelto) está cubierto por el override firmado en el frontmatter de
`68-VERIFICATION.md` (`accepted_by: Lautaro Caballero`). Se menciona sólo como contexto; no
se clasifica.

**Nota de herramientas:** `frontend/` no tiene test runner (`package.json` sólo expone
`dev/build/start/lint`), así que ninguna corrección de este informe puede pedir jest/vitest.
Toda la verificación de este informe es lectura y trazado manual + `npx tsc --noEmit` (exit 0).

## Structural Findings (fallow)

No se recibió bloque `<structural_findings>` para esta revisión: no hubo pre-pasada
estructural. Todo lo que sigue es narrativo.

## Narrative Findings (AI reviewer)

Hallazgos derivados de lectura directa de los 6 archivos en scope, con verificación cruzada
contra `frontend/src/components/ui/popover.tsx`, `frontend/src/components/ui/input.tsx`,
`frontend/src/hooks/usePacienteSuggest.ts`, `frontend/src/hooks/useEffectiveProfessionalId.ts`,
`frontend/src/lib/api.ts`, `frontend/src/lib/axios.ts`,
`frontend/src/app/dashboard/turnos/page.tsx`, `frontend/src/components/crm/CardActionsSheet.tsx`,
`backend/src/main.ts`, `backend/src/modules/pacientes/pacientes.controller.ts`,
`backend/src/modules/pacientes/pacientes.service.ts`,
`backend/src/prisma-client-exception/prisma-client-exception.filter.ts` y
`backend/src/prisma/schema.prisma`.

---

## Verificación de CR-01 / CR-02

### CR-01 — `SurgeryAppointmentModal` chip fantasma → **CERRADO**

**Código actual:** `frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx:139-160`

```tsx
useEffect(() => {                      // efecto 1 — deps [open, reset]
  reset();
  setPacienteFotoUrl(null);
  if (open) { dialogSessionRef.current += 1; setDialogSession(dialogSessionRef.current); }
}, [open, reset]);

useEffect(() => { if (open && defaultDate) setValue("fecha", defaultDate); },
  [open, defaultDate, setValue]);      // efecto 2

useEffect(() => { if (open && pacienteIdProp) { setValue("pacienteId", ...); ... } },
  [open, pacienteIdProp, pacienteNombreProp, setValue]);   // efecto 3
```

**Sanity-check de la suposición de ordenamiento (lo que se pidió verificar explícitamente).**
La afirmación del comentario — "React flushea los efectos en orden de declaración" — es
**correcta**, con dos precisiones que el comentario no hace y que son las que sostienen el
invariante:

1. La garantía es *intra-componente y por commit*: React acumula los efectos pasivos de un
   fiber en una lista en orden de declaración de hooks y la recorre en ese orden durante el
   flush pasivo del commit. Efectos 1→2→3 corren en ese orden **siempre que se agenden en el
   mismo commit**.
2. Se agendan en el mismo commit porque los tres llevan `open` en sus deps y la transición
   `open: false → true` los invalida a los tres a la vez. Si alguien sacara `open` de las deps
   del efecto 2 o 3 (parece redundante frente al `if (open && ...)` interno), el seed pasaría
   a correr en un commit distinto del `reset()` y el invariante se rompe en silencio. Eso es
   fragilidad real, registrada como IN-09.
3. `reset` es referencialmente estable en react-hook-form v7 (`^7.68.0`): `useForm` guarda el
   objeto de `createFormControl` en un ref y lo devuelve siempre igual. Sin eso, el efecto 1
   correría en cada render y resetearía el formulario mientras el usuario tipea. Verificado
   contra `frontend/package.json`.

**Traza del ataque original, re-corrida sobre el código actual:**

1. `open=true` → efecto 1: `reset()`, `ref=1`, `dialogSession=1`. Efectos 2 y 3 re-siembran.
2. Alta inline en vuelo (`POST /pacientes`).
3. El usuario cierra con *Cancelar* del `DialogFooter` (`:409-415`, no deshabilitado) →
   `open=false` → efecto 1 corre `reset()` + `setPacienteFotoUrl(null)`. **No** sella.
4. El POST resuelve. La continuación del `await` (`InlineCreatePaciente.tsx:159-161`) llama
   `onCreated` → `onSelect`. Guard: `1 !== 1` es falso → **pasa** y escribe `pacienteId` en el
   `useForm` vivo. *El guard sigue sin cubrir este caso*; no es lo que cierra CR-01.
5. El usuario reabre → efecto 1 corre **primero** → `reset()` borra el `pacienteId` fantasma;
   luego sella `ref=2`/`session=2`; luego los seeds re-siembran `fecha` y el paciente de CRM.
   **El chip fantasma no sobrevive.** ✔

**Variante complementaria (reapertura antes del aterrizaje), también cubierta:** si el POST
resuelve *después* de reabrir, el closure viejo lleva `dialogSession=1` y `ref` ya vale 2 →
`1 !== 2` → descarte con toast. ✔ Las dos mitades del agujero quedan tapadas por mecanismos
distintos (reset y guard), que es la razón por la que hacía falta la unificación.

**Residuo (no bloqueante, registrado):** el paso 4 sigue escribiendo estado en un modal
cerrado — la corrección lo limpia después en vez de impedirlo. Es aceptable porque no existe
ninguna ruta que lea ese estado sin pasar antes por la reapertura (el submit exige el modal
abierto), pero conviene saber que la propiedad de seguridad es "se limpia a tiempo", no
"nunca se escribe".

**Efecto lateral verificado del cambio:** el `reset()` dejó de estar condicionado a `!open`,
así que ahora también corre en el montaje inicial. Inocuo (`reset()` a los `defaultValues` +
`setPacienteFotoUrl(null)` con el valor ya en `null`, del que React hace bailout). Pero como
`reset()` sin argumentos restaura los `defaultValues` **del primer render**, el `fecha` por
defecto quedó dependiendo enteramente del seed del efecto 2 — y ese seed no siempre tiene un
`defaultDate` que sembrar. Eso sí es un defecto: WR-12.

### CR-02 — Enter sobre *Cancelar* creaba el paciente → **CERRADO**

**Código actual:** `frontend/src/components/InlineCreatePaciente.tsx:177-193`

```tsx
if (e.key !== "Enter") return;
const target = e.target as HTMLElement;
if (target.closest("button")) return;   // ← sale ANTES de preventDefault
e.preventDefault();
e.stopPropagation();
if (isPending || submittingRef.current) return;
void handleSubmit(onSubmit)();
```

**Verificado:**

- El `<Button variant="outline">` de shadcn renderiza un `<button>` nativo; el `e.target` de un
  keydown con foco en el botón **es** ese `<button>`, y `closest("button")` lo devuelve a sí
  mismo. El early-return ocurre antes de `preventDefault()`, así que la acción por defecto del
  keydown (sintetizar el `click`) sobrevive → `onClick={onCancel}` corre. ✔ Enter sobre
  *Cancelar* ya **no** crea el paciente.
- Enter sobre *Crear paciente* también toma el early-return y activa el botón nativamente →
  `onClick={handleSubmit(onSubmit)}` → una sola creación. El auto-repeat de tecla sostenida
  queda contenido por `submittingRef` (`:140-141`), que se escribe de forma síncrona al entrar
  a `onSubmit` — sigue siendo el candado válido, y su `finally` (`:172-174`) libera en las tres
  salidas. ✔
- Enter en los tres `<Input>` de texto: `closest("button")` es `null` → se mantiene
  `preventDefault()` + `stopPropagation()` + el submit explícito. ✔ No hay regresión del camino
  feliz.
- Los botones son `disabled={isPending}` (`:257`, `:260`); un botón deshabilitado no recibe
  keydown, así que saltearse el chequeo `isPending` en el early-return no abre nada.

**Efecto lateral real, no bloqueante:** el `stopPropagation()` quedó *después* del early-return,
así que el keydown de Enter sobre un botón del mini-form ahora burbujea. Se verificó que es
inocuo: `PopoverContent` está envuelto en `PopoverPrimitive.Portal`
(`frontend/src/components/ui/popover.tsx:27-40`), o sea que el nodo DOM vive fuera del `<form>`
del turno, y el submit implícito del navegador es una regla del árbol DOM, no del árbol de
React; además ambos botones son `type="button"`. Ningún ancestro de React registra `onKeyDown`.
Registrado como IN-12 por fragilidad, no como defecto activo.

---

## Critical Issues

### CR-03: mass assignment en `POST /pacientes` — un rol no-admin puede atar un `Paciente` a cualquier `Usuario` o `Profesional`

**Supersedes:** WR-06 de `68-REVIEW.md` (ronda anterior). Mismo defecto, severidad corregida.
**File:** `frontend/src/hooks/useCreatePaciente.ts:8-11` (cliente); `frontend/src/components/InlineCreatePaciente.tsx:143-151` (payload)
**Cross-ref backend:** `backend/src/main.ts:13-49`, `backend/src/modules/pacientes/pacientes.controller.ts:36-51`, `backend/src/modules/pacientes/pacientes.service.ts:53-77`, `backend/src/prisma/schema.prisma` (model `Paciente`)
**Severity:** BLOCKER

**Issue:** Verificado en esta pasada, línea por línea:

1. `backend/src/main.ts` **no llama a `app.useGlobalPipes(...)` en ningún punto** (sólo CORS,
   `express.json`, y `useGlobalFilters(PrismaClientExceptionFilter)`). Los decoradores de
   `CreatePacienteDto` son inertes.
2. La única pipe de la ruta es `@UsePipes(new SanitizeEmptyValuesPipe())`
   (`pacientes.controller.ts:49`), que normaliza vacíos — **no** hace whitelist ni
   `forbidNonWhitelisted`.
3. `PacientesService.create` construye `const data = { ...dto, ... }` y lo pasa entero a
   `this.prisma.paciente.create({ data })` (`pacientes.service.ts:54-77`). Sólo pisa
   `etapaCRM`, `flujo`, `telefono` y las dos fechas; todo lo demás del body llega crudo a
   Prisma.
4. El modelo `Paciente` expone como escalares escribibles `usuarioId String? @unique` (FK a
   `Usuario`) y `profesionalId String?` (FK a `Profesional`).
5. El controller está bajo `@Auth('ADMIN','PROFESIONAL','SECRETARIA','FACTURADOR')` — es decir,
   **cualquiera de esos cuatro roles**, no sólo admin.

Consecuencia concreta: una `SECRETARIA` autenticada, con su propio token y una request curl,
puede postear
`{"nombreCompleto":"X","dni":"99999999","usuarioId":"<id de un Usuario existente>","profesionalId":"<id de otro profesional>"}`
y (a) atar el nuevo `Paciente` a una cuenta `Usuario` que no le corresponde — el vínculo que
gobierna el acceso al portal del paciente — y (b) colocarlo bajo un profesional distinto,
cruzando la frontera multi-tenant que `CLAUDE.md` exige preservar. No hay ninguna validación
que lo impida.

Esta fase no introdujo el agujero, pero sí le agregó un nuevo punto de entrada de baja fricción
(`useCreatePaciente` desde el autosuggest, con `mutationFn: async (data: any)` que acepta
cualquier forma) y normalizó que el cliente sea la fuente de verdad de campos de negocio
(`estado`, `consentimientoFirmado`, `indicacionesEnviadas`, `profesionalId`).

**Fix (backend — fuera de los archivos en scope, pero requerido antes de producción):**

```ts
// backend/src/main.ts, después de crear la app
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
  }),
);
```

Y, defensivamente, dejar de spreadear el DTO en el service — enumerar las columnas escribibles:

```ts
const data = {
  nombreCompleto: dto.nombreCompleto,
  dni: dto.dni,
  telefono: this.normalizeTelefono(dto.telefono),
  profesionalId: dto.profesionalId,      // + validar que pertenezca al tenant del caller
  // ...campos explícitos; NUNCA usuarioId desde el body
  etapaCRM: EtapaCRM.NUEVO_LEAD,
  flujo: null,
};
```

En el frontend (archivo en scope), tipar el hook para que el `any` deje de habilitar payloads
arbitrarios:

```ts
// frontend/src/hooks/useCreatePaciente.ts
export type CreatePacienteInput = {
  nombreCompleto: string;
  dni: string;
  telefono?: string;
  profesionalId?: string;
};
mutationFn: async (data: CreatePacienteInput) => (await api.post("/pacientes", data)).data,
```

---

## Warnings

> WR-01..WR-10 se re-verificaron contra el código actual: **los diez siguen presentes sin
> cambios**. Se conservan los IDs; las referencias de línea están actualizadas al estado de hoy.
> WR-06 fue escalado a CR-03 y por eso no aparece en esta lista.

### WR-01: `canOfferCreate` no distingue "no hay resultados" de "la búsqueda falló"

**File:** `frontend/src/components/AutocompletePaciente.tsx:53-58`
**Severity:** WARNING (sin cambios respecto de la ronda anterior)

**Issue:** Re-verificado en el backend: `PacientesService.suggest`
(`backend/src/modules/pacientes/pacientes.service.ts:385-447`) sigue envolviendo toda la query
raw en un `try { ... } catch (err) { console.error(...); return []; }`. Cualquier fallo interno
(extensión `unaccent`/`pg_trgm` ausente, timeout de pool — ver el historial de fixes de pool de
este repo) llega al cliente como **200 con array vacío**. TanStack Query lo ve como éxito:
`isSuccess === true`, `data.length === 0` → `canOfferCreate` true → aparece
`Crear paciente: "…"` para un paciente que **sí existe**.

Si el usuario tipea el DNI exacto, el `@unique` lo frena con 409. Si viene de una búsqueda por
nombre y tipea el DNI con un dígito distinto (o el paciente existente tiene el DNI mal cargado),
**se crea un duplicado real de un paciente vivo** y la historia clínica queda partida en dos
registros. Antes de esta fase, ese mismo estado (0 resultados) no ofrecía nada.

Se mantiene en WARNING y no en BLOCKER porque el disparo requiere una falla del backend; pero
es el warning de mayor impacto clínico del informe y el backend está diseñado para que esa falla
sea invisible.

**Fix:** que el backend propague el error (`throw` en vez de `return []`) y que la oferta de alta
dependa de un vacío positivo:

```tsx
const { data = [], isFetching, isSuccess, isError } = usePacienteSuggest(query);

const canOfferCreate =
  allowCreate && !creating && !isError &&
  debouncedQuery.trim().length >= 3 && !isFetching && isSuccess;
```

---

### WR-02: con el dropdown abierto, ni Escape ni el click afuera lo cierran

**File:** `frontend/src/components/AutocompletePaciente.tsx:62-64`, `:70`, `:121-144`
**Severity:** WARNING (sin cambios; ampliado con el caso de click afuera)

**Issue:** El `<Popover>` (`:70`) es controlado por `open={showDropdown}` y **no tiene
`onOpenChange`**, así que el `onDismiss` de Radix no puede cerrarlo: el único cierre real es que
`showDropdown` pase a `false`. Con eso:

- **Escape.** `onEscapeKeyDown` hace `if (!creating) return;` sin `preventDefault()` (`:132`).
  Radix dispara el dismiss del Popover → nada ocurre. Y el Dialog del turno **no** recibe el
  Escape, porque el Popover es la capa más alta y el short-circuit `isHighestLayer` corta antes.
  Resultado: con el dropdown visible, Escape no cierra nada. Como `showDropdown` ahora incluye
  `|| canOfferCreate`, el estado "query ≥ 3 y 0 resultados" — que antes cerraba el dropdown y
  dejaba pasar el Escape al Dialog — pasó a quedar abierto: es una regresión introducida por la
  fase.
- **Click afuera (caso nuevo en este informe, mismo ID por ser el mismo mecanismo).**
  `onPointerDownOutside` sólo hace `preventDefault()` cuando `creating` es true (`:143`). Con
  `creating === false`, Radix llama al dismiss → sin `onOpenChange`, tampoco pasa nada. El
  dropdown de sugerencias queda flotando (z-50) sobre el resto del formulario mientras el
  usuario intenta operar el `Select` de tipo de turno o el `Popover` de fecha.

**Fix:** hacer que el dismiss actúe sobre lo único que gobierna `showDropdown`, la query:

```tsx
onEscapeKeyDown={(e) => {
  e.preventDefault();
  e.stopPropagation();
  if (creating) { if (createPending) return; setCreating(false); return; }
  setQuery("");
}}
onPointerDownOutside={(e) => {
  if (creating) { e.preventDefault(); return; }
  setQuery("");
}}
```

---

### WR-03: `NewAppointmentModal` resetea el formulario ante cualquier re-render del padre, incluido el paciente recién creado

**File:** `frontend/src/app/dashboard/turnos/NewAppointmentModal.tsx:110-133`
**Cross-ref:** `frontend/src/app/dashboard/turnos/page.tsx:502-507`
**Severity:** WARNING (sin cambios)

**Issue:** Re-verificado: el padre sigue construyendo `selectedEvent` como objeto literal nuevo
en cada render (`page.tsx:502-507`), y el efecto de reset lo lleva en deps. Con el modal abierto
desde un slot del calendario (`newSlotDate` seteado, el camino más usado), **cualquier**
re-render de `turnos/page.tsx` cambia la identidad del prop, el efecto re-corre y hace
`reset({...})`: se pierden tipo de turno, hora, observaciones y — lo relevante para esta fase —
el `pacienteId`/`pacienteNombre` que el alta inline acaba de escribir.

El guard de generación no defiende de esto: la escritura fue legítima y el borrado llega después.
Es, funcionalmente, el mismo desenlace que CR-01 (turno agendado sin el paciente que el usuario
acaba de crear) por una causa distinta, y sigue abierto. Sólo lo mitiga hoy
`refetchOnWindowFocus: false` + `staleTime: 30_000` en `providers.tsx`, no el diseño.

Cuando `listaEsperaPacienteId` y `newSlotDate` son ambos `null`, `selectedEvent` es el literal
`null` (primitivo estable) y el bug no se manifiesta — por eso el camino "Nuevo turno" desde el
botón está a salvo y el camino "click en slot" no.

**Fix:** estabilizar la identidad en el padre:

```tsx
const selectedEventForNewModal = useMemo(
  () =>
    listaEsperaPacienteId
      ? { pacienteId: listaEsperaPacienteId }
      : newSlotDate
        ? { fecha: newSlotDate.toISOString(), hora: format(newSlotDate, "HH:mm") }
        : null,
  [listaEsperaPacienteId, newSlotDate],
);
```

---

### WR-04: el sello de generación corre después del paint y el toast de descarte afirma una creación que puede no haber ocurrido

**File:** `frontend/src/app/dashboard/turnos/NewAppointmentModal.tsx:145-150`, `:250-256`; `frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx:139-146`, `:258-264`; `frontend/src/app/dashboard/components/QuickAppointment.tsx:421-435`
**Severity:** WARNING (sin cambios; el fix de CR-01 movió el sello de Surgery pero lo dejó en `useEffect`)

**Issue:** Dos defectos del mismo guard:

1. El sello vive en `useEffect`, que corre **después** del paint del commit de apertura. Existe
   una ventana en la que `dialogSessionRef.current` ya avanzó y el `dialogSession` sellado en los
   closures todavía no. El comentario del código la documenta y la acepta; es innecesario
   aceptarla, porque `useLayoutEffect` la cierra por completo (corre antes del paint y su
   `setState` se flushea sincrónicamente) sin cambiar ninguna otra semántica. El fix de 68-06
   mantuvo `useEffect` en `SurgeryAppointmentModal`.
2. El mensaje del descarte es una afirmación de hecho — *"El paciente se creó, pero…"* — pero
   `onSelect` es el **mismo** callback que usa el click sobre una sugerencia existente
   (`AutocompletePaciente.tsx:171-174`). Si el guard descarta esa rama, el sistema le informa al
   usuario una creación que nunca ocurrió. En un sistema clínico, afirmar la existencia de un
   registro inexistente es peor que un mensaje genérico.

**Fix:**

```tsx
useLayoutEffect(() => {
  reset();
  setPacienteFotoUrl(null);
  if (open) { dialogSessionRef.current += 1; setDialogSession(dialogSessionRef.current); }
}, [open, reset]);
```

y desacoplar el mensaje del origen (`onSelect(pac, { origin: "create" | "list" })`) o usar un
texto neutro: `"Ese turno ya se había cerrado. Volvé a buscar al paciente."`.

---

### WR-05: `buildPrefill` mete un teléfono en el campo DNI y el DNI no tiene cota superior

**File:** `frontend/src/components/InlineCreatePaciente.tsx:42-51`, `:67-74`, `:221-230`
**Severity:** WARNING (sin cambios)

**Issue:** El placeholder del input de búsqueda anuncia "Buscar paciente por nombre, DNI **o
teléfono**" (`AutocompletePaciente.tsx:106`) y el backend efectivamente matchea por teléfono
(`pacientes.service.ts:428`). Pero `buildPrefill` clasifica *cualquier* query 100 % dígitos como
DNI:

- `"1122334455"` (celular sin separadores) → precarga **DNI = 1122334455**.
- `"+54 11 2233 4455"` → el `+` sobrevive a `stripSeparators` (que sólo saca `\s.-`), cae en la
  rama de nombre y precarga **Nombre = "+54 11 2233 4455"**.

El schema sólo exige `min(7)` y el input filtra no-dígitos sin `maxLength`, así que 10-11 dígitos
pasan; el backend tampoco valida longitud (y con CR-03 ni siquiera corre el DTO). El DNI es la
clave de identidad `@unique` global del paciente: una vez creado con un teléfono adentro, ese DNI
queda ocupado y el alta real del paciente con ese DNI se vuelve imposible.

**Fix:**

```ts
dni: z.string().min(7, "Mínimo 7 dígitos").max(9, "Máximo 9 dígitos"),

export function buildPrefill(query: string) {
  const stripped = stripSeparators(query);
  if (/^\d{7,9}$/.test(stripped)) return { dni: stripped, nombreCompleto: "" };
  return { dni: "", nombreCompleto: capitalizarNombre(query.trim()) };
}
```

más `maxLength={9}` en el input de DNI (`:221-230`).

---

### WR-07: los labels del mini-form no están asociados a sus inputs

**File:** `frontend/src/components/InlineCreatePaciente.tsx:198-200`, `:218-220`, `:239-241`
**Severity:** WARNING (sin cambios; tercera ronda consecutiva)

**Issue:** Los tres campos usan `<label className="...">` sin `htmlFor` y los `<Input>` no tienen
`id`. No hay asociación programática: los lectores de pantalla anuncian los inputs sin nombre
accesible y el click sobre el texto del label no enfoca el campo. El mini-form vive dentro de un
Popover dentro de un Dialog, el contexto donde la orientación por teclado/lector es más frágil.

**Fix:**

```tsx
const nombreId = useId();
<label htmlFor={nombreId} className="...">Nombre completo *</label>
<Input id={nombreId} {...register("nombreCompleto")} ... />
```

---

### WR-08: el campo DNI evita `register()`; el error del 409 queda pegado al retipear

**File:** `frontend/src/components/InlineCreatePaciente.tsx:221-230`, `:167-170`
**Severity:** WARNING (sin cambios)

**Issue:** El input de DNI se maneja con `value={watch("dni")}` +
`setValue(..., { shouldValidate: false })`, sin `register()`. `setError("dni", ...)` del camino
409 escribe un error sobre un campo no registrado: como no hay validación en cambio, el mensaje
*"Este DNI ya está registrado"* permanece en pantalla mientras el usuario corrige el número, y
sólo desaparece al volver a submitear. El usuario ve simultáneamente un DNI nuevo y el cartel de
que ese DNI ya existe.

**Fix:**

```tsx
<Input
  {...register("dni", {
    onChange: (e) => { e.target.value = e.target.value.replace(/\D/g, ""); clearErrors("dni"); },
  })}
  ref={(el) => { register("dni").ref(el); dniRef.current = el; }}
  inputMode="numeric"
  maxLength={9}
/>
```

---

### WR-09: mientras el POST está en vuelo el mini-form no se puede cerrar por ninguna vía, y no hay timeout

**File:** `frontend/src/components/AutocompletePaciente.tsx:129-137`, `:138-144`; `frontend/src/components/InlineCreatePaciente.tsx:256-262`
**Cross-ref:** `frontend/src/lib/api.ts:3-6` (sin `timeout`)
**Severity:** WARNING (sin cambios)

**Issue:** Con `createPending === true` quedan bloqueadas las tres salidas a la vez: Escape
(`if (createPending) return`), click afuera (`preventDefault()`) y *Cancelar*
(`disabled={isPending}`). Re-verificado: `axios.create({ baseURL, withCredentials: true })` en
`lib/api.ts` **no define `timeout`**, y la mutación no usa `AbortSignal`. Si la request queda
colgada (proxy que no responde, red caída sin RST), `isPending` no vuelve nunca a `false` y el
mini-form queda inmovilizado hasta que el usuario cierre el Dialog entero — que hoy funciona sólo
porque el `preventDefault()` del Popover no alcanza al botón *Cancelar* del `DialogFooter`.

**Fix:** `export const api = axios.create({ baseURL: ..., timeout: 30_000 });` y permitir cancelar
el mini-form tras el timeout (o mantener *Cancelar* habilitado, descartando el resultado con el
guard de generación que ya existe en los padres).

---

### WR-10: `any` en la frontera del paciente creado + cast sin validar → `pacienteId: undefined` puede llegar a `POST /turnos`

**File:** `frontend/src/components/AutocompletePaciente.tsx:18`; `frontend/src/components/InlineCreatePaciente.tsx:159`; `frontend/src/app/dashboard/components/QuickAppointment.tsx:163`, `:248`; `frontend/src/hooks/useCreatePaciente.ts:8`
**Severity:** WARNING (sin cambios)

**Issue:** La cadena está sin tipar de punta a punta: `mutationFn: async (data: any)` devuelve
`any` → `(await mutateAsync(payload)) as PacienteCreado` es una **aserción, no una validación** →
`onSelect: (paciente: any) => void` → los tres call sites leen `pac.id` / `pac.nombreCompleto` sin
chequear. Si el backend cambia la forma de la respuesta (o la envuelve en `{ data: ... }`), nada
falla de forma visible: `pac.id` queda `undefined`, el chip muestra `undefined` y
`confirmarTurno()` (`QuickAppointment.tsx:248`) postea `pacienteId: undefined`. TypeScript no
puede ayudar porque el `any` desactiva los chequeos, y `zod` ya es dependencia del repo (se usa en
este mismo archivo, `:42-51`).

**Fix:**

```ts
const pacienteCreadoSchema = z.object({
  id: z.string(),
  nombreCompleto: z.string(),
  fotoUrl: z.string().nullable().optional(),
});
const creado = pacienteCreadoSchema.parse(await mutateAsync(payload));
```

y tipar `onSelect: (paciente: { id: string; nombreCompleto: string; fotoUrl?: string | null }) => void`.

---

### WR-11: Enter en el input de búsqueda del autosuggest dispara el submit implícito del formulario de turno

**File:** `frontend/src/components/AutocompletePaciente.tsx:71-113` (el `PopoverAnchor asChild` **no** portalea); `frontend/src/app/dashboard/turnos/NewAppointmentModal.tsx:236-262`; `frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx:239-271`
**Severity:** WARNING (**nuevo**)

**Issue:** A diferencia de `PopoverContent` (que sí está envuelto en `PopoverPrimitive.Portal`,
`ui/popover.tsx:27`), el `PopoverAnchor asChild` renderiza su `<div>` **en el lugar**, o sea que
el `<Input>` de búsqueda queda como control de formulario dentro del `<form onSubmit={...}>` de
`NewAppointmentModal` / `SurgeryAppointmentModal`, que además contienen un único
`<Button type="submit">`. Eso habilita el *implicit submission* del navegador: presionar Enter en
el input de búsqueda envía el formulario del turno.

Camino concreto (es el camino feliz de esta fase, no un caso de borde): el usuario tipea
`"Juan Pérez"`, ve la lista, presiona **Enter** esperando confirmar la búsqueda o elegir el primer
resultado, y en cambio dispara `handleSubmit(onSubmit)` del turno → como todavía no hay
`pacienteId`, salta `toast.error("Debe seleccionar un paciente")` (o
`"Debe indicar el procedimiento"` en cirugía). Enter, la tecla natural de este flujo, no hace nada
útil y produce un error espurio.

Ironía relevante: el mini-form de alta sí se protege del submit implícito con
`preventDefault()`/`stopPropagation()` (`InlineCreatePaciente.tsx:187-188`) — pero el input de
búsqueda, que está *más* dentro del form, no.

**Fix:** interceptar Enter en el input de búsqueda del autosuggest y darle semántica propia
(seleccionar la primera sugerencia, o abrir el alta si `canOfferCreate`):

```tsx
<Input
  placeholder="Buscar paciente por nombre, DNI o teléfono"
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  onKeyDown={(e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();       // corta el submit implícito del <form> del turno
    e.stopPropagation();
    if (data.length > 0) { onSelect(data[0]); setQuery(""); return; }
    if (canOfferCreate) setCreating(true);
  }}
/>
```

---

### WR-12: el `fecha` de `SurgeryAppointmentModal` puede quedar prellenado con la fecha de una interacción anterior no relacionada

**File:** `frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx:108-122` (`defaultValues`), `:139-146` (reset), `:148-152` (único seed)
**Cross-ref:** `frontend/src/app/dashboard/turnos/page.tsx:228`, `:440-450`, `:496-500`, `:516-520`; `frontend/src/components/crm/CardActionsSheet.tsx:237-241`
**Severity:** WARNING (**nuevo**; no lo introdujo el fix, pero el fix lo vuelve el único mecanismo de fecha)

**Issue:** `reset()` sin argumentos restaura los `defaultValues` **capturados en el primer
render**, cuyo `fecha` es `defaultDate || new Date()`. Como el efecto unificado ahora resetea en
cada apertura, la única forma de que `fecha` sea correcta es que el efecto de seed
(`if (open && defaultDate)`) tenga un `defaultDate` que sembrar. Trazando los tres call sites:

- **`turnos/page.tsx:516-520`** pasa `defaultDate={surgeryDate}`. `surgeryDate` arranca en
  `undefined` (`:228`) y **sólo** se setea en `handleSelectSlot` cuando el slot cae en día de
  cirugía (`:445-448`). El otro camino de apertura — el botón
  *"¿Querés programar una cirugía?"* de `NewAppointmentModal`, que llama `onSwitchToSurgery` →
  `setOpenSurgeryModal(true)` (`:496-500`) — **no toca `surgeryDate`**. Y `surgeryDate` nunca se
  limpia al cerrar. Resultado:
  - si el usuario nunca clickeó un slot de cirugía, `fecha` = el instante en que se montó
    `turnos/page.tsx` (para un front desk que deja el dashboard abierto, puede ser **ayer**);
  - si clickeó uno antes, `fecha` = **esa fecha vieja**, sin relación con lo que está haciendo
    ahora.
- **`CardActionsSheet.tsx:237-241`** (CRM) no pasa `defaultDate` en absoluto → `fecha` = el
  momento en que se montó el `SheetContent`. Menor, porque el sheet se monta al abrirse.
- **`QuickAppointment.tsx:497-501`** sí pasa `defaultDate={date}`, siempre definido. ✔ Único
  call site correcto.

El `Calendar` de este modal tampoco deshabilita fechas pasadas (`:302-308`, a diferencia del de
`QuickAppointment.tsx:291-301`), así que una cirugía con fecha de ayer se puede postear. La fecha
es visible en el botón del popover, lo que evita clasificarlo como BLOCKER — pero está prellenada
y presentada como si fuera correcta.

**Fix:** no depender de un prop opcional para una precondición. Sembrar dentro del mismo efecto
unificado, con fallback explícito a "hoy":

```tsx
useEffect(() => {
  reset({ ...DEFAULTS, fecha: defaultDate ?? new Date() });
  setPacienteFotoUrl(null);
  if (open) { dialogSessionRef.current += 1; setDialogSession(dialogSessionRef.current); }
}, [open, defaultDate, reset]);
```

(y así desaparece también la dependencia de orden de IN-09). En `turnos/page.tsx`, setear
`surgeryDate` en el camino `onSwitchToSurgery` y limpiarlo al cerrar el modal.

---

### WR-13: `duracionMinutos` no se resetea en `QuickAppointment` — el filtrado de slots arrastra la duración del turno anterior

**File:** `frontend/src/app/dashboard/components/QuickAppointment.tsx:166`, `:185-189`, `:201-203`, `:212-216`
**Severity:** WARNING (**nuevo**)

**Issue:** `resetForm()` (`:212-216`) limpia `paciente`, `tipoTurnoId` y `observaciones`, pero
**no** `duracionMinutos`. El efecto que la actualiza sólo dispara cuando hay un tipo seleccionado
(`if (tipoTurnoSeleccionado)`, `:185-189`), así que al limpiar `tipoTurnoId` la duración queda
congelada en el valor del turno anterior.

`duracionMinutos` alimenta `filterAvailableSlots` (`:201-203`), que se renderiza en la **tarjeta
de atrás**, fuera del Dialog. Traza: el usuario agenda una cirugía menor de 90 min → confirma →
`resetForm()` deja `duracionMinutos = 90` → la grilla de horarios del día pasa a filtrarse con
90 min de solapamiento aunque no haya ningún tipo seleccionado y la UI diga implícitamente 30.
Se le ocultan al usuario slots que en realidad están libres, y el conjunto de horarios visibles
depende de cuál fue el último tipo de turno usado en la sesión. Es un fallo silencioso: no hay
error, sólo menos opciones.

El comentario de `:205-211` justifica cuidadosamente por qué `selectedTime` **no** entra al reset;
`duracionMinutos` no está contemplado en ese razonamiento ni en ningún otro.

**Fix:** llevar la duración al reset y darle un default nombrado:

```tsx
const DURACION_DEFAULT_MIN = 30;
// ...
function resetForm() {
  setPaciente(null);
  setTipoTurnoId("");
  setObservaciones("");
  setDuracionMinutos(DURACION_DEFAULT_MIN);   // sin tipo seleccionado, la grilla usa el default
}
```

---

### WR-14: el autosuggest usa `@/lib/axios`, una instancia sin el interceptor de refresh 401 — la búsqueda muere en silencio al expirar el token

**File:** `frontend/src/components/AutocompletePaciente.tsx:4`, `:43`
**Cross-ref:** `frontend/src/hooks/usePacienteSuggest.ts:2`; `frontend/src/lib/axios.ts` (sólo request interceptor) vs `frontend/src/lib/api.ts:37+` (request + response con refresh de token)
**Severity:** WARNING (**nuevo**)

**Issue:** `CLAUDE.md` establece que "All API requests use the axios instance from
`frontend/src/lib/api.ts` which automatically attaches JWT tokens". `usePacienteSuggest` —el hook
que alimenta este componente— importa `api` desde `@/lib/axios`, que es **otra** instancia: tiene
el interceptor de request (adjunta el token) pero **no** el interceptor de response que hace el
refresh en 401.

Consecuencia: cuando el access token expira, el alta de paciente usa `@/lib/api` (refresca bien,
`useCreatePaciente.ts:1`) pero la **búsqueda** recibe 401, React Query reintenta 3 veces y la
query queda en error. Como `data` cae al default `[]`, `isFetching` es false y `isSuccess` es
false, `canOfferCreate` es false y `showDropdown` colapsa a `false`: **el dropdown simplemente no
aparece**. El usuario tipea y no ve nada — ni sugerencias, ni la fila de alta, ni un mensaje de
error — y la búsqueda queda rota hasta que otra request (por `@/lib/api`) refresque el token.

Es el punto de entrada de toda esta fase, así que la falla anula la feature completa sin ninguna
señal. Hay 8 hooks/componentes en `@/lib/axios`, o sea que la divergencia es sistémica, pero acá
tiene consecuencia funcional directa.

**Fix:** migrar `usePacienteSuggest` a `@/lib/api` (el interceptor de request es idéntico, así que
no cambia nada más) y, a mediano plazo, eliminar `src/lib/axios.ts` migrando sus 8 consumidores.
Adicionalmente, mostrar el error en el dropdown en vez de esconderlo — ver WR-01, que necesita el
mismo `isError`.

---

## Info

### IN-01: `register("nombreCompleto")` se invoca dos veces por cada callback de ref

**File:** `frontend/src/components/InlineCreatePaciente.tsx:201-209`
**Issue:** El spread `{...register("nombreCompleto")}` ya registra el campo y dentro del callback
de `ref` se vuelve a llamar `register("nombreCompleto").ref(el)`, una registración extra por cada
invocación del ref (montaje, desmontaje, cada cambio de identidad del callback).
**Fix:** `const { ref: rhfRef, ...nombreField } = register("nombreCompleto");` y luego
`<Input {...nombreField} ref={(el) => { rhfRef(el); nombreRef.current = el; }} />`.

### IN-02: `setTimeout` de foco sin `clearTimeout` y con número mágico

**File:** `frontend/src/components/InlineCreatePaciente.tsx:115-122`
**Issue:** El efecto de foco programa `setTimeout(..., 50)` y no lo limpia. No crashea (los refs
quedan `null`), pero deja un timer huérfano si el mini-form se desmonta en los primeros 50 ms y el
`50` está atado implícitamente a la animación del Popover.
**Fix:** `const t = setTimeout(...); return () => clearTimeout(t);` y extraer
`const FOCUS_DELAY_MS = 50;` con el motivo documentado.

### IN-03: el debounce está duplicado y acopla el componente a las internas del hook

**File:** `frontend/src/components/AutocompletePaciente.tsx:49`
**Issue:** `usePacienteSuggest` ya hace `useDebounce(query, 300)` internamente
(`usePacienteSuggest.ts:7`) y el componente lo repite con el mismo delay, apoyándose en que ambos
timers convergen. Es correcto sólo mientras los dos delays sean idénticos: cambiar el 300 en un
solo lado desincroniza `canOfferCreate` de la query real.
**Fix:** que `usePacienteSuggest` devuelva su `debounced` y consumirlo acá.

### IN-04: dos toasts contradictorios en el camino de descarte

**File:** `frontend/src/components/InlineCreatePaciente.tsx:160`; guards en los tres call sites
**Issue:** El éxito dispara `toast.success("… creado correctamente")` y acto seguido el guard del
padre dispara `toast.info("… ese turno ya se había cerrado")`. Quedan apilados diciendo cosas
distintas del mismo evento.
**Fix:** que el toast de éxito lo emita quien decide el desenlace (el padre), o suprimirlo cuando
el padre descarta.

### IN-05: valores de negocio hardcodeados en el payload del componente de UI

**File:** `frontend/src/components/InlineCreatePaciente.tsx:143-151`
**Issue:** `estado: "ACTIVO"`, `consentimientoFirmado: false`, `indicacionesEnviadas: false` son
defaults de dominio embebidos en un componente de presentación; el backend ya impone los suyos
(`etapaCRM: NUEVO_LEAD`, `flujo: null`, `pacientes.service.ts:68-70`). Dos fuentes de verdad para
el estado inicial de un paciente — y, con CR-03 abierto, cada campo que el cliente envía es un
campo que el cliente puede falsear.
**Fix:** no enviarlos y dejar que el default del schema/servicio gobierne.

### IN-06: `capitalizarNombre` destruye mayúsculas internas

**File:** `frontend/src/components/InlineCreatePaciente.tsx:59-65`
**Issue:** `palabra.slice(1).toLowerCase()` convierte `"McDonald"` → `"Mcdonald"` y `"D'Angelo"` →
`"D'angelo"`. Es sólo un prefill editable, pero en un campo de identidad el usuario tiende a no
corregir lo que ya viene "formateado".
**Fix:** capitalizar sólo si la palabra viene toda en minúsculas o toda en mayúsculas; dejar
intacto cualquier casing mixto.

### IN-07: `errors` desestructurado y nunca usado en `NewAppointmentModal`

**File:** `frontend/src/app/dashboard/turnos/NewAppointmentModal.tsx:96`
**Issue:** Re-verificado con grep: `errors` aparece **una sola vez** en todo el archivo, en la
propia desestructuración. La validación es manual con `toast.error` dentro de `onSubmit`.
Suscribirse a `formState.errors` en RHF tiene costo de re-render por proxy y sugiere una
validación declarativa que no existe.
**Fix:** eliminar la desestructuración, o usarla y mover las validaciones de `:156-175` a reglas
de `register`/resolver.

### IN-08: `<img>` de sugerencia sin `alt`

**File:** `frontend/src/components/AutocompletePaciente.tsx:177-181`
**Issue:** La foto del paciente en la lista de sugerencias no tiene `alt` (la del chip
seleccionado sí, `:79`). Un lector de pantalla anuncia la URL de la imagen.
**Fix:** `alt=""` (decorativa, el nombre está en el texto contiguo) o `alt={pac.nombreCompleto}`.

### IN-09: el invariante "reset antes que los seeds" está sostenido sólo por un comentario y por un `open` redundante en las deps

**File:** `frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx:133-160`
**Issue:** (**nuevo**) La corrección de CR-01 es correcta, pero su corrección depende de dos
condiciones no expresadas en el código: (a) que el efecto unificado esté declarado antes que los
dos seeds, y (b) que los tres efectos se agenden en el **mismo commit**, lo cual sólo ocurre
porque los seeds llevan `open` en deps además de chequearlo con `if (open && ...)`. Ese `open`
parece redundante y es exactamente lo que un cleanup futuro (o una regla de lint) tendería a
sacar; sacarlo rompe CR-01 en silencio, sin error de tipos ni de lint. Un comentario `ADVERTENCIA`
no es un mecanismo de enforcement.
**Fix:** eliminar la dependencia de orden fusionando el seed dentro del mismo efecto — ver el
snippet de WR-12, que resuelve IN-09 y WR-12 con el mismo cambio.

### IN-10: *Cancelar* no está deshabilitado mientras la mutación está en vuelo (inconsistente entre los tres modales)

**File:** `frontend/src/app/dashboard/turnos/NewAppointmentModal.tsx:351-357`; `frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx:409-415`
**Issue:** (**nuevo**) En ambos modales el botón de submit lleva `disabled={isSubmitting}` /
`disabled={createMutation.isPending}` pero *Cancelar* no. `QuickAppointment.tsx:474-483` sí lo
deshabilita. Cerrar el modal con la request en vuelo no la cancela (no hay `AbortSignal`): el
turno/cirugía se crea igual y el usuario ve un toast de éxito sobre un modal que él acaba de
descartar.
**Fix:** `disabled={createMutation.isPending}` en *Cancelar*, o cancelar de verdad con
`AbortSignal` (ver también WR-09).

### IN-11: el manejo de 409 asume que todo `P2002` es un choque de DNI

**File:** `frontend/src/components/InlineCreatePaciente.tsx:162-174`
**Cross-ref:** `backend/src/prisma-client-exception/prisma-client-exception.filter.ts:16-24`
**Issue:** (**nuevo**) El filtro global mapea **cualquier** `P2002` a 409 con el mensaje crudo de
Prisma, y el cliente hace `if (status === 409 || message?.includes("DNI"))` →
`setError("dni", "Este DNI ya está registrado")`. El modelo `Paciente` tiene otro `@unique`
(`usuarioId`), así que un 409 por otra columna se le reporta al usuario como un problema de DNI.
Notar además que la rama `message?.includes("DNI")` nunca matchea: el mensaje de Prisma dice
`` `dni` `` en minúscula. El 409 sólo funciona por el `status`.
**Fix:** discriminar por el campo del error (`error.meta.target`) en el filtro, exponiendo un
código estable (`{ code: "DNI_DUPLICADO" }`) en vez de reenviar el mensaje crudo de Prisma —que,
de paso, filtra nombres de tabla/columna al cliente.

### IN-12: el early-return de `handleKeyDown` deja escapar el keydown de Enter sobre los botones

**File:** `frontend/src/components/InlineCreatePaciente.tsx:185-188`
**Issue:** (**nuevo**, consecuencia del fix de CR-02) El `return` por `closest("button")` ocurre
antes de `e.stopPropagation()`, así que el Enter sobre *Cancelar* / *Crear paciente* burbujea
libremente. Hoy es inocuo — se verificó que `PopoverContent` está portaleado
(`ui/popover.tsx:27-40`), que ambos botones son `type="button"` y que ningún ancestro registra
`onKeyDown` — pero la inocuidad depende de tres detalles de terceros que nadie está fijando. Si
mañana el mini-form se usa fuera de un Popover portaleado, Enter sobre *Cancelar* pasa a submitear
el formulario que lo contenga.
**Fix:** llamar `e.stopPropagation()` antes del early-return, dejando pasar sólo el
`preventDefault()`:

```tsx
if (e.key !== "Enter") return;
e.stopPropagation();                       // el mini-form nunca cede Enter a sus ancestros
if ((e.target as HTMLElement).closest("button")) return;   // pero sí a su propio botón
e.preventDefault();
if (isPending || submittingRef.current) return;
void handleSubmit(onSubmit)();
```

---

_Reviewed: 2026-08-20T23:10:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
