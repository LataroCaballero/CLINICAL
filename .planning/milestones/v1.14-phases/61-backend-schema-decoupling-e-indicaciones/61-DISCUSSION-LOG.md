# Phase 61: Backend — Schema, Decoupling e Indicaciones - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-08
**Phase:** 61-backend-schema-decoupling-e-indicaciones
**Areas discussed:** Todo cr-01 (fold), A. Migración del acople, B. Fallback en computePasosCrm, C. Endpoint de acuse

---

## Todo cr-01 — stored-XSS de indicacionesUrl (fold decision)

| Option | Description | Selected |
|--------|-------------|----------|
| Sí, incluir en Phase 61 | Validación server-side en actualizarIndicacionesUrl + quitar comentarios engañosos | ✓ |
| No, diferir | Se mantiene como todo pendiente / riesgo abierto para Phase 62 | |

**User's choice:** Sí, incluir en Phase 61
**Notes:** Tag `resolves_phase: 61`, severidad crítica; el portal renderizará el URL como href en Phase 62, así que el vector debe cerrarse antes.

---

## A. Migración del acople existente

### A1 — Columna ConsentimientoFirmado.indicacionesLeidasAt (NOT NULL)

| Option | Description | Selected |
|--------|-------------|----------|
| Nullable + dejar de escribir | DROP NOT NULL; firmar deja de setearla; preserva forense histórico | ✓ |
| Dropear la columna | DROP COLUMN; pierde timestamp forense v1.12 | |
| Seguir escribiéndola con now() | Mantiene NOT NULL; viola SC#1 | |

**User's choice:** Nullable + dejar de escribir

### A2 — Campo indicacionesLeidas del DTO

| Option | Description | Selected |
|--------|-------------|----------|
| Quitar el campo del DTO | Se elimina + guard; whitelist strippea front viejo | ✓ |
| Mantenerlo opcional e ignorarlo | Conserva contrato pero deja código muerto | |

**User's choice:** Quitar el campo del DTO

---

## B. Fallback en computePasosCrm

| Option | Description | Selected |
|--------|-------------|----------|
| Mantener OR con fuentes legacy | Paciente.indicacionesLeidasAt OR ConsentimientoFirmado.indicacionesLeidasAt OR indicacionesEnviadas; sin regresión v1.12 | ✓ |
| Sólo el campo nuevo del perfil | Sólo Paciente.indicacionesLeidasAt; pacientes v1.12 regresionan a pendiente | |

**User's choice:** Mantener OR con fuentes legacy

---

## C. Endpoint de acuse

| Option | Description | Selected |
|--------|-------------|----------|
| Set-once + global por paciente | Primer acuse fija timestamp; idempotente; campo global (INDIC-03) | ✓ |
| Overwrite + global | Cada apertura actualiza timestamp | |
| Per-zona | Modelo por zona; mayor scope; contradice INDIC-03 | |

**User's choice:** Set-once + global por paciente

---

## Claude's Discretion

- Nombre final del route del endpoint de acuse (sugerido `POST indicaciones/acuse`), respetando el patrón de `PacientePortalController`.
- Detalles de la SQL de migración (respetando patrón pgBouncer del milestone).

## Deferred Ideas

- ValidationPipe global en `main.ts` — alternativa amplia de cr-01, NO se hace en esta fase (cambio deliberado aparte). Sólo el fix puntual.
- Todo frontend/portal → Phase 62.
