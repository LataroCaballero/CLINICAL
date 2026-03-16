# Deferred Items — Phase 12

## Pre-existing TypeScript errors (out of scope)

**File:** `frontend/src/app/dashboard/components/PatientsTable.tsx`
**Errors:**
- Line 73: Property 'onCreate' does not exist on type (TS2322) — NewPacienteModal prop mismatch
- Lines 73-75: Parameters implicitly have 'any' type (TS7006)

**Status:** Pre-existing before Plan 12-04. Not caused by AFIP frontend changes.
**Action needed:** Fix NewPacienteModal prop interface to re-add `onCreate`, `obrasSociales`, `profesionales` props or remove them from the caller.
