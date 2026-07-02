# Phase 55: Portal Frontend - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-01
**Phase:** 55-portal-frontend
**Areas discussed:** Gap backend CHAT-04, UX del paso Salud, Navegación wizard + fin, Look & feel paciente

---

## Gap backend CHAT-04

| Option | Description | Selected |
|--------|-------------|----------|
| One-way mínimo | F55 agrega `POST /consulta` (JWT portal) → `MensajeInterno(origenPaciente=true)`; paciente escribe/envía, NO ve respuestas en el portal | ✓ |
| Two-way (ve respuestas) | Además muestra el hilo con respuestas del staff (endpoint de lectura + polling) | |
| No construir ahora | Dejar CHAT-04 fuera; SC#4 quedaría sin cumplir | |

**User's choice:** One-way mínimo
**Notes:** El endpoint no existe en F54 (verificado en el controller `paciente-portal`); el campo `MensajeInterno.origenPaciente` ya está en schema desde F51. Es el único agregado de backend de esta fase.

---

## UX del paso Salud

| Option | Description | Selected |
|--------|-------------|----------|
| Chips + sugerencias + otro | Chips seleccionables con sugerencias comunes por categoría + campo "otro"; reusa patrón F52 adaptado mobile | ✓ |
| Texto libre por categoría | Un textarea simple por categoría | |
| Chips sin sugerencias | El paciente agrega sus propios chips sin lista precargada | |

**User's choice:** Chips + sugerencias + otro
**Notes:** Pre-carga desde valores staged que devuelve el `GET /` del portal (D-09 de F54). Escritura sólo por `PATCH /salud` (campos `*AutoReportad*`).

---

## Navegación wizard + fin

| Option | Description | Selected |
|--------|-------------|----------|
| Lineal adelante/atrás | Secuencial, sin saltar pasos hacia adelante | |
| Libre (tabs/saltar) | Navegación libre entre pasos | ✓ (refinado) |

**User's choice (free-text):** "Quiero que todo el contenido esté disponible siempre, ya que no es un paso a paso, también es informativo para el paciente y tiene que poder ver su información."

**Follow-up — Layout:**
| Option | Description | Selected |
|--------|-------------|----------|
| Secciones navegables libres | 4 secciones siempre accesibles vía tabs/acordeón, cualquier orden; info read-only + editable; "X de 4" como progreso | ✓ |
| Página única scrolleable | Todo en una página larga con progreso flotante | |

**Follow-up — Fin + reingreso:**
| Option | Description | Selected |
|--------|-------------|----------|
| Confirmación + re-editar siempre | Confirmación de guardado; link persistente, reabrir muestra info actual y permite corregir/agregar | ✓ |
| Confirmación de cierre | Pantalla de gracias tipo cierre | |

**Follow-up — Consultas:**
| Option | Description | Selected |
|--------|-------------|----------|
| Opcional | Se puede completar sin enviar consulta | ✓ |
| Siempre visible, sin obligar | Igual pero destacada como canal permanente | |

**Notes:** El reframe del usuario convierte el "wizard" en una vista viva y navegable; el indicador "Paso X de 4" del roadmap se mantiene como progreso visual, no como candado. Save-on-advance (SC#2) se preserva por sección.

---

## Look & feel paciente

| Option | Description | Selected |
|--------|-------------|----------|
| Reusar shadcn actual | Mismo sistema de diseño del presupuesto público, mobile-first, tuteo, ≥16px | ✓ |
| Correr /gsd:ui-phase | Generar UI-SPEC.md para un look más cálido antes de planificar | |

**User's choice:** Reusar shadcn actual
**Notes:** Sin paso extra de diseño; se sigue el sistema existente.

---

## Claude's Discretion

- Shape del contacto de emergencia y su mapeo al DTO de `PATCH /datos-personales`.
- Componente concreto de secciones navegables (Tabs vs Accordion) para mobile.
- Ruta/URL del portal en Next.js (sugerido `frontend/src/app/portal/[token]/`).
- Estructura del cliente API + hooks del portal (lado paciente).
- Ruta exacta del `POST /consulta` y forma del `Json` del paso Salud.
- Validación cliente de email/teléfono (Zod + RHF).

## Deferred Ideas

- Consultas two-way (ver respuestas en el portal) — futuro.
- Contrato de diseño UI dedicado (`/gsd:ui-phase`) — no ahora.
- Consentimiento firmado completo (PDF, firma canvas, auditoría, badges) — Phase 56.
- Todo `cr-01-indicaciones-url-validation.md` (stored-XSS backend) — reviewed, no folded; nota de sanitización para el planner si el portal renderiza `indicacionesUrl`.
