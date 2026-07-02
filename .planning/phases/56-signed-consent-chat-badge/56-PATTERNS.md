# Phase 56: Signed Consent + Chat Badge - Pattern Map

**Mapped:** 2026-07-01
**Files analyzed:** 18 (7 new, 11 modified)
**Analogs found:** 17 / 18 (one greenfield: PDF stamping service)

All excerpts below are copied from real repo files. Line numbers are load-bearing — the planner should reference them directly in PLAN action steps.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/src/prisma/schema.prisma` (add `ConsentimientoFirmado`, `version`, `Cirugia.cirugiaCatalogoId`) | model | CRUD | existing `ConsentimientoZonaArchivo` (schema.prisma:1404) | exact |
| `backend/src/modules/consentimientos/consent-stamp.service.ts` | service | file-I/O / transform | `presupuesto-pdf.service.ts` (role) + `storage.service.ts` (I/O) | role-match (greenfield lib) |
| `backend/src/modules/consentimientos/consentimientos.service.ts` (version roll on upload) | service | CRUD | itself — `uploadConsentimiento` (:29-72) | exact (self-extend) |
| `backend/src/modules/consentimientos/consentimientos.module.ts` (export stamp svc) | config | — | itself (:1-12) + `paciente-portal.module.ts` | exact |
| `backend/src/modules/paciente-portal/paciente-portal.controller.ts` (GET + POST firma) | controller | request-response | `enviarConsulta` route (:124-132) | exact |
| `backend/src/modules/paciente-portal/paciente-portal.service.ts` (resolver + firmar) | service | CRUD / transform | `crearConsulta` (:311-334) + `getDatos` (:86-152) | exact |
| `backend/src/modules/paciente-portal/paciente-portal.module.ts` (import ConsentimientosModule) | config | — | itself (:22-30) | exact |
| `backend/src/modules/paciente-portal/dto/firmar-consentimiento-portal.dto.ts` | dto | request-response | `create-consulta-portal.dto.ts` (:16-21) | exact |
| `backend/src/modules/mensajes-internos/mensajes-internos.service.ts` (add `origenPaciente`) | service | CRUD | itself — `findByPaciente` (:108-139) | exact (self-extend) |
| `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` (CR-01 URL validation) | service | CRUD | itself — `actualizarIndicacionesUrl` (:760-773) | exact (self-extend) |
| `backend/src/main.ts` (body limit 2mb) | config | — | itself (:12-46) | exact |
| `frontend/src/components/portal/PortalConsentimiento.tsx` | component | request-response | `PortalConsultas.tsx` (:1-60) | exact |
| `frontend/src/hooks/usePortalConsentimiento.ts` | hook | request-response | `usePortalDatos.ts` (:1-62) | exact |
| `frontend/src/app/portal/[token]/page.tsx` (replace placeholder) | component | — | itself (:345-361) | exact (self-extend) |
| `frontend/src/components/mensajes/MessageBubble.tsx` (teal Paciente branch) | component | — | itself — `esSistema` branch (:39-60) | exact (self-extend) |
| `frontend/src/hooks/useMensajesPaciente.ts` (add `origenPaciente` to type) | hook | CRUD | itself — `Mensaje` interface (:4-20) | exact (self-extend) |
| `frontend/src/components/mensajes/ChatView.tsx` (pass prop) | component | — | itself — MessageBubble render (:118-127) | exact (self-extend) |
| `frontend/src/components/patient/PatientDrawer/views/DatosCompletos.tsx` (emerald date badge) | component | — | itself — consent `FieldRow` (:820-831) | exact (self-extend) |

---

## Pattern Assignments

### `backend/src/prisma/schema.prisma` (model, CRUD)

**Analog:** existing `ConsentimientoZonaArchivo` model at line 1404; `Cirugia` at 854 (`procedimiento String?` at 861, no FK); `CirugiaCatalogo` at 943; `Paciente` at 152; `ZonaHC` at 1384; flag fields already present (`consentimientoFirmado` :172, `consentimientoFirmadoAt` :216).

**Three deltas** (schema shapes and backfill SQL are fully specified in RESEARCH.md §"Prisma Schema Deltas", lines 665-747 — copy verbatim):
1. `ConsentimientoZonaArchivo` gains `version Int @default(1)` + back-relation `consentimientosFirmados`.
2. NEW model `ConsentimientoFirmado` (10 forensic fields + 3 relations + 3 indexes). Use `onDelete: Restrict` on `consentimientoZonaArchivoId` (immutability, D-06 / RESEARCH Assumption A4).
3. `Cirugia` gains `cirugiaCatalogoId String?` + relation; `CirugiaCatalogo` gains inverse `cirugias Cirugia[]` (REQUIRED for D-09 chain — RESEARCH §"Critical Schema Gap" :631-661).

Inverse `consentimientosFirmados ConsentimientoFirmado[]` back-relations must be added to `Paciente` (152) and `ZonaHC` (1384).

**Migration command** (per CLAUDE.md): `npx prisma migrate dev`. Backfill SQL (RESEARCH :689-703) goes inside the generated migration file after the `ALTER TABLE`.

---

### `backend/src/modules/consentimientos/consent-stamp.service.ts` (service, transform — GREENFIELD)

**Analog (role/DI shape):** `presupuesto-pdf.service.ts` (`@Injectable` service returning `Promise<Buffer>`); `storage.service.ts` for the crypto/`node:` import style and Buffer handling. No existing PDF-**stamping** analog — pdf-lib is new to the repo (see "No Analog Found").

**DI + logger + service shell** (copy from `consentimientos.service.ts` lines 1-17):
```typescript
import { Injectable, Logger, BadRequestException } from '@nestjs/common';

@Injectable()
export class ConsentStampService {
  private readonly logger = new Logger(ConsentStampService.name);
}
```

**Full stamping implementation** (pdf-lib load → embedPng → white rect → forensic box → drawText → save → Buffer → SHA-256) is specified verbatim in RESEARCH.md §"Pattern 1" (:221-317) and §"Pattern 2" (:329-353). Critical ordering rules (D-02): hash computed over the FINAL buffer AFTER `pdfDoc.save()`, never inside the PDF. PNG magic-byte validation mirrors the existing `%PDF-` magic-byte check in `consentimientos.service.ts:44`:
```typescript
// existing PDF magic-byte pattern to mirror for PNG (consentimientos.service.ts:44)
if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
  throw new BadRequestException('El archivo no es un PDF válido');
}
```
PNG variant (RESEARCH :402-410): compare `pngBuffer.subarray(0, 8)` to `\x89PNG\r\n\x1a\n`.

**Storage I/O** — reuse `StorageService` (already injectable via `StorageModule`):
- `this.storage.readFile(templatePath)` → template `Buffer` (storage.service.ts:69-71)
- `this.storage.save(signedBuffer, profesionalId)` → relative path (storage.service.ts:21-34)
- `this.storage.getPublicUrl(signedPath)` → public URL (storage.service.ts:77-85)

---

### `backend/src/modules/consentimientos/consentimientos.service.ts` (service, CRUD — self-extend)

**Analog:** its own `uploadConsentimiento` (:29-72). Extend the Step-4 version-roll `$transaction` to compute and set the new `version`.

**Existing version-roll transaction to extend** (:52-66):
```typescript
const [, createdRow] = await this.prisma.$transaction([
  this.prisma.consentimientoZonaArchivo.updateMany({
    where: { zonaId, vigente: true },
    data: { vigente: false },
  }),
  this.prisma.consentimientoZonaArchivo.create({
    data: { zonaId, profesionalId, path: filePath, nombreOriginal: originalName, vigente: true },
  }),
]);
```
Add `version: nextVersion` to the `create.data`. Compute `nextVersion` via the `aggregate({ _max: { version } })` snippet in RESEARCH :707-712 (run before the transaction).

---

### `backend/src/modules/consentimientos/consentimientos.module.ts` (config — self-extend)

**Analog:** itself (:1-12). Already `imports: [StorageModule]`, already `exports: [ConsentimientosService]`. Add `ConsentStampService` to both `providers` and `exports` so `paciente-portal.module.ts` can inject it.

---

### `backend/src/modules/paciente-portal/paciente-portal.controller.ts` (controller, request-response)

**Analog:** the `enviarConsulta` route (:124-132) — the canonical portal-write pattern.

**Route + guard + per-route ValidationPipe + JWT-scoped pacienteId** (copy structure from :124-132):
```typescript
@UseGuards(PortalJwtGuard)
@Post('consulta')
enviarConsulta(
  @Req() req: PortalRequest,
  @Body(new ValidationPipe({ whitelist: true }))
  dto: CreateConsultaPortalDto,
) {
  return this.service.crearConsulta(req.user.pacienteId, dto);
}
```

`PortalRequest` type (`req.user.pacienteId`) already declared at :20-21. Guard is per-route, NEVER class-level (public preVerify/verificar must stay open — see class docblock :23-39).

**New GET** (resolve zones) — copy the guarded read shape from `getDatos` (:69-73):
```typescript
@UseGuards(PortalJwtGuard)
@Get('consentimiento')
getConsentimiento(@Req() req: PortalRequest) {
  return this.service.getConsentimientosParaFirmar(req.user.pacienteId);
}
```

**New POST** (`consentimiento/firmar`) — same as `enviarConsulta` PLUS server-side IP/userAgent capture from headers (NEVER body). Exact header-capture snippet in RESEARCH §"Pattern 4" (:459-473) and §"IP capture" (:885-891). New DTO = `FirmarConsentimientoPortalDto`.

---

### `backend/src/modules/paciente-portal/paciente-portal.service.ts` (service, CRUD/transform)

**Analog:** `crearConsulta` (:311-334) for the write + existence-check + narrow return; `getDatos` (:86-152) for the read/resolver shape.

**Existence guard + narrow return pattern** (copy from crearConsulta :315-333):
```typescript
const exists = await this.prisma.paciente.findUnique({
  where: { id: pacienteId },
  select: { id: true },
});
if (!exists) throw new NotFoundException();
```

**Two new methods:**
- `getConsentimientosParaFirmar(pacienteId)` — the pending-surgery → zone → template resolver. Full Prisma `findMany` with nested `include` + the six empty-state cases are in RESEARCH :753-801. Note `getDatos` already reads `Cirugia` by `pacienteId` (:112-120) — reuse that filter shape (`estado`, `pacienteId`).
- `firmarConsentimiento(pacienteId, dto, ip, userAgent)` — strip base64 prefix (RESEARCH :397-400), validate PNG magic bytes, call `ConsentStampService`, `StorageService.save`, `prisma.consentimientoFirmado.create`, then set the aggregate flag on `Paciente` (RESEARCH §"Set Paciente aggregate flag" :907-915). D-08 re-sign guard = the `findFirst` conflict check in RESEARCH :897-903.

**Injection:** add `ConsentStampService` + `StorageService` to the constructor (mirror the `PrismaService, JwtService` constructor at :36-39).

---

### `backend/src/modules/paciente-portal/paciente-portal.module.ts` (config — self-extend)

**Analog:** itself (:22-30). Add `imports: [ConsentimientosModule, StorageModule]` (ConsentimientosModule exports `ConsentStampService`; StorageModule exports `StorageService`). PrismaService is global — no import (see module docblock :19-20).

---

### `backend/src/modules/paciente-portal/dto/firmar-consentimiento-portal.dto.ts` (dto, request-response)

**Analog:** `create-consulta-portal.dto.ts` (:16-21) — single-purpose narrow DTO with class-validator decorators; `pacienteId` deliberately NOT declared (comes from JWT).

```typescript
// analog to copy (create-consulta-portal.dto.ts:16-21)
export class CreateConsultaPortalDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  mensaje: string;
}
```
New DTO fields (RESEARCH :478-491): `@IsUUID() zonaId`, `@IsString() signaturePngDataUrl`, `@IsBoolean() indicacionesLeidas`. Keep the docblock note that identity comes from JWT only.

---

### `backend/src/modules/mensajes-internos/mensajes-internos.service.ts` (service, CRUD — self-extend)

**Analog:** its own `findByPaciente` (:108-139). TWO one-line additions (RESEARCH Pitfall G :865-867):

**1. Add to the `select` block** (after :117 `esSistema: true`):
```typescript
select: {
  id: true,
  mensaje: true,
  prioridad: true,
  esSistema: true,
  origenPaciente: true,   // ADD — already Boolean on MensajeInterno model
  createdAt: true,
  ...
```

**2. Add to the `.map()` DTO shape** (:135-139):
```typescript
return mensajes.map((m) => ({
  ...m,
  leido: m.lecturas.length > 0,
  esPropio: m.autorId === userId && !m.esSistema,
  origenPaciente: m.origenPaciente,   // ADD
}));
```
(Note: `origenPaciente` is already written `true` by `paciente-portal.service.ts crearConsulta` :326.)

---

### `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` (service, CRUD — self-extend, CR-01 BLOCKER)

**Analog:** its own `actualizarIndicacionesUrl` (:760-773). Prepend URL validation BEFORE the existing ownership guard. The current method has NO validation (`@IsUrl` is dead code — no global ValidationPipe).

**Existing method to extend** (:760-773):
```typescript
async actualizarIndicacionesUrl(
  profesionalId: string,
  zonaId: string,
  indicacionesUrl: string | null,
) {
  const zona = await this.prisma.zonaHC.findUnique({ where: { id: zonaId } });
  if (!zona || zona.profesionalId !== profesionalId) {
    throw new NotFoundException('Zona no encontrada');
  }
  return this.prisma.zonaHC.update({ where: { id: zonaId }, data: { indicacionesUrl } });
}
```
Insert the `new URL()` + http/https protocol + `maxLength 2048` + allow-null validation from RESEARCH §"Pattern 5" (:497-524) at the top of the method body. `BadRequestException` is already imported in this file (used elsewhere). This is a MANDATORY blocker per CONTEXT Reviewed Todos (CR-01, stored-XSS).

---

### `backend/src/main.ts` (config — self-extend)

**Analog:** itself (:12-46). After `NestFactory.create` (:15) and before `app.listen` (:45), add the express body-limit middleware (RESEARCH Pitfall D :853-855, Pattern 3 :413-420):
```typescript
import * as express from 'express';
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
```
`rawBody: true` (:15) is unaffected — separate concern (RESEARCH Assumption A2).

---

### `frontend/src/components/portal/PortalConsentimiento.tsx` (component, request-response — NEW)

**Analog:** `PortalConsultas.tsx` (:1-60) — `'use client'`, `useState`, portal hook via `useEnviarConsulta`, `Loader2`/`CheckCircle` from lucide, toast, submit-then-success-banner flow, `text-base` root.

**Component shell to copy** (PortalConsultas.tsx :1-27):
```typescript
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePortalConsentimiento } from "@/hooks/usePortalConsentimiento";
```

**Signature capture** (signature_pad refs, isEmpty gate, fallback, resize) — RESEARCH §"Pattern 3" (:356-442) and UI-SPEC §"Surface 1" (Canvas :253-320, Interaction Contracts :496-520). **All visual/copy/typography rules are LOCKED in 56-UI-SPEC.md** — the executor must follow UI-SPEC verbatim for: empty-state copy (:129-134), already-signed state (:138-154), multi-zone cards (:159-177), PDF download link (:191-203), indicaciones check + `safeIndicacionesUrl` XSS guard (:209-251), canvas actions (:296-320), post-sign success (:332-341). 3 sizes / 2 weights only; teal accent reserved.

**Security (UI-SPEC §"Security Contracts" :524-534):** `indicacionesUrl` and `pdfUrl` only ever as `href`; validate `/^https?:\/\//i` at render.

---

### `frontend/src/hooks/usePortalConsentimiento.ts` (hook, request-response — NEW)

**Analog:** `usePortalDatos.ts` (:1-62) — `useQuery` + `useMutation` on `portalApi`, `invalidateQueries` on success.

**Query + mutation pattern to copy** (usePortalDatos.ts :5-30):
```typescript
export function usePortalDatos(enabled: boolean) {
  return useQuery<PortalDatos>({
    queryKey: ["portal-datos"],
    queryFn: async () => {
      const { data } = await portalApi.get("/paciente-portal/public");
      return data;
    },
    enabled,
  });
}

export function useUpdateContacto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await portalApi.patch("/paciente-portal/public/datos-personales", payload);
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["portal-datos"] }); },
  });
}
```
New hook: `useConsentimientosParaFirmar` (GET `/paciente-portal/public/consentimiento`) + `useFirmarConsentimiento` (POST `/paciente-portal/public/consentimiento/firmar`). `portalApi` (auth interceptor, sessionStorage `portalToken`) is at `frontend/src/lib/portal-api.ts:1-19`.

---

### `frontend/src/app/portal/[token]/page.tsx` (component — self-extend)

**Analog:** itself. Replace the placeholder `<AccordionContent>` block (:356-360) inside the `value="consentimiento"` AccordionItem (:345-361) with `<PortalConsentimiento />`. Import mirrors the existing `<PortalConsultas />` usage (:375). The AccordionItem wrapper, `FileSignature` teal icon (:352), and `font-semibold text-base` trigger stay unchanged.

---

### `frontend/src/components/mensajes/MessageBubble.tsx` (component — self-extend, CHAT-03)

**Analog:** its own `esSistema` early-return branch (:39-60). Add `origenPaciente: boolean` to `MessageBubbleProps` (:10-23), add `UserRound` to the lucide import (:8), and insert a new branch BETWEEN the `esSistema` return (:39-60) and the general avatar return (:64).

**Existing branch structure to mirror** (:39-60):
```tsx
import { Bot } from 'lucide-react';   // :8 — add UserRound here

if (esSistema) {                       // :39 — existing
  return ( ...centered Bot notification... );
}
// NEW BRANCH GOES HERE: if (origenPaciente && !esSistema) { ...teal bubble... }
```
Full teal branch JSX (avatar circle, "Paciente" badge, `bg-teal-50` bubble, timestamp) is locked in 56-UI-SPEC.md §"Surface 2" (:359-413). Bubble body uses `text-base` (16px) per UI-SPEC, not the staff `text-sm`.

---

### `frontend/src/hooks/useMensajesPaciente.ts` (hook — self-extend)

**Analog:** its own `Mensaje` interface (:4-20). Add `origenPaciente: boolean;` alongside `esPropio`/`esSistema` (:8, :19) so the field the backend now returns is typed.

---

### `frontend/src/components/mensajes/ChatView.tsx` (component — self-extend)

**Analog:** itself — the `MessageBubble` render (:118-127). Add `origenPaciente={mensaje.origenPaciente}` to the prop spread (after :126 `leido={mensaje.leido}`), so the new prop reaches the bubble.

---

### `frontend/src/components/patient/PatientDrawer/views/DatosCompletos.tsx` (component — self-extend, CONS-08)

**Analog:** its own consent `FieldRow` (:820-831).

**Existing FieldRow to extend** (:820-831):
```tsx
<FieldRow
  label="Consentimiento firmado"
  value={
    <EditableCheckbox
      disabled={!isEditing("estado") || saving}
      checked={estadoForm.consentimientoFirmado}
      onChange={(v) => setEstadoForm((f) => ({ ...f, consentimientoFirmado: v }))}
    />
  }
/>
```
Wrap the `value` in a flex row and append the emerald date pill when `paciente.consentimientoFirmadoAt` is non-null. Exact JSX + emerald tokens + `toLocaleDateString('es-AR')` in 56-UI-SPEC.md §"Surface 3" (:438-463). Add `CheckCircle2` to lucide imports (current imports at :1-11 only bring `ArrowLeft`). Emerald (NOT teal) — deliberate, to avoid collision with the chat badge. `findOne` already returns `consentimientoFirmadoAt` (RESEARCH :809) — no backend change for the drawer.

---

## Shared Patterns

### Portal endpoint security (JWT-scoped identity + per-route ValidationPipe)
**Source:** `paciente-portal.controller.ts:124-132` (`enviarConsulta`)
**Apply to:** both new firma endpoints (GET + POST)
```typescript
@UseGuards(PortalJwtGuard)          // per-route, NEVER class-level
@Post('consulta')
enviarConsulta(
  @Req() req: PortalRequest,        // req.user.pacienteId from JWT (pitfall 12)
  @Body(new ValidationPipe({ whitelist: true })) dto: CreateConsultaPortalDto,
) {
  return this.service.crearConsulta(req.user.pacienteId, dto);
}
```
`pacienteId`/`zonaId` NEVER from body (RESEARCH Pitfall E :857-859). No global ValidationPipe exists — the per-route pipe is load-bearing.

### File storage (multi-tenant, cloud-ready)
**Source:** `storage.service.ts` — `save(buffer, profesionalId)` (:21-34), `readFile(relativePath)` (:69-71), `getPublicUrl(relativePath)` (:77-85)
**Apply to:** `consent-stamp.service.ts` + `paciente-portal.service.ts firmarConsentimiento`
Paths are `{profesionalId}/{uuid}.pdf`; public URL via `BACKEND_URL` env (attachment serving already wired in F53).

### Magic-byte content validation (never trust MIME)
**Source:** `consentimientos.service.ts:44` (PDF `%PDF-` check)
**Apply to:** PNG signature validation in `firmarConsentimiento` (compare first 8 bytes to PNG magic — RESEARCH :402-410)

### SHA-256 via node:crypto
**Source:** `paciente-portal.service.ts:9,42-44` (`crypto.createHash('sha256').update(raw).digest('hex')`)
**Apply to:** forensic hash in `consent-stamp.service.ts` — same call, over the FINAL signed-PDF `Buffer`, hash persisted ONLY in DB (D-02, RESEARCH Pitfall B :845-847)

### Narrow DTO / allow-list writes (mass-assignment defense)
**Source:** `create-consulta-portal.dto.ts:16-21` + `paciente-portal.service.ts pickPresent` (:341-354)
**Apply to:** `FirmarConsentimientoPortalDto` (declare only signing fields; identity from JWT)

### Portal data hook (TanStack Query on portalApi)
**Source:** `usePortalDatos.ts:1-62` + `portal-api.ts:1-19`
**Apply to:** `usePortalConsentimiento.ts`

### Portal client component flow (submit → success banner)
**Source:** `PortalConsultas.tsx:1-60` (`'use client'`, hook, `Loader2`/`CheckCircle`, toast, `text-base`)
**Apply to:** `PortalConsentimiento.tsx`

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `backend/src/modules/consentimientos/consent-stamp.service.ts` (pdf-lib load+stamp) | service | transform | Repo only generates PDFs from scratch with `pdfkit` (`presupuesto-pdf.service.ts`, `factura-pdf.service.ts`) — no library loads/modifies an EXISTING PDF. `pdf-lib` is greenfield. The `@Injectable`/`Logger`/`StorageService`-DI/`Buffer`/`node:crypto` shell HAS analogs; only the pdf-lib stamping body is new. Use RESEARCH §"Pattern 1" (:221-317) verbatim. Requires `checkpoint:human-verify` before `npm install pdf-lib@1.17.1` (RESEARCH §"Package Legitimacy Audit" :117-134). |

---

## Metadata

**Analog search scope:**
- `backend/src/modules/{consentimientos,paciente-portal,mensajes-internos,storage,presupuestos,catalogo-hc}/`
- `backend/src/{main.ts,prisma/schema.prisma}`
- `frontend/src/{hooks,components/portal,components/mensajes,components/patient/PatientDrawer/views,lib,app/portal}/`

**Files scanned (read):** 14 source files + schema grep + directory listings
**Pattern extraction date:** 2026-07-01

> Downstream planner: 56-UI-SPEC.md is the LOCKED visual/copy contract for all three frontend surfaces — reference it, do not re-derive. 56-RESEARCH.md holds the full pdf-lib/resolver/schema code that has no in-repo analog — copy those snippets directly.
