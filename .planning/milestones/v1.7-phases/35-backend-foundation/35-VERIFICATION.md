---
phase: 35-backend-foundation
verified: 2026-05-24T16:30:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Phase 35: Backend Foundation Verification Report

**Phase Goal:** Establecer la infraestructura backend que soporta el CRM flexible — removiendo restricciones de validación que bloquean movimiento manual, exponiendo datos necesarios en endpoints existentes, e implementando el guard forward-only que protege decisiones manuales de reversiones automáticas.
**Verified:** 2026-05-24T16:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Un PATCH manual a CONFIRMADO es aceptado sin error aunque el paciente no tenga presupuesto ACEPTADO | VERIFIED | `updateEtapaCRM` en pacientes.service.ts líneas 503-577: el bloque `if (dto.etapaCRM === EtapaCRM.CONFIRMADO)` fue eliminado; el `findUnique` ya no incluye `presupuestos` anidado |
| 2  | El PATCH a PERDIDO sin motivoPerdida sigue siendo rechazado (integridad de datos) | VERIFIED | Líneas 513-517 de pacientes.service.ts: validación `if (dto.etapaCRM === EtapaCRM.PERDIDO && !dto.motivoPerdida)` intacta |
| 3  | El endpoint GET /kanban incluye el campo flujo en cada paciente de la respuesta | VERIFIED | `flujo: true` en select (línea 610 de pacientes.service.ts); `flujo: p.flujo ?? null` en el mapping (línea 685) |
| 4  | Al enviar un presupuesto, la auto-transición a PRESUPUESTO_ENVIADO no sobreescribe si el paciente ya está en CONFIRMADO o PROCEDIMIENTO_REALIZADO | VERIFIED | `maybeCRMUpdateEnviado` con `isAutoTransitionBlocked(pacienteCRMEnviado?.etapaCRM, EtapaCRM.PRESUPUESTO_ENVIADO)` en presupuestos.service.ts líneas 246-252 |
| 5  | Al aceptar un presupuesto (admin o token), la auto-transición a CONFIRMADO no sobreescribe si el paciente ya está en PROCEDIMIENTO_REALIZADO | VERIFIED | `maybeCRMUpdateAceptar` (líneas 192-198) y `maybeCRMUpdateByToken` (líneas 610-612) en presupuestos.service.ts, ambos usando `isAutoTransitionBlocked(..., EtapaCRM.CONFIRMADO)` |
| 6  | Al rechazar un presupuesto por token, la auto-transición a PERDIDO no se aplica si el paciente ya está en CONFIRMADO o PROCEDIMIENTO_REALIZADO | VERIFIED | `etapasProtegidas: EtapaCRM[] = [EtapaCRM.CONFIRMADO, EtapaCRM.PROCEDIMIENTO_REALIZADO]` + `bloqueadoRechazarByToken` en presupuestos.service.ts líneas 671-675 |
| 7  | Al crear un turno, la auto-transición a TURNO_AGENDADO no se aplica si el paciente ya está en TURNO_AGENDADO o más avanzado | VERIFIED | `if (!isAutoTransitionBlocked(pacienteCRM?.etapaCRM, EtapaCRM.TURNO_AGENDADO))` en turnos.service.ts línea 159; `etapasIniciales` whitelist eliminada (grep devuelve 0 matches) |
| 8  | En todos los casos, el update del estado del presupuesto SIEMPRE ocurre — el guard solo afecta el update de etapaCRM del paciente | VERIFIED | En todos los `$transaction`: `presupuesto.update` y `contactoLog.create` están fuera del spread condicional; solo `maybeCRMUpdate*` es condicional |

**Score:** 8/8 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/modules/pacientes/pacientes.service.ts` | updateEtapaCRM sin validación CONFIRMADO; getKanban con campo flujo | VERIFIED | Bloque CONFIRMADO eliminado; `flujo: true` en select; `flujo: p.flujo ?? null` en mapping |
| `backend/src/modules/presupuestos/presupuestos.service.ts` | Guard forward-only en marcarEnviado, aceptar, aceptarByToken, rechazarByToken | VERIFIED | `isAutoTransitionBlocked` aparece en 4 call sites; `ETAPA_ORDEN` definida module-level (líneas 18-26); `etapasProtegidas` en rechazarByToken |
| `backend/src/modules/turnos/turnos.service.ts` | Guard forward-only reemplazando whitelist etapasIniciales | VERIFIED | `isAutoTransitionBlocked` en línea 159; `etapasIniciales` no existe en el archivo; `ETAPA_ORDEN` definida module-level (líneas 29-37) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| pacientes.controller.ts PATCH /pacientes/:id/etapa-crm | pacientes.service.ts updateEtapaCRM | sin cambios en el controller | WIRED | Controller no fue modificado; método `updateEtapaCRM` sigue existiendo y aceptando el DTO |
| pacientes.controller.ts GET /kanban | pacientes.service.ts getKanban | flujo: true en select + flujo: p.flujo en mapping | WIRED | `flujo: true` confirmado en select (línea 610); `flujo: p.flujo ?? null` confirmado en mapping (línea 685) |
| presupuestos.service.ts marcarEnviado | ETAPA_ORDEN constant | isAutoTransitionBlocked(pacienteCRM, EtapaCRM.PRESUPUESTO_ENVIADO) | WIRED | Líneas 246-252: findUnique + maybeCRMUpdateEnviado con spread en $transaction |
| presupuestos.service.ts aceptar | ETAPA_ORDEN constant | isAutoTransitionBlocked(pacienteCRM, EtapaCRM.CONFIRMADO) | WIRED | Líneas 192-198: findUnique + maybeCRMUpdateAceptar con spread en $transaction |
| presupuestos.service.ts aceptarByToken | ETAPA_ORDEN constant | isAutoTransitionBlocked(paciente.etapaCRM, EtapaCRM.CONFIRMADO) | WIRED | Líneas 596-612: select extendido a incluir etapaCRM; maybeCRMUpdateByToken con spread |
| presupuestos.service.ts rechazarByToken | etapasProtegidas list | bloqueadoRechazarByToken usando includes() | WIRED | Líneas 662-675: select extendido; guard especial correcto (PERDIDO fuera de ETAPA_ORDEN) |
| turnos.service.ts crearTurno | ETAPA_ORDEN constant | isAutoTransitionBlocked reemplaza whitelist etapasIniciales | WIRED | Línea 159: condición correcta; etapasIniciales eliminada confirmado |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CRM-01 | 35-01-PLAN.md | El usuario puede mover un paciente a cualquier etapa del kanban mediante drag-and-drop sin restricciones de negocio | SATISFIED | Bloque validación CONFIRMADO eliminado de updateEtapaCRM; solo motivoPerdida requerida para PERDIDO (integridad de datos, no restricción de negocio) |
| CRM-04 | 35-02-PLAN.md | Las transiciones automáticas del sistema no sobreescriben etapas más avanzadas puestas a mano | SATISFIED | Guard `isAutoTransitionBlocked` implementado en 5 call sites: marcarEnviado, aceptar, aceptarByToken, rechazarByToken (presupuestos) y crearTurno (turnos) |

No orphaned requirements — los dos IDs declarados en los PLANs coinciden exactamente con los mapeados a Phase 35 en REQUIREMENTS.md.

---

### Anti-Patterns Found

Ninguno relevante. Los tres `return []` detectados son early-return guards legítimos (input vacío / resultado vacío), no stubs de implementación.

---

### Human Verification Required

Ninguno — toda la lógica es backend puro, verificable mediante análisis estático y TypeScript build. No hay UI, comportamiento real-time, ni servicios externos involucrados en esta fase.

---

### Build Status

TypeScript build (`tsc -p tsconfig.build.json --noEmit`) pasa sin errores. Los cuatro commits documentados en los SUMMARYs existen en el repositorio:
- `eedd5f4` — fix(35-01): remover validación CONFIRMADO de updateEtapaCRM
- `2b6f377` — feat(35-01): agregar campo flujo al endpoint GET /kanban
- `54bbd39` — feat(35-02): implementar guard forward-only en presupuestos.service.ts
- `720da99` — feat(35-02): reemplazar whitelist etapasIniciales por guard forward-only en turnos.service.ts

---

### Summary

La fase 35 alcanzó su objetivo completamente. Los tres pilares del goal están presentes y funcionales en el codebase:

1. **Restricciones de validación removidas (CRM-01):** `updateEtapaCRM` ya no bloquea el movimiento a CONFIRMADO por ausencia de presupuesto ACEPTADO. El select de `findUnique` fue limpiado. La validación de `motivoPerdida` para PERDIDO permanece intacta como integridad de datos.

2. **Datos expuestos en endpoints existentes (CRM-01):** `getKanban` devuelve `flujo` por paciente tanto en el select como en el response mapping, habilitando el FlujoBadge de Phase 37.

3. **Guard forward-only implementado (CRM-04):** `ETAPA_ORDEN` + `isAutoTransitionBlocked` definidos como module-level helpers en dos archivos de servicio (duplicación intencional para evitar acoplamiento cross-module). Cinco call sites protegidos con el patrón `maybeCRMUpdate` (spread condicional en `$transaction`). El guard especial para PERDIDO usa `etapasProtegidas` explícitas en lugar de `ETAPA_ORDEN` por diseño (PERDIDO es estado lateral, no lineal).

---

_Verified: 2026-05-24T16:30:00Z_
_Verifier: Claude (gsd-verifier)_
