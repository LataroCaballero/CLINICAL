---
phase: 36-drag-and-drop-warning-infrastructure
verified: 2026-05-25T22:45:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
human_verification:
  - test: "Arrastrar paciente SIN presupuesto a columna PRESUPUESTO_ENVIADO"
    expected: "Card se mueve a la columna y aparece toast amber 'No hay presupuesto enviado a este paciente'"
    why_human: "Comportamiento visual de drag-and-drop en browser; lógica verificada estáticamente pero la aparición del toast y la posición de la card requieren interacción real"
  - test: "Arrastrar paciente con presupuesto en estado no-ACEPTADO a columna CONFIRMADO"
    expected: "Card se mueve y aparece toast amber 'Ningún presupuesto fue aceptado — verificá antes de confirmar'"
    why_human: "Mismo motivo — comportamiento visual en browser"
  - test: "Simular fallo de backend en drag-and-drop"
    expected: "Card hace snap-back a columna original y aparece toast.error 'No se pudo guardar el movimiento. Intentá de nuevo.'"
    why_human: "Requiere forzar error de red; el mecanismo onSettled está verificado estáticamente pero el snap-back visual necesita confirmación en runtime"
---

# Phase 36: Drag-and-Drop Warning Infrastructure — Verification Report

**Phase Goal:** Implementar la infraestructura de warnings no bloqueantes para el kanban drag-and-drop del CRM, de forma que mover un paciente a etapas críticas (PRESUPUESTO_ENVIADO, CONFIRMADO) dispare un toast amber informativo sin bloquear el movimiento.

**Verified:** 2026-05-25T22:45:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `getEtapaWarning` retorna el warning correcto cuando targetEtapa es PRESUPUESTO_ENVIADO y presupuesto === null | VERIFIED | `crm-warnings.ts` line 7: exact condition and exact string present |
| 2 | `getEtapaWarning` retorna el warning correcto cuando targetEtapa es CONFIRMADO y presupuesto?.estado !== 'ACEPTADO' | VERIFIED | `crm-warnings.ts` line 10: optional chaining covers null and non-ACEPTADO in one condition |
| 3 | `getEtapaWarning` retorna null para cualquier otra combinación etapa/estado | VERIFIED | `crm-warnings.ts` line 13: `return null` as fallthrough |
| 4 | `KanbanPatient` incluye el campo `flujo` tipado como union literal | VERIFIED | `useCRMKanban.ts` line 46: `flujo: 'CIRUGIA' \| 'TRATAMIENTO' \| 'PENDIENTE' \| null` |
| 5 | El usuario puede mover una card a cualquier columna excepto PERDIDO sin restricción de negocio | VERIFIED | `KanbanBoard.tsx` lines 169-188: move optimista ejecuta sin guard; solo PERDIDO tiene early return a modal |
| 6 | Al soltar en PRESUPUESTO_ENVIADO/CONFIRMADO el toast amber aparece antes de `updateEtapa` | VERIFIED | `KanbanBoard.tsx` lines 172-174: `getEtapaWarning` + `toast.warning` ejecutan síncronamente antes del `updateEtapa` call |
| 7 | El movimiento no se bloquea cuando aparece el warning | VERIFIED | Lines 176-188: `updateEtapa` se llama incondicionalmente después del toast check — no `return` ni `if` que interrumpa el flow |
| 8 | Snap-back via onSettled preservado — warning no altera rollback | VERIFIED | Lines 179-184: `onSettled` sigue siendo el único punto de cleanup de `pendingMoves` en ambos `updateEtapa` calls (handleDragEnd y handleLossConfirm) |
| 9 | Texto de error actualizado: ya no menciona "requisitos" | VERIFIED | `grep "Verificá los requisitos"` retorna NOT_FOUND en todo `frontend/src/`; línea 186 usa el nuevo texto |

**Score:** 9/9 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/lib/crm-warnings.ts` | Exporta `getEtapaWarning(patient, targetEtapa): string \| null` | VERIFIED | Existe, 14 líneas, sin lógica adicional. Importa tipos desde `@/hooks/useCRMKanban`, no duplica definiciones |
| `frontend/src/hooks/useCRMKanban.ts` | `KanbanPatient` con campo `flujo` tipado | VERIFIED | Campo en línea 46 con comment de trazabilidad `// Phase 36 — expuesto por backend desde Phase 35` |
| `frontend/src/components/crm/KanbanBoard.tsx` | `handleDragEnd` con warning logic y texto de error actualizado | VERIFIED | Import en línea 26, uso en líneas 173-174, texto corregido en línea 186 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `crm-warnings.ts` | `useCRMKanban.ts` | `import { KanbanPatient, EtapaCRM } from "@/hooks/useCRMKanban"` | WIRED | Línea 1 de `crm-warnings.ts` — import presente y tipos consumidos en la firma de `getEtapaWarning` |
| `KanbanBoard.tsx` | `crm-warnings.ts` | `import { getEtapaWarning } from "@/lib/crm-warnings"` | WIRED | Línea 26 (import) + línea 173 (uso en handleDragEnd) — 2 ocurrencias confirmadas |
| `KanbanBoard.tsx:handleDragEnd` | `toast.warning` | `if (warning) toast.warning(warning)` | WIRED | Línea 174: pattern exacto del plan presente y conectado al resultado de `getEtapaWarning` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CRM-01 | 36-02 | El usuario puede mover un paciente a cualquier etapa del kanban mediante drag-and-drop sin restricciones de negocio | SATISFIED | `handleDragEnd` en `KanbanBoard.tsx`: solo PERDIDO tiene gate de modal; todas las demás etapas procesan el move incondicionalmente. Ningún guard de validación bloquea el drop. |
| CRM-02 | 36-01, 36-02 | Al mover a PRESUPUESTO_ENVIADO sin presupuesto existente, aparece toast no bloqueante | SATISFIED | `getEtapaWarning` retorna el string exacto del requisito; `KanbanBoard.tsx` lo pasa a `toast.warning`. El move no se cancela. |
| CRM-03 | 36-01, 36-02 | Al mover a CONFIRMADO sin presupuesto aceptado, aparece toast no bloqueante | SATISFIED | `getEtapaWarning` cubre null y non-ACEPTADO con optional chaining; integrado identicamente a CRM-02 en `handleDragEnd`. |

No requirements orphaned. Los tres IDs declarados en los PLAN frontmatter coinciden con los marcados en REQUIREMENTS.md.

---

## Anti-Patterns Found

Ninguno. Los tres archivos modificados en la fase están limpios de TODO/FIXME/placeholder. No hay stubs ni implementaciones vacías.

---

## Commits Verified

Todos los hashes documentados en los SUMMARY files existen en el repositorio:

| Hash | Mensaje |
|------|---------|
| `75326b1` | feat(36-01): add getEtapaWarning utility function |
| `ea71822` | feat(36-01): add flujo field to KanbanPatient interface |
| `23b4391` | feat(36-02): integrate getEtapaWarning into handleDragEnd |
| `0a34201` | chore(36-02): mark human-verify checkpoint approved |

---

## Human Verification Required

El checkpoint de browser fue aprobado por el usuario durante la ejecución de Plan 02 (commit `0a34201`). Las siguientes verificaciones visuales son opcionales en re-test pero pueden realizarse si hay duda:

### 1. Toast amber PRESUPUESTO_ENVIADO

**Test:** Arrastrar una card de paciente sin presupuesto a la columna "Presupuesto Enviado"
**Expected:** La card se mueve a la columna destino Y aparece un toast amber con el texto exacto "No hay presupuesto enviado a este paciente"
**Why human:** Comportamiento visual en browser; la lógica está verificada estáticamente pero el rendering del toast y el movimiento de la card requieren interacción

### 2. Toast amber CONFIRMADO

**Test:** Arrastrar una card cuyo presupuesto no está en estado ACEPTADO a la columna "Confirmado"
**Expected:** La card se mueve Y aparece toast amber "Ningún presupuesto fue aceptado — verificá antes de confirmar"
**Why human:** Mismo motivo

### 3. Snap-back en error de backend

**Test:** Forzar un error de red (desconectar backend) y arrastrar una card
**Expected:** La card vuelve a su columna original y aparece toast.error "No se pudo guardar el movimiento. Intentá de nuevo."
**Why human:** Requiere simular condición de error; el mecanismo onSettled fue verificado estáticamente

---

## Summary

La fase 36 alcanzó su objetivo. Los tres artefactos existen, son sustantivos, y están conectados:

1. `crm-warnings.ts` es una función pura de 14 líneas que cubre exactamente los 6 casos especificados en el CONTEXT.md — sin lógica extra, sin tipos duplicados.
2. `useCRMKanban.ts` tiene el campo `flujo` con el tipo union literal correcto (no un enum de Prisma), consistente con el patrón del proyecto.
3. `KanbanBoard.tsx` integra el warning de forma no bloqueante: el toast se dispara síncronamente antes de `updateEtapa`, el move procede incondicionalmente, y el snap-back via `onSettled` quedó intacto.

Los tres requirements de la fase (CRM-01, CRM-02, CRM-03) están satisfechos. TypeScript compila limpio. La cadena de imports está completa y verificada. El texto de error obsoleto "Verificá los requisitos" fue eliminado del codebase.

---

_Verified: 2026-05-25T22:45:00Z_
_Verifier: Claude (gsd-verifier)_
