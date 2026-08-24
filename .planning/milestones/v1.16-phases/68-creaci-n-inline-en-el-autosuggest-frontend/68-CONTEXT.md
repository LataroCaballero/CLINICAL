# Phase 68: Creación Inline en el Autosuggest (Frontend) - Context

**Gathered:** 2026-08-18
**Status:** Ready for planning

<domain>
## Phase Boundary

`AutocompletePaciente` gana la capacidad de dar de alta un paciente (nombre + DNI + teléfono opcional) desde adentro de su propio popover, sin cerrar el modal de turno. La capacidad se activa por una prop opcional (default off), y se enciende únicamente en los tres modales de turno: `QuickAppointment`, `NewAppointmentModal` y `SurgeryAppointmentModal`.

**Requisitos cubiertos:** ALTA-01, ALTA-02, ALTA-03, ALTA-04, ALTA-05, ALTA-06, ALTA-07.

**Fuera de esta fase:**
- Los usos de filtro del autosuggest (`PatientFilters`, `data-table-toolbar`) **no** cambian de comportamiento — la prop queda apagada ahí (ALTA-07).
- Backend: nada. La Phase 67 ya dejó `telefono` nullable, `normalizeTelefono()` en el service y el 409 de DNI duplicado con mensaje en español. Esta fase **no toca** `pacientes.service.ts`, el DTO ni el schema.
- Los placeholders de teléfono en display (TEL-03), el alta completa sin teléfono en `NewPacienteModal` (TEL-02) y los botones de WhatsApp deshabilitados (ENVIO-03) son de la **Phase 69**. Ver D-14 para el punto de contacto entre ambas.

</domain>

<decisions>
## Implementation Decisions

### Disparo del mini-form

- **D-01:** El popover **no** muestra el form directo. Con la creación habilitada, muestra una **fila clickeable `➕ Crear paciente "«query»"`**; recién al clickearla se despliega el mini-form dentro del mismo popover. La fila reusa el estilo de botón de fila que ya tienen los resultados (`AutocompletePaciente.tsx:99-124`). Razón: el usuario confirma la intención de crear antes de que aparezcan campos, y el popover no salta de alto apenas falla una búsqueda.
- **D-02:** La fila `➕ Crear` aparece **siempre** que la creación esté habilitada y el query califique — con 0 resultados **y también al final de la lista cuando sí hay resultados**. Razón: el caso real no es sólo "no existe", es "hay tres Gonzalez y ninguno es el mío". Va al pie de la lista, dentro del scroll existente (`max-h-60`), no sticky.
- **D-03:** La fila `➕ Crear` sólo aparece con **≥3 caracteres en el query debounceado** y con el fetch ya resuelto. Razón: `usePacienteSuggest` debouncea 300ms y sólo dispara con `debounced.length > 0`, así que entre la primera tecla y la respuesta hay una ventana con `data=[]` e `isFetching=false` que es indistinguible de "no existe" — declarar "sin resultados" ahí es un falso negativo. El umbral de 3 además evita ofrecer crear un paciente llamado "Ju".
- **D-04:** Con el mini-form abierto, la **búsqueda se congela**: el input de búsqueda sigue visible pero deja de refrescar el contenido del popover, y el foco salta al primer campo vacío del form. El usuario entra en "modo alta" hasta que cancela (D-11/D-12). Razón: sin esto, un resultado que llega tarde puede reemplazar el form debajo de los dedos del usuario.

### Campos y estado del alta

- **D-05:** El mini-form tiene **tres campos: Nombre, DNI y Teléfono (opcional)**. El teléfono no es obligatorio — la Phase 67 hizo la columna nullable justamente para habilitar este alta — pero se ofrece porque si la secretaria lo tiene a mano, cargarlo acá evita que el paciente nazca sin canal de WhatsApp (los guards de ENVIO-01 lo van a bloquear después). Mandar `telefono: ''` es seguro: `normalizeTelefono()` lo convierte a `null` en el service (Phase 67, D-01).
- **D-06:** El paciente creado inline es **indistinguible** de uno cargado por el alta completa. Mismo payload que `NewPacienteModal.tsx:83-95`: `estado: "ACTIVO"`, `consentimientoFirmado: false`, `indicacionesEnviadas: false`, `profesionalId`. El service ya fuerza `etapaCRM: NUEVO_LEAD` y `flujo: null` para todo alta, incondicionalmente (`pacientes.service.ts:69-70`). **No** se agrega ningún flag de "ficha incompleta" — no existe en el schema y está explícitamente Out of Scope en REQUIREMENTS.md (FICHA-F01/F02 diferidos).
- **D-07:** Feedback post-creación: **toast + selección**. Toast verde con el patrón `sonner` ya usado en `NewPacienteModal.tsx:99`, y el paciente queda seleccionado en la cajita indigo del autosuggest — el mismo estado visual que si lo hubiera elegido de la lista (ALTA-04). El popover se cierra. El usuario sigue derecho a fecha y tipo de turno, sin pasos extra.
- **D-08:** `profesionalId` llega por **prop explícita en `AutocompletePaciente`**, no lo resuelve el componente por su cuenta. Cada modal le pasa exactamente el mismo valor que usa para el turno:
  - `NewAppointmentModal` → `effectiveProfessionalId` (`:161`)
  - `SurgeryAppointmentModal` → `effectiveProfessionalId` (`:146`)
  - `QuickAppointment` → su prop `profesionalId` (`:151`)

  Razón: `useEffectiveProfessionalId()` devuelve `null` cuando un ADMIN/SECRETARIA está en vista global sin profesional seleccionado, y los tres modales no lo resuelven igual. Una prop mantiene una sola fuente de verdad por modal y evita que el paciente quede asignado a un profesional distinto del que lo va a atender (ALTA-06). Si el valor es `null`, se manda `profesionalId: undefined` — mismo comportamiento que `NewPacienteModal.tsx:91` (`profesionalId ?? undefined`). No se bloquea la creación: en la práctica ese caso ya está cortado aguas abajo por `NewAppointmentModal.tsx:132` ("Debe seleccionar un profesional").

### Precarga del query (ALTA-03)

- **D-09:** La regla es **"todo dígitos → DNI"**: si al query se le quitan espacios, puntos y guiones y lo que queda son sólo dígitos, precarga el campo **DNI**; cualquier otra cosa precarga **Nombre**. Casos: `30.123.456` y `30123456` → DNI; `Juan 45` y `12 de Octubre` → Nombre. Se descartó exigir largo 7-8 porque dejaría un DNI parcial (`3012`) en el campo equivocado.
- **D-10:** El DNI se normaliza a **sólo dígitos, tanto al precargar como al mandar**. `30.123.456` entra al campo como `30123456` y se envía así. Razón: el 409 de duplicado depende del índice único de Postgres — `30.123.456` y `30123456` son dos DNI distintos, y sin normalizar se puede crear un duplicado sin que ALTA-05 dispare nunca. Nota de alcance: normaliza sólo lo que se crea inline; no hay backfill de DNI históricos.
- **D-11:** El nombre se **capitaliza automáticamente al precargar** (`juan perez` → `Juan Perez`), y **sólo al precargar**. El campo queda editable y se guarda lo que el usuario deje: si corrige a `Juan de la Torre` o `Ana McCarthy`, se manda tal cual. Razón: deja la lista prolija por defecto sin pisarle la corrección al usuario en apellidos que no siguen la regla.

### Errores, foco y cierre

- **D-12:** Ruteo de errores calcado de `NewPacienteModal.tsx:104-112`: **status 409 (o mensaje que mencione "DNI") → `setError('dni')` inline bajo el campo**, conservando todo lo cargado y permitiendo corregir (ALTA-05). **Cualquier otro error → `toast.error`** con el mensaje del backend. No se introduce un slot de error genérico dentro del popover.
- **D-13:** **Escape cierra sólo el mini-form**, no el Dialog del turno. Hay que frenar la propagación del evento — por default Radix deja que Escape burbujee del Popover al Dialog, y un Escape reflejo tipeando el DNI le borraría al usuario todo el turno a medio cargar (fecha, tipo, observaciones).
- **D-14:** **Click-outside no cierra el mini-form.** Mientras está abierto, sólo se sale por Escape (D-13) o por el botón Cancelar. Requiere interceptar `onPointerDownOutside` en `PopoverContent`. Esto es exactamente lo que flaguea la nota del roadmap: *"el mini-form no debe cerrarse mientras se tipea"*.
- **D-15:** Validación cliente con **Zod local + React Hook Form + zodResolver**, acotada a los 3 campos, espejando las reglas del alta completa. **Importante — no copiar el schema literal:** `NewPacienteModal.tsx:31-35` declara `telefono: z.string().min(6, "Teléfono inválido")` **obligatorio**, y eso es justamente lo que la Phase 69 (TEL-02) va a relajar. El schema del mini-form es:
  - `nombreCompleto`: `min(3)` — igual al alta completa
  - `dni`: `min(7)` sobre el valor ya normalizado a dígitos (D-10) — igual al alta completa
  - `telefono`: **opcional**; vacío es válido, y si hay valor exige ≥6 caracteres para espejar `normalizeTelefono()` del backend (Phase 67, D-06) y no comerse un 400 evitable.

### Claude's Discretion

El usuario eligió explícitamente en las cuatro áreas — no quedaron ítems delegados. Lo que sigue abierto a criterio del planner/executor por ser detalle de implementación, no decisión de producto:

- Si el mini-form es un componente propio (ej. `InlineCreatePaciente.tsx`) o vive dentro de `AutocompletePaciente.tsx`.
- El nombre exacto de la prop que habilita la creación (el roadmap sugiere `allowCreate`) y de la prop de profesional (D-08).
- Estado visual del botón mientras el POST está en vuelo (`isPending` de `useCreatePaciente` ya está disponible).
- Si `useCreatePaciente` extiende su `onSuccess` para invalidar también `["pacientes-suggest"]` (hoy sólo invalida `["pacientes"]`, `useCreatePaciente.ts:14`). No es necesario para ALTA-04 —el paciente se selecciona con la respuesta del POST, no re-buscando— pero evita que una búsqueda inmediata posterior siga sin encontrarlo.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning
- `.planning/ROADMAP.md` §"Phase 68" — goal, 6 success criteria y las 5 notas de implementación (prop `allowCreate`, condición de apertura del popover, 409 inline, `useEffectiveProfessionalId`, foco/click-outside)
- `.planning/REQUIREMENTS.md` — ALTA-01..07 + tabla "Out of Scope" (no hacer `dni` opcional, no flag de ficha incompleta, no backfill)
- `.planning/phases/67-tel-fono-opcional-y-guards-de-env-o-backend/67-CONTEXT.md` — **contrato backend de esta fase.** D-01 (teléfono `''` → `null` en el service), D-05/D-06 (`normalizeTelefono()`, umbral ≥6 chars, ficha del paciente inline editable), y el "Contrato con la Phase 68" en su `<code_context>`

### Componente a modificar
- `frontend/src/components/AutocompletePaciente.tsx` — el archivo central. `:33` condición `showDropdown` a extender (D-02/D-03); `:84-90` `PopoverContent` donde van `onEscapeKeyDown`/`onPointerDownOutside` (D-13/D-14); `:99-124` fila de resultado, patrón visual a reusar para la fila `➕ Crear` (D-01); `:15-20` el bloque `type Props` donde entran las dos props nuevas (D-08)
- `frontend/src/components/ui/popover.tsx` — wrapper shadcn sobre `@radix-ui/react-popover`; `PopoverContent` pasa props al primitive, así que `onEscapeKeyDown`/`onPointerDownOutside` llegan sin tocar el wrapper

### Patrón de referencia — el alta completa
- `frontend/src/app/dashboard/pacientes/components/NewPacienteModal.tsx:31-44` — schema Zod. **Leer junto con D-15**: el `telefono` obligatorio de `:34` NO se replica
- `frontend/src/app/dashboard/pacientes/components/NewPacienteModal.tsx:83-95` — forma del payload de creación (D-06)
- `frontend/src/app/dashboard/pacientes/components/NewPacienteModal.tsx:97-113` — `mutate` + ruteo de errores 409 → `setError('dni')` y toast (D-07/D-12). **Este es el patrón a calcar.**

### Hooks y datos
- `frontend/src/hooks/useCreatePaciente.ts` — mutation `POST /pacientes`; invalida `["pacientes"]`, no `["pacientes-suggest"]`
- `frontend/src/hooks/usePacienteSuggest.ts` — debounce 300ms, `enabled: debounced.length > 0`, ya filtra por `profesionalId` (D-03)
- `frontend/src/hooks/useEffectiveProfessionalId.ts` — devuelve `null` para ADMIN/SECRETARIA sin profesional seleccionado (D-08)

### Call sites — habilitar la creación (ALTA-07)
- `frontend/src/app/dashboard/components/QuickAppointment.tsx:363-365` — `onSelect={(p) => setPaciente(p)}`; el profesional sale de su prop `profesionalId` (`:151`)
- `frontend/src/app/dashboard/turnos/NewAppointmentModal.tsx:214-227` — `onSelect` setea `pacienteId`/`pacienteNombre`/`fotoUrl`; profesional en `:161`; guard de profesional en `:132`
- `frontend/src/app/dashboard/turnos/SurgeryAppointmentModal.tsx:223-232` — mismo patrón; profesional en `:146`

### Call sites — NO habilitar (ALTA-07)
- `frontend/src/app/dashboard/pacientes/components/PatientFilters.tsx` — uso de filtro; queda con el default off
- `frontend/src/components/data-table/data-table-toolbar.tsx` — uso de filtro; queda con el default off

### Backend (sólo lectura — no se modifica en esta fase)
- `backend/src/modules/pacientes/pacientes.controller.ts:38, 48-51` — `POST /pacientes` con `@Auth('ADMIN','PROFESIONAL','SECRETARIA','FACTURADOR')`; los 4 roles que llegan a los modales de turno ya pueden crear, no hace falta gating extra en la UI
- `backend/src/modules/pacientes/pacientes.service.ts:54-100` — `create()`: normalización de teléfono (`:73`), defaults de CRM (`:69-70`), y el 409 `'El DNI ingresado ya está registrado.'` (`:94-96`)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`NewPacienteModal` es el molde entero de esta fase**: schema Zod + RHF, forma del payload, `mutate` con `onSuccess`/`onError`, y —lo más importante— el ruteo `409 → setError('dni')` que ALTA-05 pide (`:104-112`). No hay que inventar el manejo de duplicados, hay que reusarlo acotado a 3 campos.
- **`useCreatePaciente`** ya existe y funciona; expone `isPending` para el estado del botón. Sólo hay que decidir si extiende la invalidación de cache.
- **La fila de resultado del autosuggest** (`AutocompletePaciente.tsx:99-124`) da el estilo exacto para la fila `➕ Crear`: `<button type="button">` full-width, `hover:bg-gray-100`, ícono a la izquierda + texto. Consistencia gratis.
- **`type="button"` en todo lo clickeable dentro del popover** — el autosuggest ya lo hace en `:60` y `:101`. Crítico acá: el mini-form vive dentro del `<form>` de un modal de turno, y un botón sin `type` submitea el turno en vez de crear el paciente.

### Established Patterns
- **RHF + zodResolver** es el patrón de formularios del repo. El mini-form lo sigue (D-15) aunque sea chico.
- **Errores de negocio del backend = `BadRequestException`/`ConflictException` planos con mensaje en español**, leídos como `error.response.data.message`. No hay códigos estructurados (heredado de Phase 67, D-10) — por eso el discriminante del 409 es `status === 409 || message?.includes("DNI")`.
- **`toast` de `sonner`** para feedback de mutación (D-07).
- **Modo foco (`useUIStore`)**: `AutocompletePaciente.tsx:78` aplica variables CSS `--fc-*` al input cuando `focusModeEnabled`. Los campos nuevos del mini-form deberían recibir el mismo tratamiento para no quedar en blanco puro sobre fondo oscuro.

### Integration Points
- **`showDropdown` (`:33`)** es el único punto donde se decide si el popover abre. Hoy: `!value && query.length > 0 && (data.length > 0 || isFetching)`. Tiene que pasar a contemplar el caso "sin resultados pero puedo crear" (D-02/D-03) sin cambiar el comportamiento cuando la prop está apagada — ese es el mecanismo que hace que `PatientFilters` y `data-table-toolbar` no se enteren de nada (ALTA-07).
- **La forma del objeto que recibe `onSelect`**: los tres modales leen `pac.id`, `pac.nombreCompleto` y `pac.fotoUrl`. `POST /pacientes` devuelve el registro Prisma completo, que es un superset de eso — se puede pasar la respuesta del POST directo a `onSelect` sin adaptador (D-07/ALTA-04).
- **Popover dentro de Dialog**: los tres call sites son Dialogs de Radix. La interacción Escape/click-outside entre las dos capas es el riesgo técnico principal de la fase (D-13/D-14) y merece verificación manual en los tres modales, no sólo en uno.
- **Frontera con la Phase 69:** ambas fases tocan `AutocompletePaciente.tsx`. La 69 modifica `:121` (`Tel: {pac.telefono}` → placeholder) y la 68 toca `:15-20`, `:33` y `:84-126`. Son regiones distintas del mismo archivo — pueden ir en paralelo, pero si se ejecutan a la vez hay que esperar conflicto de merge en ese archivo.

</code_context>

<specifics>
## Specific Ideas

- **La nota del roadmap sobre la condición de apertura es correcta pero incompleta.** Dice extender `data.length > 0 || isFetching` al caso "sin resultados". No alcanza: hay una ventana de ~300ms (debounce) donde `data=[]` e `isFetching=false` **sin que se haya buscado nada todavía** — ahí "sin resultados" es mentira. De ahí el umbral de ≥3 caracteres sobre el query **debounceado** y la espera al fetch resuelto (D-03).
- **El usuario pidió explícitamente que la fila `➕ Crear` aparezca también con resultados presentes** (D-02). El roadmap sólo menciona el caso "sin resultados" (SC#1) — esto lo extiende, sin salirse de ALTA-01, porque el escenario real son los apellidos comunes.
- **Riesgo señalado y aceptado en D-11:** capitalizar automáticamente rompe `de la Torre` / `McCarthy`. Se acotó a la precarga, dejando el campo editable, así que el usuario siempre puede corregirlo antes de guardar.

</specifics>

<deferred>
## Deferred Ideas

- **Flag de "ficha incompleta"** — surgió al decidir D-06 y se descartó: no existe en el schema, agregarlo abriría la fase al backend, y REQUIREMENTS.md ya lo tiene diferido como FICHA-F01/F02.
- **Normalizar/backfillear los DNI históricos con puntos** — D-10 normaliza sólo lo que se crea inline. Si hay filas viejas con `30.123.456`, siguen siendo distintas de `30123456` para el índice único. Es una migración de datos, fuera de alcance.
- **Bloquear la creación inline cuando no hay profesional en contexto** — se evaluó en D-08 y se descartó a favor de replicar el comportamiento del alta completa (`profesionalId: undefined`).
- **Editar/completar la ficha del paciente recién creado sin salir del modal de turno** — no se pidió, y sería una capacidad nueva. Hoy se completa después desde la ficha (habilitado por Phase 67, D-05).

</deferred>

---

*Phase: 68-Creación Inline en el Autosuggest (Frontend)*
*Context gathered: 2026-08-18*
