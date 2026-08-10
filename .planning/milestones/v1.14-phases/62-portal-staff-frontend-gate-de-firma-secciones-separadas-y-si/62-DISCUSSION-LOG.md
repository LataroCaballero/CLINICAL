# Phase 62: Portal + Staff Frontend — Gate de Firma, Secciones Separadas y Sincronización - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-20
**Phase:** 62-portal-staff-frontend-gate-de-firma-secciones-separadas-y-si
**Areas discussed:** Trigger del acuse de indicaciones, Fuente de datos de la sección Indicaciones, Fecha en el indicador del staff, Estrategia de refetch on focus

---

## Trigger del acuse de indicaciones (INDIC-02 / SC#4)

| Option | Description | Selected |
|--------|-------------|----------|
| Al abrir el link/archivo | Acuse dispara en el onClick del link (abre PDF/archivo en pestaña nueva). Más fiel a "leyó de verdad". | ✓ |
| Al expandir la sección | Acuse dispara al desplegar el acordeón. Más simple, pero marca leído sin abrir el archivo. | |
| Ambas / discutir | Ver trade-off UX/legal antes de fijar. | |

**User's choice:** Al abrir el link/archivo.
**Notes:** Si no hay `indicacionesUrl`, no hay nada que abrir → sin acuse + empty state.

---

## Fuente de datos de la sección Indicaciones (INDIC-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Reusar el response actual | Sección lee `indicacionesUrl` del response de `useConsentimientosParaFirmar`. Cero backend nuevo. | ✓ |
| Endpoint dedicado nuevo | GET portal-scoped de indicaciones separado. Más limpio pero backend nuevo fuera de scope. | |
| Discutir | Decidir según múltiples zonas / empty state. | |

**User's choice:** Reusar el response actual.
**Notes:** Evita endpoint backend nuevo; el response ya trae `indicacionesUrl` per-zona.

---

## Fecha en el indicador del staff (INDIC-05 / SC#5)

| Option | Description | Selected |
|--------|-------------|----------|
| Solo tooltip/estado sin fecha | Mantener dot verde/naranja sin fecha. (1ª ronda) | |
| Exponer timestamp en getKanban | Agregar `indicacionesLeidasAt` al payload + tipo; stepper muestra la fecha. Cumple INDIC-05. | ✓ |

**User's choice:** Exponer la fecha (cumplir INDIC-05).
**Notes:** En la 1ª ronda el usuario eligió "sin fecha", pero se le señaló que contradice SC#5/INDIC-05 ("con la fecha de lectura") y que el fix es mínimo (`getKanban` ya selecciona el campo, línea 662). Reconsideró y optó por exponer la fecha para cumplir el criterio completo.

---

## Estrategia de refetch on focus (EMBUDO-06)

| Option | Description | Selected |
|--------|-------------|----------|
| refetchOnWindowFocus + bajar staleTime | Activar refetch explícito y reducir staleTime para reflejar cambios inmediatos. Más requests. | ✓ |
| Solo refetchOnWindowFocus, staleTime igual | Dejar staleTime 30s; refetch solo si pasaron >30s. Menos requests, posible lag. | |
| Discutir | Ver trade-off freshness vs volumen. | |

**User's choice:** refetchOnWindowFocus + bajar staleTime.
**Notes:** Freshness sobre volumen (cierre deuda W-1 v1.13). Query key `['crm-kanban', profesionalId]` sin cambios.

---

## Claude's Discretion

- Layout de la nueva sección "Indicaciones" (ícono, copy del empty state, orden en el acordeón).
- Valor exacto de `staleTime` (rango 0–5s).
- Micro-copy de checkboxes e indicador de fecha del staff.

## Deferred Ideas

- Registro server-side de "PDF abierto" (Out of Scope por diseño legal).
- Endpoint backend dedicado de indicaciones (descartado a favor de reusar el response de consentimiento).
- Guard local anti-reenvío del acuse por sesión (opcional; backend es idempotente set-once).
