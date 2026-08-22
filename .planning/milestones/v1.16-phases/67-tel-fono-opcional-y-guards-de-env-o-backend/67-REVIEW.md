---
phase: 67-telefono-opcional-y-guards-de-envio-backend
reviewed: 2026-08-18T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - backend/src/common/types/paciente-suggest.type.ts
  - backend/src/modules/paciente-portal/paciente-portal.service.ts
  - backend/src/modules/pacientes/dto/create-paciente.dto.ts
  - backend/src/modules/pacientes/dto/paciente-lista.dto.ts
  - backend/src/modules/pacientes/pacientes.service.spec.ts
  - backend/src/modules/pacientes/pacientes.service.ts
  - backend/src/modules/presupuestos/presupuestos.service.spec.ts
  - backend/src/modules/presupuestos/presupuestos.service.ts
  - backend/src/modules/reportes/services/reportes-financieros.service.ts
  - backend/src/modules/reportes/types/reportes.types.ts
  - backend/src/modules/whatsapp/whatsapp.service.spec.ts
  - backend/src/modules/whatsapp/whatsapp.service.ts
  - backend/src/prisma/migrations/20260818214917_telefono_opcional/migration.sql
  - backend/src/prisma/schema.prisma
findings:
  critical: 3
  warning: 11
  info: 5
  total: 19
status: issues_found
---

# Phase 67: Code Review Report

**Reviewed:** 2026-08-18
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

The four `requireTelefonoParaEnvio()` guards in `WhatsappService` are correctly placed:
in all four send paths the guard runs **before** `mensajeWhatsApp.create()`, before
`whatsappQueue.add()`, and before any Meta call, and no unguarded enqueue path exists
(`rg` over `whatsappQueue.add` finds exactly 5 call sites: the 4 guarded senders + the
test job; the webhook controller only enqueues `process-webhook`). The `suggest()` raw
SQL is genuinely parameterized — `${query}` goes through Prisma's tagged template, so
there is **no SQL injection** there, and the `COALESCE(p.telefono,'')` rewrite does not
change matching semantics for NULL rows. `npx tsc -p tsconfig.build.json --noEmit` is
clean and all 49 tests in the three spec files pass.

That said, the change has real defects. The two most serious are on the *write* side,
not the send side: `updateContacto()` now silently **erases** an existing phone number
when the caller omits the field (previously that same request was rejected with a 400),
and the patient portal can still persist `telefono: ''` because it never routes through
`normalizeTelefono()` — directly contradicting the new D-08 comment added in this phase
which asserts the portal "never blanks out contact data". A third blocker sits inside the
function the phase edited: `create()` returns an un-`await`ed Prisma promise from inside
its `try`, so the whole `catch` (including the duplicate-DNI → 409 mapping) never sees
Prisma errors; the newly added `BadRequestException` rethrow only works because
`normalizeTelefono()` throws synchronously.

Separately: `strictNullChecks: false` in `backend/tsconfig.json` means every
`telefono: string` → `string | null` type widening in this phase (suggest type, lista DTO,
reportes types) buys **zero** compile-time safety. The compiler did not and cannot verify
the blast radius — and indeed the sibling raw query `PacientesService.search()` was left
behind with a now-false `telefono: string` row type.

The new spec files do assert real behavior (the WhatsApp spec pins side-effect ordering
with `expect(mockQueue.add).not.toHaveBeenCalled()` and `mensajeWhatsApp.create` not
called — that is not mock-and-pass). Coverage gaps are called out in WR-11.

## Critical Issues

### CR-01: `updateContacto()` silently wipes an existing phone on any partial payload

**File:** `backend/src/modules/pacientes/pacientes.service.ts:469-477`
**Issue:** The old code rejected a contacto patch without a phone (`400 Teléfono inválido`)
— destructive-but-rejected. The new code replaces the validation with
`telefono: this.normalizeTelefono(data.telefono)`, and `normalizeTelefono(undefined)`
returns `null`. So a `PATCH /pacientes/:id { section: 'contacto', data: { email: 'x@y.z' } }`
— a payload that omits `telefono` entirely — now **overwrites the stored phone with NULL**.
The request that used to fail loudly now succeeds while destroying the clinic's only
outbound channel for that patient (and, per the phase's own guards, permanently blocks
WhatsApp sending to them). Whitelist-patch semantics ("absent means don't touch") are
violated for the one field this phase cares most about. This is the same asymmetry the
portal comment (`paciente-portal.service.ts:697-703`) explicitly reasons about — the staff
path was supposed to be able to *deliberately* clear the phone, not clear it by omission.
The behavior is untested (the spec only covers `telefono: ''`, never an absent key).
**Fix:**
```ts
private async updateContacto(id: string, data: any) {
  await this.ensureExists(id); // see IN-03
  const patch: Prisma.PacienteUpdateInput = {};
  // Only touch keys actually present in the payload (D-02 semantics).
  if (data.telefono !== undefined) {
    patch.telefono = this.normalizeTelefono(data.telefono);
  }
  if (data.telefonoAlternativo !== undefined) {
    patch.telefonoAlternativo = data.telefonoAlternativo || null;
  }
  if (data.email !== undefined) {
    if (data.email !== null && typeof data.email !== 'string') {
      throw new BadRequestException('Email inválido');
    }
    patch.email = data.email || null;
  }
  return this.prisma.paciente.update({ where: { id }, data: patch });
}
```

### CR-02: Patient portal bypasses `normalizeTelefono()` and can persist `telefono: ''`

**File:** `backend/src/modules/paciente-portal/paciente-portal.service.ts:249-258, 690-706`
**Issue:** The comment rewritten by this phase claims "the portal never blanks out contact
data … the patient-facing portal cannot [clear `telefono`] (D-08)". That is false.
`pickPresent()` only drops `undefined` and `null`; an empty string is neither, so
`PATCH /portal/contacto { "telefono": "" }` writes `''` straight into the column, and
`{ "telefono": "1" }` writes a 1-char value — both bypassing the module's single source of
truth for phone validity (`PacientesService.normalizeTelefono`, ≥6 chars, `'' → null`).
Consequences: (a) a patient can erase the clinic's contact channel, exactly the outcome
D-08 says is impossible; (b) the DB ends up with a third state (`''`) that is neither
"absent" (`null`) nor "valid", so every downstream `telefono !== null` / `!!telefono`
check, the `COALESCE(p.telefono, '')` reasoning in `suggest()`, and any "has phone" badge
disagree with `requireTelefonoParaEnvio()` (which correctly rejects `''`). The portal is
patient-controlled input — it must be the *strictest* writer, not the only unvalidated one.
**Fix:** normalize before the write, or make `pickPresent` treat blank strings as absent
for the contact fields:
```ts
async updateContacto(pacienteId: string, dto: UpdateContactoPortalDto) {
  const data = this.pickPresent(dto, [...]);
  if ('telefono' in data) {
    const t = String(data.telefono).trim();
    // D-08: the portal may only SET a valid phone, never blank it.
    if (t.length < 6) throw new BadRequestException('Teléfono inválido');
    data.telefono = t;
  }
  ...
}
```

### CR-03: `create()`'s `try/catch` never observes Prisma errors — duplicate DNI now returns 500, not 409

**File:** `backend/src/modules/pacientes/pacientes.service.ts:75-94`
**Issue:** `return this.prisma.paciente.create({ data });` is **not awaited** inside the
`try`. In an `async` function, `try { return somePromise; }` completes normally — the
rejection propagates to the caller and never reaches the `catch`. Verified:
`node -e "async function f(){try{return Promise.reject(new Error('boom'))}catch(e){...}}"`
prints `ESCAPED: boom`. Therefore the `error.code === 'P2002' … ConflictException('El DNI
ingresado ya está registrado.')` branch (line 89-91) is **dead code** and a duplicate DNI
surfaces to the UI as a generic Prisma 500 instead of a 409 with a usable message. The
phase edited this exact block and added a rethrow whose comment states "sin este rethrow,
el catch-all de abajo lo enmascara como 500" — the premise is only true for the synchronous
`normalizeTelefono()` throw; the author's mental model of this catch is wrong, which is why
the pre-existing bug survived a targeted edit. (The new BadRequest rethrow itself works.)
**Fix:**
```ts
      return await this.prisma.paciente.create({ data });
```
and re-verify the P2002 branch with a test (`prisma.paciente.create` mock rejecting with
`{ code: 'P2002', meta: { target: ['dni'] } }` → expect `ConflictException`).

## Warnings

### WR-01: `strictNullChecks: false` — every `string | null` widening in this phase is compile-time inert

**File:** `backend/tsconfig.json:16` (affects `backend/src/common/types/paciente-suggest.type.ts:5`, `backend/src/modules/pacientes/dto/paciente-lista.dto.ts:6`, `backend/src/modules/reportes/types/reportes.types.ts:197,214`, `backend/src/modules/reportes/services/reportes-financieros.service.ts:554`)
**Issue:** With `strictNullChecks: false`, `string | null` collapses to `string` for
assignability. A clean `tsc` run therefore proves nothing about the nullable-telefono blast
radius: any surviving `paciente.telefono.trim()` / `${paciente.telefono}` in an untouched
module still compiles. Evidence that the compiler is not doing the work: `search()` still
declares `telefono: string` (WR-02) and `frontend/src/components/crm/ListaEsperaSheet.tsx:92`
still renders `href={\`tel:${p.telefono}\`}` (→ `tel:null`). The type edits are documentation,
not enforcement, and should not be treated as verification.
**Fix:** Either enable `strictNullChecks` (large, do it as its own phase) or record the
blast-radius audit as a manual grep checklist and add runtime fallbacks
(`p.telefono ?? '—'`) at each render/consumer site.

### WR-02: The sibling raw query `search()` was left behind — stale row type and inconsistent NULL handling

**File:** `backend/src/modules/pacientes/pacientes.service.ts:290-332` (esp. 295, 319, 328)
**Issue:** `suggest()` got `COALESCE(p.telefono, '')` in both the WHERE and the score, plus
`telefono: string | null` on the row type. The near-identical `search()` query two hundred
lines above kept `telefono: string` (now a lie — the column is nullable) and bare
`p."telefono" LIKE …`. The SQL semantics happen to be safe (`NULL LIKE x` → NULL → falsy in
both `OR` and `CASE WHEN`), so this is not a runtime bug today, but two copies of the same
query now disagree, and the false row type will mislead the next reader/consumer given WR-01.
**Fix:** Apply the same `COALESCE(p.telefono, '')` and `telefono: string | null` to
`search()`, or better, delete one of the two duplicated scoring queries.

### WR-03: `suggest()` passes LIKE metacharacters through, and tenant scoping comes from a client-supplied query param

**File:** `backend/src/modules/pacientes/pacientes.service.ts:418, 425-428` and `backend/src/modules/pacientes/pacientes.controller.ts:75-85`
**Issue:** Parameterization is correct (no SQL injection), but `%` and `_` inside `q` are not
escaped, so `GET /pacientes/suggest?q=%25%25` makes `COALESCE(p.telefono,'') LIKE '%%%%'`
true for *every* row, defeating the ≥2-char specificity gate. `profesionalId` is read from
the query string, not from the JWT, and is optional — so any authenticated staff user
(ADMIN/PROFESIONAL/SECRETARIA/FACTURADOR) can omit it and get 10 arbitrary patients with
`dni` and `telefono` from **any** professional. The phase touched both of these lines, which
makes it the moment to fix the scoping.
**Fix:**
```ts
const escaped = query.replace(/[\\%_]/g, (m) => '\\' + m);
// …and use ESCAPE '\' on the LIKE patterns
// plus: derive profesionalId from req.user, never from @Query()
```

### WR-04: The guards validate existence but not shape — `"sin dato"` reaches Meta as `to: ''`

**File:** `backend/src/modules/whatsapp/whatsapp.service.ts:189-198` and `backend/src/modules/pacientes/pacientes.service.ts:367-378`
**Issue:** `normalizeTelefono()` accepts any string ≥6 chars with no digit requirement and no
upper bound; `requireTelefonoParaEnvio()` only checks non-blank. So `"sin dato"` (8 chars) is
persisted, passes the send guard, and reaches
`whatsapp-message.processor.ts:98` → `telefono.replace(/\D/g, '')` → `to: ''` → a Meta call
with an empty recipient that fails at the API with an opaque error and burns 3 BullMQ retries.
The spec *pins* this hole ("un teléfono corto pero presente ('123') NO bloquea el envío"). The
missing max length also diverges from the frontend contract (`z.string().min(6).max(20)`).
**Fix:** validate digits in the shared normalizer and make the send guard check the normalized
form:
```ts
const digits = trimmed.replace(/\D/g, '');
if (digits.length < 6 || digits.length > 20) throw new BadRequestException('Teléfono inválido');
```
and in `requireTelefonoParaEnvio`, reject when `telefono.replace(/\D/g,'').length === 0`.

### WR-05: `PacientesService.update()` is dead code — the D-02 test covers an unreachable path

**File:** `backend/src/modules/pacientes/pacientes.service.ts:219-233`; test at `backend/src/modules/pacientes/pacientes.service.spec.ts` ("D-02: vaciar el teléfono desde el staff lo deja en null")
**Issue:** No controller calls `pacientesService.update()` — `@Patch(':id')` routes to
`updatePacienteSection()`, and `UpdatePacienteDto` is imported in
`pacientes.controller.ts:19` but never used. The careful `dto.telefono !== undefined` guard
added here is therefore never exercised in production, while the path that *is* reachable
(`updateContacto`) got the opposite semantics (CR-01). The green test creates false confidence
that "staff clearing the phone" is safe.
**Fix:** Delete `update()` and the unused DTO import, and move the `!== undefined` semantics
into `updateContacto()` (CR-01 fix) — or wire a route to `update()` if it is still wanted.

### WR-06: `retryMessage()` re-sends already-delivered messages and loses the template payload

**File:** `backend/src/modules/whatsapp/whatsapp.service.ts:447-485`
**Issue:** Pre-existing, but it is one of the four guard sites this phase certified. There is no
`mensaje.estado` check: retrying an `ENVIADO` message forcibly resets it to `PENDIENTE`
(line 466-469), which also defeats the processor's idempotency check
(`estado !== 'PENDIENTE' → skip`), producing a duplicate WhatsApp to the patient. The re-enqueued
job omits `templateName`/`components`/`freeText`, so the processor falls through to using
`mensaje.contenido` as a template name — for a `CUSTOM` message that means the free-text body is
sent to Meta as a template name.
**Fix:** guard with `if (mensaje.estado !== 'FALLIDO') throw new BadRequestException(...)` and
rebuild the job payload from `mensaje.tipo`/`contenido` instead of relying on the processor's
fallback.

### WR-07: Migration drops NOT NULL but does not backfill legacy `telefono = ''` rows

**File:** `backend/src/prisma/migrations/20260818214917_telefono_opcional/migration.sql:2`
**Issue:** The column was NOT NULL with no CHECK, so historical rows written before the
frontend `min(6)` rule (or by the portal path in CR-02) can hold `''`. After this migration
the codebase treats `null` as "no phone" but `''` still reads as present to any
`telefono !== null` / `!== undefined` check while being rejected by
`requireTelefonoParaEnvio()`. The intended invariant ("blank ⇒ NULL") is only enforced going
forward, and only on some paths.
**Fix:** add to the migration (or a follow-up):
```sql
UPDATE "Paciente" SET "telefono" = NULL WHERE btrim("telefono") = '';
```

### WR-08: `suggest()` swallows every error and returns an empty array

**File:** `backend/src/modules/pacientes/pacientes.service.ts:437-441`
**Issue:** Pre-existing, but this phase edited the query inside the `try`. A broken query
(e.g. a missing `unaccent`/`pg_trgm` extension, or a future edit to the COALESCE expression)
is indistinguishable from "no matches" for users and for tests — the suggest spec surface
cannot detect a regression introduced here.
**Fix:** log via `Logger.error` and rethrow (or return `[]` only for a whitelisted error
class), so a broken search fails visibly.

### WR-09: `getMorosidad()` interpolates a `$queryRaw` template into another `$queryRaw` template

**File:** `backend/src/modules/reportes/services/reportes-financieros.service.ts:570`
**Issue:** `${profesionalId ? this.prisma.$queryRaw\`AND pac."profesionalId" = ${profesionalId}\` : this.prisma.$queryRaw\`\`}`
passes a `PrismaPromise` **object** as a query *parameter*, not as SQL. The correct primitive
is `Prisma.sql` / `Prisma.empty` (which is exactly what `suggest()` uses at
`pacientes.service.ts:384-386`). As written, the professional filter is either serialized as a
bogus bind parameter or blows up at runtime — either way `getMorosidad(profesionalId)` does not
do what its signature promises. Same file as the reviewed `telefono` change (line 554).
**Fix:**
```ts
const profFilter = profesionalId
  ? Prisma.sql`AND pac."profesionalId" = ${profesionalId}`
  : Prisma.empty;
```

### WR-10: `search()` returns `SELECT p.*` — leaks portal tokens and every clinical column

**File:** `backend/src/modules/pacientes/pacientes.service.ts:300-301, 334`
**Issue:** Pre-existing, in a reviewed file and in the same feature area the phase rewrote.
`SELECT p.*` plus `return results` ships the *entire* `Paciente` row to the client, including
`portalToken` (sha256) and `portalTokenCifrado` (AES ciphertext) — the very values
`generarPortalLink`/`getDatos` go to great lengths to keep server-side — plus curated clinical
arrays and CRM columns. `suggest()` correctly selects 6 columns; `search()` does not.
**Fix:** replace `p.*` with the explicit column list (`p.id, p."nombreCompleto", p.dni,
p.telefono, p."fotoUrl"`), matching `suggest()`.

### WR-11: Coverage gaps in the new specs line up exactly with the blockers above

**File:** `backend/src/modules/whatsapp/whatsapp.service.spec.ts`, `backend/src/modules/pacientes/pacientes.service.spec.ts`
**Issue:** The specs do assert real behavior (not mock-and-pass): the WhatsApp suite pins guard
ordering vs. `mensajeWhatsApp.create` / `queue.add` and the opt-in-before-phone precedence,
and the presupuestos suite pins verbatim null passthrough. But the untested cases are the
defective ones: (a) no test for `updatePacienteSection('contacto')` with the `telefono` key
**absent** — the CR-01 wipe; (b) no test that the portal write path normalizes — CR-02;
(c) no test for the duplicate-DNI → 409 mapping — CR-03 (which would have failed);
(d) `sendFreeText`/`sendPresupuestoPdf` have only the null case, no happy path asserting the
trimmed `telefono` lands in the job payload (only `sendTemplateMessage` does);
(e) `retryMessage`'s fixture always includes `paciente`, so nothing pins the `include` that
makes `mensaje.paciente.telefono` safe — a future `select` change would break it silently.
**Fix:** add the four cases above; (a) and (c) are regression tests for real bugs, so write
them red-first.

## Info

### IN-01: Debug `console.log` on hot paths, one of them dumping a full error object

**File:** `backend/src/modules/pacientes/pacientes.service.ts:79, 389, 433, 438`
**Issue:** `console.log('ERROR CAPTURADO EN CATCH:', error)` runs on every failed create and
prints the whole exception (visible in the Jest output during this review, including the
`Teléfono inválido` payload); `'>>> SUGGEST START/END'` logs every keystroke-driven suggest
call. Patient-identifying data can end up in stdout logs.
**Fix:** use NestJS `Logger` with `error.message`/`error.code` only, and drop the suggest tracing.

### IN-02: The UI still hard-requires a phone, so "teléfono opcional" is not reachable end-to-end

**File:** `frontend/src/app/dashboard/pacientes/components/NewPacienteModal.tsx:34,87` and `frontend/src/components/patient/PatientDrawer/views/DatosCompletos.tsx:106`
**Issue:** Both zod schemas keep `telefono: z.string().min(6, "Teléfono inválido")`, and
`NewPacienteModal` calls `data.telefono.trim()` unconditionally. No UI path can produce the
new `null` state, so the phase outcome is currently only observable via direct API calls.
Flagged for the follow-up plan (this phase's file list is backend-only).
**Fix:** make `telefono` optional/nullable in both schemas and guard the `.trim()`.

### IN-03: `updateContacto()` never checks the patient exists

**File:** `backend/src/modules/pacientes/pacientes.service.ts:484-487`
**Issue:** Unlike `update()`/`delete()`, the section updaters skip `ensureExists(id)`, so an
unknown id yields a Prisma `P2025` → 500 instead of a 404.
**Fix:** `await this.ensureExists(id);` at the top (folded into the CR-01 fix above).

### IN-04: `npm run lint` is not clean on the touched files

**File:** `backend/src/modules/pacientes/pacientes.service.ts:34,156`, `backend/src/modules/presupuestos/presupuestos.service.ts:21`, `backend/src/modules/paciente-portal/paciente-portal.service.ts:531,595,601-603,634`
**Issue:** 12 eslint errors, all pre-existing: unused `esPortalUrlValida`, unused local
`estudiosPendientes` (line 156 computes a value that line 188 recomputes inline — one of the two
is redundant), unused `Decimal` import, plus prettier violations. The project quality bar says
"no romper lint existente"; it is already broken in these files.
**Fix:** `npm run lint` (auto-fixes 9) and delete the three unused symbols.

### IN-05: Unrelated schema change bundled into the phase

**File:** `backend/src/prisma/schema.prisma:884`
**Issue:** `@@index([cirugiaCatalogoId])` on `Cirugia` has nothing to do with nullable
`telefono`. It is harmless (the index already exists in
`20260701000000_signed_consent_forensic/migration.sql:72`, so this is drift alignment and needs
no new migration), but it widens the phase diff.
**Fix:** none required — noted so the next `prisma migrate dev` diff is not surprising.

---

_Reviewed: 2026-08-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
