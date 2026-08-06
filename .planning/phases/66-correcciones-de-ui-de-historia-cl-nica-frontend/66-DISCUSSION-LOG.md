# Phase 66: Correcciones de UI de Historia Clínica (Frontend) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-06
**Phase:** 66-correcciones-de-ui-de-historia-cl-nica-frontend
**Areas discussed:** Punto de entrada al wizard (HCUI-01), Código viejo, Render Pre-quirúrgico (HCUI-02)

---

## Punto de entrada al wizard (HCUI-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown → abre wizard | El botón 'Nueva entrada' de la vista pasa a abrir el wizard nuevo (HCCreatorDialog). | |
| Eliminar el dropdown | Se saca el botón 'Nueva entrada' de la vista y queda solo el header '+ Nueva HC' como único punto de entrada. | ✓ |
| Mantener texto libre | Conservar texto libre como opción secundaria + wizard como primaria. | |

**User's choice:** Eliminar el dropdown — único punto de entrada: header "+ Nueva HC".
**Notes:** El botón "+ Nueva HC" ya está cableado a HCCreatorDialog; no hace falta agregar botón nuevo.

---

## Código viejo (texto libre + selector de plantilla)

| Option | Description | Selected |
|--------|-------------|----------|
| Borrar código muerto | Eliminar formulario texto libre y selector de plantilla sin uso; entradas viejas siguen renderizándose. | ✓ |
| Dejar el código | Dejar el código sin punto de entrada por si se reutiliza. | |

**User's choice:** Borrar código muerto.
**Notes:** Quitar estado/imports/handlers huérfanos, cuidando no romper tipos ni lint.

---

## Render Pre-quirúrgico (HCUI-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Rama nueva estilo primera_vez | Agregar rama pre_quirurgico en HCEntryFullContent + HCEntryChips, estilo primera_vez, campos vacíos ocultos. | ✓ |
| Reutilizar render de LiveTurno | Extraer/compartir el componente de LiveTurno. | |
| Solo el detalle (modal) | Solo HCEntryFullContent, preview con chip genérico. | |

**User's choice:** Rama nueva estilo primera_vez (detalle + preview).
**Notes:** No compartir código con LiveTurno (fuera de scope). Campos vacíos se ocultan. `consentimientoInformado` booleano → render legible.

---

## Claude's Discretion

- Detalles de layout fino de la rama pre_quirurgico (orden de secciones, íconos, spacing) mientras mantenga consistencia con `primera_vez`.
- Alcance exacto del cleanup de imports/estado, sin romper tipos ni lint.

## Deferred Ideas

- Migrar `HistorialClinicoPanel`/`TurnoHCModal` al componente compartido de HC — fuera de scope salvo lo mínimo para HCUI-02; queda para phase futuro.
