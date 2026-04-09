---
phase: 20-backend-data-fixes
verified: 2026-04-02T16:00:00Z
status: passed
score: 4/4 must-haves verified
re_verification: false
---

# Phase 20: Backend Data Fixes — Verification Report

**Phase Goal:** Los endpoints de turnos exposen todos los campos que el frontend necesita, y el backend acepta entradas HC con fecha histórica
**Verified:** 2026-04-02T16:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                        | Status     | Evidence                                                                                      |
|----|----------------------------------------------------------------------------------------------|------------|-----------------------------------------------------------------------------------------------|
| 1  | GET /turnos/agenda devuelve diagnostico y tratamiento del paciente en cada turno             | VERIFIED   | `turnos.service.ts:321-322` — `diagnostico: true, tratamiento: true` in obtenerAgendaDiaria select |
| 2  | GET /turnos/proximos devuelve esCirugia y entradaHCId en cada turno, y esCirugia en tipoTurno | VERIFIED | `turnos.service.ts:787-801` — `esCirugia: true, entradaHCId: true` at turno level; `esCirugia: true` in tipoTurno select |
| 3  | POST /pacientes/:id/historia-clinica/entradas acepta campo fecha opcional y persiste esa fecha | VERIFIED  | `crear-entrada.dto.ts:39-41` — `@IsOptional() @IsDateString() fecha?: string`; `historia-clinica.service.ts:149-154` — `...(fechaFinal && { fecha: fechaFinal })` in Prisma create |
| 4  | POST con fecha futura retorna 400 antes de tocar la DB                                       | VERIFIED   | `historia-clinica.service.ts:111-125` — validation block runs before the `$transaction` call; throws `BadRequestException` if `parsed > hoy` |

**Score:** 4/4 truths verified

---

### Required Artifacts

| Artifact                                                                          | Provides                                                                 | Status    | Details                                                                                                     |
|-----------------------------------------------------------------------------------|--------------------------------------------------------------------------|-----------|-------------------------------------------------------------------------------------------------------------|
| `backend/src/modules/turnos/turnos.service.ts`                                    | obtenerAgendaDiaria con diagnostico+tratamiento; obtenerProximosTurnos con esCirugia+entradaHCId | VERIFIED | File exists, substantive (1000+ lines), both selects contain the required fields. Commit d6142b1 + 2dde494. |
| `backend/src/modules/historia-clinica/dto/crear-entrada.dto.ts`                  | Campo fecha opcional con @IsOptional + @IsDateString                     | VERIFIED  | File exists, 42 lines, imports `IsOptional, IsDateString`; field `fecha?: string` present with both decorators. Commit d06b0ec. |
| `backend/src/modules/historia-clinica/historia-clinica.service.ts`               | crearEntrada pasa fecha a la DB; rechaza fechas futuras con 400          | VERIFIED  | File exists, substantive; fecha validation block at lines 111-125 (before transaction); conditional spread at line 153. Commit d06b0ec. |

---

### Key Link Verification

| From                        | To                                        | Via                                                                                       | Status   | Details                                                                      |
|-----------------------------|-------------------------------------------|-------------------------------------------------------------------------------------------|----------|------------------------------------------------------------------------------|
| `CreateEntradaDto.fecha`    | `historiaClinicaEntrada.fecha`            | `...(fechaFinal && { fecha: fechaFinal })` inside `tx.historiaClinicaEntrada.create`      | WIRED    | `historia-clinica.service.ts:153` — conditional spread confirmed             |
| `obtenerAgendaDiaria select` | `Paciente.diagnostico / Paciente.tratamiento` | `paciente: { select: { ..., diagnostico: true, tratamiento: true } }`                | WIRED    | `turnos.service.ts:317-323` — both fields present in paciente select block   |

---

### Requirements Coverage

| Requirement | Source Plan | Description                                                                                       | Status    | Evidence                                                                                       |
|-------------|-------------|---------------------------------------------------------------------------------------------------|-----------|------------------------------------------------------------------------------------------------|
| BACK-01     | 20-01-PLAN  | `GET /turnos/agenda` retorna `diagnostico`, `tratamiento` del paciente en el select               | SATISFIED | `obtenerAgendaDiaria` select at `turnos.service.ts:317-323` includes both fields               |
| BACK-02     | 20-01-PLAN  | `GET /turnos/proximos` retorna `esCirugia`, `entradaHCId`, `tipoTurno.esCirugia` en el select    | SATISFIED | `obtenerProximosTurnos` select at `turnos.service.ts:782-804` includes all three fields         |
| BACK-03     | 20-01-PLAN  | `POST /pacientes/:id/historia-clinica/entradas` acepta campo `fecha` opcional; no puede ser futuro | SATISFIED | DTO field + service validation + conditional Prisma spread all verified                        |

No orphaned requirements — REQUIREMENTS.md marks all three as Complete for Phase 20.

---

### Anti-Patterns Found

No anti-patterns found in any of the three modified files. No TODOs, FIXMEs, placeholder comments, empty return stubs, or console-only handlers in the changed code paths.

Note: `if (!historia) return []` at `historia-clinica.service.ts:45` is a legitimate early-return in a different method (`obtenerEntradas`), not in `crearEntrada`. Not a stub.

---

### Human Verification Required

The following behaviors require a running backend to confirm end-to-end, though all structural indicators pass:

#### 1. Retroactive date persistence round-trip

**Test:** POST `/pacientes/:id/historia-clinica/entradas` with `{ "tipo": "libre", "texto": "test", "fecha": "2026-03-15" }` and inspect the created entry's `fecha` in the DB or response.
**Expected:** Entry created with `fecha = 2026-03-15T00:00:00.000Z` (not `now()`).
**Why human:** Prisma conditional spread is structurally correct, but actual DB write path needs runtime confirmation.

#### 2. Future date rejection

**Test:** POST same endpoint with `{ "tipo": "libre", "texto": "test", "fecha": "2030-01-01" }`.
**Expected:** HTTP 400 with message "No se puede crear una entrada con fecha futura."
**Why human:** Exception is thrown before the transaction — needs actual request to confirm NestJS validation pipe chain doesn't intercept first.

#### 3. Agenda response shape

**Test:** GET `/turnos/agenda?profesionalId=X&fecha=2026-04-02` with a real professional who has patients with diagnostico/tratamiento set.
**Expected:** Each turno object contains `turno.paciente.diagnostico` and `turno.paciente.tratamiento` (may be null for patients without them).
**Why human:** Select is correct; null-safety of the added nullable fields needs smoke-test with real data.

---

### Gaps Summary

No gaps. All four observable truths are fully verified at the structural level:

- The two `turnos.service.ts` select expansions are present at the correct locations within `obtenerAgendaDiaria` (line 317) and `obtenerProximosTurnos` (line 782).
- The DTO field `fecha` is decorated correctly and the class-validator imports are in place.
- The service fecha validation block precedes the transaction, correctly using end-of-day boundary so today's date is accepted.
- The conditional Prisma spread `...(fechaFinal && { fecha: fechaFinal })` correctly passes the date only when provided, preserving existing `@default(now())` behavior.
- All three task commits (d6142b1, 2dde494, d06b0ec) exist in the git history.
- REQUIREMENTS.md reflects all three IDs as Complete for Phase 20.

---

_Verified: 2026-04-02T16:00:00Z_
_Verifier: Claude (gsd-verifier)_
