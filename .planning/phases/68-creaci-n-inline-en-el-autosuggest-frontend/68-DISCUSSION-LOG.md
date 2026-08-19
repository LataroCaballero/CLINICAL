# Phase 68: Creación Inline en el Autosuggest (Frontend) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-18
**Phase:** 68-Creación Inline en el Autosuggest (Frontend)
**Areas discussed:** Disparo del mini-form, Campos y estado del alta, Precarga del query, Errores/foco/cierre

---

## Disparo del mini-form

### ¿Qué ve el usuario cuando la búsqueda no arroja resultados?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Fila '+ Crear' → expande | 'Sin resultados' + fila clickeable que despliega el mini-form; reusa el estilo de botón de fila existente | ✓ |
| Mini-form directo | Los campos aparecen sin click intermedio, con el que corresponda ya precargado | |
| Vos decidís | Delegado a Claude | |

**User's choice:** Fila '+ Crear' → expande
**Notes:** El usuario confirma la intención antes de ver campos; evita que el popover salte de alto apenas falla una búsqueda.

### ¿Y cuando SÍ hay resultados pero ninguno es el paciente buscado?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Sí, al final de la lista | La fila aparece siempre, pegada abajo de los resultados, dentro del scroll (max-h-60) | ✓ |
| Solo con 0 resultados | Literal a ALTA-01; sin riesgo de duplicado teniendo el paciente a la vista | |
| Sí, pero fija arriba (sticky) | Siempre visible, anclada al pie; más CSS | |

**User's choice:** Sí, al final de la lista
**Notes:** Extiende SC#1 del roadmap (que sólo menciona "sin resultados") para cubrir el caso real de apellidos comunes.

### ¿Cuándo aparece la fila, dado el debounce de 300ms?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Recién con ≥3 caracteres | Sobre el query debounceado y con el fetch resuelto; evita '+ Crear «Ju»' | ✓ |
| Apenas hay 1 carácter | Misma condición que los resultados; regla única pero ruidosa | |
| Vos decidís | Delegado a Claude | |

**User's choice:** Recién con ≥3 caracteres
**Notes:** Se le presentó la ventana de ~300ms donde `data=[]` e `isFetching=false` es indistinguible de "no existe".

### ¿Qué pasa con el input de búsqueda con el mini-form abierto?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Se congela mientras está abierto | Visible pero sin refrescar el popover; foco al primer campo vacío | ✓ |
| Sigue viva — tipear vuelve a buscar | Permite corregir un typo sin cancelar, pero puede borrar lo cargado | |
| Se reemplaza por el form | Popover más compacto; se pierde de vista qué se buscó | |

**User's choice:** Se congela mientras está abierto

---

## Campos y estado del alta

### ¿Qué campos tiene el mini-form?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Sólo Nombre + DNI | Literal a ALTA-02; cero fricción, el teléfono se completa después desde la ficha | |
| Nombre + DNI + Teléfono opcional | Tercer campo no obligatorio; evita que el paciente nazca sin canal de WhatsApp | ✓ |
| Vos decidís | Delegado a Claude | |

**User's choice:** Nombre + DNI + Teléfono opcional
**Notes:** Se le confirmó que mandar `telefono: ''` es seguro — `normalizeTelefono()` lo pasa a `null` (Phase 67, D-01).

### ¿El paciente creado inline se distingue de uno del alta completa?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Idéntico al alta completa | Mismo payload; el service ya fuerza etapaCRM NUEVO_LEAD y flujo null | ✓ |
| Marcado como ficha incompleta | Requeriría flag nuevo en schema; Out of Scope (FICHA-F01/F02 diferidos) | |
| Vos decidís | Delegado a Claude | |

**User's choice:** Idéntico al alta completa

### ¿Qué feedback ve el usuario después de crear?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Selección silenciosa | La selección ES la confirmación; un toast sobre un Dialog abierto es ruido | |
| Toast + selección | Patrón sonner ya usado en NewPacienteModal:99; deja constancia de que se creó algo | ✓ |
| Vos decidís | Delegado a Claude | |

**User's choice:** Toast + selección

### ¿De dónde sale el profesionalId cuando el contexto está en vista global?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Crea igual, sin profesional | `profesionalId: undefined`, como NewPacienteModal:91 | |
| Toma el profesional del turno | Acopla el autosuggest al form del turno vía prop | ✓ |
| Bloquea el alta inline | Garantiza ALTA-06 al costo de un callejón sin salida para el ADMIN | |

**User's choice:** Toma el profesional del turno
**Notes:** Al investigar el follow-up se encontró que en `NewAppointmentModal` y `SurgeryAppointmentModal` el profesional del turno **es** `effectiveProfessionalId` (no hay selector aparte), y que `NewAppointmentModal:132` ya corta con "Debe seleccionar un profesional" si es null. Sólo `QuickAppointment` lo recibe por prop.

### Follow-up: ¿cómo le llega el profesional al mini-form?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Prop explícita desde cada modal | Cada modal pasa el mismo valor que usa para el turno; null → undefined | ✓ |
| Prop, y sin prof. no se crea | La fila '+ Crear' desaparece sin profesional | |
| Vos decidís | Delegado a Claude | |

**User's choice:** Prop explícita desde cada modal

---

## Precarga del query

### ¿Qué regla decide DNI vs Nombre?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Todo dígitos → DNI | Tras quitar espacios/puntos/guiones; '30.123.456' → DNI, 'Juan 45' → Nombre | ✓ |
| Todo dígitos + largo 7-8 | Más preciso, pero deja un DNI parcial ('3012') en el campo equivocado | |
| Arranca con dígito → DNI | Permisivo, pero manda '12 de Octubre' a DNI | |

**User's choice:** Todo dígitos → DNI

### ¿Qué va exactamente al campo DNI si busca '30.123.456'?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Sólo dígitos, siempre | Limpia al precargar y al mandar; cierra el agujero de duplicados por formato | ✓ |
| Tal cual lo tipeó | Consistente con el alta completa, pero habilita un duplicado que no dispara el 409 | |
| Limpia al precargar, manda tal cual | Punto medio que deja el agujero abierto | |

**User's choice:** Sólo dígitos, siempre
**Notes:** Se le presentó que el 409 depende del índice único y que sin normalizar ALTA-05 nunca dispararía para el mismo DNI con otro formato.

### ¿Qué queda en el campo Nombre si buscó 'juan perez'?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Tal cual, sólo trim | Sin magia; ninguna otra parte del sistema capitaliza nombres | |
| Capitalizado automáticamente | Lista prolija, pero rompe 'de la Torre' / 'McCarthy' | ✓ |

**User's choice:** Capitalizado automáticamente

### Follow-up: ¿la capitalización es sólo al precargar o también al guardar?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Sólo al precargar | Campo editable; se guarda lo que el usuario deje | ✓ |
| También al guardar | Garantiza formato pero pisa la corrección del usuario | |

**User's choice:** Sólo al precargar
**Notes:** Este follow-up acota el riesgo de apellidos con partículas señalado en la pregunta anterior.

---

## Errores, foco y cierre

### ¿Cómo se rutean los errores?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| 409 inline, el resto por toast | Calcado de NewPacienteModal:104-112 | ✓ |
| Todo inline en el form | Nunca se pierde contexto, pero requiere un slot de error que hoy no existe | |
| Vos decidís | Delegado a Claude | |

**User's choice:** 409 inline, el resto por toast

### ¿Qué hace Escape con el mini-form abierto?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Cierra sólo el mini-form | Requiere frenar la propagación al Dialog (Radix la deja burbujear) | ✓ |
| Cierra el Dialog entero | Default de Radix, cero código, pero borra el turno a medio cargar | |
| Vos decidís | Delegado a Claude | |

**User's choice:** Cierra sólo el mini-form

### ¿Y un click fuera del popover con datos cargados?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| El form no se cierra | Sólo Escape o Cancelar; requiere interceptar onPointerDownOutside | ✓ |
| Se cierra descartando | Predecible, pero es el accidente que el roadmap quiere evitar | |
| Se cierra pero recuerda | Estado de borrador que sobrevive al cierre | |

**User's choice:** El form no se cierra
**Notes:** Alineado con la nota del roadmap: "el mini-form no debe cerrarse mientras se tipea".

### ¿Qué valida el mini-form antes del POST?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Zod local, calcado del alta completa | RHF + zodResolver acotado a 3 campos | ✓ |
| Mínimo: campos no vacíos | Más liviano, pero un DNI de 3 dígitos vuelve como error genérico | |
| Vos decidís | Delegado a Claude | |

**User's choice:** Zod local, calcado del alta completa
**Notes:** Se le advirtió que el schema de `NewPacienteModal:34` tiene `telefono` **obligatorio** (min 6) y que eso es justo lo que la Phase 69 va a relajar — el mini-form no puede copiarlo literal.

---

## Claude's Discretion

El usuario eligió explícitamente en las cuatro áreas; ninguna pregunta terminó en "Vos decidís". Lo delegado por ser detalle de implementación (documentado en CONTEXT.md):

- Si el mini-form es componente propio o vive dentro de `AutocompletePaciente.tsx`
- Nombres exactos de las props nuevas (`allowCreate`, prop de profesional)
- Estado visual del botón durante el POST (`isPending`)
- Si `useCreatePaciente` extiende su invalidación a `["pacientes-suggest"]`

## Deferred Ideas

- Flag de "ficha incompleta" (surgió en la pregunta de estado del alta) — Out of Scope, FICHA-F01/F02 ya diferidos
- Normalización/backfill de DNI históricos con puntos — migración de datos, fuera de alcance
- Bloquear la creación inline sin profesional en contexto — evaluado y descartado
- Completar el resto de la ficha sin salir del modal de turno — capacidad nueva, no pedida
