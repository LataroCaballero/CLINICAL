# Phase 51: Schema Foundation + Chat Fix - Pattern Map

**Mapped:** 2026-06-25
**Files analyzed:** 5 (2 modified, 3 created)
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/src/prisma/schema.prisma` | model | CRUD | Same file (existing models ZonaHC/DiagnosticoHC/TratamientoHC) | exact |
| `backend/src/modules/pacientes/seguimiento-scheduler.service.ts` | service | event-driven | Same file (existing scheduler body) | exact |
| `backend/src/modules/<alergia-catalogo>/alergia-catalogo.service.ts` (new) | service | CRUD | `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` | exact |
| `backend/src/modules/<alergia-catalogo>/alergia-catalogo.seed-data.ts` (new) | config | batch | `backend/src/modules/catalogo-hc/catalogo-hc.seed-data.ts` | exact |
| `backend/src/modules/<alergia-catalogo>/alergia-catalogo.module.ts` (new) | config | — | `backend/src/modules/catalogo-hc/catalogo-hc.module.ts` | exact |

> The two new catalog models (`AlergiaCatalogoPro`, `MedicamentoCatalogoPro`) are flat variants of `ZonaHC`. They may live in one combined module or two separate modules — that is left to `Claude's Discretion`. Patterns below cover the service/seed for one catalog; the second catalog is identical in structure.

---

## Pattern Assignments

### `backend/src/prisma/schema.prisma` — new models `AlergiaCatalogoPro` / `MedicamentoCatalogoPro`

**Analog:** `ZonaHC` model (schema.prisma lines 1361–1376) and `TratamientoHC` model (lines 1395–1412).

These two new models are flat versions of `ZonaHC` — no child relations, just the per-professional catalog entry with `esSistema`/`activo` flags and the `@@unique([nombre, profesionalId])` constraint.

**Prisma model pattern to copy** (schema.prisma lines 1361–1376):
```prisma
model ZonaHC {
  id            String          @id @default(uuid())
  nombre        String
  orden         Int
  activo        Boolean         @default(true)
  esSistema     Boolean         @default(false)
  profesionalId String
  profesional   Profesional     @relation(fields: [profesionalId], references: [id])
  diagnosticos  DiagnosticoHC[]
  tratamientos  TratamientoHC[]
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@unique([nombre, profesionalId])
  @@index([profesionalId, activo])
}
```

**Apply for `AlergiaCatalogoPro` and `MedicamentoCatalogoPro` as:**
```prisma
model AlergiaCatalogoPro {
  id            String      @id @default(uuid())
  nombre        String
  activo        Boolean     @default(true)
  esSistema     Boolean     @default(false)
  profesionalId String
  profesional   Profesional @relation(fields: [profesionalId], references: [id])
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@unique([nombre, profesionalId])
  @@index([profesionalId, activo])
}
```
(Same structure for `MedicamentoCatalogoPro`.)

**Add back-relations to `Profesional` model** following the same pattern as the existing relation declarations in Profesional (schema.prisma lines 101–137). Every new catalog model requires a corresponding `alergiasCatalogo` / `medicamentosCatalogo` field on `Profesional`.

---

### `backend/src/prisma/schema.prisma` — `TareaSeguimiento` new guard fields

**Analog:** `Turno.notificacionEnviada Boolean @default(false)` (schema.prisma line 811) — same guard-flag pattern.

Add to `TareaSeguimiento` (schema.prisma lines 1188–1203):
```prisma
model TareaSeguimiento {
  // ... existing fields ...
  notificada      Boolean   @default(false)   // CHAT-01 guard: true after first alert sent
  notificadaEn    DateTime?                   // Timestamp of first notification
  // ... existing relations ...
}
```
Also update the index to include `notificada` for efficient scheduler WHERE:
```prisma
  @@index([profesionalId, completada, notificada, fechaProgramada])
```
(Replaces the existing `@@index([profesionalId, completada, fechaProgramada])` at line 1202.)

---

### `backend/src/prisma/schema.prisma` — `MensajeInterno` nullable `autorId` + `origenPaciente`

**Existing model** (schema.prisma lines 221–236):
```prisma
model MensajeInterno {
  id         String           @id @default(uuid())
  mensaje    String
  prioridad  PrioridadMensaje @default(MEDIA)
  esSistema  Boolean          @default(false)
  autorId    String           // ← currently NOT NULL
  pacienteId String
  createdAt  DateTime         @default(now())

  autor    Usuario          @relation("MensajesEnviados", fields: [autorId], references: [id])
  paciente Paciente         @relation(fields: [pacienteId], references: [id])
  lecturas MensajeLectura[]

  @@index([pacienteId, createdAt])
  @@index([autorId])
}
```

**Change `autorId String` → `autorId String?`** and update the relation to `onDelete: SetNull`. Add `origenPaciente Boolean @default(false)`. The migration must use `ALTER COLUMN "autorId" DROP NOT NULL` (safe — no DEFAULT change needed since column already exists).

---

### `backend/src/prisma/schema.prisma` — `Paciente` new fields (milestone big-bang)

**Existing array-field pattern** (schema.prisma lines 162–163):
```prisma
alergias    String[]
condiciones String[]
```

**Add following the same pattern:**
```prisma
medicacion  String[]   // PREOP-07 — medication list
adicciones  String[]   // PREOP-08 — substance history
```

Also add portal-related fields (all nullable with DEFAULT, per established migration pattern — see `Established Patterns` below):
```prisma
portalTokenHash      String?   @unique   // SHA-256 hash of portal access token (never store plaintext)
portalTokenExpiry    DateTime?
portalUltimoAcceso   DateTime?
// Staging fields for patient portal form (Fase 55 writes, Fase 52+ reads)
portalStagingData    Json?
consentimientoFirmadoAt DateTime?
```

---

### `backend/src/prisma/schema.prisma` — `HistoriaClinicaEntrada` estudios field (D-09)

**Existing model** (schema.prisma lines 279–303) already has `contenido Json?` and `answers Json?` as separate named Json fields. Follow that same pattern — do NOT embed inside `contenido`.

**Add dedicated field** (D-09 decision):
```prisma
estudiosComplementarios Json?   // {laboratorio: bool, ecg: bool, imagenes: string[]} — consultable via Postgres JSON ops
```

---

### `backend/src/modules/pacientes/seguimiento-scheduler.service.ts` — CHAT-01 guard fix

**Analog:** Same file. The full existing body (lines 1–72).

**Current buggy WHERE** (lines 21–26):
```typescript
const tareasPendientes = await this.prisma.tareaSeguimiento.findMany({
  where: {
    completada: false,
    fechaProgramada: { lte: ahora },
  },
```

**Fixed WHERE** — add `notificada: false`:
```typescript
const tareasPendientes = await this.prisma.tareaSeguimiento.findMany({
  where: {
    completada: false,
    notificada: false,          // CHAT-01: skip already-notified tasks
    fechaProgramada: { lte: ahora },
  },
```

**After `mensajeInterno.create`** (after line 59), add update to mark as notified:
```typescript
await this.prisma.mensajeInterno.create({
  data: {
    mensaje,
    prioridad: dias <= 3 ? 'ALTA' : 'MEDIA',
    esSistema: true,
    autorId: tarea.profesional.usuarioId,
    pacienteId: tarea.paciente.id,
  },
});

// CHAT-01: mark task as notified so it is never re-alerted
await this.prisma.tareaSeguimiento.update({
  where: { id: tarea.id },
  data: {
    notificada: true,
    notificadaEn: ahora,
  },
});
```

Replace the existing `logger.log` comment at lines 62–65 with this `update` call.

---

### New catalog service — `alergia-catalogo.service.ts` (and `medicamento-catalogo.service.ts`)

**Analog:** `backend/src/modules/catalogo-hc/catalogo-hc.service.ts`

**Imports pattern** (catalogo-hc.service.ts lines 1–13):
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SEED_ALERGIAS } from './alergia-catalogo.seed-data';  // adapted name
```

**Idempotency guard pattern** (catalogo-hc.service.ts lines 103–107):
```typescript
async seedCatalogoInicial(profesionalId: string): Promise<void> {
  const count = await this.prisma.alergiaCatalogoPro.count({ where: { profesionalId } });
  if (count > 0) {
    return;  // already seeded — skip entirely
  }
  // ...
}
```

**Bulk creation with skipDuplicates pattern** (catalogo-hc.service.ts lines 130–140):
```typescript
await this.prisma.alergiaCatalogoPro.createMany({
  data: SEED_ALERGIAS.map((nombre) => ({
    nombre,
    esSistema: true,
    profesionalId,
  })),
  skipDuplicates: true,
});
```

**Soft-delete guard pattern** (catalogo-hc.service.ts lines 571–585):
```typescript
async eliminarAlergia(profesionalId: string, alergiaId: string) {
  const item = await this.prisma.alergiaCatalogoPro.findUnique({ where: { id: alergiaId } });
  if (!item || item.profesionalId !== profesionalId) {
    throw new NotFoundException('Alergia no encontrada');
  }
  if (item.esSistema) {
    throw new ForbiddenException('No se puede eliminar un ítem del sistema');
  }
  return this.prisma.alergiaCatalogoPro.update({
    where: { id: alergiaId },
    data: { activo: false },
  });
}
```

---

### New seed data — `alergia-catalogo.seed-data.ts` (and `medicamento-catalogo.seed-data.ts`)

**Analog:** `backend/src/modules/catalogo-hc/catalogo-hc.seed-data.ts`

**File structure pattern** (catalogo-hc.seed-data.ts lines 1–18):
```typescript
/**
 * Seed data for AlergiaCatalogoPro.
 * INVARIANT: esSistema=true items are never editable/deletable via API.
 * D-07: Penicilina, Látex, AINEs, Yodo, Contraste
 */

export const SEED_ALERGIAS: string[] = [
  'Penicilina',
  'Látex',
  'AINEs',
  'Yodo',
  'Contraste',
];
```

For `medicamento-catalogo.seed-data.ts` (D-07):
```typescript
export const SEED_MEDICAMENTOS: string[] = [
  'Anticoagulantes',
  'Corticoides',
  'Metformina',
  'Levotiroxina',
  'Aspirina',
  'Enalapril',
];
```

---

### New module file — `alergia-catalogo.module.ts`

**Analog:** `backend/src/modules/catalogo-hc/catalogo-hc.module.ts` (full file, 11 lines):
```typescript
import { Module } from '@nestjs/common';
import { AlergiaCatalogoController } from './alergia-catalogo.controller';
import { AlergiaCatalogoService } from './alergia-catalogo.service';

@Module({
  // PrismaModule is @Global() — PrismaService injected without imports
  controllers: [AlergiaCatalogoController],
  providers: [AlergiaCatalogoService],
  exports: [AlergiaCatalogoService],
})
export class AlergiaCatalogoModule {}
```

---

### Prisma migration file (big-bang)

**No direct analog** — existing migrations under `backend/src/prisma/migrations/` follow the same `migration.sql` flat-SQL structure.

**Established migration patterns from CONTEXT.md:**
- All new columns use `DEFAULT` (either via Prisma DDL or explicit SQL default).
- The `autorId` NOT NULL drop uses: `ALTER TABLE "MensajeInterno" ALTER COLUMN "autorId" DROP NOT NULL;`
- The `CHAT-02` cleanup DELETE runs inside the same migration: `DELETE FROM "MensajeInterno" WHERE "esSistema" = true;` — idempotent (re-running on empty table is a no-op) and cascade-safe (`MensajeLectura.onDelete: Cascade` at schema.prisma line 244).
- New `String[]` columns (`medicacion`, `adicciones`) map to `TEXT[]` in Postgres with no DEFAULT required (empty array is the default for Prisma array fields).

---

## Shared Patterns

### esSistema / activo guards (all catalog operations)
**Source:** `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` lines 448–464, 570–585
**Apply to:** `AlergiaCatalogoService`, `MedicamentoCatalogoService` — any update/delete endpoint
```typescript
if (item.esSistema) {
  throw new ForbiddenException('No se puede modificar un ítem del sistema');
}
```

### Idempotent seed guard
**Source:** `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` lines 103–107
**Apply to:** Both new catalog services' `seedCatalogoInicial` methods
```typescript
const count = await this.prisma.<model>.count({ where: { profesionalId } });
if (count > 0) return;
```

### PrismaService injection (NestJS)
**Source:** `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` lines 36–40
**Apply to:** All new services
```typescript
@Injectable()
export class AlergiaCatalogoService {
  private readonly logger = new Logger(AlergiaCatalogoService.name);
  constructor(private readonly prisma: PrismaService) {}
}
```

### Scheduler try/catch per-item pattern
**Source:** `backend/src/modules/pacientes/seguimiento-scheduler.service.ts` lines 67–70
**Apply to:** The fixed scheduler — keep existing try/catch wrapping both `create` and the new `update`
```typescript
} catch (err) {
  this.logger.error(`Error procesando tarea ${tarea.id}: ${err.message}`);
}
```

### Cron decorator pattern
**Source:** `backend/src/modules/pacientes/seguimiento-scheduler.service.ts` lines 15–16
```typescript
@Cron(CronExpression.EVERY_DAY_AT_9AM)
async processSeguimientos(): Promise<void> {
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| Prisma migration SQL file | migration | batch | Migration files are auto-generated by `prisma migrate dev`; no hand-written analog exists. SQL pattern derived from established project conventions and D-01/D-02/D-03 decisions. |

---

## Metadata

**Analog search scope:** `backend/src/modules/catalogo-hc/`, `backend/src/modules/pacientes/`, `backend/src/modules/mensajes-internos/`, `backend/src/prisma/schema.prisma`
**Files scanned:** 6
**Pattern extraction date:** 2026-06-25
