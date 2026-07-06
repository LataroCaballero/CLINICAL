# Phase 57: Backend Foundation — Etapa y Payload Enriquecido - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-03
**Phase:** 57-Backend Foundation — Etapa y Payload Enriquecido
**Areas discussed:** Estrategia de la etapa, Forma del payload, Detección turno cirugía, Relajar el guard

---

## Estrategia de la etapa "Cirugía Realizada"

| Option | Description | Selected |
|--------|-------------|----------|
| Reusar + relabelar | Mantener PROCEDIMIENTO_REALIZADO como valor interno; label "Cirugía Realizada" en frontend. Cero migración | ✓ |
| Renombrar el enum | Migración PROCEDIMIENTO_REALIZADO → CIRUGIA_REALIZADA; toca guard, stats, portal, DTOs | |

**User's choice:** Reusar + relabelar

### Trigger de la etapa

| Option | Description | Selected |
|--------|-------------|----------|
| Solo manual | El profesional lo mueve manualmente | |
| Auto al registrar cirugía | Auto-move al registrar cirugía | |
| Vos decidís | El investigador determina el trigger | |

**User's choice:** (free text) "El backend lo debe mover automáticamente si pasó la fecha de cirugía. También el profesional puede moverlo manualmente."

### Disparo del auto-move

| Option | Description | Selected |
|--------|-------------|----------|
| Job programado diario | Cron/BullMQ 1x/día mueve pacientes con turno de cirugía pasado; estado persistido | ✓ |
| Computado al leer getKanban | Sin persistir; se calcula por request | |
| Al completar/pasar el turno | Hook cuando el turno se marca completado | |

**User's choice:** Job programado diario

**Notes:** Estado persistido en DB para consistencia con stats/dashboard/kanban. Auto-transición forward → guard la permite.

---

## Forma del payload de getKanban

| Option | Description | Selected |
|--------|-------------|----------|
| Estado de pasos computado | Backend devuelve estado por paso + flag todosCompletos; frontend solo pinta | ✓ |
| Flags/datos crudos | Backend devuelve datos crudos; frontend deriva | |
| Híbrido | Datos crudos + algunos derivados clave | |

**User's choice:** Estado de pasos computado

### Set de pasos canónicos

| Option | Description | Selected |
|--------|-------------|----------|
| Los 5 del requisito | HC + Presupuesto + Turno cirugía + Consentimiento + Preop; completo = 5 verdes | ✓ |
| Los 5 + confirmación aparte | Confirmado como paso propio | |
| Vos decidís el set exacto | El investigador confirma con stepper existente | |

**User's choice:** Los 5 del requisito

---

## Detección del turno de cirugía

| Option | Description | Selected |
|--------|-------------|----------|
| Modelo Cirugia | Registro Cirugia (fecha + EstadoCirugia); fuente semántica y alimenta auto-move + stats | ✓ |
| Turno.esCirugia | Turno con esCirugia=true | |
| Ambos / vos decidís | El investigador combina fuentes | |

**User's choice:** Modelo Cirugia

---

## Relajar el guard forward-only

| Option | Description | Selected |
|--------|-------------|----------|
| Bypass en creación de turno | La auto-transición a TURNO_AGENDADO deja de pasar por el guard | ✓ |
| Bypass solo si turno futuro | Solo mueve si la fecha del turno es futura | |
| Vos decidís los límites | El investigador define etapas terminales | |

**User's choice:** Bypass en creación de turno

### Casos límite (etapas terminales)

| Option | Description | Selected |
|--------|-------------|----------|
| Reactivar a TURNO_AGENDADO | Un nuevo turno reactiva desde cualquier etapa, incl. PERDIDO y CIRUGIA_REALIZADA | ✓ |
| No reactivar terminales | PERDIDO y CIRUGIA_REALIZADA protegidas | |
| Solo proteger PERDIDO | CIRUGIA_REALIZADA sí retrocede; PERDIDO requiere reactivación manual | |

**User's choice:** Reactivar a TURNO_AGENDADO

**Notes:** El guard sigue aplicando en presupuestos/otras auto-transiciones. Stats de cirugía (fase 60) no se afectan porque se basan en registros reales, no en etapa CRM.

---

## Claude's Discretion

- Forma exacta del objeto de estado de pasos (nombres de keys, enum de estado).
- Consolidación oportunista del guard duplicado (turnos/presupuestos) en un helper compartido.
- Definición precisa de las fuentes de datos de HC relevante, consentimiento firmado e indicaciones preop (v1.12) — a confirmar por el investigador.

## Deferred Ideas

- Renombrado real del enum a CIRUGIA_REALIZADA — descartado por costo/riesgo de migración.
- Board/columnas/indicadores/etiquetas → fase 58.
- Cableado del stepper + quick-actions → fase 59.
- Conteos de stats sobre registros reales → fase 60.
