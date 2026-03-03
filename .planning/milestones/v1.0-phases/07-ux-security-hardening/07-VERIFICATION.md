---
phase: 07-ux-security-hardening
verified: 2026-03-02T01:00:00Z
status: human_needed
score: 4/4 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 3/4
  gaps_closed:
    - "El botón 'Ver todos (N)' en ContactosSection expande la lista en el lugar mostrando todos los contactos del paciente (no solo los primeros 5)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Open patient profile with more than 5 contacts, click 'Ver todos (N)'"
    expected: "All contacts appear in-place (not just the 5 already cached). 'Mostrar menos' button appears. Clicking it returns to 5 entries."
    why_human: "The queryKey fix is code-correct; confirming that TanStack Query actually issues a second network request with no limit param requires a browser session with real patient data."
  - test: "Send POST /webhook/whatsapp with valid x-hub-signature-256 (META_APP_SECRET set in production env)"
    expected: "Request returns 200 and BullMQ job is enqueued"
    why_human: "Dev fallback (META_APP_SECRET absent) bypasses guard — runtime verification needs actual Meta credentials"
---

# Phase 7: UX + Security Hardening — Verification Report

**Phase Goal:** El historial completo de contactos es accesible para pacientes con mas de 5 entradas, y el webhook de WhatsApp verifica la firma HMAC para rechazar payloads no firmados por Meta
**Verified:** 2026-03-02
**Status:** human_needed
**Re-verification:** Yes — after gap closure (queryKey fix in useContactos.ts)

## Re-verification Summary

| Item | Previous | Now |
|------|----------|-----|
| Truth 1 — Ver todos button triggers full-list fetch | FAILED (queryKey bug) | VERIFIED (fix confirmed) |
| Truth 2 — POST /webhook/whatsapp rejects invalid HMAC | VERIFIED | VERIFIED (no regression) |
| Truth 3 — GET /webhook/whatsapp unaffected by guard | VERIFIED | VERIFIED (no regression) |
| Truth 4 — Valid webhooks enqueue to BullMQ | VERIFIED | VERIFIED (no regression) |

**Gap closed:** `frontend/src/hooks/useContactos.ts` line 23 — `queryKey` now includes `limit ?? "all"` as the third element. TanStack Query will issue a distinct cache entry when `limit` changes from `5` to `undefined`, triggering a new network request that returns all contacts.

No regressions found in previously-passing artifacts.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | El boton "Ver todos (N)" en ContactosSection expande la lista en el lugar mostrando todos los contactos (no solo los primeros 5) | VERIFIED | `useContactos.ts` line 23: `queryKey: ["contactos", pacienteId, limit ?? "all"]`. When `showAll` flips to true, `ContactosSection.tsx` line 32 passes `undefined` as limit, resolving the third key element to `"all"` — a distinct cache key from the initial `5` call. A new fetch fires. Button wiring: `onClick={() => setShowAll(true)}` line 124. "Mostrar menos" button: lines 129-136. |
| 2 | POST /webhook/whatsapp rechaza con 401 cualquier request cuya firma x-hub-signature-256 no coincida con HMAC-SHA256 del body firmado con META_APP_SECRET | VERIFIED | `whatsapp-hmac.guard.ts`: full HMAC-SHA256 implementation with `crypto.timingSafeEqual`, length pre-check, throws `UnauthorizedException` on mismatch. Applied via `@UseGuards(WhatsappHmacGuard)` on `@Post` handler (controller line 50). |
| 3 | GET /webhook/whatsapp (Meta challenge handshake) sigue respondiendo sin que el guard HMAC interfiera | VERIFIED | `@UseGuards(WhatsappHmacGuard)` is on `@Post` method only (line 50). `@Get` handler (line 24) has no `UseGuards` decorator and no class-level guard. |
| 4 | Webhooks legitimos con firma valida siguen procesandose correctamente a traves de BullMQ | VERIFIED (with human caveat) | `handleWebhook` enqueues to `whatsappQueue` with `attempts: 3` and exponential backoff (controller lines 53-56). Guard returns `true` on valid signature. Dev fallback skips guard when `META_APP_SECRET` absent. Production path requires human test. |

**Score:** 4/4 truths verified

---

## Required Artifacts

### Level 1 — Existence

| Artifact | Expected Path | Exists | Notes |
|----------|--------------|--------|-------|
| useContactos.ts | frontend/src/hooks/useContactos.ts | YES | 32 lines |
| ContactosSection.tsx | frontend/src/app/dashboard/pacientes/components/ContactosSection.tsx | YES | 142 lines |
| whatsapp-hmac.guard.ts | backend/src/modules/whatsapp/guards/whatsapp-hmac.guard.ts | YES | 56 lines |
| main.ts | backend/src/main.ts | YES | 47 lines |
| whatsapp-webhook.controller.ts | backend/src/modules/whatsapp/whatsapp-webhook.controller.ts | YES | 59 lines |

### Level 2 — Substantive (no stubs)

| Artifact | Check | Result |
|----------|-------|--------|
| useContactos.ts | queryKey includes limit param | PASS — line 23: `queryKey: ["contactos", pacienteId, limit ?? "all"]` |
| useContactos.ts | queryFn builds URL with limit param | PASS — line 25: `const params = limit ? \`?limit=${limit}\` : ""` |
| ContactosSection.tsx | Contains `useState(false)` for showAll | PASS — line 31 |
| ContactosSection.tsx | useContactos call uses showAll ternary | PASS — line 32: `useContactos(pacienteId, showAll ? undefined : 5)` |
| ContactosSection.tsx | "Ver todos" button has real onClick | PASS — line 124: `onClick={() => setShowAll(true)}` |
| ContactosSection.tsx | "Mostrar menos" button present | PASS — lines 129-136 |
| ContactosSection.tsx | Notes use whitespace-pre-wrap when expanded | PASS — line 111: ternary on showAll |
| whatsapp-hmac.guard.ts | Implements CanActivate with real HMAC logic | PASS — uses `crypto.createHmac` + `timingSafeEqual` |
| whatsapp-hmac.guard.ts | Length pre-check before timingSafeEqual | PASS — line 47: length check |
| whatsapp-hmac.guard.ts | Dev fallback when META_APP_SECRET absent | PASS — lines 27-32 |
| main.ts | rawBody: true in NestFactory.create | PASS — line 15 |
| whatsapp-webhook.controller.ts | @UseGuards on @Post only | PASS — line 50 |
| whatsapp-webhook.controller.ts | No @UseGuards on @Get | PASS — @Get handler (line 24) has no UseGuards decorator |

### Level 3 — Wiring

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| ContactosSection.tsx | useContactos(pacienteId, undefined) when showAll=true | showAll ternary in hook call + distinct queryKey | WIRED | Line 32 passes `undefined` when showAll=true. queryKey resolves to `["contactos", pacienteId, "all"]` — distinct from `["contactos", pacienteId, 5]`. New fetch fires. |
| whatsapp-webhook.controller.ts POST handler | WhatsappHmacGuard | @UseGuards(WhatsappHmacGuard) on @Post | WIRED | Import present (line 6), decorator present (line 50) |
| WhatsappHmacGuard | req.rawBody | NestFactory rawBody: true option | WIRED | main.ts line 15 enables rawBody; guard reads `request.rawBody` (guard line 24) |
| WhatsappHmacGuard | WhatsappModule providers | whatsapp.module.ts providers array | WIRED (not re-read; no change since initial verification) |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| LOG-02 | 07-01-PLAN.md | El perfil del paciente muestra el historial completo de interacciones ordenado cronologicamente | SATISFIED | queryKey fix closes the cache invalidation defect. All UI wiring (showAll state, limit ternary, buttons, note styling) was already correct. Full list is now fetched on "Ver todos" click. |
| WA-04 | 07-01-PLAN.md | El sistema maneja correctamente los webhooks de Meta para actualizar el estado de mensajes en tiempo real — includes HMAC signature validation | SATISFIED | WhatsappHmacGuard implements HMAC-SHA256 with timingSafeEqual. rawBody: true enabled. Guard on POST only. GET unaffected. BullMQ enqueue on valid requests. |

---

## Anti-Patterns Found

No anti-patterns found.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None | — | — |

No TODO/FIXME/placeholder comments found in any phase-7 files.
No stub implementations (empty returns, console.log-only handlers) found.
The previous blocker anti-pattern (queryKey omitting limit) is resolved.

---

## Human Verification Required

### 1. Full contact history expand — functional test

**Test:** Open patient profile for a patient with more than 5 registered contacts. Click "Ver todos (N)".
**Expected:** All contacts (more than 5) appear in the list below the button; the list expands in-place without navigation. Notes display without truncation. "Mostrar menos" button appears. Clicking it collapses back to 5 entries.
**Why human:** The queryKey fix is confirmed correct in code. Confirming that TanStack Query actually fires a second network request (observable in browser DevTools Network tab) and that the full list renders requires a browser session with real patient data containing more than 5 contacts.

### 2. HMAC rejection — production signature test

**Test:** Set META_APP_SECRET in backend .env. Send `POST /webhook/whatsapp` with no `x-hub-signature-256` header. Send a second request with a tampered signature.
**Expected:** Both requests return 401 (UnauthorizedException from guard). A request with the correct HMAC-SHA256 signature returns 200 and enqueues the BullMQ job.
**Why human:** Dev environment skips guard when META_APP_SECRET is absent (guard returns true on line 31). Production verification requires actual Meta App Secret and a correctly signed payload.

---

## Gaps Summary

No gaps remain. All four observable truths are verified at the code level.

**LOG-02 (Full contact history):** The single-line fix to `useContactos.ts` queryKey (adding `limit ?? "all"` as the third element) closes the cache invalidation defect identified in the initial verification. The UI was fully correct before the fix; the hook was the only broken piece. Both artifacts now pass all three verification levels.

**WA-04 (WhatsApp HMAC guard):** Unchanged since initial verification. Fully implemented and wired. No regressions.

Two human verification items remain (functional browser test + production HMAC test), but these are operational checks, not code gaps. The phase goal is achieved at the implementation level.

---

_Verified: 2026-03-02_
_Verifier: Claude (gsd-verifier)_
