---
phase: 55-portal-frontend
verified: 2026-07-01T16:58:15Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
human_verification:
  - test: "DNI-gate mobile-viewport visual check"
    expected: "Card centrada con texto >=16px legible sin zoom, copy en tuteo (Ingresa tu numero de DNI...). DNI incorrecto -> mensaje de error claro. 3 intentos fallidos (o token de paciente bloqueado) -> pantalla de estado bloqueado con mensaje humano en tuteo (Demasiados intentos. Volve a intentar en X minutos)."
    why_human: "Visual legibility, font size rendering, and UX copy quality cannot be verified programmatically. Requires browser DevTools responsive mode at ~390px width."
  - test: "Ready view navigation and Paso X de 4 indicator"
    expected: "Tras DNI correcto: header read-only con nombre/DNI/obra social/proxima cirugia. Indicador 'Paso X de 4' visible con dots (NO un candado, NO bloquea navegacion). Las 4 secciones (Info basica, Salud, Consentimiento, Consultas) son expandibles en cualquier orden simultaneamente via Accordion type=multiple. Consentimiento muestra placeholder de texto."
    why_human: "Accordion multi-open behavior, visual progress indicator style, and copy legibility require visual inspection in a real or simulated mobile viewport."
---

# Phase 55: Portal Frontend Verification Report

**Phase Goal:** El paciente puede completar su informacion personal, auto-reportar antecedentes de salud y enviar consultas al medico mediante un wizard mobile-first de 4 pasos accesible sin login.
**Verified:** 2026-07-01T16:58:15Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC#1 | El paciente abre el link del portal y ve un wizard con indicador "Paso X de 4" en tuteo, texto >=16px legible sin zoom | VERIFIED (code) / ? UNCERTAIN (visual) | `page.tsx` line 284: "Paso {pasoActual} de {SECCIONES.length}" + dot indicators. `text-base` classes throughout. DNI-gate copy: "Ingresa tu numero de DNI para acceder a tu informacion". Visual mobile check deferred (human checkpoint) |
| SC#2 | En Info basica, el paciente puede revisar y corregir telefono/email/direccion/contacto emergencia; se guardan al guardar | VERIFIED | `PortalInfoBasica.tsx`: RHF+Zod form pre-fills from `datos.contacto` (null->""). `onSubmit` calls `useUpdateContacto().mutateAsync(payload)` → `PATCH /datos-personales`. toast.success/error. Save button present. |
| SC#3 | En Salud, el paciente selecciona/escribe condiciones/alergias/medicacion/tratamientos; datos staged sin tocar clinicos curados | VERIFIED | `PortalSalud.tsx`: 4 categories with SaludChips. Pre-fill from staged values. `handleGuardar` payload contains ONLY `alergiasAutoReportadas`, `medicacionAutoReportada`, `antecedentesAutoReportados`, `tratamientosPreviosAutoReportados`. No bare clinical keys. |
| SC#4 | En Consultas, el paciente envia una pregunta que aparece en el chat interno diferenciada de mensajes del staff | VERIFIED | Backend: `crearConsulta` creates `MensajeInterno` with `origenPaciente: true`, `autorId: null`. Frontend: `PortalConsultas.tsx` calls `enviarConsulta.mutateAsync(mensaje)` → `portalApi.post('/consulta', { mensaje })`. One-way confirmed (no staff reply rendering). |

**Score:** 4/4 truths VERIFIED (code). Visual/UX truths within SC#1 and SC#2 (mobile legibility, accordion UX) require human check.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/.../dto/create-consulta-portal.dto.ts` | Narrow DTO: only `mensaje` field, @IsString/@MinLength(1)/@MaxLength(2000) | VERIFIED | 21 lines; no pacienteId/autorId/prioridad declared |
| `backend/.../paciente-portal.controller.ts` | @Post('consulta') with @UseGuards(PortalJwtGuard) per-route | VERIFIED | Line 124-132: @UseGuards(PortalJwtGuard) + @Post('consulta'); pacienteId from req.user |
| `backend/.../paciente-portal.service.ts` | crearConsulta method: origenPaciente:true, autorId:null, select {id,createdAt} | VERIFIED | Lines 311-335: defensive findUnique, mensajeInterno.create with exact shape |
| `frontend/src/lib/portal-api.ts` | portalApi, setPortalToken, clearPortalToken; sessionStorage not localStorage; no /login redirect | VERIFIED | 30 lines; sessionStorage.getItem("portalToken"); no localStorage, no redirect/login reference in code |
| `frontend/src/types/portal.ts` | PortalDatos (4 saludAutoReportada + 7 contacto fields) + 2 payload types | VERIFIED | 42 lines; exact shape matches backend getDatos return |
| `frontend/src/hooks/usePortalDatos.ts` | 4 exports: usePortalDatos, useUpdateContacto, useUpdateSalud, useEnviarConsulta; all invalidate ["portal-datos"] | VERIFIED | All 4 exports present; all 3 mutations invalidate ["portal-datos"] on success |
| `frontend/src/app/portal/[token]/page.tsx` | Shell with DNI-gate, blocked state, 4-section Accordion, Paso X de 4 | VERIFIED | 381 lines; PageState union includes "blocked"; type="multiple" Accordion; "Paso {pasoActual} de 4" indicator; all 3 components rendered with correct props |
| `frontend/src/schemas/portalContacto.schema.ts` | z.object with 7 fields, email validation | VERIFIED | 14 lines; 7 fields mapped to UpdateContactoPortalDto; email with .email().or(z.literal("")) |
| `frontend/src/components/portal/PortalInfoBasica.tsx` | RHF+Zod form, pre-fill, useUpdateContacto, toast | VERIFIED | 173 lines; useForm+zodResolver; defaultValues map null->""; onSubmit calls mutateAsync; toast.success/error |
| `frontend/src/components/portal/SaludChips.tsx` | chips+sugerencias+otro, onChange emits string[] (no .join) | VERIFIED | 103 lines; onChange(next: string[]) — no .join(); allChips merges sugerencias + value; addCustom; AnimatePresence |
| `frontend/src/components/portal/PortalSalud.tsx` | 4 categories, pre-fill staged, useUpdateSalud with only *AutoReportad* keys | VERIFIED | 150 lines; useUpdateSalud; payload contains exactly 4 *AutoReportad* keys; antecedentesAutoReportados serialized as Object.fromEntries |
| `frontend/src/schemas/portalConsulta.schema.ts` | z.object mensaje min(1)/max(2000) | VERIFIED | 10 lines; min(1, "Escribi tu consulta") + max(2000, "La consulta es muy larga") |
| `frontend/src/components/portal/PortalConsultas.tsx` | useEnviarConsulta, CONSULTAS_SUGERIDAS, green banner, one-way | VERIFIED | 102 lines; CONSULTAS_SUGERIDAS (5 entries); safeParse + mutateAsync(mensaje); green banner on success; no staff reply rendering |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `paciente-portal.controller.ts @Post('consulta')` | `PacientePortalService.crearConsulta` | `req.user.pacienteId` (not body) | WIRED | Line 131: `return this.service.crearConsulta(req.user.pacienteId, dto)` |
| `PacientePortalService.crearConsulta` | `prisma.mensajeInterno.create` | `data: { origenPaciente: true, autorId: null, pacienteId, mensaje }` | WIRED | Lines 322-334: exact shape verified |
| `portal/[token]/page.tsx` | `/paciente-portal/public/:token/verificar` | `fetch POST + setPortalToken(jwt)` | WIRED | Lines 91-129: POST verify; 429 → blocked; 401 → error msg; ok → setPortalToken; ready |
| `usePortalDatos.ts` | `portalApi.get('/paciente-portal/public')` | `useQuery ["portal-datos"]` | WIRED | Line 9: `portalApi.get("/paciente-portal/public")` |
| `portal/[token]/page.tsx` | `PortalInfoBasica / PortalSalud / PortalConsultas` | `Accordion type="multiple"` | WIRED | Lines 325, 341, 375: correct props passed |
| `PortalInfoBasica.tsx` | `PATCH /paciente-portal/public/datos-personales` | `useUpdateContacto().mutateAsync(payload)` | WIRED | Line 62: `await updateContacto.mutateAsync(payload)` |
| `PortalSalud.tsx` | `PATCH /paciente-portal/public/salud` | `useUpdateSalud().mutateAsync({ *AutoReportad* keys })` | WIRED | Lines 86-93: exactly 4 *AutoReportad* keys, no bare clinical keys |
| `PortalConsultas.tsx` | `POST /paciente-portal/public/consulta` | `useEnviarConsulta().mutateAsync(mensaje)` | WIRED | Line 40: `await enviarConsulta.mutateAsync(mensaje)` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `portal/[token]/page.tsx` | `portalDatos` | `usePortalDatos(true)` → `portalApi.get('/paciente-portal/public')` → `getDatos(pacienteId)` | `prisma.paciente.findUnique` + `prisma.cirugia.findFirst` | FLOWING |
| `PortalInfoBasica.tsx` | `datos.contacto.*` | Passed as prop from `portalDatos` (real DB data) | Prisma query in getDatos | FLOWING |
| `PortalSalud.tsx` | `salud.*AutoReportad*` | Passed as prop from `portalDatos.saludAutoReportada` (real staged DB data) | Prisma query in getDatos | FLOWING |
| `PortalConsultas.tsx` | N/A (write-only) | `mutateAsync(mensaje)` → POST → `mensajeInterno.create` | Real DB write confirmed by service implementation | FLOWING |

### Behavioral Spot-Checks

Step 7b SKIPPED — no running server available; backend requires DB+Redis. TypeScript compilation (tsc --noEmit) and test runner results serve as proxy:

| Behavior | Evidence | Status |
|----------|----------|--------|
| `npx jest paciente-portal.service` passes (19/19) | Documented in 55-01-SUMMARY.md; includes 4 new crearConsulta tests | PASS (documented) |
| `npx tsc --noEmit` frontend: 0 errors | All 4 SUMMARYs confirm exit 0 | PASS (documented) |
| All 12 plan commits exist in git log | Verified via `git log --oneline` grep: 7b625e6, 009af44, 412f480, 4c749b9, a129953, 020f5ff, 3006303, b0507d9, 8e4450a, 97702e3, 45df742, 57fe7fa — all 12 found | PASS |

### Probe Execution

Step 7c: No `scripts/*/tests/probe-*.sh` files declared or found for this phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PORTAL-02 | 55-02 | Portal mobile-first wizard, operable por paciente no tecnico | SATISFIED | DNI-gate + 4-section Accordion + Paso X de 4 in page.tsx; text-base throughout |
| PORTAL-03 | 55-03 | Datos de contacto editables (telefono, email, direccion, emergencia) | SATISFIED | PortalInfoBasica.tsx with RHF+Zod; 7 fields; PATCH /datos-personales |
| PORTAL-05 | 55-03 | Auto-reporte de salud (condiciones, alergias, medicacion, tratamientos previos) | SATISFIED | PortalSalud.tsx with SaludChips; 4 categories; PATCH /salud with *AutoReportad* keys only |
| CHAT-04 | 55-01, 55-04 | Consulta del paciente → MensajeInterno con origenPaciente=true | SATISFIED | Backend crearConsulta + POST /consulta; PortalConsultas one-way send |

All 4 requirements declared across the 4 plans are accounted for. No orphaned requirements for Phase 55 in REQUIREMENTS.md.

### Anti-Patterns Found

Scanned all 13 modified/created files.

| File | Pattern | Severity | Finding |
|------|---------|----------|---------|
| All files | TODO/FIXME/TBD/XXX | — | None found |
| All components | `return null` / `return []` stubs | — | None — all Wave 2 stubs replaced with full implementations |
| `PortalSalud.tsx` | Bare clinical key names in payload | — | Local state vars named `alergias`/`medicacion`/`condiciones` are internal — payload keys are exclusively `*AutoReportad*` |
| `portal-api.ts` | `localStorage` reference | INFO | Only in comment ("NUNCA lee localStorage..."); no actual `localStorage` usage in code |

No blockers or warnings from anti-pattern scan.

### Human Verification Required

The following items require human testing with the development server running. These were deferred from the `checkpoint:human-verify` task in Plan 02.

#### 1. DNI-gate Mobile Viewport Visual Check

**Test:** `cd frontend && npm run dev`. Open `http://localhost:3000/portal/<TOKEN_CRUDO>` in browser DevTools responsive mode (~390px width). Inspect the DNI-gate card.
**Expected:** Centered card visible. Text is >=16px legible without zoom. Copy reads in tuteo Spanish (e.g., "Ingresa tu numero de DNI para acceder a tu informacion"). Entering an incorrect DNI shows a clear error message below the input. Entering 3 incorrect DNIs (or using a patient already locked) → the "blocked" screen appears with a human tuteo message including the retry wait time (e.g., "Demasiados intentos. Volve a intentar en X minutos.").
**Why human:** Font size rendering, visual legibility, and UX copy quality cannot be verified programmatically. Requires real browser rendering at mobile viewport.

#### 2. Ready View Navigation and Paso X de 4

**Test:** Enter the correct DNI to proceed past the gate. Inspect the "ready" view.
**Expected:** Read-only header shows patient's nombre, DNI, obra social (if any), proxima cirugia (if any). A "Paso X de 4" indicator with dots is visible — it updates as sections are opened but does NOT block navigation. All 4 sections (Info basica, Salud, Consentimiento, Consultas) appear as expandable accordion items; multiple can be open simultaneously in any order. The Consentimiento section shows "Proximamente vas a poder firmar tu consentimiento informado aca."
**Why human:** Accordion multi-open behavior, visual progress dot style, read-only header layout, and whether navigation truly feels unrestricted require visual inspection.

### Gaps Summary

No code gaps identified. All 4 roadmap success criteria are fully implemented and wired in the codebase. Status is `human_needed` solely because the `checkpoint:human-verify` from Plan 02 (visual mobile-viewport check) was deferred by the user and has not yet been performed.

---

_Verified: 2026-07-01T16:58:15Z_
_Verifier: Claude (gsd-verifier)_
