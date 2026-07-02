---
phase: 55-portal-frontend
plan: "03"
subsystem: frontend/portal
tags: [portal, frontend, react-hook-form, zod, chips, salud, contacto]
dependency_graph:
  requires: [55-02]
  provides:
    - portalContactoSchema (Zod schema, 7 contacto fields → UpdateContactoPortalDto)
    - PortalInfoBasica (RHF+Zod form, pre-fill + save via useUpdateContacto)
    - SaludChips (reusable chip component, emits string[], no .join)
    - PortalSalud (4 health categories, pre-fill staged, save only *AutoReportad* fields)
  affects:
    - frontend/src/schemas/
    - frontend/src/components/portal/
tech_stack:
  added: []
  patterns:
    - React Hook Form + zodResolver (same pattern as ContactoSheet.tsx)
    - z.string().email().or(z.literal("")).optional() for optional email with validation
    - payload omits empty strings (pickPresent-compatible)
    - SaludChips emits string[] not joined string (adaptation from AlergiasChips analog)
    - antecedentesAutoReportados as Object.fromEntries(condiciones.map(c => [c, true]))
    - updateSalud payload confined to *AutoReportad* keys only (D-06 enforcement)
key_files:
  created:
    - frontend/src/schemas/portalContacto.schema.ts
    - frontend/src/components/portal/SaludChips.tsx
  modified:
    - frontend/src/components/portal/PortalInfoBasica.tsx
    - frontend/src/components/portal/PortalSalud.tsx
decisions:
  - "antecedentesAutoReportados serialized as Object.fromEntries(condiciones.map(c => [c, true])) — keys are condition names, values are true; matches Record<string,unknown> DTO shape and round-trips cleanly (Object.keys extracts them on pre-fill)"
  - "Tratamientos previos uses Textarea (not SaludChips) because DTO field is string not string[]"
  - "Save-on-leave-section (D-08) implemented as explicit Guardar button only — accordion collapse detection would require changes to page.tsx outside this plan's scope"
  - "TDD gate not enforced: frontend has no test runner configured; tsc --noEmit used as verification proxy"
metrics:
  duration: "12 min"
  completed: "2026-07-01"
  tasks_completed: 3
  files_changed: 4
---

# Phase 55 Plan 03: Portal Editable Sections Summary

**One-liner:** Zod schema + RHF contact form (pre-fill + PATCH /datos-personales) and 4-category health chip UI (pre-fill from staged values, PATCH /salud writing only `*AutoReportad*` fields), filling in the Wave 2 stubs from Plan 02.

## What Was Built

### Task 1 — portalContacto.schema.ts + PortalInfoBasica.tsx

**`frontend/src/schemas/portalContacto.schema.ts`** — `z.object` with 7 fields mapping 1:1 to `UpdateContactoPortalDto`:
- `telefono`, `telefonoAlternativo`, `direccion`, `contactoEmergenciaNombre`, `contactoEmergenciaTelefono`, `contactoEmergenciaRelacion` — all `z.string().optional()`
- `email` — `z.string().email("Email invalido").or(z.literal("")).optional()` — validates format when filled, accepts empty string, accepts undefined
- Exports `PortalContactoValues = z.infer<typeof portalContactoSchema>`

**`frontend/src/components/portal/PortalInfoBasica.tsx`** — replaced stub with full RHF+Zod form:
- `useForm<PortalContactoValues>({ resolver: zodResolver(portalContactoSchema), defaultValues: { ...prefill (null→"") } })`
- `onSubmit` builds `UpdateContactoPayload` omitting empty strings (pickPresent-compatible with F54 backend)
- Calls `useUpdateContacto().mutateAsync(payload)` + `toast.success` / `toast.error`
- Mobile-first layout: fields with `Label` + `Input`, emergencia group with border separator, full-width `Button`

### Task 2 — SaludChips.tsx

**`frontend/src/components/portal/SaludChips.tsx`** — reusable chip component:
- Props: `{ label: string; sugerencias: string[]; value: string[]; onChange: (next: string[]) => void }`
- `allChips = Array.from(new Set([...sugerencias, ...value]))` — merges predefined + selected
- `toggle(item)` adds/removes from `value` and calls `onChange(next)` — no `.join()`
- `Input` + `Plus` button for custom "otro" entries; Enter key also triggers `addCustom`
- `AnimatePresence` + `framer-motion` chips with active/inactive `cn()` classes (same pattern as `AlergiasChips.tsx`)

### Task 3 — PortalSalud.tsx

**`frontend/src/components/portal/PortalSalud.tsx`** — replaced stub with 4-category health form:
- **Alergias** → `SaludChips`, sugerencias comunes (Penicilina, Iodo, Latex, AINEs...), emits `alergiasAutoReportadas: string[]`
- **Medicacion** → `SaludChips`, sugerencias (Anticoagulantes, Antihipertensivos...), emits `medicacionAutoReportada: string[]`
- **Condiciones y enfermedades** → `SaludChips`, pre-fill via `Object.keys(salud.antecedentesAutoReportados)`, emits `antecedentesAutoReportados: Object.fromEntries(condiciones.map(c => [c, true]))` (object, not array)
- **Tratamientos previos** → `Textarea` (DTO field is `string`), emits `tratamientosPreviosAutoReportados: string`
- `handleGuardar` → `useUpdateSalud().mutateAsync({ alergiasAutoReportadas, medicacionAutoReportada, antecedentesAutoReportados, tratamientosPreviosAutoReportados })` — exactly 4 `*AutoReportad*` keys, zero clinical fields

## Task Commits

| Task | Name | Commit | Type |
|------|------|--------|------|
| 1 | portalContacto schema + PortalInfoBasica form | b0507d9 | feat |
| 2 | SaludChips (chips + sugerencias + otro, emits string[]) | 8e4450a | feat |
| 3 | PortalSalud (4 categories, staged pre-fill, *AutoReportad* only) | 97702e3 | feat |

## Verification Results

- `npx tsc --noEmit`: exit 0 — 0 TypeScript errors across all 4 files
- `grep -q "useUpdateContacto" PortalInfoBasica.tsx`: OK
- `grep -q "email" portalContacto.schema.ts`: OK
- `grep -q "onChange" SaludChips.tsx`: OK
- `grep -q "string\[\]" SaludChips.tsx`: OK
- `grep -q "join(" SaludChips.tsx` → NOT FOUND: OK (no .join in SaludChips)
- `grep -q "useUpdateSalud" PortalSalud.tsx`: OK
- `grep -q "alergiasAutoReportadas" PortalSalud.tsx`: OK
- `grep -q "antecedentesAutoReportados" PortalSalud.tsx`: OK
- Payload assertion: only `alergiasAutoReportadas`, `medicacionAutoReportada`, `antecedentesAutoReportados`, `tratamientosPreviosAutoReportados` in `mutateAsync` call — no bare clinical keys
- `npm run build`: Node.js 18 on this machine (requires >= 20.9.0 per Next.js) — pre-existing environment constraint, not introduced by this plan; `tsc --noEmit` is clean

## Deviations from Plan

### Auto-noted Issues

**1. [TDD gate — skipped] Frontend has no test runner configured**
- **Found during:** Task 1 (tdd="true")
- **Issue:** `frontend/package.json` has no `test` script, no Jest/Vitest config. The plan's `<automated>` verification uses `npx tsc --noEmit` + grep, not a test runner.
- **Resolution:** Implemented directly (schema → component) without RED/GREEN cycle. TypeScript verification used as proxy.
- **Impact:** Low — the plan's own acceptance criteria are `tsc --noEmit` + grep, which all pass.

**2. [Scope boundary] D-08 "save on section leave" — button-only**
- **Found during:** Task 3
- **Issue:** Accordion collapse detection for auto-save on section exit requires `onValueChange` wiring in `portal/[token]/page.tsx` which is outside this plan's file scope.
- **Resolution:** "Guardar" button implemented in both PortalInfoBasica and PortalSalud. The save-on-leave behavior is deferred to a future enhancement or can be wired in Plan 04.
- **Files unmodified:** `frontend/src/app/portal/[token]/page.tsx`

## Known Stubs

None — all Wave 2 stubs from Plan 02 for PortalInfoBasica and PortalSalud have been replaced with full implementations. PortalConsultas remains a stub (Wave 2 Plan 04).

## Threat Surface Scan

T-55-10 (Tampering — write to curated clinical fields): **Mitigated**
- `PortalSalud` payload contains ONLY `alergiasAutoReportadas`, `medicacionAutoReportada`, `antecedentesAutoReportados`, `tratamientosPreviosAutoReportados`
- Grep assertion confirms zero bare clinical field names (`"alergias"`, `"condiciones"`, `"medicacion"`) in the `mutateAsync` call
- Backend whitelist (`ValidationPipe({ whitelist: true })` per-route from F54) provides second layer

T-55-12 (Input validation — email/telefono): **Mitigated**
- `portalContactoSchema` validates email client-side with `z.string().email("Email invalido")`
- Backend `UpdateContactoPortalDto` has `@IsEmail()` server-side (F54 double-layer)

T-55-13 (XSS — render of patient values): **Mitigated**
- All pre-filled values rendered as React text in `value=` attributes — no `dangerouslySetInnerHTML`

No new threat surface outside the plan's threat model.

## Self-Check: PASSED

- `frontend/src/schemas/portalContacto.schema.ts`: exists, contains `z.object`, exports `PortalContactoValues`
- `frontend/src/components/portal/PortalInfoBasica.tsx`: exists, contains `useUpdateContacto`, `zodResolver`, `handleSubmit`
- `frontend/src/components/portal/SaludChips.tsx`: exists, contains `onChange`, `string[]`, no `.join(`
- `frontend/src/components/portal/PortalSalud.tsx`: exists, contains `useUpdateSalud`, `alergiasAutoReportadas`, `antecedentesAutoReportados`
- Commits: b0507d9 / 8e4450a / 97702e3 — all present in `git log`
- `npx tsc --noEmit` exit 0
