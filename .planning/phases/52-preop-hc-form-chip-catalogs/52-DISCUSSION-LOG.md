# Phase 52: PREOP HC Form + Chip Catalogs - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-26
**Phase:** 52-preop-hc-form-chip-catalogs
**Areas discussed:** Antecedentes (catálogo), Estructura del formulario, Compartir link del portal, Persistencia/consentimiento, Seed de antecedentes

---

## Antecedentes — catálogo faltante

| Option | Description | Selected |
|--------|-------------|----------|
| Crear AntecedenteCatalogoPro + migración | Modelo nuevo per-profesional (patrón Alergia/Medicamento) + migración + seed. Cumple PREOP-04 (learning real). | ✓ |
| Lista semilla compartida + learning a condiciones | Sin modelo nuevo; "Otro" sólo a Paciente.condiciones[]. No cumple PREOP-04 estrictamente. | |
| Discutámoslo a fondo | Analizar trade-offs antes de decidir. | |

**User's choice:** Crear AntecedenteCatalogoPro + migración
**Notes:** Se acepta la migración extra (F51 "big-bang" no la incluyó) a cambio de consistencia con alergias/medicación y learning real per-profesional.

---

## Estructura del formulario (PREOP-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Una página seccionada (acordeón/scroll) | Todas las secciones en una vista; menos clicks para el staff de escritorio. | ✓ |
| Wizard multi-paso | Pasos secuenciales "Paso X de N"; más lento; el wizard mobile-first es del portal (F55). | |
| Vos decidís | Que el planner elija. | |

**User's choice:** Una página seccionada
**Notes:** "Paso a paso" del roadmap se interpreta como "estructurado por secciones", no como wizard.

---

## Compartir link del portal (PREOP-11/12)

| Option | Description | Selected |
|--------|-------------|----------|
| Stub UI ahora, cablear en F54 | UI contra placeholder; token real diferido. (Elección inicial.) | |
| Generar token real ahora (sha256) | F52 computa el hash, persiste en portalToken, arma URL real. Cumple SC#5. | ✓ |

**User's choice:** Generar token real ahora (hash SHA-256)
**Notes:** Decisión revisada tras señalar que el stub no cumple el Success Criteria #5 de la propia fase y que generar el token es barato (campo `portalToken` ya existe desde F51). F54 reusa el mismo token.

---

## Persistencia en perfil + consentimiento informado (PREOP-05/06/07/10)

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-cargar perfil + unión-dedup; "informado" en JSONB | Pre-seleccionar chips del perfil; unir-dedup al guardar; timestamp de consentimiento informado en el JSONB de la entrada (distinto de firmado). | ✓ |
| Reemplazar perfil; reusar consentimientoFirmadoAt | Sobrescribe arrays; mezcla "informado" con "firmado". | |
| Discutámoslo | — | |

**User's choice:** Pre-cargar perfil + unión-dedup; "informado" en JSONB de la entrada
**Notes:** Separación explícita "informado" (F52) vs "firmado" (F56, escribe consentimientoFirmadoAt).

---

## Seed inicial de AntecedenteCatalogoPro

| Option | Description | Selected |
|--------|-------------|----------|
| Reusar PREDEFINED de CondicionesChips | Hipertensión, Diabetes, Asma, Enfermedad cardíaca, Obesidad, Artritis, Alergia severa, Hipotiroidismo, Cannabis, Epilepsia. | ✓ |
| Lista prequirúrgica más clínica | Lista nueva enfocada en riesgo quirúrgico. | |
| Vos decidís | Que el planner elija. | |

**User's choice:** Reusar PREDEFINED de CondicionesChips
**Notes:** Coherente con la lista que el equipo ya usaba para condiciones.

---

## Claude's Discretion

- Nombre/ubicación del método de learning en backend (catalogo-hc.service vs historia-clinica.service) — seguir F46.
- Shape del payload de ítems nuevos hacia el backend (flags en DTO vs detección server-side) — como F46.
- Estilo visual del acordeón/secciones y del chip "nuevo" antes de guardar.
- Key exacta del timestamp de consentimiento informado dentro del JSONB.
- Librería de QR (ninguna instalada todavía).

## Deferred Ideas

- Reporte/vista de estudios complementarios pendientes (FUT-04) — fuera de v1.12.
- Campo `adicciones[]` mencionado en research — no es requisito de v1.12; sólo si surge naturalmente.
- Verificación de identidad por DNI, rate-limit y DTOs estrictos del portal — F54.
