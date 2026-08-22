# Requirements: CLINICAL — Milestone v1.16 Alta de Paciente sin Fricción

**Defined:** 2026-08-17
**Core Value:** Que un cirujano plástico cierre más cirugías — el sistema debe hacer visible qué pacientes seguir, cuándo contactarlos y cómo, de la manera más automatizada y simple posible para profesionales sin background en marketing o sistemas.

**Milestone goal:** Que agendar un turno a un paciente nuevo no requiera registrarlo antes — se crea desde el mismo autosuggest con nombre y DNI.

## v1.16 Requirements

### Teléfono Opcional

- [x] **TEL-01**: El sistema permite persistir un paciente sin teléfono (`Paciente.telefono` nullable en schema + `@IsOptional()` en `CreatePacienteDto`), sin alterar los pacientes existentes que ya tienen número
- [ ] **TEL-02**: El usuario puede dar de alta un paciente desde el formulario completo (`NewPacienteModal`) sin cargar teléfono
- [ ] **TEL-03**: Las vistas que muestran el teléfono de un paciente (autosuggest, lista de pacientes, ficha, reportes) muestran un placeholder legible (ej. "—") en vez de "null" o vacío cuando no hay número

### Creación Inline de Paciente

- [x] **ALTA-01**: Cuando la búsqueda del autosuggest no arroja resultados, el usuario ve la opción de crear un paciente nuevo sin salir del modal de turno
- [x] **ALTA-02**: El usuario puede crear el paciente cargando únicamente nombre completo y DNI
- [x] **ALTA-03**: El formulario inline precarga el campo correspondiente con lo que el usuario ya escribió: DNI si el query es numérico, nombre completo si es texto
- [x] **ALTA-04**: Al crear el paciente, queda seleccionado automáticamente en el modal de turno y el usuario puede confirmar el turno sin pasos adicionales
- [x] **ALTA-05**: Si el DNI ingresado ya está registrado, el usuario ve el error dentro del formulario inline y puede corregirlo sin perder lo que ya cargó
- [x] **ALTA-06**: El paciente creado inline queda asignado al profesional del contexto activo, igual que en el alta completa
- [x] **ALTA-07**: La creación inline está disponible en los tres modales de turno (`QuickAppointment`, `NewAppointmentModal`, `SurgeryAppointmentModal`) y no aparece en los usos de filtro del autosuggest (`PatientFilters`, `data-table-toolbar`)

### Guard de Envíos sin Teléfono

- [x] **ENVIO-01**: Al intentar enviar un WhatsApp a un paciente sin teléfono, el backend rechaza la operación y el usuario ve un mensaje claro en español en vez de un error crudo de Meta
- [x] **ENVIO-02**: Al intentar enviar un presupuesto por WhatsApp a un paciente sin teléfono, el backend rechaza la operación con el mismo mensaje claro
- [x] **ENVIO-03**: Los botones de envío por WhatsApp aparecen deshabilitados con tooltip explicativo cuando el paciente no tiene teléfono cargado

## Future Requirements

Reconocidos pero diferidos. No entran en el roadmap de v1.16.

### Calidad de Ficha

- **FICHA-F01**: Vista de pacientes con ficha incompleta (sin teléfono, sin fecha de nacimiento, etc.) para completar en lote
- **FICHA-F02**: Indicador visual de "ficha incompleta" en la card del kanban y en la lista de pacientes

### Guard de Contacto

- **ENVIO-F01**: Guard de teléfono faltante en la lista de acción CRM y en el botón de contacto rápido del kanban
- **ENVIO-F02**: Email como canal alternativo automático cuando el paciente no tiene teléfono

### Alta sin DNI

- **ALTA-F01**: Permitir crear paciente inline sin DNI, con identificador temporal a reconciliar después

## Out of Scope

| Feature | Reason |
|---------|--------|
| Hacer `dni` opcional o no-único | Es la clave de identidad del paciente y el 409 de duplicado es el guard que evita fichas dobles; sacarlo abre la puerta a pacientes duplicados |
| Backfill de teléfonos en pacientes existentes | TEL-01 aplica sólo hacia adelante; los registros históricos ya tienen número y no se tocan |
| Creación inline en los usos de filtro del autosuggest | `PatientFilters` y `data-table-toolbar` filtran una tabla — crear un paciente desde un filtro no tiene sentido de producto |
| Nueva etapa o columna CRM para el paciente creado inline | Entra como `NUEVO_LEAD` por el `create()` de v1.15 (EMBUDO-07) y el turno lo mueve a `TURNO_AGENDADO` por el flujo existente; sin código CRM nuevo |
| Flag/columna `fichaIncompleta` en el schema | Se puede derivar de los campos nulos cuando haga falta; agregar estado persistido ahora es prematuro (ver FICHA-F01) |
| Guard de teléfono en lista de acción / contacto CRM | Descopeado explícitamente en questioning; el guard se limita a los dos entrypoints de envío WA (ver ENVIO-F01) |
| Refactor del autosuggest a un combobox de shadcn | El componente actual (Popover + Input) funciona; el alcance es sumarle la rama de creación, no rediseñarlo |

## Traceability

Cada requisito mapea a exactamente una fase. Ver `.planning/ROADMAP.md` para goals y success criteria.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TEL-01 | Phase 67 | Complete |
| ENVIO-01 | Phase 67 | Complete |
| ENVIO-02 | Phase 67 | Complete |
| ALTA-01 | Phase 68 | Complete |
| ALTA-02 | Phase 68 | Complete |
| ALTA-03 | Phase 68 | Complete |
| ALTA-04 | Phase 68 | Complete |
| ALTA-05 | Phase 68 | Complete |
| ALTA-06 | Phase 68 | Complete |
| ALTA-07 | Phase 68 | Complete |
| TEL-02 | Phase 69 | Pending |
| TEL-03 | Phase 69 | Pending |
| ENVIO-03 | Phase 69 | Complete |

**Coverage:**
- v1.16 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0 ✓

---
*Requirements defined: 2026-08-17*
*Last updated: 2026-08-17 al iniciar el milestone v1.16*
