# Phase 66: Correcciones de UI de Historia Clínica (Frontend) - Context

**Gathered:** 2026-08-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Cargar y revisar entradas de HC desde la ficha del paciente (`PatientDrawer`) de forma consistente con LiveTurno, sin dejar información sin mostrar. Dos correcciones acotadas de frontend:

- **HCUI-01:** Agregar una nueva entrada de HC desde el PatientDrawer usa el wizard nuevo (`HCCreatorForm`/`HCCreatorDialog`, el mismo de LiveTurno), no el formulario de texto libre viejo.
- **HCUI-02:** El detalle de una entrada "Pre-quirúrgico" en el historial renderiza todos los campos guardados en el JSONB, en vez de mostrarse vacío.

No depende de las Phases 63-65 (cambios de frontend independientes). No es un rediseño: se enriquece/corrige lo existente.
</domain>

<decisions>
## Implementation Decisions

### HCUI-01 — Punto de entrada al wizard
- **D-01:** Eliminar el dropdown **"Nueva entrada"** (con sus items *Texto libre* y *Usar plantilla*) del header de la vista `HistoriaClinica` (`frontend/src/components/patient/PatientDrawer/views/HistoriaClinica.tsx`, ~líneas 195-215). El único punto de entrada para crear una entrada de HC queda el botón **"+ Nueva HC"** del header de `PatientDrawer` (`PatientDrawer.tsx:60-68`), que ya abre `HCCreatorDialog` → `HCCreatorForm` (el wizard nuevo). Ese botón ya está cableado y funciona; no hay que agregar un botón nuevo dentro de la vista.
- **D-02:** Borrar el **código muerto** que queda sin punto de entrada tras D-01: el formulario de texto libre (`showForm`, `handleGuardar`, el `<Textarea>` de "Nueva entrada (texto libre)" ~líneas 262-281), el modal selector de plantilla (`showTemplateSelector` y su `<Dialog>` ~líneas 312-343), y el estado/imports/handlers asociados que dejen de usarse (`contenido`, `setContenido`, `handleSelectTemplate`, `DropdownMenu` si queda sin uso, etc.). Las entradas viejas de texto libre ya guardadas **siguen renderizándose igual** (la lógica de listado/detalle no se toca por este cambio).
- Nota: verificar durante el plan que nada más dependa de esos handlers/estado antes de borrar; quitar imports huérfanos para no romper lint.

### HCUI-02 — Render del detalle Pre-quirúrgico
- **D-03:** Agregar una rama nueva `tipo === 'pre_quirurgico'` en **`HCEntryFullContent`** (variante detalle/modal) y en **`HCEntryChips`** (variante preview/tarjeta) dentro de `frontend/src/components/patient/PatientDrawer/views/HCEntryContent.tsx`. Estilo visual siguiendo el patrón de la rama `primera_vez` existente (mismo look & feel de chips/secciones). **No** se reutiliza/extrae el componente de LiveTurno (el roadmap lo marca fuera de scope salvo lo mínimo).
- **D-04:** Campos a renderizar (forma exacta del JSONB que guarda `HCCreatorForm` para `pre_quirurgico`, ver `HCCreatorForm.tsx:151-166`):
  - `antecedentes: string[]`
  - `alergias: string[]`
  - `medicacion: string[]`
  - `estudiosComplementarios?: string`
  - `consentimientoInformado: boolean` (renderizar como Sí/No o badge legible)
  - `zonas: []` (mismas zonas/tratamientos que `primera_vez` — reutilizar el mismo render de zonas/chips que ya usa esa rama)
  - `comentario?: string`
- **D-05:** Campos vacíos (arrays vacíos, strings vacíos/undefined) se **ocultan** (no mostrar "—" ni secciones vacías), consistente con cómo la rama `primera_vez` maneja ausencia de datos.

### Claude's Discretion
- Detalles de layout fino de la rama pre_quirurgico (orden exacto de secciones, íconos, spacing) quedan a criterio del ejecutor mientras mantengan consistencia con la rama `primera_vez`.
- Alcance exacto del cleanup de imports/estado en D-02, siempre que no rompa tipos ni lint.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos y roadmap
- `.planning/REQUIREMENTS.md` §HCUI-01, §HCUI-02 — texto de los requisitos y nota de out-of-scope ("Migrar `HistorialClinicoPanel`/`TurnoHCModal` al componente compartido de HC — Fuera de scope salvo lo mínimo necesario para HCUI-02").
- `.planning/ROADMAP.md` §"Phase 66" — Goal y Success Criteria.

### Archivos frontend a modificar
- `frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx` — botón "+ Nueva HC" (`hcDialogOpen` → `HCCreatorDialog`), punto de entrada canónico tras HCUI-01.
- `frontend/src/components/patient/PatientDrawer/views/HistoriaClinica.tsx` — vista con el dropdown viejo a eliminar y el código muerto a borrar; contiene el listado y el modal de detalle (`ExpandedEntryContent`).
- `frontend/src/components/patient/PatientDrawer/views/HCEntryContent.tsx` — `HCEntryChips` (preview) y `HCEntryFullContent` (detalle); acá se agrega la rama `pre_quirurgico`.
- `frontend/src/components/patient/PatientDrawer/views/HCCreatorDialog.tsx` — wrapper del wizard (ya existente, no requiere cambios salvo verificación).

### Referencia de forma de datos y consistencia (leer, no modificar salvo lo mínimo)
- `frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx` §151-166 — forma exacta del DTO `pre_quirurgico` (fuente de verdad de los campos a renderizar).
- `frontend/src/components/live-turno/tabs/hc/HistorialClinicoPanel.tsx` — cómo LiveTurno lista/etiqueta entradas por `tipo` (referencia de consistencia, no se comparte código en este phase).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `HCCreatorDialog` (`PatientDrawer/views/HCCreatorDialog.tsx`): ya envuelve `HCCreatorForm` con `showDatePicker`; es el wizard que HCUI-01 debe dejar como único camino. Ya está cableado al botón "+ Nueva HC".
- Rama `primera_vez` en `HCEntryContent.tsx` (`HCEntryChips` línea ~55, `HCEntryFullContent` línea ~174): patrón de referencia para el estilo de chips/secciones de la nueva rama `pre_quirurgico`, incluido el render de `zonas`.

### Established Patterns
- El render del detalle se decide por `entrada.contenido.tipo` (free-entry) vs `entrada.templateId` (template-based). Las entradas `pre_quirurgico` son free-entry con `contenido.tipo === 'pre_quirurgico'` → hoy caen sin rama y muestran tarjeta vacía.
- `getTituloEntrada` (`HistoriaClinica.tsx:412`) ya mapea `tipo`; confirmar que "Pre-quirúrgico" tenga título legible (agregar a `TIPO_LABELS` si falta).

### Integration Points
- `PatientDrawer` (header) → `HCCreatorDialog` → `HCCreatorForm` → `useCreateHistoriaClinicaEntry` (`frontend/src/hooks/useCreateHistoriaClinicaEntry.ts`): flujo de creación ya operativo; HCUI-01 solo elimina el camino viejo paralelo.
- El listado de entradas (`EntryCard` → `ExpandedEntryContent` → `FreeEntryFullContent`/`FreeEntryPreview` → `HCEntryContent`) es donde se enchufa la rama nueva de HCUI-02.

</code_context>

<specifics>
## Specific Ideas

- Consistencia visual con la rama `primera_vez` existente es el criterio explícito para el render pre-quirúrgico (no inventar un estilo nuevo).
- `consentimientoInformado` es booleano → mostrarlo de forma legible (Sí/No o badge), no como valor crudo.
- Preferencia general del proyecto: enriquecer/corregir componentes existentes, no rediseñarlos (ver memoria `feedback_enrich_not_replace`).

</specifics>

<deferred>
## Deferred Ideas

- Migrar `HistorialClinicoPanel`/`TurnoHCModal` al componente compartido de HC — explícitamente fuera de scope en REQUIREMENTS.md salvo lo mínimo necesario para HCUI-02. Queda para un phase futuro de unificación de render de HC.

</deferred>

---

*Phase: 66-correcciones-de-ui-de-historia-cl-nica-frontend*
*Context gathered: 2026-08-06*
