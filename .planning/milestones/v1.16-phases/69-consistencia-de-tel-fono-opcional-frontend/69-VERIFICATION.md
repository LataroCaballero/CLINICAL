---
phase: 69-consistencia-de-tel-fono-opcional-frontend
verified: 2026-08-22T03:51:17Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 3/4
  gaps_closed:
    - "Los botones de envío por WhatsApp aparecen deshabilitados con tooltip explicativo cuando el paciente no tiene teléfono (calendario / detalle de turno) — CR-01"
    - "Un paciente sin teléfono se comporta bien en toda la app — al cargarle un teléfono, los controles de WhatsApp reflejan el cambio sin recargar la página — CR-02"
  gaps_remaining: []
  regressions: []
---

# Phase 69: Consistencia de Teléfono Opcional (Frontend) Verification Report

**Phase Goal:** Que un paciente sin teléfono se vea y se comporte bien en toda la app, no sólo en el flujo de alta inline.
**Verified:** 2026-08-22T03:51:17Z
**Status:** passed
**Re-verification:** Yes — after gap closure (plans 69-07, 69-08, 69-09, 69-10)

## Goal Achievement

### Observable Truths

| # | Truth (from ROADMAP success criteria) | Status | Evidence |
|---|---|---|---|
| 1 | El alta completa (`NewPacienteModal`) permite guardar un paciente sin cargar teléfono | ✓ VERIFIED | Unchanged since initial verification. `NewPacienteModal.tsx:34-39` — Zod `telefono` optional, `refine` only enforces `>=6` when non-empty; payload `telefono: data.telefono?.trim() ?? ""` (line 92). Re-read source directly, matches prior finding. |
| 2 | El autosuggest muestra un placeholder legible en vez de "Tel: null" para pacientes sin número | ✓ VERIFIED | Unchanged. `AutocompletePaciente.tsx:16,192` — `tieneTelefono(pac.telefono)` gates the entire `" — Tel: ..."` segment; never prints "Tel: null". Deviation from the `-` SSOT placeholder (renders nothing instead) remains a documented, non-blocking exception (IN-03 of 69-REVIEW.md). |
| 3 | La lista de pacientes, la ficha (`DatosCompletos.tsx`) y los reportes que muestran teléfono renderizan el placeholder en vez de vacío o "null" | ✓ VERIFIED (con advertencia, sin cambios) | `PacienteDetails.tsx:34,191` and both reportes pages (`cuentas/page.tsx:17,37,68`, `ausentismo/page.tsx:11,30`) still use `formatTelefono`. `DatosCompletos.tsx` read-mode still falls back to `EditableInput`'s internal `value || "—"` (em dash, not the SSOT's `-`) instead of `formatTelefono` (IN-06 of 69-REVIEW.md) — not empty, not "null", but a second, undocumented placeholder definition. This finding pre-dates and is outside the scope of the CR-01/CR-02 gap-closure plans (69-07–69-10 only touched ENVIO-03), carried forward unresolved as non-blocking INFO. |
| 4 | Los botones de envío por WhatsApp aparecen deshabilitados con tooltip explicativo cuando el paciente no tiene teléfono | ✓ VERIFIED | **CR-01 closed and behaviorally tested:** `obtenerTurnosPorRango` select now includes `pacienteId: true` (`turnos.service.ts:566-567`, confirmed by direct read), `TurnoRango` type requires `pacienteId: string` (no `?`), the `as any[]` cast is gone from `turnos/page.tsx:283`, and — critically — `AppointmentDetailModal.test.tsx` mounts the real component in jsdom and asserts: (a) button present+enabled when phone+opt-in present, (b) button present+disabled+tooltip text reachable when phone absent, (c) button **absent from the DOM** when `pacienteId` is undefined (the exact pre-fix bug, frozen as a regression test). Ran independently: `npm test` → 3 files, 18/18 passing. **CR-02 closed and behaviorally tested:** `DatosCompletos.tsx` now calls `invalidatePaciente()` (`queryClient.invalidateQueries({queryKey:["paciente", paciente.id]})`) in all 6 `save*` handlers, confirmed grep `invalidatePaciente()` × 6. `DatosCompletos.test.tsx` mounts the component inside a real `QueryClientProvider`, spies on `invalidateQueries` on the live instance, drives the actual edit→save DOM flow, and asserts: successful PATCH invalidates with a 2-element `["paciente", id]` key, failed PATCH does NOT invalidate, and failed client-side validation does NOT invalidate. Ran independently: same 18/18 run. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `backend/src/modules/turnos/turnos.service.ts` | `pacienteId: true` + `esSobreturno: true` at root of `obtenerTurnosPorRango` select | ✓ VERIFIED | Confirmed by direct read (lines 561-577); `telefono: true` from plan 02 preserved. |
| `backend/src/modules/turnos/turnos.service.spec.ts` | Regression test for the select contract | ✓ VERIFIED | `describe('obtenerTurnosPorRango — el select devuelve el FK pacienteId (CR-01 / D-13)')` with 2 `it`s (contract + passthrough). `npx jest src/modules/turnos` → 2 suites, 15/15 passing (run independently by this verifier). |
| `frontend/src/hooks/useTurnosRangos.ts` | `TurnoRango` mirrors the real response, `pacienteId: string` required | ✓ VERIFIED | Confirmed by direct read: `pacienteId: string;` (no `?`), `esSobreturno: boolean`, `paciente.telefono: string \| null`, `EstadoTurnoRango` exported union. |
| `frontend/src/app/dashboard/turnos/page.tsx` | Mapeo sin `as any[]`, `pacienteId: t.pacienteId ?? t.paciente?.id ?? undefined` | ✓ VERIFIED | `rg "as any"` on the file returns nothing; line 290 matches exactly. |
| `frontend/src/app/dashboard/turnos/AppointmentDetailModal.tsx` | Atajo WhatsApp gated by phone, reachable in the DOM | ✓ VERIFIED (was ORPHANED) | Unmodified since plan 06 (D-17 JSX untouched, as required) — now reachable because `event.pacienteId` is real. Verified by render test, not source reading alone. |
| `frontend/src/components/patient/PatientDrawer/views/DatosCompletos.tsx` | Invalidación de `["paciente", id]` tras cada PATCH exitoso, en las 6 secciones | ✓ VERIFIED | 6× `invalidatePaciente()` calls confirmed by grep, 1× `invalidateQueries` definition (2-element key, no `effectiveProfessionalId`). Verified by render test spying on the live `QueryClient`, not source reading. |
| `backend/src/modules/turnos/turnos.controller.ts` | `obtenerPorRango` scoped via `resolveScope`, aligned with `findAll` (T-69-16 IDOR fix, dependency of 69-07) | ✓ VERIFIED | Confirmed by direct read: `@Req() req`, `resolveScope({user:req.user, requestedProfesionalId:profesionalId})`, guard on falsy `scope.profesionalId`, service called with `scope.profesionalId`. `turnos.controller.spec.ts` (new) covers PROFESIONAL-blocked / SECRETARIA-unaffected / null-profesionalId-rejected — all 3 pass in the independently-run suite. |
| `frontend/vitest.config.ts`, `vitest.setup.ts` | Test runner capable of mounting React 19 components in jsdom | ✓ VERIFIED | `npm test` runs and produces real, distinguishable pass/fail (confirmed by this verifier's own independent run: 3 files / 18 tests / 0 failures). |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `turnos.service.ts` (select) | `AppointmentDetailModal` | `pacienteId: true` → `TurnoRango.pacienteId` → `CalendarEvent.pacienteId` → `{event.pacienteId && (...)}` | ✓ WIRED | Confirmed end-to-end by direct read AND by the render test's "pacienteId ausente" case, which is the exact assertion needed to distinguish "renders disabled" from "doesn't render." |
| `DatosCompletos.saveContacto` (and 5 other handlers) | `usePaciente` cache | `invalidateQueries({queryKey:["paciente", paciente.id]})` | ✓ WIRED | Confirmed by direct read AND by a render test that spies on the real `QueryClient.invalidateQueries` and drives the actual save flow through the DOM — the exact runtime property source-reading cannot verify. |
| `turnos.controller.ts obtenerPorRango` | `resolve-scope.ts` | `resolveScope({user, requestedProfesionalId})` | ✓ WIRED | Confirmed by direct read and by 3 passing controller tests (PROFESIONAL blocked, SECRETARIA unaffected, null-profesionalId rejected). |
| `PatientDrawer.tsx` | `PresupuestosView` / `WAThreadView` / `PacienteDetails` | prop `pacienteTelefono` / `paciente.telefono`, now fed by a query that gets invalidated on save | ✓ WIRED | Same as prior verification (data always correct on first render); the staleness problem that made this ⚠️ HOLLOW is now closed by CR-02. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `AppointmentDetailModal` WhatsApp button | `event.pacienteId`, `event.telefono` | `GET /turnos/rango` → Prisma `findMany` with real `select` | Yes — traced to a live DB query, not a static stub | ✓ FLOWING |
| `DatosCompletos` save handlers | `paciente.id` | Prop from `PatientDrawer` → `usePaciente` → `GET /pacientes/:id` | Yes | ✓ FLOWING |
| `PresupuestosView` / `WAThreadView` / `PacienteDetails` WA guards | `paciente.telefono` | `usePaciente` cache, now invalidated by `DatosCompletos` saves | Yes — refetch triggered by an explicit, tested `invalidateQueries` call | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Frontend test suite (vitest) runs and all assertions pass | `cd frontend && npm test` | 3 test files, 18/18 tests passing (run independently by this verifier) | ✓ PASS |
| Backend `turnos` module test suite (jest) runs and all assertions pass | `cd backend && npx jest src/modules/turnos --runInBand` | 2 suites, 15/15 tests passing (run independently by this verifier) | ✓ PASS |
| Frontend type-checks cleanly (Node 20) | `nvm use 20 && cd frontend && npx tsc --noEmit` | Exit 0, no output | ✓ PASS |
| Backend builds cleanly | `cd backend && npm run build` | Exit 0, `nest build` succeeded | ✓ PASS |
| WhatsApp shortcut render test distinguishes "renders disabled" from "doesn't render" (the exact property that broke the previous verification) | Read `AppointmentDetailModal.test.tsx` case 3 ("pacienteId ausente") | Asserts `queryByRole('button',{name:/whatsapp/i})` is `not.toBeInTheDocument()` when `pacienteId: undefined` | ✓ PASS |
| Invalidation test verifies the runtime effect, not source presence | Read `DatosCompletos.test.tsx` — spies on `queryClient.invalidateQueries` on the real instance passed to `QueryClientProvider`, drives edit→save through the DOM | 3 cases: success invalidates (2-element key), failure does not invalidate, validation failure does not invalidate | ✓ PASS |

### Probe Execution

Not applicable — this phase has no `scripts/*/tests/probe-*.sh` files and none are declared in the PLAN/SUMMARY files. The equivalent runtime evidence requirement was satisfied via the vitest/jest suites run independently above (Behavioral Spot-Checks section), per the explicit instruction in this verification's critical context to prefer runtime evidence over source reading for criteria 2-4.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| TEL-02 | 69-03 | Alta completa sin teléfono | ✓ SATISFIED | `NewPacienteModal.tsx` re-confirmed (truth 1). **Note:** `.planning/REQUIREMENTS.md` still shows `[ ]` / "Pending" for TEL-02 in both the checklist and the traceability table — a documentation gap, not a code gap. Recommend flipping to `[x]` / "Complete" now that this is re-verified. |
| TEL-03 | 69-01, 69-04 | Placeholder legible en vistas de teléfono | ✓ SATISFIED (con advertencia, sin cambios) | Helper + 5 display sites confirmed; `DatosCompletos.tsx` read-mode still uses its own `—` fallback instead of `formatTelefono` (IN-06), pre-existing and out of the CR-01/CR-02 gap-closure scope. `.planning/REQUIREMENTS.md` already shows `[x]` / "Complete" for TEL-03. |
| ENVIO-03 | 69-01, 69-02, 69-05, 69-06, 69-07, 69-08, 69-09, 69-10 | Botones WA deshabilitados con tooltip sin teléfono | ✓ SATISFIED | Both blocking defects (CR-01, CR-02) from the previous verification are closed and behaviorally tested, not just source-read. `.planning/REQUIREMENTS.md` already shows `[x]` / "Complete" for ENVIO-03. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `frontend/src/components/patient/PatientDrawer/views/DatosCompletos.tsx` | ~618 | Read-mode teléfono falls back to `EditableInput`'s internal `value \|\| "—"` instead of `formatTelefono` (IN-06 of 69-REVIEW.md) | ℹ️ INFO (carried forward, unresolved) | Second, undocumented placeholder definition (em dash vs. the SSOT's plain hyphen). Not empty, not "null" — does not fail success criterion 3, but is exactly the kind of drift the phase's SSOT was meant to eliminate. Out of scope for the CR-01/CR-02 gap-closure plans, which touched only ENVIO-03. |
| `frontend/src/app/dashboard/pacientes/components/PacienteDetails.tsx` | 38-46 | `getMotivoBloqueoWhatsApp(paciente.telefono, ...)` dereferences `paciente` above the component's own `if (!paciente) return null;` guard (WR-03 of 69-REVIEW.md) | ℹ️ INFO (carried forward, unresolved) | Latent — only caller (`PatientDrawer.tsx:87`) already renders behind `{paciente && !isLoading && ...}`, so it does not currently throw. Pre-existing, unrelated to the gap-closure scope. |
| 3 forms (`NewPacienteModal`, `InlineCreatePaciente`, `DatosCompletos`) | — | Phone-length validation duplicated with divergent bounds (WR-04) | ℹ️ INFO (carried forward, unresolved) | Confirmed still present; not part of ENVIO-03/gap-closure scope. |
| `frontend/src/types/finanzas.ts` | 77 | `CuentaCorrienteResumen.paciente.telefono: string` not widened to `string \| null` (WR-02) | ℹ️ INFO (carried forward, unresolved) | No consumer today; latent drift, unrelated to gap-closure scope. |

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in any file touched by plans 69-07 through 69-10 (backend `turnos.service.ts`, `turnos.controller.ts`, both `.spec.ts` files, `useTurnosRangos.ts`, `turnos/page.tsx`, `DatosCompletos.tsx`, both new `.test.tsx` files, `telefono.test.ts`, `vitest.config.ts`, `vitest.setup.ts`).

### Human Verification Required

None. Both truths that previously required deterministic runtime verification (CR-01's DOM reachability, CR-02's cache-invalidation effect) are now covered by automated render tests that were run independently by this verifier (not inherited from SUMMARY claims) and that pass. No visual, real-time, or external-service-dependent behavior remains unverified for this phase's success criteria.

### Gaps Summary

Both blocking gaps from the previous verification (`gaps_found`, score 3/4) are closed and — per this verification's explicit mandate to prefer runtime evidence over source reading — confirmed via independently-executed automated tests, not by re-reading source or trusting SUMMARY claims:

1. **CR-01 (calendar WhatsApp shortcut unreachable):** `obtenerTurnosPorRango`'s Prisma `select` now returns the scalar `pacienteId` FK. The frontend mapping type (`TurnoRango`) was hardened to require it (no longer optional), the `as any[]` cast that had hidden the mismatch was removed, and a new render test (`AppointmentDetailModal.test.tsx`) proves the control now exists in the DOM — including a regression case that reproduces the exact pre-fix bug (`pacienteId: undefined` → button absent) and would fail if the fix were reverted. Independently re-run: 4/4 tests in that file pass.

2. **CR-02 (stale WhatsApp guards after saving a phone):** `DatosCompletos.tsx`'s 6 `save*` handlers now call `queryClient.invalidateQueries({queryKey:["paciente", id]})` after a successful PATCH (2-element prefix key, matching the pattern already used by `useUpdateWhatsappOptIn.ts`). A new render test (`DatosCompletos.test.tsx`) mounts the real component inside a live `QueryClientProvider`, spies on `invalidateQueries`, and drives the actual edit-and-save DOM flow — proving invalidation fires on success and does not fire on failure or validation error. Independently re-run: 3/3 tests in that file pass.

A dependency the 69-07 plan declared on closing first — the pre-existing IDOR on `GET /turnos/rango` (T-69-16, `obtenerPorRango` had no `resolveScope`) — was also closed by plan 69-10 and independently confirmed here (3/3 controller tests pass, `resolveScope` call and falsy-guard present in source).

Two pre-existing, non-blocking documentation/code items are carried forward unresolved because they are outside the scope of the phase's success criteria and outside the scope of the four gap-closure plans (which targeted ENVIO-03 exclusively): `DatosCompletos.tsx`'s read-mode phone fallback still diverges from the SSOT placeholder (IN-06), and `.planning/REQUIREMENTS.md` still shows TEL-02 as `[ ]`/Pending despite being satisfied in code (a metadata-only discrepancy, worth a follow-up edit but not a code gap).

---

_Verified: 2026-08-22T03:51:17Z_
_Verifier: Claude (gsd-verifier)_
