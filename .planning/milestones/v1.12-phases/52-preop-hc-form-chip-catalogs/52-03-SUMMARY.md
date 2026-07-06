---
phase: 52-preop-hc-form-chip-catalogs
plan: 03
subsystem: backend/historia-clinica
tags: [nestjs, prisma, historia-clinica, preoperatorio, dto, catalogo-hc, chip-catalogs]

# Dependency graph
requires:
  - phase: 52
    plan: 02
    provides: "aprenderDesdePreoperatorio method on CatalogoHCService"
  - phase: 51
    provides: "HistoriaClinicaEntrada.estudiosComplementarios Json column + TipoEntradaHC.PREOPERATORIO enum"
provides:
  - "CreateEntradaDto PREOP fields: antecedentes/alergias/medicacion (string[]), estudiosComplementarios (D-10 shape), consentimientoInformado (boolean)"
  - "crearEntrada pre_quirurgico branch: builds contenido JSONB, persists estudiosComplementarios to dedicated column, union-dedup merges patient profile, best-effort catalog learning"
affects:
  - 52-04  # Frontend PreoperatorioForm will POST to this branch

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "pre_quirurgico contenido JSONB shape: {tipo, antecedentes[], alergias[], medicacion[], estudiosComplementarios|null, consentimientoInformadoAt ISO|null, comentario|null}"
    - "Dedicated column write: estudiosComplementarios cast via (as unknown as Prisma.InputJsonValue) for class-instance JSON fields"
    - "Union-dedup merge: Array.from(new Set([...existing, ...incoming])) applied per-field inside $transaction, after entry creation"
    - "Forced tipoEntrada override: dto.tipo === 'pre_quirurgico' ? 'PREOPERATORIO' : (dto.tipoEntrada ?? undefined)"
    - "Post-transaction best-effort: aprenderDesdePreoperatorio in outer try/catch, inner sections already guarded in the service"

key-files:
  created: []
  modified:
    - backend/src/modules/historia-clinica/dto/crear-entrada.dto.ts
    - backend/src/modules/historia-clinica/historia-clinica.service.ts

key-decisions:
  - "estudiosComplementarios cast via (as unknown as Prisma.InputJsonValue) — direct cast fails because EstudiosComplementariosDto lacks an index signature (TypeScript nominal vs structural mismatch with Prisma's InputJsonObject)"
  - "Profile merge executes as a separate findUnique+update block inside the $transaction, after the entry creation and flujo block — cleaner than expanding the existing pac findUnique select"
  - "consentimientoInformadoAt written to contenido JSONB only; consentimientoFirmadoAt column is never touched (D-11 / T-52-08)"
  - "aprenderDesdePreoperatorio called with the JWT-derived profesionalId argument, not from dto body (T-52-06)"

# Metrics
duration: 15min
completed: 2026-06-26
---

# Phase 52 Plan 03: HC CreateEntrada PREOP Branch Summary

**PREOP DTO fields added and pre_quirurgico branch wired to crearEntrada: contenido JSONB built with locked shape, estudios persisted to dedicated column (D-10), patient profile union-dedup merged (D-09), consent timestamped in JSONB (D-11), best-effort catalog learning fires post-transaction (D-06)**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-26T13:00:00Z
- **Completed:** 2026-06-26T13:15:00Z
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments

### Task 1: Add PREOP fields to CreateEntradaDto

Added to `crear-entrada.dto.ts`:

- `antecedentes?: string[]` — `@IsOptional()`, `@IsArray()`, `@IsString({ each: true })`
- `alergias?: string[]` — same decorators
- `medicacion?: string[]` — same decorators
- `EstudiosComplementariosDto` class exported with `{ laboratorio: boolean; ecg: boolean; imagenes: string[] }` (D-10 shape, imagenes ⊆ {Ecografía, Tomografía, Mamografía, Otro})
- `estudiosComplementarios?: EstudiosComplementariosDto` — `@IsOptional()`, `@IsObject()`
- `consentimientoInformado?: boolean` — `@IsOptional()`, `@IsBoolean()`
- Added `IsObject` to class-validator imports
- Confirmed `tipo` union already includes `'pre_quirurgico'` (no change needed)

### Task 2: Add pre_quirurgico branch to crearEntrada

Added to `historia-clinica.service.ts`:

**Contenido build (pre-transaction dispatch):**
```ts
contenido = {
  tipo: 'pre_quirurgico',
  antecedentes: dto.antecedentes ?? [],
  alergias: dto.alergias ?? [],
  medicacion: dto.medicacion ?? [],
  estudiosComplementarios: dto.estudiosComplementarios ?? null,
  consentimientoInformadoAt: dto.consentimientoInformado ? new Date().toISOString() : null,
  comentario: dto.comentario ?? null,
};
```

**Entry creation (inside `$transaction`):**
- `tipoEntrada` forced to `'PREOPERATORIO'` when `dto.tipo === 'pre_quirurgico'`
- `estudiosComplementarios` written to dedicated Json column when `dto.estudiosComplementarios` is present (D-10, PREOP-09 queryable)

**Profile merge (inside `$transaction`, after entry creation):**
- `findUnique` patient for `condiciones/alergias/medicacion`
- `Array.from(new Set([...existing, ...incoming]))` per field
- `update` patient — MERGE only; no field is ever replaced or cleared
- `consentimientoFirmadoAt` and `*AutoReportada(o)s` fields never touched (D-11)

**Post-transaction learning (D-06):**
- `this.catalogoHc.aprenderDesdePreoperatorio(profesionalId, { antecedentes, alergias, medicacion })`
- Wrapped in outer try/catch with `this.logger.warn(...)` — failure never blocks the save
- `profesionalId` is the JWT-derived argument from `crearEntrada(pacienteId, dto, profesionalIdFromJwt)`, never from `dto`

## Task Commits

1. **feat(52-03): add PREOP fields to CreateEntradaDto** — `9bfcfbd`
2. **feat(52-03): add pre_quirurgico branch to crearEntrada** — `cc6f482`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript cast from EstudiosComplementariosDto to Prisma.InputJsonValue**
- **Found during:** Task 2 build (`npm run build`)
- **Issue:** `dto.estudiosComplementarios as Prisma.InputJsonValue` fails — TS2352: EstudiosComplementariosDto lacks an index signature required by InputJsonObject
- **Fix:** Changed to `as unknown as Prisma.InputJsonValue` (double cast pattern standard in NestJS/Prisma codebases for DTO→Json column writes)
- **Files modified:** `backend/src/modules/historia-clinica/historia-clinica.service.ts`
- **Commit:** included in `cc6f482`

## Known Stubs

None — all writes go to real Prisma fields. The profile merge runs against real patient rows. Learning calls the real `aprenderDesdePreoperatorio` method already validated in Plan 02.

## Threat Flags

None — no new network endpoints or auth surfaces. All threats addressed:

| Threat | Mitigation confirmed |
|--------|---------------------|
| T-52-06 (Tampering - learning scope) | `profesionalId` for learning comes from `crearEntrada` argument (JWT), not `dto` |
| T-52-07 (Tampering - profile arrays) | `Array.from(new Set([...existing, ...incoming]))` — existing values preserved; no destructive replace |
| T-52-08 (Repudiation - consent audit) | ISO timestamp in `contenido.consentimientoInformadoAt`; `consentimientoFirmadoAt` column never written |
| T-52-09 (DoS - learning failure) | `try/catch` with `logger.warn`; transaction already committed before learning runs |

## Self-Check

- [x] `backend/src/modules/historia-clinica/dto/crear-entrada.dto.ts` modified: `consentimientoInformado` and `estudiosComplementarios` fields present
- [x] `backend/src/modules/historia-clinica/historia-clinica.service.ts` modified: `pre_quirurgico`, `aprenderDesdePreoperatorio`, `consentimientoInformadoAt` present via grep
- [x] `npm run build` exits 0
- [x] 7 HC + catalogo-hc test suites: 136 tests all pass
- [x] Commits `9bfcfbd` and `cc6f482` exist in git log

## Self-Check: PASSED
