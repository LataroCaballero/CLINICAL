---
phase: 03-presupuestos-completos
plan: "03"
subsystem: frontend
tags: [presupuestos, frontend, public-page, pdf, email, crm]
dependency_graph:
  requires: ["03-02"]
  provides: ["frontend-presupuestos-flow", "public-acceptance-page"]
  affects: ["PatientDrawer", "CRM-kanban", "presupuesto-lifecycle"]
tech_stack:
  added: []
  patterns: ["TanStack Query mutations", "Next.js App Router public route", "Blob URL inline PDF preview"]
key_files:
  created:
    - frontend/src/hooks/useEnviarPresupuesto.ts
    - frontend/src/hooks/useRechazarPresupuesto.ts
    - frontend/src/components/presupuesto/EnviarPresupuestoModal.tsx
    - frontend/src/app/presupuesto/[token]/layout.tsx
    - frontend/src/app/presupuesto/[token]/page.tsx
  modified:
    - frontend/src/hooks/useCreatePresupuesto.ts
    - frontend/src/hooks/usePresupuestos.ts
    - frontend/src/components/patient/PatientDrawer/views/PresupuestosView.tsx
    - frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx
decisions:
  - "pacienteEmail passed from PatientDrawer via paciente.email field — coordinador can override in modal"
  - "rechazarPresupuesto hook in PresupuestosView present but not exposed via UI button (coordinator rejects through backend admin or paciente rejects via public page)"
  - "PresupuestosView import: Presupuesto type removed from named import since estadoColors now uses Record<string, string> to support VENCIDO"
metrics:
  duration: 11min
  completed: "2026-02-24"
  tasks_completed: 2
  tasks_total: 3
  files_created: 5
  files_modified: 4
---

# Phase 3 Plan 3: Frontend Presupuestos Flow Summary

**One-liner:** Frontend completo para presupuestos: PresupuestosView renovado con moneda/validez/PDF inline, EnviarPresupuestoModal (Descargar/Email/WhatsApp placeholder), y pagina publica /presupuesto/[token] sin auth para aceptacion del paciente.

## Completed Tasks

### Task 1: Hooks + EnviarPresupuestoModal + pagina publica (commit: aae8bd9)

**Files created:**
- `frontend/src/hooks/useEnviarPresupuesto.ts` — mutation hook para POST /presupuestos/:id/enviar-email, invalida presupuestos y crm-kanban
- `frontend/src/hooks/useRechazarPresupuesto.ts` — mutation hook para PATCH /presupuestos/:id/rechazar
- `frontend/src/components/presupuesto/EnviarPresupuestoModal.tsx` — modal con 3 acciones: Descargar PDF (blob download), Email (formulario expandible con emailDestino + nota), WhatsApp (disabled con tooltip "Proximamente")
- `frontend/src/app/presupuesto/[token]/layout.tsx` — layout minimo `<div>` sin html/body (evita duplicacion con root layout)
- `frontend/src/app/presupuesto/[token]/page.tsx` — pagina publica patient-facing: carga por token, muestra procedimientos + totales, Aceptar (POST public/:token/aceptar), Rechazar con campo motivo (POST public/:token/rechazar)

**File modified:**
- `frontend/src/hooks/useCreatePresupuesto.ts` — PresupuestoItemInput: `precioTotal` reemplaza `cantidad`/`precioUnitario`; CreatePresupuestoInput agrega `moneda` y `fechaValidez`

### Task 2: usePresupuestos interfaces + PresupuestosView completo (commit: 71cf922)

**Files modified:**
- `frontend/src/hooks/usePresupuestos.ts` — PresupuestoItem: `precioTotal` reemplaza `cantidad`/`precioUnitario`/`total`, agrega `orden`; Presupuesto: agrega `moneda`, `fechaValidez`, `VENCIDO` en estado union
- `frontend/src/components/patient/PatientDrawer/views/PresupuestosView.tsx` — reescritura completa: items con precioTotal, selector moneda ARS/USD, campo fechaValidez, badge VENCIDO en amber, boton "Ver PDF" abre iframe inline en Dialog (no window.open), boton "Enviar" abre EnviarPresupuestoModal
- `frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx` — pasa `pacienteEmail={paciente.email ?? ""}` a PresupuestosView para prefill en modal de envio

### Task 3: checkpoint:human-verify (PENDING — awaiting verification)

This task requires manual verification of the full presupuesto flow.

## Build Verification

`npm run build` — **PASSED** (Build exit 0)

Route `/presupuesto/[token]` confirmed as `ƒ (Dynamic)` outside `/dashboard/`:
```
└ ƒ /presupuesto/[token]
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] pacienteEmail prop wired in PatientDrawer**
- **Found during:** Task 2
- **Issue:** Plan noted `pacienteEmail` prop but PatientDrawer.tsx was not updated to pass it
- **Fix:** Added `pacienteEmail={paciente.email ?? ""}` to PresupuestosView call in PatientDrawer. `PacienteDetalle` type already had `email?: string | null`
- **Files modified:** `frontend/src/app/dashboard/pacientes/components/PatientDrawer.tsx`
- **Commit:** 71cf922

**2. [Rule 1 - Bug] estadoColors typed as Record<string, string> instead of Record<Presupuesto["estado"], string>**
- **Found during:** Task 2 — VENCIDO added to estado union
- **Issue:** Original code used `Record<Presupuesto["estado"], string>` which would require exhaustive mapping. New VENCIDO estado needed to be added cleanly without breaking the compile
- **Fix:** Changed to `Record<string, string>` with fallback in Badge className (`?? "bg-gray-100 text-gray-700"`), matching pattern used elsewhere in the codebase
- **Files modified:** `frontend/src/components/patient/PatientDrawer/views/PresupuestosView.tsx`
- **Commit:** 71cf922

## Checkpoint Reached

Task 3 is `type="checkpoint:human-verify"` — execution paused for manual verification. See CHECKPOINT section below.

## Self-Check: PASSED

Files exist:
- frontend/src/hooks/useEnviarPresupuesto.ts: FOUND
- frontend/src/hooks/useRechazarPresupuesto.ts: FOUND
- frontend/src/components/presupuesto/EnviarPresupuestoModal.tsx: FOUND
- frontend/src/app/presupuesto/[token]/layout.tsx: FOUND
- frontend/src/app/presupuesto/[token]/page.tsx: FOUND

Commits exist:
- aae8bd9: FOUND (Task 1)
- 71cf922: FOUND (Task 2)

Build: PASSED (exit 0, no TypeScript errors)
