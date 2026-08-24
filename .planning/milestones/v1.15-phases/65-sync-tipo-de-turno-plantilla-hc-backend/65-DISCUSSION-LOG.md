# Phase 65: Sync Tipo de Turno ↔ Plantilla HC (Backend) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-04
**Phase:** 65-Sync Tipo de Turno ↔ Plantilla HC (Backend)
**Areas discussed:** Reglas de sobrescritura, Varias plantillas en una sesión, Alcance del cambio en el turno, Discriminador y mapeo

---

## Reglas de sobrescritura

| Option | Description | Selected |
|--------|-------------|----------|
| Escalera de prioridad | Consulta < Tratamiento < Pre-Quirúrgico; cada plantilla sube pero nunca baja; Cirugía intocable | ✓ |
| Literal por regla (protege Cirugía) | 01/03 pisan cualquier tipo salvo Cirugía; 02 solo desde Consulta | |
| Literal absoluto | 01/03 pisan todo, incluso Cirugía | |

**User's choice:** Escalera de prioridad
**Notes:** Modelo numérico: Consulta(1) < Tratamiento(2) < Pre-Quirúrgico(3); Cirugía protegido (nunca se toca); tipos no mapeados = rango 0.

---

## Gate de disparo de Tratamiento (sub-decisión de sobrescritura)

| Option | Description | Selected |
|--------|-------------|----------|
| Cualquier tipo por debajo (no protegido) | Tratamiento dispara desde Consulta/Control/null; nunca sobre Pre-Quirúrgico ni Cirugía; escalera 100% numérica y order-independent | ✓ |
| Estricto: solo desde Consulta | Literal a HCSYNC-02; costo: orden puede importar en el borde raro Control+dual-plantilla | |

**User's choice:** Cualquier tipo por debajo (no protegido)
**Notes:** Reconcilia la escalera con la independencia del orden. Efecto extra intencional: `Control → Tratamiento` también dispara (si se hizo un tratamiento, el turno fue un tratamiento).

---

## Varias plantillas en una sesión

| Option | Description | Selected |
|--------|-------------|----------|
| Independiente del orden | El resultado no depende de cuál entrada se guarda primero; sale gratis con la escalera numérica | ✓ |
| Last-write-wins | Gana la última entrada; más simple pero orden-dependiente | |

**User's choice:** Independiente del orden
**Notes:** El wizard crea entradas separadas (Phase 63 D-08); con la escalera pura, el rango mayor siempre queda. Sin lógica cross-entrada.

---

## Alcance del cambio en el turno

| Option | Description | Selected |
|--------|-------------|----------|
| Tipo + esCirugia, sin tocar flujo | Escribe tipoTurnoId + sincroniza esCirugia; NO re-dispara paciente.flujo (lo maneja resolverNuevoFlujo) | ✓ |
| Solo tipoTurnoId | Mínimo absoluto; deja esCirugia potencialmente inconsistente | |
| Sincronizar todo (como crearTurno) | tipoTurnoId + esCirugia + paciente.flujo; riesgo de doble-fire con Phase 63 | |

**User's choice:** Tipo + esCirugia, sin tocar flujo
**Notes:** Evita conflicto/doble-fire con la lógica de flujo de Phase 63. Esta fase toca solo el turno.

---

## Discriminador y mapeo

| Option | Description | Selected |
|--------|-------------|----------|
| Por dto.tipo (plantilla) | primera_vez→Consulta, tratamiento_en_consultorio→Tratamiento, pre_quirurgico→Pre-Quirúrgico; control/practica/libre sin sync | ✓ |
| Por el enum tipoEntrada | Reutiliza TipoEntradaHC; indirecto (primera_vez no tiene enum propio) | |

**User's choice:** Por dto.tipo (plantilla)
**Notes:** dto.tipo representa literalmente la "plantilla" del requisito. control/practica/libre quedan fuera del sync.

---

## Claude's Discretion

- Ubicación/forma del helper puro (`resolverTipoTurnoSync`) siguiendo el patrón `resolverNuevoFlujo` (TDD).
- Atomicidad: dónde poner el `turno.update` dentro de `crearEntrada` (misma transacción si existe).
- No-op idempotente si el tipo destino ya coincide con el actual.
- Comportamiento defensivo si el `TipoTurno` destino no existe (skip silencioso, no romper el guardado de HC).

## Deferred Ideas

- Tipos de turno personalizados por profesional (TIPO-F01) + color por tipo (TIPO-F02) — diferidos de v1.8.
- Frontend/UX de HC (wizard PatientDrawer, render prequirúrgico) → Phase 66 (HCUI-01/02).
</content>
