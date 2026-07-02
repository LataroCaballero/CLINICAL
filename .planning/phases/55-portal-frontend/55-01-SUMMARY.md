---
phase: 55-portal-frontend
plan: "01"
subsystem: backend/paciente-portal
tags: [chat, backend, nestjs, prisma, tdd, security]
dependency_graph:
  requires: []
  provides: [POST /paciente-portal/public/consulta]
  affects: [paciente-portal.controller, paciente-portal.service, MensajeInterno]
tech_stack:
  added: []
  patterns: [narrow DTO con class-validator, per-route ValidationPipe whitelist, per-route PortalJwtGuard, confined select en create]
key_files:
  created:
    - backend/src/modules/paciente-portal/dto/create-consulta-portal.dto.ts
  modified:
    - backend/src/modules/paciente-portal/paciente-portal.service.ts
    - backend/src/modules/paciente-portal/paciente-portal.service.spec.ts
    - backend/src/modules/paciente-portal/paciente-portal.controller.ts
decisions:
  - crearConsulta usa select acotado { id, createdAt } en mensajeInterno.create para nunca exponer fila completa (SC#4)
  - Verificacion defensiva de existencia del paciente (findUnique antes de create) para manejar JWT de paciente eliminado
  - prioridad omitida en create data para usar default MEDIA del schema (no exponer en DTO, no mass-assignable)
metrics:
  duration: "8 min"
  completed: "2026-07-01"
  tasks_completed: 3
  files_changed: 4
---

# Phase 55 Plan 01: Backend Endpoint POST /paciente-portal/public/consulta (CHAT-04) Summary

**One-liner:** DTO narrow + handler POST `consulta` con PortalJwtGuard per-ruta + metodo `crearConsulta` en service que persiste MensajeInterno con `origenPaciente=true` y `autorId=null`, cubriendo CHAT-04.

## What Was Built

Cerrado el unico gap de backend de Phase 55: el endpoint `POST /paciente-portal/public/consulta` que permite a un paciente autenticado por JWT de portal enviar una consulta de texto al chat interno de su profesional.

### Files Created

- `backend/src/modules/paciente-portal/dto/create-consulta-portal.dto.ts` — DTO narrow con un unico campo `mensaje: string` decorado `@IsString()` + `@MinLength(1)` + `@MaxLength(2000)`. No declara `pacienteId`, `autorId` ni `prioridad` (D-03, T-55-01).

### Files Modified

- `backend/src/modules/paciente-portal/paciente-portal.service.ts` — Metodo publico `crearConsulta(pacienteId, dto)` que verifica existencia del paciente (NotFoundException si no existe), luego llama a `prisma.mensajeInterno.create` con `data: { mensaje, pacienteId, origenPaciente: true, autorId: null }` y `select: { id, createdAt }`. No crea MensajeLectura (paciente no es Usuario).
- `backend/src/modules/paciente-portal/paciente-portal.service.spec.ts` — 4 tests nuevos en `describe('crearConsulta')`: invocacion correcta de create con `origenPaciente=true`/`autorId=null`, derivacion de pacienteId desde argumento no del dto, retorno acotado `{ id, createdAt }`, y NotFoundException cuando el paciente no existe. Mock `mensajeInterno.create` agregado al `mockPrisma`.
- `backend/src/modules/paciente-portal/paciente-portal.controller.ts` — Handler `enviarConsulta` con `@UseGuards(PortalJwtGuard)` per-ruta + `@Post('consulta')` + `@Body(new ValidationPipe({ whitelist: true })) dto: CreateConsultaPortalDto`. pacienteId tomado de `req.user.pacienteId` (nunca del body). Guard NUNCA a nivel de clase.

## Task Commits

| Task | Name | Commit | Type |
|------|------|--------|------|
| 1 | DTO narrow CreateConsultaPortalDto | 7b625e6 | feat |
| 2 (RED) | Failing tests crearConsulta | 009af44 | test |
| 2 (GREEN) | Implement crearConsulta | 412f480 | feat |
| 3 | Handler POST consulta en controller | 4c749b9 | feat |

## Verification Results

- `npx tsc --noEmit`: 0 errores en el modulo paciente-portal (error pre-existente en e2e test fuera de rootDir no relacionado a este plan).
- `npx jest paciente-portal.service`: 19/19 tests PASS (15 preexistentes + 4 nuevos de `crearConsulta`).

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — el endpoint persiste datos reales en MensajeInterno via Prisma. El campo `prioridad` usa el default del schema (MEDIA) sin stub.

## Threat Surface Scan

Los threats T-55-01 a T-55-05 del plan estan todos mitigados o aceptados tal como planeado:
- T-55-01 (pacienteId del JWT): `req.user.pacienteId` en el controller, nunca del body ni del dto.
- T-55-02 (mass-assignment): `new ValidationPipe({ whitelist: true })` per-ruta en el handler.
- T-55-03 (auth bypass): `@UseGuards(PortalJwtGuard)` per-ruta, nunca a nivel de clase.
- T-55-04 (flood): clase tiene `@Throttle(20/min)` heredado, aceptado.
- T-55-05 (stored-XSS): texto almacenado via Prisma parametrizado, MaxLength(2000) acota payload; render seguro es responsabilidad del chat staff (React escapa por defecto).

No nueva superficie de seguridad fuera del threat_model del plan.

## TDD Gate Compliance

- RED gate: commit `009af44` — `test(55-01): add failing tests for crearConsulta`
- GREEN gate: commit `412f480` — `feat(55-01): implement crearConsulta in PacientePortalService`

## Self-Check: PASSED

- `create-consulta-portal.dto.ts` existe y compila.
- `crearConsulta` en service: commit 412f480 existe.
- `@Post('consulta')` en controller con `@UseGuards(PortalJwtGuard)`: commit 4c749b9 existe.
- `npx jest paciente-portal.service`: 19/19 PASS.
- Commits: 7b625e6 / 009af44 / 412f480 / 4c749b9 — todos existen en `git log`.
