# Phase 67: Teléfono Opcional y Guards de Envío (Backend) - Pattern Map

**Mapped:** 2026-08-17
**Files analyzed:** 11 (2 schema/DTO, 5 service edits, 1 service comment-only, 2 new test files, 1 existing test file to extend)
**Analogs found:** 11 / 11 (all have an in-repo analog; two new spec files use a composite analog — no whatsapp/presupuestos spec exists yet)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/src/prisma/schema.prisma` (`Paciente.telefono`, line 158) | model/config | CRUD | `Paciente.telefonoAlternativo` (same file, line 159) | exact — same model, same primitive type, only diff is now-matching nullability |
| `backend/src/modules/pacientes/dto/create-paciente.dto.ts` (`telefono`, lines 23-24) | DTO/validation | request-response | `telefonoAlternativo` field, same file lines 26-28 | exact — same DTO, sibling optional string field |
| `backend/src/modules/pacientes/pacientes.service.ts` — new `normalizeTelefono()` helper | service/utility | transform | `ensureExists()` private helper (same file, lines 332-335) + `EMAIL_SHAPE` runtime-validation comment (lines 38-43) | role-match — private helper + "validate at runtime because DTO validation is inert" convention |
| `backend/src/modules/pacientes/pacientes.service.ts` — `create()` (lines 54-85) | service | CRUD | itself (pattern to extend, not replace) | exact |
| `backend/src/modules/pacientes/pacientes.service.ts` — `update()` (lines 209-215) | service | CRUD | itself | exact |
| `backend/src/modules/pacientes/pacientes.service.ts` — `updateContacto()` (lines 426-449) | service | CRUD | itself; sibling `updateEmergencia()` (451-470) shows the "no-touch" contrast | exact |
| `backend/src/modules/pacientes/pacientes.service.ts` — `suggest()` raw SQL (lines 337-399) | service | CRUD (raw SQL) | `reportes-financieros.service.ts` `getMorosidad()` raw `$queryRaw` (lines ~547-570) | role-match — same NULL-in-`LIKE`/typed-generic raw-SQL shape |
| `backend/src/modules/pacientes/pacientes.service.ts` — passthrough reads (lines 166, 973) | service | CRUD (read) | `presupuesto-pdf.service.ts` `buildPatientSection()` optional-telefono render (line 143) | role-match — precedent for treating `telefono` as possibly-null |
| `backend/src/modules/whatsapp/whatsapp.service.ts` — 4 guard sites: `sendTemplateMessage` (187-235), `sendFreeText` (241-285), `sendPresupuestoPdf` (291-336), `retryMessage` (426-463) | service | request-response (queue producer) | the existing `whatsappOptIn` guard **inside these same 4 methods** | exact — same file, same shape, to be replicated verbatim |
| `backend/src/modules/presupuestos/presupuestos.service.ts` — `generatePdf()` (lines 417-476, `telefono` at ~428/458) | service | request-response (read passthrough) | `presupuesto-email.service.ts` `enviarPresupuesto()` pdfData block (lines ~60-90, `telefono` at line 77) | exact — same shape, same file family, both build the same `PresupuestoPdfData.paciente` payload |
| `backend/src/modules/reportes/services/reportes-financieros.service.ts` (3 sites, ~505-610: `CuentaPorCobrar`/`CuentaMorosa` mapping + raw SQL) | service | CRUD (raw SQL + read passthrough) | `pacientes.service.ts` `suggest()` — same raw-SQL-with-typed-generic idiom | role-match |
| `backend/src/modules/paciente-portal/paciente-portal.service.ts` — `pickPresent()` comment only (lines 690-703, WR-02) | service/utility | transform | itself — behavior unchanged per D-08, only the comment is rewritten | exact (no code change) |
| `backend/src/modules/pacientes/pacientes.service.spec.ts` (extend) | test | — | `describe('create() — default etapaCRM=NUEVO_LEAD + flujo=null (D-01/D-03)')` block, lines 392-441 | exact |
| `backend/src/modules/whatsapp/whatsapp.service.spec.ts` (**new file**) | test | — | composite: `finanzas.service.spec.ts` (BullMQ queue mock via `getQueueToken`) + `pacientes.service.spec.ts` (`Test.createTestingModule` + per-test `jest.fn()` overrides shape) | role-match — no whatsapp spec exists yet, first one for this module |
| `backend/src/modules/presupuestos/presupuestos.service.spec.ts` (**new file**) | test | — | `pacientes.service.spec.ts` mock-Prisma setup (no queue needed here) | role-match — no presupuestos spec exists yet |

## Pattern Assignments

### `backend/src/prisma/schema.prisma` (model, CRUD)

**Analog:** same file, `telefonoAlternativo` field one line below `telefono`

**Current state** (`schema.prisma:157-159`):
```prisma
telefono                          String
telefonoAlternativo               String?
```

**Pattern to copy:** just add `?`, matching the sibling field exactly:
```prisma
telefono                          String?
telefonoAlternativo               String?
```

Note the GIN trgm index on `telefono` (`schema.prisma:231`, `@@index([telefono(ops: raw("gin_trgm_ops"))], map: "idx_paciente_telefono_trgm", type: Gin)`) stays untouched — Postgres GIN indexes over nullable columns are valid, `NULL` rows are simply not indexed. Run via `npx prisma migrate dev` per CLAUDE.md.

---

### `backend/src/modules/pacientes/dto/create-paciente.dto.ts` (DTO, request-response)

**Analog:** `telefonoAlternativo` field in the same file (lines 26-28)

**Imports** (already present, lines 1-9):
```typescript
import {
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  IsBoolean,
  IsEnum,
} from 'class-validator';
```

**Current `telefono` field** (lines 23-24):
```typescript
@IsString()
telefono: string;
```

**Sibling optional-string field to copy the shape from** (lines 26-28):
```typescript
@IsOptional()
@IsString()
telefonoAlternativo?: string;
```

**Target shape for `telefono`:**
```typescript
@IsOptional()
@IsString()
telefono?: string;
```

`UpdatePacienteDto` needs **no separate edit** — it's `PartialType(CreatePacienteDto)` (`backend/src/modules/pacientes/dto/update-paciente.dto.ts:4`), so it inherits optionality automatically.

---

### `backend/src/modules/pacientes/pacientes.service.ts` — `normalizeTelefono()` helper (D-01/D-06)

**Analog A — private helper convention** (`ensureExists`, lines 332-335):
```typescript
private async ensureExists(id: string) {
  const exists = await this.prisma.paciente.findUnique({ where: { id } });
  if (!exists) throw new NotFoundException('Paciente no encontrado');
}
```

**Analog B — "DTO validation is inert, validate at runtime in the service" convention** (lines 38-43):
```typescript
/**
 * Conservative email shape check (WR-01). No global ValidationPipe is active, so
 * the `@IsEmail()` decorator on the DTO is inert — we MUST re-check at runtime
 * before persisting an address or using it as an SMTP `to:`.
 */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

**Existing length-validation to centralize** (`updateContacto`, lines 434-440 — this is the ≥6-char rule D-06 says must move into the new helper):
```typescript
// validación mínima backend
if (
  typeof patch.telefono !== 'string' ||
  patch.telefono.trim().length < 6
) {
  throw new BadRequestException('Teléfono inválido');
}
```

Error-throwing convention to reuse: `BadRequestException` already imported at line 30 (`import { BadRequestException } from '@nestjs/common';`).

---

### `backend/src/modules/pacientes/pacientes.service.ts` — `create()` (D-01, D-02)

**Analog:** itself, lines 54-85 (extend in place)

```typescript
async create(dto: CreatePacienteDto) {
  try {
    const data = {
      ...dto,
      fechaNacimiento: dto.fechaNacimiento
        ? new Date(dto.fechaNacimiento)
        : null,
      fechaIndicaciones: dto.fechaIndicaciones
        ? new Date(dto.fechaIndicaciones)
        : null,
      etapaCRM: EtapaCRM.NUEVO_LEAD,
      flujo: null,
    };
    return this.prisma.paciente.create({
      data,
    });
  } catch (error: any) {
    ...
    if (error.code === 'P2002' && error.meta?.target?.includes('dni')) {
      throw new ConflictException('El DNI ingresado ya está registrado.');
    }
    throw new InternalServerErrorException('Error interno al crear paciente');
  }
}
```

The `fechaNacimiento`/`fechaIndicaciones` conditional-transform-then-spread pattern in `data` is the exact shape to copy for injecting `telefono: this.normalizeTelefono(dto.telefono)` into the same object.

---

### `backend/src/modules/pacientes/pacientes.service.ts` — `update()` (D-02)

**Current state** (lines 209-215) — thin passthrough, no per-field transform today:
```typescript
async update(id: string, dto: UpdatePacienteDto) {
  await this.ensureExists(id);
  return this.prisma.paciente.update({
    where: { id },
    data: dto,
  });
}
```

This is the one call site with **no existing per-field transform to copy** — `create()`'s conditional-spread shape (above) is the nearest analog for how to special-case `telefono` (`dto.telefono !== undefined` before calling `normalizeTelefono`, since `UpdatePacienteDto` fields are all optional and an absent `telefono` must not be forced to `null`).

---

### `backend/src/modules/pacientes/pacientes.service.ts` — `updateContacto()` (D-05, D-06)

**Analog:** itself, lines 426-449 (current strict-required behavior to relax) vs. sibling `updateEmergencia()` (451-470, D-07 says this one is **not** touched — useful contrast for "what NOT to change"):

```typescript
private async updateContacto(id: string, data: any) {
  // whitelist explícito
  const patch = {
    telefono: data.telefono,
    telefonoAlternativo: data.telefonoAlternativo ?? null,
    email: data.email ?? null,
  };

  // validación mínima backend
  if (
    typeof patch.telefono !== 'string' ||
    patch.telefono.trim().length < 6
  ) {
    throw new BadRequestException('Teléfono inválido');
  }
  if (patch.email && typeof patch.email !== 'string') {
    throw new BadRequestException('Email inválido');
  }

  return this.prisma.paciente.update({
    where: { id },
    data: patch,
  });
}
```

Per D-05, the required-string check on `patch.telefono` must be replaced with a call into `normalizeTelefono()` (no value → `null`, with value → keep the ≥6-char check). The `patch`/`data` whitelist shape and the `BadRequestException` error style stay identical — only the branching logic on `telefono` changes.

---

### `backend/src/modules/pacientes/pacientes.service.ts` — `suggest()` raw SQL (integration risk, D per roadmap notes)

**Analog:** itself, lines 337-399 — `$queryRaw` with a typed generic declaring `telefono: string` and `LIKE` in both `WHERE` and score:

```typescript
const results = await this.prisma.$queryRaw<
  Array<{
    id: string;
    nombreCompleto: string;
    dni: string;
    telefono: string;
    fotoUrl: string | null;
    score: number;
  }>
>`
SELECT
  p.id,
  p."nombreCompleto",
  p.dni,
  p.telefono,
  p."fotoUrl",
  (
    ...
    CASE WHEN p.telefono LIKE '%' || ${query} || '%' THEN 0.5 ELSE 0 END
  ) AS score
FROM "Paciente" p
WHERE
  (
    ...
    OR p.telefono LIKE '%' || ${query} || '%'
  )
  ${profesionalFilter}
ORDER BY score DESC
LIMIT 10;
`;
```

Second analog for the "typed generic must match nullable column" fix — `reportes-financieros.service.ts`'s `getMorosidad()` raw query (below) already types `telefono: string` too and will need the same generic widening to `string | null` once the schema changes; both sites share the exact same class of bug (typed-generic lies about nullability) and should be fixed the same way (widen the generic, and where the SQL branches on `telefono` presence, use `COALESCE(p.telefono, '')` or an explicit `IS NOT NULL AND ... LIKE` guard rather than relying on `NULL LIKE 'x'` — which evaluates to `NULL`, i.e. excluded from `WHERE`, not `false` in the score `CASE`).

---

### `backend/src/modules/whatsapp/whatsapp.service.ts` — the 4 guard sites (D-09)

**Analog: the existing `whatsappOptIn` guard, present identically in all 4 methods.** This is the shape to replicate for the new telefono guard, placed immediately after it per D-09.

**Imports** (lines 1-14):
```typescript
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from './crypto/encryption.service';
import { WHATSAPP_QUEUE } from './processors/whatsapp-message.processor';
```

**`sendTemplateMessage` guard block** (lines 194-205 — the pattern to replicate 4x):
```typescript
const paciente = await this.prisma.paciente.findUnique({
  where: { id: dto.pacienteId },
  select: { telefono: true, whatsappOptIn: true },
});
if (!paciente) {
  throw new NotFoundException('Paciente no encontrado');
}
if (!paciente.whatsappOptIn) {
  throw new BadRequestException(
    'El paciente no ha dado su consentimiento para recibir mensajes de WhatsApp.',
  );
}
```
Insert immediately after this (per D-09): a falsy-after-trim check on `paciente.telefono` (D-03) throwing `BadRequestException('...')` in Spanish, matching the exact message-shape convention (plain string, no error code — D-10). The `select` already includes `telefono` in all 4 methods, no query changes needed.

**`retryMessage` — the one site without a `whatsappOptIn` guard today** (lines 432-441): fetches `paciente.telefono` via a nested `include`, not `select`, and only checks `mensaje`/ownership, not opt-in:
```typescript
const mensaje = await this.prisma.mensajeWhatsApp.findUnique({
  where: { id: mensajeId },
  include: {
    paciente: { select: { telefono: true } },
  },
});
if (!mensaje || mensaje.profesionalId !== profesionalId) {
  throw new NotFoundException('Mensaje no encontrado');
}
```
The telefono guard here reads `mensaje.paciente.telefono` (not `paciente.telefono`) — same falsy-after-trim / `BadRequestException` logic, different accessor path.

---

### `backend/src/modules/presupuestos/presupuestos.service.ts` — `generatePdf()` (D-09, ENVIO-02)

**Analog:** `presupuesto-email.service.ts`'s pdfData-assembly block (lines ~60-90) — same shape, same file family, builds the identical `PresupuestoPdfData.paciente` payload that `presupuesto-pdf.service.ts` already treats as optional.

**`generatePdf()` current state** (lines 417-476, `telefono` reads at 428 and 458):
```typescript
async generatePdf(id: string): Promise<{ buffer: Buffer; filename: string }> {
  const presupuesto = await this.prisma.presupuesto.findUnique({
    where: { id },
    include: {
      items: { orderBy: { orden: 'asc' } },
      paciente: {
        select: {
          id: true,
          nombreCompleto: true,
          dni: true,
          email: true,
          telefono: true,
        },
      },
      ...
    },
  });
  if (!presupuesto) throw new NotFoundException('Presupuesto no encontrado');
  ...
  paciente: {
    nombreCompleto: presupuesto.paciente.nombreCompleto,
    dni: (presupuesto.paciente as any).dni,
    email: (presupuesto.paciente as any).email,
    telefono: (presupuesto.paciente as any).telefono,
  },
  ...
}
```

**Sibling in `presupuesto-email.service.ts`** (lines ~60-90) — same `pdfData.paciente.telefono` passthrough into `PresupuestoPdfService.generatePdfBuffer()`:
```typescript
paciente: {
  nombreCompleto: presupuesto.paciente.nombreCompleto,
  dni: presupuesto.paciente.dni,
  email: presupuesto.paciente.email,
  telefono: presupuesto.paciente.telefono,
},
```

**Already-optional target type** (`presupuesto-pdf.service.ts`, `PresupuestoPdfData` interface, lines 15-19):
```typescript
paciente: {
  nombreCompleto: string;
  dni?: string | null;
  email?: string | null;
  telefono?: string | null;
};
```
and the null-safe render call site (`buildPatientSection`, line 143):
```typescript
if (paciente.telefono) doc.text(`Teléfono: ${paciente.telefono}`, 50, 230);
```

**Note for the planner:** neither `generatePdf()` nor `enviarPresupuesto()` calls `WhatsappService` directly — `generatePdf()` backs the public `GET /presupuestos/:id/pdf` route (`presupuestos.controller.ts:57-59`) that Meta itself fetches after `whatsapp.service.ts`'s `sendPresupuestoPdf` has already enqueued the message (see `BACKEND_URL` note in `CLAUDE.md`). Both sites are **type-safety / null-passthrough fixes** (the `as any` casts already suppress the type checker), not new `BadRequestException` guard sites like the 4 in `whatsapp.service.ts` — D-09 groups it under "también lo lleva" but the concrete change here is narrower: drop the now-unnecessary `as any` on `telefono` is optional, and confirm `presupuesto-pdf.service.ts`'s existing `if (paciente.telefono)` continues to no-op cleanly.

---

### `backend/src/modules/reportes/services/reportes-financieros.service.ts` (3 audit sites)

**Analog:** `pacientes.service.ts`'s `suggest()` raw-SQL idiom (typed generic + direct column selection), reused verbatim within this same file across all 3 sites.

**Site 1 — `getCuentasPorCobrar()` list mapping** (read passthrough, ~line 519):
```typescript
const cuentasList: CuentaPorCobrar[] = cuentas.map((c) => ({
  pacienteId: c.paciente.id,
  nombreCompleto: c.paciente.nombreCompleto,
  telefono: c.paciente.telefono,
  email: c.paciente.email,
  ...
}));
```

**Site 2 — `getMorosidad()` raw `$queryRaw`** (typed generic + SQL, ~lines 547-568):
```typescript
const cuentasMorosas = await this.prisma.$queryRaw<
  Array<{
    pacienteId: string;
    nombreCompleto: string;
    telefono: string;
    montoVencido: Decimal;
    ultimoCargo: Date;
    ultimoPago: Date | null;
  }>
>`
  SELECT
    pac.id as "pacienteId",
    pac."nombreCompleto",
    pac.telefono,
    ...
  FROM "CuentaCorriente" cc
  JOIN "Paciente" pac ON cc."pacienteId" = pac.id
  ...
`;
```

**Site 3 — `getMorosidad()` result mapping** (~lines 590-598):
```typescript
const cuentasMorosasList: CuentaMorosa[] = cuentasMorosas.map((c) => ({
  pacienteId: c.pacienteId,
  nombreCompleto: c.nombreCompleto,
  telefono: c.telefono,
  ...
}));
```

The `CuentaPorCobrar`/`CuentaMorosa` interfaces (declared in this module's types, likely `reportes-financieros.types.ts` or inline) need `telefono: string` widened to `telefono: string | null`, mirroring how `presupuesto-pdf.service.ts`'s `PresupuestoPdfData.paciente.telefono?: string | null` already does it.

---

### `backend/src/modules/paciente-portal/paciente-portal.service.ts` — `pickPresent()` comment-only change (D-08, WR-02)

**Analog:** itself — behavior and test are frozen, only the comment changes.

**Current state** (lines 690-703):
```typescript
/**
 * Defense in depth: build a prisma `data` object from ONLY the allow-listed
 * keys that are actually present (not `undefined`) on the input — extra keys
 * passed at runtime are dropped even if the per-route ValidationPipe is absent.
 */
private pickPresent<T extends object>(
  input: T,
  allowed: readonly string[],
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    const value = (input as Record<string, unknown>)[key];
    // WR-02: `@IsOptional()` lets an explicit `null` pass DTO validation, but
    // forwarding `null` into a non-nullable column (e.g. `telefono`) throws at
    // the DB layer (500). Treat `null` like an absent field — no change.
    if (value !== undefined && value !== null) data[key] = value;
  }
  return data;
}
```
Per D-08: rewrite only the `// WR-02:` comment (e.g. "the portal never blanks out contact data — the staff can clear `telefono` via `PacientesService.updateContacto`, D-02, but the patient-facing portal cannot") — the `if (value !== undefined && value !== null)` line and its test **must not change**.

**Reference for the surrounding contact-read/whitelist shape** (lines 141-150, `getDatos()`):
```typescript
contacto: {
  telefono: paciente.telefono,
  telefonoAlternativo: paciente.telefonoAlternativo,
  email: paciente.email,
  direccion: paciente.direccion,
  contactoEmergenciaNombre: paciente.contactoEmergenciaNombre,
  contactoEmergenciaTelefono: paciente.contactoEmergenciaTelefono,
  contactoEmergenciaRelacion: paciente.contactoEmergenciaRelacion,
},
```
and the `updateContacto()`/`pickPresent()` call site (lines 249-258):
```typescript
async updateContacto(pacienteId: string, dto: UpdateContactoPortalDto) {
  const data = this.pickPresent(dto, [
    'telefono',
    'telefonoAlternativo',
    'email',
    'direccion',
    'contactoEmergenciaNombre',
    'contactoEmergenciaTelefono',
    'contactoEmergenciaRelacion',
  ]);
  ...
}
```

---

## Shared Patterns

### Domain errors = `BadRequestException`, plain Spanish message, no structured error code (D-10)

**Source:** `backend/src/modules/whatsapp/whatsapp.service.ts:202-204` (the existing opt-in guard, the direct precedent for the new telefono guard):
```typescript
throw new BadRequestException(
  'El paciente no ha dado su consentimiento para recibir mensajes de WhatsApp.',
);
```
Also seen in `pacientes.service.ts:439` (`throw new BadRequestException('Teléfono inválido');`) and `pacientes.service.ts:463` (`throw new BadRequestException('Datos de emergencia inválidos');`).

**Apply to:** all 5 WhatsApp-send guard sites (`whatsapp.service.ts` x4, `presupuestos.service.ts` if a guard ends up needed there per the planner's read of D-09) and `pacientes.service.ts`'s `updateContacto()`.

**Convention:** `BadRequestException(string)` — a single plain-string message in Spanish. No error-code envelope, no custom exception subclass exists anywhere in this codebase for domain validation errors. Do not introduce one (explicit decision, D-10).

### `NotFoundException('... no encontrado')` for missing entities

**Source:** repeated verbatim across `pacientes.service.ts:334` (`'Paciente no encontrado'`), `whatsapp.service.ts:199` (`'Paciente no encontrado'`), `whatsapp.service.ts:440` (`'Mensaje no encontrado'`), `presupuestos.service.ts:439` (`'Presupuesto no encontrado'`).

**Apply to:** any new not-found branch introduced alongside the telefono guards (none of the 4 `whatsapp.service.ts` sites need a *new* not-found check — they already have one; only the telefono-guard `BadRequestException` is new).

### Optional-`String?` Prisma field + matching `@IsOptional() @IsString()` DTO field

**Source:** `schema.prisma:159` (`telefonoAlternativo String?`) + `create-paciente.dto.ts:26-28`:
```typescript
@IsOptional()
@IsString()
telefonoAlternativo?: string;
```

**Apply to:** `schema.prisma:158` (`telefono`) and `create-paciente.dto.ts:23-24` (`telefono`) — exact copy of this shape, per the File Classification table above.

### Raw `$queryRaw` typed generic mirroring `Paciente` columns exactly

**Source:** `pacientes.service.ts:347-355` (`suggest()`) and `reportes-financieros.service.ts` `getMorosidad()` (~lines 547-556) — both declare a TS generic literally listing every selected column with its Prisma type, which is what goes stale once `telefono` becomes nullable in the schema but stays `telefono: string` in the generic.

**Apply to:** every raw-SQL site touching `p.telefono` / `pac.telefono`: `pacientes.service.ts:337-399` (`suggest`), `reportes-financieros.service.ts` `getMorosidad()`.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `backend/src/modules/whatsapp/whatsapp.service.spec.ts` | test | — | No spec file exists yet for `WhatsappService`. Closest composite analog: `finanzas.service.spec.ts` for the `getQueueToken(WHATSAPP_QUEUE)` BullMQ mock pattern (`{ provide: getQueueToken(CAE_QUEUE), useValue: mockQueue }`, lines 2, 62-64, 85-88) + `pacientes.service.spec.ts` for the overall `Test.createTestingModule` / per-test `jest.fn()` mock-Prisma shape (lines 51-83). Will also need `EncryptionService` mocked the same way `pacientes.service.spec.ts` does it (`mockEncryptionService()`, lines 24-33), since `WhatsappService`'s constructor takes it directly (`whatsapp.service.ts:25`). |
| `backend/src/modules/presupuestos/presupuestos.service.spec.ts` | test | — | No spec file exists yet for `PresupuestosService`. Closest analog: `pacientes.service.spec.ts`'s mock-Prisma + `Test.createTestingModule` shape (no queue mock needed here, `PresupuestosService` has no `@InjectQueue`). |

## Metadata

**Analog search scope:** `backend/src/modules/pacientes/`, `backend/src/modules/whatsapp/`, `backend/src/modules/presupuestos/`, `backend/src/modules/paciente-portal/`, `backend/src/modules/reportes/services/`, `backend/src/modules/finanzas/` (for the BullMQ spec-mock analog), `backend/src/prisma/schema.prisma`
**Files scanned:** ~16 (7 source files fully or partially read, 4 spec files read for test conventions, 1 schema file, DTOs for `pacientes` and `paciente-portal`)
**Pattern extraction date:** 2026-08-17
