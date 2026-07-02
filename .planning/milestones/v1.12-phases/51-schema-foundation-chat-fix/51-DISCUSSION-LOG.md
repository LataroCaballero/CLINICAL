# Phase 51: Schema Foundation + Chat Fix - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-25
**Phase:** 51-schema-foundation-chat-fix
**Areas discussed:** Alcance de la limpieza (CHAT-02), Política tras la alerta (CHAT-01), Valores seed de catálogos, Forma de almacenar estudios

---

## Alcance de la limpieza del chat (CHAT-02)

| Option | Description | Selected |
|--------|-------------|----------|
| DELETE todos esSistema=true | Borra todo el spam del scheduler incl. PERSONALIZADA; simple, completo, idempotente, cascade-safe; ningún mensaje legítimo usa esSistema=true | ✓ |
| Solo match de texto 'Seguimiento CRM%' | Conservador; deja las PERSONALIZADA que también se re-spamean → incompleto | |
| Soft-hide en vez de borrar | Flag 'oculto' + filtros en queries; reversible pero más complejo | |

**User's choice:** DELETE todos esSistema=true (Recomendado)
**Notes:** Decisión respaldada por verificación de código: único creador de `esSistema:true` en prod es el scheduler bugueado; presupuestos crean mensajes con `esSistema=false`; `MensajeLectura` cascade-safe.

---

## Política tras la alerta (CHAT-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Una alerta, silencio hasta completar | Coincide con SC#1; implementación más simple; la fija el roadmap | ✓ |
| Re-nudge suave periódico | Re-alertar cada N días; cambiaría SC#1 → ajuste deliberado, no parte del fix | |

**User's choice:** Una alerta, silencio hasta completar (Recomendado)
**Notes:** Re-nudge queda como idea diferida para un milestone futuro.

---

## Valores seed de catálogos

| Option | Description | Selected |
|--------|-------------|----------|
| Confirmar listas propuestas | Alergias: Penicilina/Látex/AINEs/Yodo/Contraste; Medicación: Anticoagulantes/Corticoides/Metformina/Levotiroxina/Aspirina/Enalapril; seed idempotente esSistema=true | ✓ |
| Ajustar las listas | Sumar/quitar valores específicos | |
| Arrancar vacíos | Sin seed, todo vía 'Otro' | |

**User's choice:** Confirmar listas propuestas (Recomendado)
**Notes:** —

---

## Forma de almacenar estudios complementarios

| Option | Description | Selected |
|--------|-------------|----------|
| Campo Json dedicado y consultable | Json propio en la entrada HC, shape {laboratorio, ecg, imagenes[]}, consultable vía Postgres JSON; sin backfill futuro | ✓ |
| JSONB dentro del contenido HC | Propuesta del research; más simple ahora pero requiere backfill para FUT-04; no es realmente consultable | |
| Tabla estructurada EstudioComplementario | Máxima consultabilidad pero over-engineering para un checklist en v1.12 | |

**User's choice:** Campo Json dedicado y consultable (Recomendado)
**Notes:** DESVIACIÓN del research (que proponía JSONB embebido). Researcher/planner deben definir ubicación exacta y shape final, manteniendo la intención: campo Json propio, consultable, fuera del blob `contenido` libre.

---

## Claude's Discretion

- Nombres/ubicación exactos de las columnas nuevas del schema, forma del migration file, orden de operaciones dentro de la migración.
- Resto de columnas del milestone (medicacion[], adicciones[], consentimientoFirmadoAt, portalToken hasheado, campos de staging, origenPaciente, autorId nullable) arrastradas del research salvo donde D-09 (estudios) lo sobreescribe.

## Deferred Ideas

- Re-nudge periódico de tareas de seguimiento (choca con SC#1).
- Reporte/vista de estudios pendientes (FUT-04).
- Endpoint admin opcional para archivar spam (la migración one-shot alcanza).
