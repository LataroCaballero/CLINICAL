---
phase: 41-tipo-entrada-hc
verified: 2026-06-08T22:00:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
human_verification:
  - test: "En LiveTurno, elegir plantilla 'Primera Consulta' y confirmar que el selector 'Tipo de consulta' aparece pre-cargado en 'Consulta para cirugía', es editable, y el botón Guardar queda deshabilitado si se limpia el selector."
    expected: "Selector visible con valor derivado; botón Guardar deshabilitado sin tipoEntrada."
    why_human: "canSave y render condicional verificados en código, pero la UX visual y el comportamiento interactivo del Select de shadcn requieren prueba en browser."
  - test: "Abrir PatientDrawer (sin turnoId), crear una entrada: confirmar que el selector aparece igual y que sin tipoEntrada no se puede guardar."
    expected: "Selector obligatorio idéntico al de LiveTurno; canSave bloquea el submit."
    why_human: "HCCreatorDialog no pasa turnoId — comportamiento de la UI en ausencia del id de turno requiere verificación manual."
  - test: "Con paciente en flujo CIRUGIA, guardar entrada con plantilla 'Tratamiento en Consultorio': verificar que el flujo del paciente NO cambia."
    expected: "paciente.flujo permanece CIRUGIA (dual-state preservado, HC-04)."
    why_human: "La lógica es correcta en código y en los unit tests, pero el end-to-end con DB real y sesión activa requiere prueba humana."
---

# Phase 41: Tipo Entrada HC — Verification Report

**Phase Goal:** Tipo de Entrada en Historia Clínica — clasificación clínica de entradas de HC (enum TipoEntradaHC + campo tipoEntrada en HistoriaClinicaEntrada), selector "Tipo de consulta" obligatorio y auto-derivado en HCCreatorForm (compartido LiveTurno + PatientDrawer), y lógica de transición de flujo del Paciente dentro de crearEntrada.
**Verified:** 2026-06-08T22:00:00Z
**Status:** passed (with human verification items noted)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths — Plan 01 (HC-01, HC-03, HC-04)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | La entrada de HC persiste un campo tipoEntrada con uno de los 5 valores del enum TipoEntradaHC | VERIFIED | `schema.prisma` line 291: `tipoEntrada TipoEntradaHC?`; enum defined at line 1170 with all 5 values; migration SQL confirmed |
| 2 | CONSULTA_CIRUGIA + flujo=PENDIENTE → flujo transiciona a CIRUGIA | VERIFIED | `resolverNuevoFlujo` returns 'CIRUGIA'; test 1 passes; `crearEntrada` applies result via `tx.paciente.update` |
| 3 | TRATAMIENTO + flujo=PENDIENTE → flujo transiciona a TRATAMIENTO | VERIFIED | `resolverNuevoFlujo` returns 'TRATAMIENTO'; test 3 passes; wired in `crearEntrada` |
| 4 | TRATAMIENTO + flujo=CIRUGIA → NO cambia (dual-state HC-04) | VERIFIED | `resolverNuevoFlujo` returns null for CIRUGIA flujo; test 4 passes |
| 5 | CONTROL, SEGUIMIENTO, PREOPERATORIO no modifican flujo | VERIFIED | `resolverNuevoFlujo` returns null for all 3; tests 6-8 pass |
| 6 | turno con esCirugia=true omite cambio de flujo por tipoEntrada | VERIFIED | Guard `if (esCirugia) return null` is first branch; test 9 passes; `turnoCtx.esCirugia` pre-fetched in service |
| 7 | cerrarSesion conserva etapaCRM/PROCEDIMIENTO_REALIZADO intacta | VERIFIED | `turnos.service.ts` lines 921-926: esCirugia→PROCEDIMIENTO_REALIZADO, TURNO_AGENDADO→CONSULTADO; no tipoEntrada logic touched |

### Observable Truths — Plan 02 (HC-02)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 8 | HCCreatorForm muestra selector obligatorio "Tipo de consulta" con 5 opciones | VERIFIED | `TIPO_ENTRADA_OPTIONS` array at lines 43-49; Select rendered at lines 243-264 with 5 `SelectItem`s |
| 9 | Selector aparece en LiveTurno y PatientDrawer (mismo componente reutilizado) | VERIFIED | `HistoriaClinicaTab.tsx` line 5/23 and `HCCreatorDialog.tsx` line 4/27 both import and render `HCCreatorForm` |
| 10 | Valor del selector se auto-deriva del botón de plantilla elegido pero es editable | VERIFIED | `onClick` at line 227: `setTipoEntradaHC(PLANTILLA_TO_TIPO_ENTRADA[id] ?? 'CONTROL')`; `onValueChange` allows override |
| 11 | Al guardar, payload incluye tipoEntrada en las 3 ramas de handleSave | VERIFIED | Lines 126, 144, 162: `tipoEntrada: tipoEntradaHC ?? undefined` present in all 3 `mutateAsync` calls |
| 12 | No se puede guardar sin un tipoEntrada seleccionado | VERIFIED | `canSave` at line 110: `tipoEntradaHC !== null &&` is a required condition |

**Score: 12/12 truths verified**

---

## Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `backend/src/prisma/schema.prisma` | VERIFIED | `enum TipoEntradaHC` at line 1170; `tipoEntrada TipoEntradaHC?` at line 291 on `HistoriaClinicaEntrada` |
| `backend/src/prisma/migrations/20260608100000_add_tipo_entrada_hc/migration.sql` | VERIFIED | Contains `CREATE TYPE "TipoEntradaHC" AS ENUM (...)` + `ALTER TABLE "HistoriaClinicaEntrada" ADD COLUMN "tipoEntrada"` |
| `backend/src/modules/historia-clinica/dto/crear-entrada.dto.ts` | VERIFIED | `tipoEntrada` at line 73 with `@IsOptional()` + `@IsEnum([...])` decorators, 5 values |
| `backend/src/modules/historia-clinica/historia-clinica.flujo.helpers.ts` | VERIFIED | `resolverNuevoFlujo` exported pure function; implements all 10 rules; no NestJS/Prisma deps |
| `backend/src/modules/historia-clinica/historia-clinica.flujo.spec.ts` | VERIFIED | 10 tests covering all transition rules; `npx jest historia-clinica.flujo` → 10/10 PASS |
| `backend/src/modules/historia-clinica/historia-clinica.service.ts` | VERIFIED | Imports helper, re-exports it; `crearEntrada` persists `tipoEntrada` and applies `nuevoFlujo` inside `$transaction` |
| `frontend/src/hooks/useCreateHistoriaClinicaEntry.ts` | VERIFIED | `tipoEntrada?` at line 33 in `CreateEntradaDto`; `TipoEntradaHCValue` alias exported at line 51 |
| `frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx` | VERIFIED | All 5 options, PLANTILLA_TO_TIPO_ENTRADA mapping, tipoEntradaHC state, canSave guard, 3 handleSave branches, reset on save |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `crearEntrada` | `tx.paciente.update({ flujo })` | `resolverNuevoFlujo` inside `$transaction` | WIRED | Service lines 216-228: resolverNuevoFlujo called, result applied conditionally |
| `crearEntrada` | `turno.esCirugia` guard | Pre-fetch outside tx, passed to `resolverNuevoFlujo` | WIRED | Service lines 185-191: `turnoCtx.esCirugia` pre-fetched; line 219 passes it to helper |
| `HCCreatorForm selector` | `createEntry.mutateAsync({ dto: { tipoEntrada } })` | `tipoEntradaHC` state included in all 3 handleSave branches | WIRED | Lines 126, 144, 162 each carry `tipoEntrada: tipoEntradaHC ?? undefined` |
| `botón de plantilla (TIPOS)` | valor inicial del selector | `PLANTILLA_TO_TIPO_ENTRADA` map in onClick | WIRED | Line 227: `setTipoEntradaHC(PLANTILLA_TO_TIPO_ENTRADA[id] ?? 'CONTROL')` with `primera_vez → CONSULTA_CIRUGIA` mapping |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| HC-01 | 41-01 | Campo `tipoEntrada` (enum `TipoEntradaHC`) en `HistoriaClinicaEntrada` | SATISFIED | Schema + migration + DTO confirmed; field stored in DB via `crearEntrada` |
| HC-02 | 41-02 | Selector obligatorio "Tipo de consulta" en HCCreatorForm | SATISFIED | Select component with 5 options, canSave guard, same form in LiveTurno + PatientDrawer |
| HC-03 | 41-01 | CONSULTA_CIRUGIA + PENDIENTE → flujo=CIRUGIA; TURNO_AGENDADO → CONSULTADO via cerrarSesion | SATISFIED | resolverNuevoFlujo (test 1) + crearEntrada wiring; cerrarSesion intact for CRM transition |
| HC-04 | 41-01 | TRATAMIENTO + PENDIENTE → flujo=TRATAMIENTO; TRATAMIENTO + CIRUGIA → sin cambio | SATISFIED | resolverNuevoFlujo tests 3+4 pass; dual-state preserved correctly |

No orphaned requirements: all HC-01 through HC-04 are claimed by plans and verified.

---

## Anti-Patterns Found

No anti-patterns detected. The `return null` statements in `historia-clinica.flujo.helpers.ts` are correct functional returns implementing the no-op rules. The `placeholder` attribute occurrences in `HCCreatorForm.tsx` are standard HTML input placeholders (UI hint text), not stub implementations.

---

## Human Verification Required

### 1. LiveTurno — Selector UI behavior

**Test:** In LiveTurno of a "Consulta" appointment, click "Primera Consulta" template button. Confirm "Tipo de consulta" selector appears pre-loaded with "Consulta para cirugía". Clear the selector and confirm the Guardar button becomes disabled.
**Expected:** Selector visible and pre-populated; Guardar disabled when selector is empty.
**Why human:** `canSave` logic and conditional render verified in code, but the interactive Select behavior (shadcn component state) requires browser validation.

### 2. PatientDrawer — Selector without turnoId

**Test:** Open PatientDrawer (no active appointment), create a new HC entry. Confirm the "Tipo de consulta" selector appears and that saving without selecting a type is blocked.
**Expected:** Selector mandatory and functional; same 5 options as LiveTurno.
**Why human:** `HCCreatorDialog` passes no `turnoId` — the `turnoCtx` will be null, meaning esCirugia=false. End-to-end behavior in browser needed to confirm.

### 3. Dual-state preservation (CIRUGIA patient + TRATAMIENTO entry)

**Test:** With a patient whose `flujo` is already `CIRUGIA`, choose "Tratamiento en Consultorio" template and save the HC entry. Check that `paciente.flujo` remains `CIRUGIA` in the database.
**Expected:** Flujo not changed (HC-04 dual-state rule).
**Why human:** Unit tests confirm the logic; end-to-end with real DB and active session needed to confirm atomic transaction behavior.

---

## Gaps Summary

No gaps. All 12 must-haves are verified across both plans. The three human verification items are confirmations of already-verified code logic in a live browser/database context — they do not represent missing or stubbed implementation.

---

_Verified: 2026-06-08T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
