# Phase 69: Consistencia de Teléfono Opcional (Frontend) - Context

**Gathered:** 2026-08-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Un paciente sin teléfono se ve y se comporta bien en toda la app, no sólo en el flujo de alta inline. Tres frentes:

1. **TEL-02** — el alta completa (`NewPacienteModal`) permite guardar sin cargar teléfono.
2. **TEL-03** — los sitios que muestran teléfono de paciente renderizan un placeholder legible en vez de vacío o `null`.
3. **ENVIO-03** — los controles de envío por WhatsApp quedan deshabilitados con tooltip explicativo cuando el paciente no tiene número.

**Fuera de esta fase:**
- Backend de teléfono nullable y guards de envío — ya cerrado en Phase 67 (`telefono String?`, `normalizeTelefono()`, `requireTelefonoParaEnvio()` en los 5 entrypoints).
- Creación inline en el autosuggest — Phase 68.
- Guard de teléfono en la lista de acción CRM / contacto rápido del kanban (ENVIO-F01) y email como canal alternativo (ENVIO-F02) — diferidos en REQUIREMENTS.md.
- Flag de "ficha incompleta" (FICHA-F01/F02) — diferido.

**Excepción acotada y deliberada al "(Frontend)" del título:** D-13 requiere **una línea de backend** (`turnos.service.ts`, ensanchar un `select`). Ver D-13 y `<specifics>`.

</domain>

<decisions>
## Implementation Decisions

**Nota de origen:** el usuario delegó explícitamente las cuatro áreas de decisión ("quiero que decidas todo vos con las mejores opciones"). **Todas las decisiones D-01..D-16 son Claude's Discretion**, tomadas contra el código real verificado durante el scout. No son preguntas abiertas para el planner — están cerradas. Ver `### Claude's Discretion` al final para lo que sí queda a criterio del planner.

### Placeholder de teléfono ausente (TEL-03)

- **D-01: El placeholder es `-` (guion simple), no `—` (em dash).** REQUIREMENTS.md TEL-03 dice *"(ej. '—')"* — es un ejemplo, no un contrato. El repo ya renderiza `-` en sus dos vistas de paciente más transitadas: `PacienteDetails.tsx:186` (`{paciente.telefono || "-"}`) y `DatosPacienteTab.tsx:198` (ídem). Introducir `—` obligaría a tocar esos dos sitios sólo para no quedar inconsistentes, o a convivir con dos glifos. Se adopta el que ya existe.
- **D-02: El placeholder vive en un solo helper compartido, y los dos sitios existentes se migran a él.** Un `formatTelefono(value: string | null | undefined): string` que aplica el criterio de Phase 67 D-03 (**falsy tras trim**) y devuelve `-`. Los `|| "-"` inline de hoy usan `||` crudo, que **no** cubre `"   "` (sólo espacios) — un caso que 67 D-03 sí considera "sin teléfono" y que puede existir en filas históricas. Migrarlos cierra esa divergencia y deja una sola definición del placeholder, en el mismo espíritu de 67 D-06 (una sola definición de "teléfono válido"). Ubicación sugerida: `frontend/src/lib/utils.ts`.
- **D-03: En el autosuggest se cae el segmento entero, no se muestra `Tel: -`.** `AutocompletePaciente.tsx:190` hoy es `DNI: {pac.dni} — Tel: {pac.telefono}`. Sin número queda `DNI: 30123456` a secas (se va también el separador `—`). Razón: es un subtítulo de un renglón dentro de un popover angosto, y es el único de los sitios de display donde el dato no es accionable (no se puede llamar ni escribir desde ahí) — gastar ancho para decir "no hay dato" no aporta. Ojo: ese `—` es un **separador**, no el placeholder de D-01; no se confunden.
- **D-04: En la lista de espera no se renderiza un link `tel:` roto.** `ListaEsperaSheet.tsx:90-97` envuelve el teléfono en `<a href={`tel:${p.telefono}`}>`. Sin número, se renderiza un `<span>` inerte con el mismo ícono `Phone` en gris y el placeholder de D-01 — nunca el `<a>`. Un `href="tel:null"` abre el discador del sistema con basura. Se conserva el ícono para que la fila no cambie de alto ni de layout.
- **D-05: En reportes el placeholder entra por `render`, sin tocar el componente genérico.** `TablaReporte.tsx:100` hace `{col.render ? col.render(value, row) : value}` — un `null` renderiza **celda vacía**, exactamente lo que SC#3 prohíbe. Se agrega `render: (v) => formatTelefono(v)` a las **tres** columnas de teléfono: `reportes/financieros/cuentas/page.tsx:33` (cuentas por cobrar), `:60` (morosidad) y `reportes/operativos/ausentismo/page.tsx:26`. **`TablaReporte.tsx` no se modifica** — lo consumen ~6 reportes y un default global cambiaría columnas ajenas.
- **D-06: La tabla de pacientes no muestra teléfono — no hay nada que hacer ahí.** Verificado: `pacientes/components/columns.tsx` tiene 10 columnas (nombre, obra social, diagnóstico, tratamiento, presupuesto, estado, flujo, último turno, próximo turno, objeción) y **ninguna de teléfono**. La única referencia en la capa de tabla es `data-table/data-table.tsx:119` (`paciente.telefono?.toLowerCase().includes(text)`), que es el **filtro de búsqueda global**, no display, y ya es null-safe por el `?.` — se deja tal cual. **El planner no debe inventar una columna de teléfono** para satisfacer SC#3: el criterio se cumple en ficha + reportes. Ver `<specifics>` — la nota del roadmap que nombra `columns.tsx` está mal atribuida.
- **D-07: Los tipos TS se ensanchan a `string | null`, espejando lo que la Phase 67 hizo en backend.** Sitios: `types/pacients.ts:6` (`PacienteListItem`), `types/pacients.ts:38` (`PacienteDetalle`), `hooks/useReportesFinancieros.ts:60` (`CuentaPorCobrar`), `hooks/useReportesFinancieros.ts:77` (`CuentaMorosa`), `types/reportes.ts:84` (`PacienteAusentista`), `hooks/useListaEspera.ts:7` (`PacienteListaEspera`). **Sin `as any` y sin placeholders en el tipo** (mismo criterio que 67 D-04 / plan 67-04). Si el compilador rompe en un sitio no listado acá, ese sitio es un **hallazgo de la fase**, no un obstáculo: se resuelve con el helper de D-02 y se registra en el SUMMARY.

### Formularios de teléfono (TEL-02 + consistencia de edición)

- **D-08: `NewPacienteModal` calca el schema del mini-form de la Phase 68 (68 D-15).** Concretamente en `pacientes/components/NewPacienteModal.tsx`:
  - `:34` `telefono: z.string().min(6, "Teléfono inválido")` → **opcional**: vacío es válido; si hay valor, exige ≥6 caracteres, para espejar `normalizeTelefono()` del backend (67 D-06) y no comerse un 400 evitable.
  - `:170` el label pierde el `<span className="text-destructive">*</span>` y gana `(opcional)`, siguiendo cómo el modal marca hoy sus otros campos no obligatorios.
  - `:87` **`telefono: data.telefono.trim()` explota con `undefined`** — pasa a `data.telefono?.trim() ?? ""`. Mandar `""` es seguro: 67 D-01 lo normaliza a `null` en el service.
  - `:70` el `defaultValues: { telefono: "" }` se deja como está — `""` sigue siendo el estado inicial correcto.
- **D-09: El bloque Contacto de la ficha (`DatosCompletos.tsx:106`) SÍ entra en la fase.** Hoy declara `telefono: z.string().min(6, "Teléfono inválido").max(20, "Teléfono inválido")` **obligatorio**. La Phase 67 D-05 relajó `updateContacto` en el backend *justamente* para que un paciente sin teléfono pudiera editar su sección Contacto — pero el Zod del cliente lo sigue bloqueando, así que ese trabajo hoy es invisible. Sin este cambio, un paciente creado inline (Phase 68) **no puede corregir su email sin inventar un teléfono**. Se relaja con la misma regla de D-08 (vacío válido; con valor, 6–20 chars). No es capacidad nueva: SC#3 nombra `DatosCompletos.tsx` explícitamente y esto es literalmente "consistencia de teléfono opcional en frontend".
  - `telefonoAlternativo` (`:107`) **no se toca** — ya es `.optional().nullable()`.
  - Los seeds `paciente.telefono ?? ""` de `:27` y `:185` ya son null-safe; se dejan.
- **D-10: `PatientFormModal.tsx` no se toca — verificado como no-op.** Su campo teléfono (`:96`) es un `<Input>` suelto sobre `form.telefono`, inicializado con `editData?.telefono || ""` (`:33`) y sin validación de largo. Ya acepta vacío. Se deja constancia para que el planner no lo audite dos veces.

### Alcance de los controles de WhatsApp deshabilitados (ENVIO-03)

- **D-11: El guard va en 4 archivos / 5 controles. La lista es cerrada.**
  1. `pacientes/components/PacienteDetails.tsx:311-328` — botón "WhatsApp" de la grilla de acciones de la ficha.
  2. `turnos/AppointmentDetailModal.tsx:367-386` — atajo "WhatsApp" del detalle de turno.
  3. `patient/PatientDrawer/views/PresupuestosView.tsx:213-245` — "Enviar por WhatsApp" del presupuesto (contraparte UI de ENVIO-02).
  4. `whatsapp/WAThreadView.tsx` — **dos controles en el mismo archivo**: el botón "Enviar mensaje"/template (`:205-243`) y el par `Textarea` + botón `Send` de free-text (`:254`, `:268`). Ambos ya están gateados por `whatsappOptIn`; el teléfono se suma al mismo predicado.
  - **`whatsapp/SendWAMessageModal.tsx` queda explícitamente fuera y no lleva guard propio.** Sólo se abre desde (1) y (2), que ya lo bloquean aguas arriba; no recibe el teléfono ni tiene trigger propio. Un guard ahí sería defensa muerta y obligaría a plumbear el dato por tercera vez.
- **D-12: Un solo predicado, al lado del de D-02.** `tieneTelefono(value) = !!value?.trim()` — mismo criterio *falsy tras trim* de 67 D-03, misma semántica que usa el placeholder. **No mira `telefonoAlternativo`** (67 D-04: no es canal de envío). Vive junto a `formatTelefono` para que placeholder y guard nunca puedan divergir.
- **D-13: El dato se plumbea replicando exactamente el recorrido que ya hace `whatsappOptIn`. Sin queries nuevas en el frontend.**
  - **`PacienteDetails`** — ya tiene `paciente.telefono` en scope (lo usa en `:186`). Cero plumbing.
  - **`PresupuestosView`** — prop nueva `pacienteTelefono?: string | null`, pasada desde `pacientes/components/PatientDrawer.tsx:131-137`, en la línea de al lado de `pacienteOptIn`. El objeto `paciente` del drawer ya trae el campo.
  - **`WAThreadView`** — misma cadena que `whatsappOptIn` hoy: `PatientDrawer.tsx:141-146` → `MensajesView.tsx` → `WAThreadView.tsx`. Tres firmas, un valor.
  - **`AppointmentDetailModal`** — el más largo, y el único con **una línea de backend**:
    - `backend/src/modules/turnos/turnos.service.ts:567-572` — el `select` de `paciente` dentro de `obtenerTurnosPorRango` trae hoy `id`, `nombreCompleto` y `whatsappOptIn`, **no `telefono`**. Verificado leyendo el código: sin este cambio el guard deshabilitaría el botón para **todos** los pacientes, incluidos los que sí tienen número. Se agrega `telefono: true`. Es un ensanchamiento aditivo de un `select`, no rompe ningún contrato.
    - `frontend/src/app/dashboard/turnos/CalendarGrid.tsx:15-28` — `telefono?: string | null` en `CalendarEvent`.
    - `frontend/src/app/dashboard/turnos/AppointmentDetailModal.tsx:56` — mismo campo en su `Props`.
    - `frontend/src/app/dashboard/turnos/page.tsx:290` — poblarlo en el mapeo: `telefono: t.paciente?.telefono ?? null`, inmediatamente al lado de la línea de `whatsappOptIn`.
  - **Regla para el planner:** este orden importa. El backend y el mapeo van **antes** que el guard visual, o el botón queda deshabilitado para todo el mundo en el estado intermedio.

### Tooltip: texto y precedencia con el opt-in existente (ENVIO-03)

- **D-14: Precedencia — el teléfono gana.** Si falta el teléfono, el tooltip dice lo del teléfono, **tenga o no opt-in**. Si hay teléfono y falta el opt-in, sigue apareciendo el texto actual, sin cambios. Razón: son dos bloqueos con acciones distintas y el teléfono es el prerequisito — pedirle opt-in a un paciente al que no podés escribirle no destraba nada. Un mensaje combinado obliga a leer dos frases para descubrir cuál arreglar primero.
- **D-15: Un motivo por vez, y calculado en un solo lugar.** El tooltip conserva su forma actual (una frase corta dentro de `TooltipContent`, sin layout ni lista). Se implementa como una función que devuelve `string | null`: `null` → control habilitado y **sin** `TooltipContent`; string → control deshabilitado con esa frase. Los 4 archivos de D-11 repiten hoy la frase del opt-in **literal**; centralizar el motivo evita crear una quinta copia divergente. Vive junto a `tieneTelefono` (D-12).
- **D-16: Texto exacto: `"El paciente no tiene teléfono cargado"`.** Espeja el registro del mensaje que ya existe (`"El paciente no tiene opt-in para WhatsApp"`): sujeto "El paciente", presente, frase corta, sin instrucciones. **Deliberadamente más corto que el del backend** (`whatsapp.service.ts:194`: *"El paciente no tiene un número de teléfono cargado. Agregá un teléfono en su ficha para poder enviarle mensajes de WhatsApp."*). Dos razones: un tooltip no es un toast y no tiene lugar para dos oraciones; y en `PacienteDetails` el usuario **ya está parado en la ficha**, así que "agregá un teléfono en su ficha" sería absurdo ahí. El mensaje largo del backend queda como está — es la red de seguridad de 67 D-10 para un caso que esta fase deja de dejar llegar.
- **D-17: El patrón visual se reusa tal cual, no se rediseña.** `Tooltip > TooltipTrigger asChild > <span> > <Button disabled>` + `TooltipContent` condicional. El `<span>` intermedio **es obligatorio** — un `<Button disabled>` no dispara eventos de puntero, así que sin el wrapper el tooltip nunca aparece. Los 4 sitios ya lo hacen bien; se copia, no se toca.

### Claude's Discretion

El usuario delegó las cuatro áreas completas, por lo que D-01..D-17 ya son mi criterio y están **cerradas**. Lo que queda genuinamente abierto al planner/executor, por ser detalle de implementación:

- Nombres exactos y archivo de los tres helpers (`formatTelefono`, `tieneTelefono`, y el que resuelve el motivo del tooltip). Sugerido `frontend/src/lib/utils.ts`; un `lib/telefono.ts` propio también es razonable si el planner prefiere agruparlos.
- Nombre exacto de las props nuevas (`pacienteTelefono` vs `telefono`) en `PresupuestosView`, `MensajesView`/`WAThreadView` y `AppointmentDetailModal`.
- Si el motivo del tooltip se calcula en el componente o se pasa ya resuelto desde el padre.
- Cómo se expresa el "opcional" en el label de `NewPacienteModal` (texto `(opcional)` vs sólo quitar el asterisco), siempre que quede visible que no es obligatorio.
- Si se agregan tests. No hay suite de tests de frontend establecida en el repo (`TESTING.md` del mapa de codebase es la referencia); la verificación esperada es manual sobre los criterios de éxito.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning
- `.planning/ROADMAP.md` §"Phase 69: Consistencia de Teléfono Opcional (Frontend)" — goal, 4 criterios de éxito y notas de implementación. **Leer junto con D-06 y `<specifics>`: la lista de sitios de display de esas notas contiene un error de atribución.**
- `.planning/REQUIREMENTS.md` — TEL-02 (línea 13), TEL-03 (línea 14), ENVIO-03 (línea 30) + tabla "Out of Scope"
- `.planning/phases/67-tel-fono-opcional-y-guards-de-env-o-backend/67-CONTEXT.md` — **contrato backend de esta fase.** D-01 (`""` → `null` en el service), **D-03 (criterio *falsy tras trim*, el mismo que usa toda esta fase)**, D-04 (`telefonoAlternativo` no es canal de envío), D-05/D-06 (`normalizeTelefono()`, umbral ≥6, ficha editable sin teléfono), D-10 (forma del error de backend). Su `<code_context>` tiene la sección "Contrato con la Phase 69".
- `.planning/phases/68-creaci-n-inline-en-el-autosuggest-frontend/68-CONTEXT.md` — **D-15 es el molde del schema Zod de D-08/D-09.** Su `<code_context>` documenta la frontera de archivos con esta fase.

### TEL-03 — sitios de display (los 5 reales)
- `frontend/src/components/AutocompletePaciente.tsx:190` — `DNI: {pac.dni} — Tel: {pac.telefono}` (D-03). La Phase 68 ya tocó `:17-29`, `:38-58` y la zona del popover; **esta línea es la única región de esta fase en ese archivo**
- `frontend/src/app/dashboard/pacientes/components/PacienteDetails.tsx:186` — `{paciente.telefono || "-"}`, migra al helper (D-02)
- `frontend/src/components/live-turno/tabs/DatosPacienteTab.tsx:198` — `{paciente.telefono || '-'}`, ídem (D-02). `:204` `telefonoAlternativo` no se toca
- `frontend/src/components/crm/ListaEsperaSheet.tsx:90-97` — `<a href={`tel:${p.telefono}`}>` (D-04)
- `frontend/src/app/dashboard/reportes/financieros/cuentas/page.tsx:33, 60` y `frontend/src/app/dashboard/reportes/operativos/ausentismo/page.tsx:26` — columnas `{ key: "telefono", header: "Teléfono" }` (D-05)
- `frontend/src/app/dashboard/reportes/components/TablaReporte.tsx:19, 100` — firma de `render?: (value, row) => ReactNode` y el punto donde un `null` cae en celda vacía. **Sólo lectura — no se modifica** (D-05)

### TEL-03 — sitios verificados que NO se tocan
- `frontend/src/app/dashboard/pacientes/components/columns.tsx` — 10 columnas, **ninguna de teléfono** (D-06)
- `frontend/src/components/data-table/data-table.tsx:119` — filtro de búsqueda global, ya null-safe con `?.` (D-06)

### TEL-02 — formularios
- `frontend/src/app/dashboard/pacientes/components/NewPacienteModal.tsx:34, 70, 87, 167-180` — schema Zod, defaults, payload y el bloque del campo (D-08). **`:87` es el crash latente**
- `frontend/src/components/patient/PatientDrawer/views/DatosCompletos.tsx:106-107, 185-186, 203-212, 588-608` — schema Zod del bloque Contacto, seeds y submit (D-09)
- `frontend/src/app/dashboard/pacientes/components/PatientFormModal.tsx:33, 95-96` — verificado no-op (D-10)

### ENVIO-03 — controles de envío
- `frontend/src/app/dashboard/pacientes/components/PacienteDetails.tsx:311-328` — patrón de referencia completo (Tooltip + span + Button disabled + TooltipContent condicional)
- `frontend/src/app/dashboard/turnos/AppointmentDetailModal.tsx:56, 367-386` — Props + control
- `frontend/src/components/patient/PatientDrawer/views/PresupuestosView.tsx:59, 213-245` — Props + control; el POST es `api.post('/whatsapp/presupuesto/{id}/send')` inline
- `frontend/src/components/whatsapp/WAThreadView.tsx:26-32, 205-243, 250-272` — Props + los dos controles (template y free-text)
- `frontend/src/components/whatsapp/SendWAMessageModal.tsx:23-28` — **fuera de alcance con razón** (D-11)

### ENVIO-03 — cadena de plumbing (D-13)
- `backend/src/modules/turnos/turnos.service.ts:561-587` — `select` de `obtenerTurnosPorRango`. **Falta `telefono: true` en `paciente.select` (`:567-572`) — única línea de backend de la fase**
- `backend/src/modules/turnos/turnos.controller.ts:122-139` — `GET /turnos/rango`, sin cambios
- `frontend/src/app/dashboard/turnos/page.tsx:281-300` — mapeo `turnos → CalendarEvent`; `:290` es la línea de `whatsappOptIn` junto a la que va el teléfono
- `frontend/src/app/dashboard/turnos/CalendarGrid.tsx:15-28` — `interface CalendarEvent`
- `frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx:129-146` — pasa `pacienteOptIn` a `PresupuestosView` y `whatsappOptIn` a `MensajesView`; **el mismo lugar donde entra el teléfono**
- `frontend/src/components/patient/PatientDrawer/views/MensajesView.tsx:8, 12-20` — eslabón intermedio hacia `WAThreadView`

### Tipos a ensanchar (D-07)
- `frontend/src/types/pacients.ts:6, 38`
- `frontend/src/types/reportes.ts:84`
- `frontend/src/hooks/useReportesFinancieros.ts:60, 77`
- `frontend/src/hooks/useListaEspera.ts:7`

### Backend (sólo lectura, salvo la línea de D-13)
- `backend/src/modules/whatsapp/whatsapp.service.ts:183-197` — `requireTelefonoParaEnvio()`, el criterio *falsy tras trim* y el mensaje largo que **no** se replica en el tooltip (D-16)
- `backend/src/modules/pacientes/pacientes.service.ts` — `normalizeTelefono()` (67 D-01/D-06), el contrato que espejan D-08 y D-09

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **El patrón de botón WA deshabilitado ya existe y está repetido 4 veces**, siempre igual: `Tooltip > TooltipTrigger asChild > <span> > <Button disabled={...}>` con `TooltipContent` renderizado condicionalmente. Esta fase **no inventa nada visual** — extiende el predicado del `disabled` y el texto del `TooltipContent`. Es el caso ideal de "enriquecer, no reemplazar".
- **Los dos `|| "-"` existentes** (`PacienteDetails.tsx:186`, `DatosPacienteTab.tsx:198`) fijan el glifo del placeholder sin discusión (D-01) y, al migrarlos al helper, cierran gratis el agujero de `"   "`.
- **`TablaReporte`** ya tiene el hook de escape que hace falta: `render?: (value, row) => ReactNode` (`:19`), aplicado en `:100`. No hay que modificar el componente genérico para cumplir SC#3.
- **El mini-form de la Phase 68** (`InlineCreatePaciente.tsx`) ya resolvió el schema Zod de teléfono opcional contra el backend real. D-08 y D-09 lo copian en vez de re-derivarlo.

### Established Patterns
- **Un solo predicado compartido para "sin teléfono".** Phase 67 D-06 estableció que el umbral de teléfono válido vive en un único helper del backend; esta fase hace lo simétrico en el frontend (D-02/D-12), y placeholder y guard salen del mismo lugar por construcción.
- **`whatsappOptIn` se plumbea a mano por props, no por un hook de contexto.** Es el patrón vigente en las cuatro cadenas. El teléfono lo replica exactamente — no se introduce un store ni un fetch por componente.
- **Los mensajes de bloqueo de UI son frases cortas en español dentro de `TooltipContent`**, sin códigos ni layout. D-16 se ajusta a ese registro.
- **Sin tests de frontend en el repo.** La verificación de esta fase es manual contra los 4 criterios de éxito del roadmap.

### Integration Points
- **`obtenerTurnosPorRango` es el único riesgo de datos de la fase.** Su `select` no trae `telefono` (verificado en `turnos.service.ts:567-572`). Si el guard visual se implementa antes que el ensanche del `select` + el mapeo, el botón de WhatsApp del calendario queda deshabilitado para **todos** los pacientes — un falso negativo total, no un caso borde. El orden de tareas del plan tiene que reflejarlo (D-13).
- **Frontera con la Phase 68 en `AutocompletePaciente.tsx`:** la 68 tocó `:17-29` (Props), `:38-58` (estado y `canOfferCreate`) y la zona del popover/`InlineCreatePaciente`. Esta fase toca **sólo `:190`**. Regiones disjuntas; la 68 ya está ejecutada, así que no hay riesgo de conflicto — sí conviene releer la línea antes de editar por si el número corrió.
- **`DatosCompletos.tsx` es el punto donde el trabajo de la Phase 67 se vuelve visible o no.** D-09 es lo que convierte 67 D-05 (backend relajado) en comportamiento observable. Si se omite, la 67 queda con trabajo muerto y un paciente creado inline no puede editar su contacto.
- **`PatientDrawer.tsx:129-146` es un único punto de entrada para dos de las cuatro cadenas** (presupuestos y mensajes). Un cambio ahí alimenta ambas.

</code_context>

<specifics>
## Specific Ideas

- **La nota de implementación del roadmap para la Phase 69 nombra `columns.tsx` como sitio de display de teléfono, y no lo es.** Verificado: la tabla de pacientes tiene 10 columnas y ninguna de teléfono; la única referencia en esa capa es el filtro de búsqueda de `data-table.tsx:119`, que ya es null-safe. El criterio de éxito #3 ("la lista de pacientes... renderiza el placeholder") se satisface en la ficha y en los reportes. **El planner no debe agregar una columna de teléfono para "cumplir" el criterio** — sería scope creep disfrazado de compliance. Es el mismo tipo de error de atribución que la Phase 67 encontró en sus propias notas (`pacientes.service.ts:436` atribuido al portal).
- **La nota del roadmap tampoco menciona los dos sitios que sí importan y no son obvios:** `ListaEsperaSheet.tsx:90-97` (link `tel:` roto, D-04) y `TablaReporte.tsx:100` (celda vacía en vez de "null", D-05). Ambos entran.
- **El título dice "(Frontend)" pero la fase lleva una línea de backend.** `turnos.service.ts:567-572` tiene que ensanchar su `select`. Es aditivo y necesario: sin eso, el criterio de éxito #4 se cumple "de mentira" en el calendario (el botón se deshabilita, pero para todos). Decisión consciente de incluirlo en vez de sacar el calendario del alcance — es el entrypoint de envío más transitado.
- **El mensaje del tooltip diverge a propósito del mensaje del backend** (D-16). No es una inconsistencia a corregir en review: el del backend es una oración con instrucción, pensada para un toast; el del tooltip es una etiqueta de una línea, y en la ficha la instrucción sería redundante.

</specifics>

<deferred>
## Deferred Ideas

Ninguna idea nueva surgió — el usuario delegó las decisiones sin abrir alcance. Lo que rozó la conversación y sigue afuera:

- **ENVIO-F01** (guard de teléfono en la lista de acción CRM y en el contacto rápido del kanban) — rozado al cerrar la lista de D-11. Esos son entrypoints de *contacto*, no de *envío por WhatsApp*, y siguen diferidos en REQUIREMENTS.md.
- **ENVIO-F02** (email como canal alternativo cuando no hay teléfono) — rozado al reafirmar 67 D-04. Sigue diferido.
- **Guard en `SendWAMessageModal`** — evaluado en D-11 y descartado como defensa muerta. Si algún día ese modal gana un trigger propio (fuera de la ficha y del detalle de turno), hay que revisitarlo.
- **Migrar el mensaje del tooltip de opt-in a la misma función centralizada de D-15** — se hace, pero acotado a los 4 archivos de D-11. No se sale a buscar otras repeticiones de texto de bloqueo en la app.
- **Un `formatTelefono` que además formatee el número** (separadores, prefijo país) — no se pidió y cambiaría el dato mostrado en pacientes que sí tienen teléfono. El helper sólo resuelve ausencia.
- **FICHA-F01 / F02** (vista e indicador de ficha incompleta) — un paciente sin teléfono es hoy indistinguible de uno completo salvo por el `-`. Sigue diferido.

</deferred>

---

*Phase: 69-Consistencia de Teléfono Opcional (Frontend)*
*Context gathered: 2026-08-20*
