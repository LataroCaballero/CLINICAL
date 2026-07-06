# Phase 41: Tipo de Entrada en Historia Clínica - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Al cerrar una sesión de consulta, el profesional clasifica el "tipo de consulta" realizada vía un selector en `HCCreatorForm`, y el sistema actualiza el flujo del paciente (`Paciente.flujo`) y su etapa CRM según esa clasificación. Esto materializa el principio de "clasificación tardía" de v1.8: el tipo de turno "Consulta" tiene `flujoPaciente = NULL` (Phase 40), así que agendar NO clasifica — la clasificación ocurre al guardar/cerrar la entrada de HC vía `tipoEntrada`.

Alcance fijo:
- Nuevo campo `tipoEntrada` en la entrada de HC con enum: `CONSULTA_CIRUGIA`, `TRATAMIENTO`, `CONTROL`, `SEGUIMIENTO`, `PREOPERATORIO` (HC-01)
- Selector "Tipo de consulta" obligatorio en `HCCreatorForm` (HC-02)
- Lógica de transición de flujo según `tipoEntrada` (HC-03, HC-04)

NO incluye: estado dual / TratamientosTab (Phase 42), archivado del embudo CRM (Phase 43).

</domain>

<decisions>
## Implementation Decisions

### Selector "Tipo de consulta" — relación con botones de plantilla existentes
- El form YA tiene botones de plantilla (`primera_vez`/Primera Consulta, `pre_quirurgico`/Pre Quirúrgico, `control`/Control, `tratamiento_en_consultorio`/Tratamiento en Consultorio, más `libre`/`practica`). Esos botones eligen **qué plantilla/formulario renderizar** — son un eje distinto al nuevo `tipoEntrada`.
- El `tipoEntrada` se **auto-deriva** del botón de plantilla elegido, pero se muestra como un **selector visible y editable**, pre-cargado con el valor derivado (cumple HC-02 "selector obligatorio" y permite override manual).
- **Mapeo plantilla → tipoEntrada (default):**
  - Primera Consulta (`primera_vez`) → `CONSULTA_CIRUGIA`
  - Pre Quirúrgico (`pre_quirurgico`) → `PREOPERATORIO`
  - Control (`control`) → `CONTROL`
  - Tratamiento en Consultorio (`tratamiento_en_consultorio`) → `TRATAMIENTO`
  - Entradas libres / práctica (`libre`, `practica`) → `CONTROL` (default seguro, no-op de flujo, editable)
- `SEGUIMIENTO` no tiene plantilla asociada — solo se alcanza eligiéndolo manualmente en el selector.
- Opciones del selector (labels visibles, 5): "Consulta para cirugía", "Tratamiento", "Control", "Seguimiento", "Pre-operatorio".

### Reglas de transición de flujo (driven by tipoEntrada)
- `CONSULTA_CIRUGIA`: si `paciente.flujo === PENDIENTE` → `flujo = CIRUGIA` (HC-03)
- `TRATAMIENTO`: si `paciente.flujo === PENDIENTE` → `flujo = TRATAMIENTO`; si `paciente.flujo === CIRUGIA` → **sin cambio** (dual-state preservado, HC-04)
- `CONTROL`, `SEGUIMIENTO`, `PREOPERATORIO`: **no-op total** de flujo — solo se registran en la HC, no tocan `flujo` ni `etapaCRM`.

### Interacción con etapaCRM
- La lógica existente de `etapaCRM` en `cerrarSesion` se mantiene igual que hoy: `TURNO_AGENDADO → CONSULTADO` para turnos no-cirugía, y `PROCEDIMIENTO_REALIZADO` para `esCirugia = true`.
- Phase 41 NO reimplementa esa transición — el avance a `CONSULTADO` descrito en HC-03 ya ocurre vía la rama existente cuando `etapaCRM === TURNO_AGENDADO`.

### Turnos con esCirugia = true
- Si el turno tiene `esCirugia = true`, la nueva lógica de flujo basada en `tipoEntrada` **se omite por completo** — la rama existente `PROCEDIMIENTO_REALIZADO` prevalece. La clasificación `tipoEntrada` solo afecta `flujo` en turnos NO-cirugía (criterio 5).

### Comportamiento en PatientDrawer (sin turno)
- El selector aparece en `HCCreatorForm` tanto en LiveTurno como en PatientDrawer (criterio 1).
- En PatientDrawer (no hay turno ni `cerrarSesion`), guardar una entrada **también aplica el cambio de flujo** según `tipoEntrada` (CONSULTA_CIRUGIA / TRATAMIENTO). PatientDrawer NO cambia `etapaCRM` (no tiene turno asociado).

### Split de lógica flujo vs etapaCRM (arquitectura)
- **Cambio de flujo** (`PENDIENTE → CIRUGIA/TRATAMIENTO`): vive en `crearEntrada` (historia-clinica.service.ts) — punto único que usan AMBOS contextos (PatientDrawer y LiveTurno crean la entrada por el mismo endpoint). Sin duplicación.
- **etapaCRM + PROCEDIMIENTO_REALIZADO**: quedan en `cerrarSesion` (turnos.service.ts) — necesitan el turno.
- En LiveTurno la entrada se crea segundos antes de `cerrarSesion`, así que el resultado para el usuario es idéntico a "al cerrar sesión".
- **Guard esCirugia en crearEntrada:** cuando `dto.turnoId` está presente, `crearEntrada` debe verificar `turno.esCirugia` y omitir el cambio de flujo si es `true`. Sin `turnoId` (PatientDrawer), el flujo aplica directo según `tipoEntrada`.

### Claude's Discretion
- Storage exacto de `tipoEntrada`: columna Prisma dedicada en `HistoriaClinicaEntrada` vs dentro del JSONB `contenido`. HC-01 dice "campo `tipoEntrada`" → se recomienda columna real (enum) para queryability y para que `cerrarSesion`/`crearEntrada` lo lean limpio, pero queda a discreción del planner.
- Nombre exacto del nuevo enum Prisma (sugerido `TipoEntradaHC` para evitar colisión con el `TipoEntrada` de plantilla del frontend).
- Componente UI exacto del selector (Select de shadcn vs RadioGroup vs botones).
- Forma de extraer la lógica de transición de flujo en un helper compartido.

</decisions>

<specifics>
## Specific Ideas

- **⚠ Colisión de nombres a evitar:** ya existe un tipo `TipoEntrada` en el frontend (`useCreateHistoriaClinicaEntry.ts`) y un campo `tipo` en `CreateEntradaDto`/`contenido` con valores `primera_vez | pre_quirurgico | control | practica | tratamiento_en_consultorio | libre`. Ese es el **tipo de plantilla**, NO el nuevo `tipoEntrada` (clasificación clínica). El planner debe usar naming distinto y claro para no confundirlos (ej. enum backend `TipoEntradaHC`, campo `tipoEntrada`).
- El `entradaHCId` ya fluye de `HCCreatorForm` → `crearEntrada` (devuelve la entrada) → `LiveTurnoFooter` lo pasa a `cerrarSesion` (`turnos.service.ts`). Esa cadena ya existe; Phase 41 no necesita reconectarla, solo agrega `tipoEntrada` a la entrada y la lógica de flujo en `crearEntrada`.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `historia-clinica.service.ts:65` `crearEntrada()` — punto único de creación de entradas (lo usan PatientDrawer y LiveTurno). Acá vive la nueva lógica de flujo + persistencia de `tipoEntrada`.
- `crear-entrada.dto.ts` (`CreateEntradaDto`) — agregar campo `tipoEntrada`.
- `turnos.service.ts:873` `cerrarSesion()` — ya tiene la lógica de etapaCRM (`esCirugia → PROCEDIMIENTO_REALIZADO`, `TURNO_AGENDADO → CONSULTADO`). Se mantiene intacta; NO se le agrega lógica de flujo.
- `HCCreatorForm.tsx:35` (`live-turno/tabs/hc/`) — array `TIPOS` de botones de plantilla; acá se agrega/deriva el selector "Tipo de consulta".
- `HCCreatorDialog.tsx` (`PatientDrawer/views/`) — el otro consumidor de `HCCreatorForm`; hereda el selector automáticamente.
- `useCreateHistoriaClinicaEntry.ts` — agregar `tipoEntrada` al `CreateEntradaDto`/tipos del hook.

### Established Patterns
- Enums Prisma para clasificaciones (`FlujoPaciente`, `EtapaCRM` en `schema.prisma:1137-1166`). Nuevo enum sigue el mismo patrón.
- `Paciente.flujo` (`FlujoPaciente?`, schema.prisma:197, default `PENDIENTE`) y `Paciente.etapaCRM` (`EtapaCRM?`, schema.prisma:193) — los dos campos que mutan.
- Transacción única en `crearEntrada` (`prisma.$transaction`) — el update de flujo debe sumarse dentro de esa transacción.
- `ContactoLog` de tipo `SISTEMA` se crea en `cerrarSesion` al transicionar etapaCRM — patrón existente, no cambia.

### Integration Points
- `backend/src/prisma/schema.prisma` — nuevo enum `TipoEntradaHC` + campo `tipoEntrada` en `model HistoriaClinicaEntrada` (línea ~276); nueva migración Prisma.
- `backend/src/modules/historia-clinica/historia-clinica.service.ts` — `crearEntrada`: persistir `tipoEntrada` + aplicar transición de flujo (con guard `esCirugia` cuando hay `turnoId`).
- `backend/src/modules/historia-clinica/dto/crear-entrada.dto.ts` — campo `tipoEntrada`.
- `frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx` — selector "Tipo de consulta" pre-cargado/editable + mapeo plantilla→tipoEntrada.
- `frontend/src/hooks/useCreateHistoriaClinicaEntry.ts` — incluir `tipoEntrada` en el payload.
- `frontend/src/components/live-turno/LiveTurnoFooter.tsx:60` — ya pasa `entradaHCId` a `cerrarSesion`; sin cambios salvo verificación.

</code_context>

<deferred>
## Deferred Ideas

None — la discusión se mantuvo dentro del alcance de Phase 41. El estado dual completo y su visualización en TratamientosTab pertenecen a Phase 42 (DUAL-01..03).

</deferred>

---

*Phase: 41-tipo-entrada-hc*
*Context gathered: 2026-06-08*
