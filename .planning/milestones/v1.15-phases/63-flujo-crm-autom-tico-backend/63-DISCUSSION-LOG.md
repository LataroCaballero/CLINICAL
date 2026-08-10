# Phase 63: Flujo CRM Automático (Backend) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-31
**Phase:** 63-Flujo CRM Automático (Backend)
**Areas discussed:** Guard CONFIRMADO, Cirugía cancelada, Tratamiento sobre cirugía, Detección de tratamiento, Reversa de etapa, Detección de Consulta

---

## Guard de degradación de CONFIRMADO (EMBUDO-08)

| Option | Description | Selected |
|--------|-------------|----------|
| Proteger CONFIRMADO | Guard: un turno nuevo no degrada CONFIRMADO/PROCEDIMIENTO_REALIZADO a TURNO_AGENDADO | ✓ (matizada) |
| Mantener comportamiento actual | Cualquier turno resetea a TURNO_AGENDADO | |

**User's choice:** Proteger CONFIRMADO, **excepto** cuando el turno nuevo es de tipo "Consulta" → ahí sí resetea a TURNO_AGENDADO.
**Notes:** "Un turno de Consulta significa que tiene una consulta por otro tratamiento/cirugía. Un mismo paciente puede hacer el recorrido del embudo tantas veces como cirugías se haga." → el embudo es cíclico; Consulta inicia ciclo nuevo.

---

## Cirugía cancelada / suspendida (EMBUDO-08)

| Option | Description | Selected |
|--------|-------------|----------|
| Queda CONFIRMADO | Cancelar/suspender no cambia la etapa | ✓ (ampliada) |
| Revierte a etapa previa | Vuelve a TURNO_AGENDADO / etapa anterior | (descartada en 2ª vuelta) |

**User's choice:** Mantiene CONFIRMADO (el presupuesto fue confirmado) + dispara recontacto.
**Notes:** Debe aparecer en el registro de contacto "Cirugía cancelada, recontactar", entrar a la lista de acción y setear temperatura CALIENTE. La secretaria decide manualmente: nueva fecha, marcar PERDIDO, o sacar del embudo. (Primera respuesta fue "revierte a etapa previa"; corregida en el follow-up a "mantener CONFIRMADO + señales de recontacto".)

---

## Tratamiento en consultorio sobre paciente en flujo CIRUGIA (EMBUDO-09)

| Option | Description | Selected |
|--------|-------------|----------|
| Sale igual del board | Siempre fuerza flujo=TRATAMIENTO | |
| Solo si estaba PENDIENTE | Comportamiento actual de resolverNuevoFlujo | ✓ |

**User's choice:** Solo si estaba PENDIENTE.
**Notes:** Un candidato quirúrgico (flujo=CIRUGIA) que recibe un tratamiento en consultorio se queda en el board.

---

## Detección de "Tratamiento en consultorio" (EMBUDO-09)

| Option | Description | Selected |
|--------|-------------|----------|
| Entradas separadas | El wizard crea entradas HC independientes; disparo si alguna entrada del turno es tipo tratamiento_en_consultorio | ✓ |
| Entrada combinada | Una sola entrada marca varios tipos a la vez | |
| No estoy seguro | Que research verifique el payload | |

**User's choice:** Entradas separadas.
**Notes:** "Junto a Primera vez" = dos entradas independientes en el mismo turno.

---

## Reversa de etapa (follow-up de Cirugía cancelada)

| Option | Description | Selected |
|--------|-------------|----------|
| Recalcular del estado real | Derivar etapa con crm-steps helper | |
| Volver a TURNO_AGENDADO | Fijo | |
| Volver a PRESUPUESTO_ENVIADO/CONSULTADO | Regla fija | |

**User's choice:** Ninguna — cambió el criterio: mantener CONFIRMADO y disparar recontacto (ver "Cirugía cancelada" arriba).
**Notes:** No hay reversa de etapa; la decisión de perder al paciente es humana.

---

## Detección de "Consulta" (follow-up de Guard CONFIRMADO)

| Option | Description | Selected |
|--------|-------------|----------|
| Por nombre del TipoTurno | tipoTurno.nombre === 'Consulta' | ✓ |
| Cualquier turno no-cirugía/no-tratamiento | Amplio | |
| No estoy seguro | Que research confirme | |

**User's choice:** Por nombre del TipoTurno (`nombre === 'Consulta'`, es @unique).

---

## Claude's Discretion

- Dónde vive la lógica de transición (helpers existentes vs. nuevo).
- Estructura del mecanismo "requiere recontacto" (flag persistido vs. derivado por query).
- Orden de escritura de etapaCRM/flujo/temperatura en las transacciones.

## Deferred Ideas

- Badge "Cirugía cancelada, recontactar" en la card → Phase 64 (display).
- Fix crm-steps.helper línea 92 (cirugiaCompleto ignora estado) → tech debt existente, no foldado a Phase 63.
- Endpoint dedicado de planilla server-side → fuera de scope (TRAT-07 es Phase 64).
