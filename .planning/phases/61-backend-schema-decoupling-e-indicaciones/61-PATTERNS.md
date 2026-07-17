# Phase 61: Backend — Schema, Decoupling e Indicaciones - Pattern Map

**Mapped:** 2026-07-08
**Files analyzed:** 9 (7 modified + 1 new migration + 1 new service method)
**Analogs found:** 9 / 9 (all in-repo, same domain)

> **Backend-only phase.** Every target file already exists except the new migration
> directory. All analogs are exact in-repo patterns (NestJS module/service/DTO). No
> RESEARCH.md fallback needed — the codebase already contains every pattern required.

---

## File Classification

| Target File | Role | Data Flow | Closest Analog | Match Quality |
|-------------|------|-----------|----------------|---------------|
| `backend/src/prisma/schema.prisma` (Paciente 152-236, ConsentimientoFirmado 1426-1446) | model | schema-DDL | existing nullable `DateTime?` fields in same models (`consentimientoFirmadoAt:216`, `fechaIndicaciones:174`) | exact |
| `backend/src/prisma/migrations/[ts]_add_indicaciones_leidas/migration.sql` (NEW) | migration | batch-DDL | `migrations/20260701000000_signed_consent_forensic/migration.sql` | role-match (additive vs. ALTER COLUMN) |
| `backend/src/modules/paciente-portal/paciente-portal.service.ts` (`firmarConsentimiento` 560-665) | service | request-response / write | itself (surgical removal of 2 blocks) | exact (self) |
| `backend/src/modules/paciente-portal/dto/firmar-consentimiento-portal.dto.ts` (19-28) | DTO | validation | same file (remove one field) | exact (self) |
| `backend/src/modules/paciente-portal/paciente-portal.controller.ts` (NEW acuse route) | controller | request-response | `@Patch('salud')` (122-130) + `@Post('consulta')` (147-155) same file | exact |
| `paciente-portal.service.ts` → NEW method `registrarAcuseIndicaciones` | service | write / set-once | aggregate-flag update in `firmarConsentimiento` step 8 (655-661) | role-match |
| `backend/src/modules/pacientes/crm-steps.helper.ts` (`PacientePasosInput` 28-49, `computePasosCrm` 58-113) | utility (pure helper) | transform | itself (existing legacy-OR pattern, 90-99) | exact (self) |
| `backend/src/modules/pacientes/pacientes.service.ts` (`getKanban` select 627-678, call 741-748) | service | CRUD / read | itself (add one `select` key + one call arg) | exact (self) |
| `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` (`actualizarIndicacionesUrl` 761-788) | service | request-response / write | itself — **validation already present** (see cr-01 note) | exact (self) |

---

## Pattern Assignments

### 1. `schema.prisma` — add field + relax NOT NULL (INDIC-03, D-01)

**Two schema deltas:**

**(a) `Paciente` model — add new nullable field.** Copy the shape of the existing
nullable timestamp fields already in the model (lines 174, 216):
```prisma
consentimientoFirmadoAt           DateTime?     // line 216 — existing analog
fechaIndicaciones                 DateTime?     // line 174 — existing analog
```
Add, in the same block (near line 216 alongside the other consent/indicaciones fields):
```prisma
indicacionesLeidasAt              DateTime?     // INDIC-03: acuse global set-once
```

**(b) `ConsentimientoFirmado` model (line 1437) — relax NOT NULL to nullable.**
Current:
```prisma
indicacionesLeidasAt        DateTime // set at signing time, required   ← line 1437
```
Change to (D-01 — keep column, drop the required-ness, preserve v1.12 forensic values):
```prisma
indicacionesLeidasAt        DateTime? // legacy v1.12 forensic value; new rows leave NULL (D-01)
```
> Do NOT drop the column and do NOT touch existing rows — it holds legal timestamps.

---

### 2. NEW migration SQL (INDIC-03 / D-01, SC#4 — pgBouncer pattern)

**Analog:** `backend/src/prisma/migrations/20260701000000_signed_consent_forensic/migration.sql`
(most recent migration; additive `ALTER TABLE ... ADD COLUMN` style, header comment
documenting the deltas and lock-safety).

**Migration mechanics (from CONTEXT "Established Patterns" + PROJECT.md):**
- Path: `backend/src/prisma/migrations/[timestamp]_[name]/migration.sql` (raw SQL).
- Apply via `prisma diff + db execute + migrate resolve` — **NEVER** `migrate dev` / `db push`.
- `directUrl` (env `DIRECT_URL`) bypasses pgBouncer for schema ops; `PrismaService`
  pins `connection_limit`/`pool_timeout` on `DATABASE_URL`.

**Header-comment + additive style to copy** (analog lines 1-6):
```sql
-- Phase 56 — Signed Consent Forensic Foundation
-- Additive-only migration: ADD COLUMN + CREATE TABLE (no locks on hot paths, T-56-03)
--
-- Delta 1: Add version column to ConsentimientoZonaArchivo (D-03)
ALTER TABLE "ConsentimientoZonaArchivo"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
```

**SQL this phase needs (two deltas — mirror the commented-delta layout):**
```sql
-- Phase 61 — Indicaciones acuse + consent decoupling
-- Delta 1 (INDIC-03): add global set-once read-receipt timestamp to Paciente
ALTER TABLE "Paciente" ADD COLUMN "indicacionesLeidasAt" TIMESTAMP(3);

-- Delta 2 (D-01): relax ConsentimientoFirmado.indicacionesLeidasAt to nullable.
--   Column is preserved (legal v1.12 forensic value); new rows leave it NULL.
ALTER TABLE "ConsentimientoFirmado" ALTER COLUMN "indicacionesLeidasAt" DROP NOT NULL;
```
> Both statements are metadata-only / additive (an unindexed `ADD COLUMN` with no
> default and a `DROP NOT NULL` are non-rewriting on Postgres) — matches the analog's
> "no locks on hot paths" property. No index required (single global field).

---

### 3. `firmarConsentimiento` — decouple from indicaciones (CONS-11, D-02, SC#1)

**File:** `paciente-portal.service.ts:560-665`. Two surgical **removals**, nothing else
in this method changes (steps 1,2,4,5,6,8 stay — it still writes
`Paciente.consentimientoFirmado`/`consentimientoFirmadoAt`).

**Removal A — the indicaciones guard (lines 605-610):**
```typescript
// (3) D-11: indicacionesLeidas must be true before signing is allowed.
if (!dto.indicacionesLeidas) {
  throw new BadRequestException(
    'Debe confirmar que ha leído las indicaciones antes de firmar.',
  );
}
```
→ delete the whole block. Renumber the subsequent step comments if desired (cosmetic).

**Removal B — the write of `indicacionesLeidasAt` into the forensic record (line 650):**
```typescript
await this.prisma.consentimientoFirmado.create({
  data: {
    pacienteId,
    zonaId: dto.zonaId,
    consentimientoZonaArchivoId: archivo.id,
    pdfFirmadoPath: signedPath,
    ip,
    userAgent,
    versionNumero: archivo.version,
    hashSha256,
    indicacionesLeidasAt: new Date(),   // ← DELETE THIS LINE (column now nullable, D-02)
  },
});
```
> The `create` compiles after removal only because schema delta (b) made the column
> `DateTime?`. Order matters: schema/migration change lands with (or before) this edit.
> Also update the method's docstring (541-558) — remove the "confirm indicacionesLeidas
> (D-11)" clause so the header stops advertising a coupling that no longer exists.

---

### 4. `FirmarConsentimientoPortalDto` — drop `indicacionesLeidas` (D-03)

**File:** `dto/firmar-consentimiento-portal.dto.ts:19-28`. Remove the third field:
```typescript
export class FirmarConsentimientoPortalDto {
  @IsUUID()
  zonaId: string;

  @IsString()
  signaturePngDataUrl: string; // data URL — prefix stripped server-side

  @IsBoolean()
  indicacionesLeidas: boolean; // ← DELETE (field + the @IsBoolean import if now unused)
}
```
> Safe by construction: the controller's per-route `new ValidationPipe({ whitelist: true })`
> (controller line 178) silently strips any extra field a stale Phase-61 front still sends
> (D-03). Drop the now-unused `IsBoolean` from the `class-validator` import (line 1) and
> update the class docstring ("Declares THREE fields..." → TWO).

---

### 5. NEW acuse endpoint — portal-scoped (INDIC-03, D-06/D-07, SC#2)

**Analog (route + auth shape):** `@Patch('salud')` and `@Post('consulta')` in
`paciente-portal.controller.ts` (122-130, 147-155). Copy the guard + `req.user`
identity pattern EXACTLY.

**Controller route to add** (mirror `@Post('consulta')`, but no DTO/body per D-07):
```typescript
@UseGuards(PortalJwtGuard)
@Post('indicaciones/acuse')
registrarAcuseIndicaciones(@Req() req: PortalRequest) {
  return this.service.registrarAcuseIndicaciones(req.user.pacienteId);
}
```
**Load-bearing invariants copied from the analogs (verified):**
- `pacienteId` comes ONLY from the portal JWT (`req.user.pacienteId`) — `PortalJwtStrategy`
  (strategy name `'portal-jwt'`) rejects any payload whose `scope !== 'portal-paciente'`
  and returns `{ pacienteId }` (strategy `validate()` lines 35, 48). NEVER from `@Param`/`@Body`.
- `@UseGuards(PortalJwtGuard)` is **per-route** — never class-level (would break the
  public `preVerify`/`verificar` routes). See controller doc lines 28-40.
- `PortalRequest` type alias (controller line 22): `Request & { user: { pacienteId: string } }`.
- No body ⇒ no `ValidationPipe` needed (there is nothing to whitelist).

**`req.user` shape (portal-jwt strategy):**
```typescript
if (payload?.scope !== 'portal-paciente') { /* reject */ }   // strategy line 35
return { pacienteId: paciente.id };                          // strategy line 48
```

---

### 6. NEW service method `registrarAcuseIndicaciones` — set-once idempotent (D-06)

**Analog (Paciente aggregate update):** `firmarConsentimiento` step 8 (service 655-661):
```typescript
await this.prisma.paciente.update({
  where: { id: pacienteId },
  data: { consentimientoFirmado: true, consentimientoFirmadoAt: new Date() },
});
```

**Set-once variant (D-06 — first acuse wins, retries are no-ops, never overwrite the
legally-significant first timestamp).** Use `updateMany` with a `null` guard in the
`where` so a second call updates 0 rows instead of overwriting:
```typescript
/**
 * Records the indicaciones read-receipt on the patient profile (INDIC-03, D-06).
 * Set-once + global: the FIRST call stamps Paciente.indicacionesLeidasAt; later
 * calls match 0 rows (WHERE indicacionesLeidasAt IS NULL) so the original
 * legally-significant timestamp is never overwritten (idempotent).
 * pacienteId ALWAYS from the portal JWT — never from body (mirrors firmarConsentimiento).
 */
async registrarAcuseIndicaciones(pacienteId: string): Promise<{ ok: true }> {
  await this.prisma.paciente.updateMany({
    where: { id: pacienteId, indicacionesLeidasAt: null },
    data: { indicacionesLeidasAt: new Date() },
  });
  return { ok: true };   // idempotent — { ok: true } even when 0 rows updated
}
```
> Return shape `{ ok: true }` matches `firmarConsentimiento` (line 664). `updateMany`
> (not `update`) is deliberate: `update` on a non-existent id throws, and the `null`
> filter can't be expressed in a `where: { id }` unique-update. 0-rows == already-acked
> == success.

---

### 7. `computePasosCrm` + `PacientePasosInput` — derive from profile (INDIC-04, D-04/D-05, SC#3)

**File:** `crm-steps.helper.ts`. This helper ALREADY uses a legacy-OR pattern — extend it,
don't restructure it.

**(a) `PacientePasosInput` (28-49) — add the new primary-source field.** Mirror the
existing legacy-flag fields (46-48):
```typescript
/** Legacy Paciente.indicacionesEnviadas boolean (fallback pre-v1.12) */
indicacionesEnviadas?: boolean | null;
```
Add:
```typescript
/** Paciente.indicacionesLeidasAt (v1.14) — fuente PRIMARIA nueva del paso indicaciones */
indicacionesLeidasAt?: Date | string | null;
```

**(b) `computePasosCrm` Paso 5 (94-99) — prepend the new primary source to the OR.**
Current:
```typescript
// ── Paso 5: Indicaciones preop ────────────────────────────────────────────
// Primary (v1.12): ConsentimientoFirmado.indicacionesLeidasAt presente
// Fallback (legacy): Paciente.indicacionesEnviadas === true
const indicacionesPreopCompleto =
  consentimientosFirmados.some((c) => c.indicacionesLeidasAt != null) ||
  indicacionesEnviadasLegacy === true;
```
Change to (D-04 exact 3-source OR — new primary first, both old sources demoted to fallback):
```typescript
// ── Paso 5: Indicaciones preop ────────────────────────────────────────────
// Primary (v1.14): Paciente.indicacionesLeidasAt presente (acuse en el perfil)
// Fallback 1 (legacy v1.12): ConsentimientoFirmado.indicacionesLeidasAt
// Fallback 2 (legacy pre-v1.12): Paciente.indicacionesEnviadas === true
const indicacionesPreopCompleto =
  p.indicacionesLeidasAt != null ||
  consentimientosFirmados.some((c) => c.indicacionesLeidasAt != null) ||
  indicacionesEnviadasLegacy === true;
```
> Destructure `p.indicacionesLeidasAt` at the top alongside the other `const ... = p.xxx ?? ...`
> lines (62-67) if you prefer, or read `p.indicacionesLeidasAt` inline as shown. Update
> the file header docstring (8-10) to name the new primary source. Consentimiento (Paso 4)
> is UNCHANGED — decoupling only affects Paso 5.

---

### 8. `getKanban` select — surface the new field (D-05, SC#3)

**File:** `pacientes.service.ts`. `getKanban` is the **only** consumer of `computePasosCrm`
(CONTEXT integration point). Two edits.

**(a) Add to the top-level `Paciente` select (near lines 660-661, alongside the other
legacy flags already selected):**
```typescript
// Payload enriquecido para pasos del stepper (D-04/D-05)
consentimientoFirmado: true,
indicacionesEnviadas: true,
indicacionesLeidasAt: true,          // ← ADD (v1.14 primary source, INDIC-04)
```

**(b) Pass it into the `computePasosCrm({ ... })` call (741-748):**
```typescript
...computePasosCrm({
  presupuestos: p.presupuestos,
  cirugias: p.cirugias,
  historiasClinicas: p.historiasClinicas,
  consentimientosFirmados: p.consentimientosFirmados,
  consentimientoFirmado: p.consentimientoFirmado,
  indicacionesEnviadas: p.indicacionesEnviadas,
  indicacionesLeidasAt: p.indicacionesLeidasAt,   // ← ADD
}),
```

---

### 9. cr-01 — `actualizarIndicacionesUrl` URL validation (folded todo)

**File:** `catalogo-hc.service.ts:761-788`.

> **IMPORTANT DISCREPANCY FOR PLANNER:** CONTEXT describes cr-01 as "`indicacionesUrl`
> persisted without server-side validation." The current committed code (HEAD =
> `1084474`) **already contains the full manual validation** in this method. The
> stored-XSS fix appears to have already landed. Verify before planning net-new work.

**Validation already present (lines 766-779) — this IS the pattern, matches the cr-01 spec exactly:**
```typescript
if (indicacionesUrl !== null) {
  if (indicacionesUrl.length > 2048) {
    throw new BadRequestException('URL de indicaciones demasiado larga (máx 2048 caracteres)');
  }
  let parsed: URL;
  try {
    parsed = new URL(indicacionesUrl);
  } catch {
    throw new BadRequestException('URL de indicaciones inválida');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException('URL de indicaciones debe usar protocolo http o https');
  }
}
```
This already covers every cr-01 requirement: `new URL()` reject-on-throw, http/https-only
(rejects `javascript:`/`data:`), `maxLength` 2048, and `null` allowed to clear.

**Remaining cr-01 work (cosmetic/verification only, IF the above is confirmed present):**
- Remove the misleading docstring at **service line 759**:
  `Allows null to clear the URL (D-02 / T-53-11 @IsUrl validated in DTO).` — the
  "@IsUrl validated in DTO" claim is dead-code (no global ValidationPipe; DTO decorators
  in `consentimientos/dto/update-indicaciones.dto.ts` don't run). Reword to point at the
  manual server-side check.
- Optionally note in the controller (`catalogo-hc.controller.ts:115-131`) that validation
  is server-side in the service.
> Manual-validation-in-service (no global pipe) is the project-wide pattern — see the
> portal's manual `pickPresent` defense (service 672+) and the per-route ValidationPipe
> approach. This is the established convention; do NOT add a global ValidationPipe (Deferred).

---

## Shared Patterns

### Portal identity from JWT (NEVER from body/param)
**Source:** `paciente-portal.controller.ts:22` (type) + `strategies/portal-jwt.strategy.ts:35,48`
**Apply to:** the new acuse endpoint (#5) and its service method (#6)
```typescript
type PortalRequest = Request & { user: { pacienteId: string } };
// strategy: rejects scope !== 'portal-paciente'; returns { pacienteId: paciente.id }
@UseGuards(PortalJwtGuard)   // ALWAYS per-route, NEVER class-level
```

### Manual server-side validation (no global ValidationPipe)
**Source:** `catalogo-hc.service.ts:766-779` (URL); `paciente-portal.controller.ts:110,126,178` (per-route pipe)
**Apply to:** cr-01 (#9) and any body-carrying portal write
> This project has NO global `ValidationPipe`. Two safe patterns exist: (a) per-route
> `new ValidationPipe({ whitelist: true })` for mass-assignment stripping (portal writes),
> and (b) explicit manual checks in the service (`actualizarIndicacionesUrl`). DTO
> class-validator decorators alone are decorative and MUST NOT be relied on.

### Prisma `Paciente` aggregate/set-once update
**Source:** `paciente-portal.service.ts:655-661` (aggregate flag), extended to set-once in #6
**Apply to:** the acuse write
```typescript
// set-once: WHERE ... indicacionesLeidasAt: null → 0-row no-op on retries
await this.prisma.paciente.updateMany({ where: { id, indicacionesLeidasAt: null }, data: {...} });
```

### Legacy-OR non-regression in derived flags
**Source:** `crm-steps.helper.ts:90-99` (already the codebase convention for Pasos 4 & 5)
**Apply to:** `computePasosCrm` Paso 5 (#7) — new primary source OR'd ahead of both legacy fallbacks (D-04)

### pgBouncer raw-SQL migration
**Source:** `migrations/20260701000000_signed_consent_forensic/migration.sql` (header + additive style)
**Apply to:** the new migration (#2) — `prisma diff + db execute + migrate resolve`, `directUrl` bypass, never `migrate dev`

---

## No Analog Found

None. Every target has an exact or role-match in-repo analog; no RESEARCH.md fallback required.

---

## Metadata

**Analog search scope:** `backend/src/modules/{paciente-portal,pacientes,catalogo-hc,consentimientos}`, `backend/src/prisma/{schema.prisma,migrations}`
**Files scanned:** 9 read in full/targeted + guard/strategy/DTO greps
**Pattern extraction date:** 2026-07-08
