---
phase: 49-frontend-filtro-y-color-coding-de-estado
verified: 2026-06-22T21:00:00Z
status: human_needed
score: 5/6 must-haves verified
re_verification: false
human_verification:
  - test: "Verificacion visual del filtro source B en navegador"
    expected: "Filas CIRUGIA sin ultimoTratamiento no aparecen en la planilla; filas CIRUGIA con tratamiento siguen visibles; presencia en kanban CRM intacta"
    why_human: "El filtro es client-side y depende de datos reales de la base de datos. La correctitud del comportamiento de filtrado no puede verificarse con grep — requiere datos reales con source B vacío y no-vacío."
  - test: "Verificacion visual de chips EN_ESPERA y SIENDO_ATENDIDO"
    expected: "EN_ESPERA aparece con chip violeta/bg-violet-100 y label 'En espera'; SIENDO_ATENDIDO aparece con chip celeste/bg-sky-100 y label 'Atendiendo'; colores coinciden con dots del calendario"
    why_human: "Requiere turnos activos en esos estados para ver los chips en la planilla. La logica del helper es correcta pero la presencia visual en datos reales no puede verificarse estaticamente."
---

# Phase 49: Frontend Filtro y Color-Coding de Estado — Verification Report

**Phase Goal:** La planilla muestra unicamente pacientes con tratamiento real (CIRUGIA sin tratamiento excluidos automaticamente), y los chips de estado son legibles con color semantico.
**Verified:** 2026-06-22T21:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Un turno source B sin ultimoTratamiento NO aparece como fila | VERIFIED | Linea 65: `isFuenteB(t) && t.ultimoTratamiento != null` — null excluye la fila |
| 2 | Un turno source A (flujoPaciente=TRATAMIENTO) aparece siempre | VERIFIED | Linea 64: `t.tipoTurno.flujoPaciente === "TRATAMIENTO"` — sin condicion adicional, source A siempre pasa |
| 3 | Un turno source B CON ultimoTratamiento sigue apareciendo (estado dual preservado) | VERIFIED | Predicado OR: source B con `!= null` pasa el filtro. Backend no modificado. Filtro es client-side only (comentario linea 60-61 confirma intencion) |
| 4 | El chip de Estado muestra color y label humanizado para los 7 valores de EstadoTurno | VERIFIED | `estadoTurno.ts` cubre CONFIRMADO, PENDIENTE, FINALIZADO, AUSENTE, CANCELADO, EN_ESPERA, SIENDO_ATENDIDO + fallback neutro. Chip se renderiza via `getEstadoTurnoChip(turno.estado)` en linea 259 |
| 5 | EN_ESPERA y SIENDO_ATENDIDO tienen chip violeta/celeste con label humanizado | VERIFIED | `estadoTurno.ts` lineas 18-23: EN_ESPERA -> `bg-violet-100 text-violet-700` / "En espera"; SIENDO_ATENDIDO -> `bg-sky-100 text-sky-700` / "Atendiendo" |
| 6 | El conteo del header se calcula sobre filas visibles post-filtro y agrupa por realizados/programados/cancelados | VERIFIED | Lineas 88-118: `countByEstado` deriva de `tratamientoTurnos` (post-filtro). Grupos: realizados=FINALIZADO; programados=PENDIENTE+CONFIRMADO+EN_ESPERA+SIENDO_ATENDIDO; cancelados=CANCELADO+AUSENTE |

**Score:** 6/6 truths verified by static analysis

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/lib/estadoTurno.ts` | Helper puro cubriendo los 7 EstadoTurno + fallback neutro | VERIFIED | Existe, 28 lineas, switch con los 7 casos + default, sin imports de React ni NestJS |
| `frontend/src/app/dashboard/pacientes/components/TratamientosTab.tsx` | Planilla con filtro source B, chips semantizados y header re-mapeado | VERIFIED | Existe, 311 lineas, contiene "estadoTurno" (import + uso), contiene "EN_ESPERA" via helper |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `TratamientosTab.tsx` | `frontend/src/lib/estadoTurno.ts` | `import { getEstadoTurnoChip } from "@/lib/estadoTurno"` | WIRED | Linea 10: import presente. Linea 259: usado en render del chip |
| `TratamientosTab predicado de filtrado` | `t.ultimoTratamiento` | `isFuenteB(t) && t.ultimoTratamiento != null` | WIRED | Linea 65: predicado exacto del plan presente |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| TRAT-04 | 49-01-PLAN.md | Paciente CIRUGIA sin tratamiento real (source B vacio) no aparece en la planilla | SATISFIED | Filtro `isFuenteB(t) && t.ultimoTratamiento != null` en linea 65 excluye source B con null |
| TRAT-05 | 49-01-PLAN.md | Paciente CIRUGIA con tratamiento real sigue visible; presencia en kanban CRM intacta (estado dual) | SATISFIED | Source B con `!= null` pasa el filtro OR; filtro es puramente client-side sin mutacion de backend |
| TRAT-06 | 49-01-PLAN.md | Chips de Estado con color-coding semantico y labels humanizados para los 7 EstadoTurno | SATISFIED | Helper `getEstadoTurnoChip` cubre los 7 valores + fallback; chip renderizado via `chip.label`/`chip.className` en lineas 259-270 |

No orphaned requirements: REQUIREMENTS.md mapea exactamente TRAT-04, TRAT-05, TRAT-06 a Phase 49 y los tres estan cubiertos por el plan 49-01.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | — |

No anti-patterns found. Sin TODOs, FIXMEs, placeholders, constantes legacy (ESTADO_LABEL/ESTADO_BADGE_CLASS eliminadas), ni `{turno.estado}` crudo en render. El `turno.estado === "CANCELADO"` en linea 233 es correcto (control de opacity, no render de label).

### Commits Verificados

| Hash | Descripcion | Existe en git |
|------|-------------|---------------|
| `29a7c7a` | feat(49-01): add getEstadoTurnoChip helper | Si |
| `91e1d4c` | feat(49-01): wire estadoTurno helper, source-B null filter, header remap | Si |

### Human Verification Required

#### 1. Filtro source B con datos reales

**Test:** En `/dashboard/pacientes` tab Tratamientos, seleccionar un profesional y mes con pacientes CIRUGIA que tienen Consulta→Tratamiento sin contenido (ultimoTratamiento = null en la API).
**Expected:** Esas filas NO aparecen en la planilla. Filas con tratamiento real siguen visibles.
**Why human:** El filtro opera sobre datos reales de la base de datos. La logica del predicado es correcta estaticamente, pero la correctitud del comportamiento requiere datos con source B null y no-null presentes simultaneamente.

#### 2. Chips EN_ESPERA y SIENDO_ATENDIDO en planilla real

**Test:** Encontrar o crear un turno en estado EN_ESPERA o SIENDO_ATENDIDO que aparezca en la planilla de Tratamientos. Confirmar color del chip.
**Expected:** EN_ESPERA muestra chip violeta con "En espera"; SIENDO_ATENDIDO muestra chip celeste con "Atendiendo". Colores coinciden con los dots del calendario en `/dashboard/turnos`.
**Why human:** Requiere datos reales en esos estados para ver los chips renderizados. La logica del helper es correcta pero la aparicion visual no puede verificarse sin datos de prueba.

### Gaps Summary

No hay gaps de implementacion. Todos los truths se verifican estaticamente. Los dos items de verificacion humana corresponden a comportamiento en datos reales (no defectos de codigo), y ya habian sido marcados como checkpoint:human-verify en el plan (Task 3) donde el usuario aprobo con "approved". La verificacion automatizada esta completa.

---

_Verified: 2026-06-22T21:00:00Z_
_Verifier: Claude (gsd-verifier)_
