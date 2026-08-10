---
phase: 61-backend-schema-decoupling-e-indicaciones
plan: 02
subsystem: backend/paciente-portal
tags: [portal, consentimiento, indicaciones, decoupling, set-once]
requires:
  - 61-01 (Paciente.indicacionesLeidasAt column + nullable ConsentimientoFirmado.indicacionesLeidasAt)
provides:
  - "firmarConsentimiento decoupled from indicaciones state"
  - "POST paciente-portal/public/indicaciones/acuse (portal-scoped, set-once)"
  - "registrarAcuseIndicaciones(pacienteId) service method"
affects:
  - backend/src/modules/paciente-portal/paciente-portal.service.ts
  - backend/src/modules/paciente-portal/paciente-portal.controller.ts
  - backend/src/modules/paciente-portal/dto/firmar-consentimiento-portal.dto.ts
  - backend/src/modules/paciente-portal/paciente-portal.service.spec.ts
tech-stack:
  added: []
  patterns:
    - "Prisma updateMany with a null-guard WHERE clause for set-once idempotent writes"
    - "Portal identity resolved exclusively from req.user.pacienteId (PortalJwtGuard, per-route)"
key-files:
  created: []
  modified:
    - backend/src/modules/paciente-portal/paciente-portal.service.ts
    - backend/src/modules/paciente-portal/paciente-portal.controller.ts
    - backend/src/modules/paciente-portal/dto/firmar-consentimiento-portal.dto.ts
    - backend/src/modules/paciente-portal/paciente-portal.service.spec.ts
decisions:
  - "Task 1 and Task 2 committed as a single atomic commit — the removals and the new method share the same docstring/step-renumbering edits in firmarConsentimiento, and splitting them would have required an intermediate broken state (see Deviations)."
metrics:
  duration: "~55 min"
  completed: 2026-07-09
---

# Phase 61 Plan 02: Backend Decoupling — firmarConsentimiento + Acuse de Indicaciones Summary

Desacoplé la firma del consentimiento del checkbox de indicaciones (CONS-11) y agregué el endpoint portal-scoped `POST indicaciones/acuse` con escritura set-once idempotente sobre `Paciente.indicacionesLeidasAt` (INDIC-03).

## What Was Built

**Task 1 — Desacoplar `firmarConsentimiento` + quitar `indicacionesLeidas` del DTO (CONS-11, D-02, D-03):**
- Eliminado el guard `if (!dto.indicacionesLeidas) throw new BadRequestException(...)` de `firmarConsentimiento` (`paciente-portal.service.ts`).
- Eliminada la key `indicacionesLeidasAt: new Date()` del `consentimientoFirmado.create({ data: {...} })` — compila porque la columna es `DateTime?` desde 61-01.
- Renumerados los comentarios de pasos (1→7, antes 1→8) y actualizado el docstring del método para dejar de anunciar el acople D-11.
- Eliminado el campo `@IsBoolean() indicacionesLeidas: boolean;` del DTO `FirmarConsentimientoPortalDto`; removido `IsBoolean` del import de `class-validator` (quedó sin uso); docstring de la clase actualizado (TRES campos → DOS).
- El controller (`@Post('consentimiento/firmar')`) no requirió cambios: el whitelist `ValidationPipe` per-route ya strippea cualquier campo extra que un front viejo mande.

**Task 2 — Endpoint de acuse portal-scoped + método set-once (INDIC-03, D-06, D-07):**
- Nuevo método `registrarAcuseIndicaciones(pacienteId: string): Promise<{ ok: true }>` en el service: `prisma.paciente.updateMany({ where: { id: pacienteId, indicacionesLeidasAt: null }, data: { indicacionesLeidasAt: new Date() } })`. `updateMany` (no `update`) es deliberado — permite el filtro `indicacionesLeidasAt: null` para set-once sin lanzar cuando 0 filas matchean (reintentos idempotentes).
- Nueva ruta `@UseGuards(PortalJwtGuard) @Post('indicaciones/acuse')` en el controller, declarada junto a las otras rutas autenticadas estáticas (después de `@Post('consulta')`, antes de `@Post('consentimiento/firmar')`) — sin colisión con las rutas param `:token` (métodos/paths distintos). Sin body/DTO (D-07): la identidad viene exclusivamente de `req.user.pacienteId` (JWT scope `portal-paciente`).

## Deviations from Plan

### Process deviation (not a code deviation)

**1. Tasks 1 y 2 commiteados en un solo commit atómico (no dos commits separados).**
- **Motivo:** Ambas tareas modifican el mismo método `firmarConsentimiento` en el mismo archivo con ediciones de docstring y renumeración de pasos entrelazadas (el docstring de Task 1 ya anticipa el nuevo endpoint de Task 2; el renumerado de pasos 1-7 de Task 1 es prerequisito visual para insertar el nuevo método justo después). Separar en dos commits habría requerido escribir el archivo dos veces con un estado intermedio artificial (docstring mencionando un método que aún no existe, o viceversa).
- **Impacto:** Ninguno en la funcionalidad. Ambos criterios de aceptación (Task 1 y Task 2) están cubiertos por el mismo commit `9335cd5`.
- **Archivos:** `paciente-portal.service.ts`, `paciente-portal.controller.ts`, `dto/firmar-consentimiento-portal.dto.ts`, `paciente-portal.service.spec.ts`.
- **Commit:** `9335cd5`

### Environment deviation — automated test/build verification blocked (documented per environment_notes)

**2. `npm test -- paciente-portal.service.spec` y `npm run build`/`tsc --noEmit` no pudieron ejecutarse — hang reproducible a nivel de entorno, no de código.**
- **Qué se intentó (todos colgados con CPU ~0%, consistente con el hang documentado en environment_notes):**
  - `npx jest paciente-portal.service.spec` (foreground y background)
  - `npx jest paciente-portal.service.spec --runInBand`
  - `npx jest paciente-portal.service.spec --runInBand --forceExit --detectOpenHandles --testTimeout=20000`
  - `npm run test -- paciente-portal.service.spec`
  - `npx jest diagnosticos.service.spec --runInBand` (spec de control, no relacionado a este plan — también colgó, confirmando que el hang es del entorno/proceso node, no de mi código)
  - `npx tsc --noEmit` (también colgó)
- **Diagnóstico:** `sample` sobre el proceso jest colgado mostró el `WorkerThreadsTaskRunner` bloqueado indefinidamente en `uv__io_poll`/`kevent`, nunca progresando — coincide exactamente con el "near-zero CPU hang" descrito en `environment_notes` para `nest build`/`tsc` en sesiones previas de este mismo entorno.
- **Mitigación aplicada:** Verificación manual exhaustiva en su lugar:
  1. Los 4 archivos modificados pasan `ts.transpileModule` (chequeo sintáctico vía la API del compilador TypeScript, sin colgarse) — confirma ausencia de errores de sintaxis.
  2. El campo `Paciente.indicacionesLeidasAt` y `ConsentimientoFirmado.indicacionesLeidasAt` (nullable) están confirmados presentes en `schema.prisma` (líneas 217 y 1438) y el Prisma Client generado es importable (`node -e "require('./node_modules/.prisma/client')"` resuelve `PrismaClient`).
  3. Revisión manual línea por línea de `firmarConsentimiento`, `registrarAcuseIndicaciones`, la nueva ruta del controller y el spec extendido contra el patrón exacto especificado en `61-PATTERNS.md` (secciones 3-6) y los `<action>`/`<behavior>` del plan — todos los invariantes de seguridad (identidad desde JWT, set-once, whitelist pipe) están implementados como se especificó.
  4. Grep de los 3 checks automatizados del plan (`indicacionesLeidas` fuera del DTO, guard `Debe confirmar...` fuera del service, `indicacionesLeidasAt: null` presente para el set-once) — todos pasan.
- **Riesgo residual:** Los tests nuevos en `paciente-portal.service.spec.ts` no se ejecutaron realmente contra Jest en esta sesión. El código fue revisado exhaustivamente y sigue el patrón exacto de los tests existentes en el mismo archivo (mismo estilo de mocks, mismas aserciones `toHaveBeenCalledWith`), pero **se recomienda una ejecución real de `npm test -- paciente-portal.service.spec` en un entorno sin el hang antes de dar por cerrado el plan**, o como parte de la verificación de fase 61.

## Self-Check: PASSED

- FOUND: backend/src/modules/paciente-portal/paciente-portal.service.ts (modified, commit 9335cd5)
- FOUND: backend/src/modules/paciente-portal/paciente-portal.controller.ts (modified, commit 9335cd5)
- FOUND: backend/src/modules/paciente-portal/dto/firmar-consentimiento-portal.dto.ts (modified, commit 9335cd5)
- FOUND: backend/src/modules/paciente-portal/paciente-portal.service.spec.ts (modified, commit 9335cd5)
- FOUND: commit 9335cd5 in git log
