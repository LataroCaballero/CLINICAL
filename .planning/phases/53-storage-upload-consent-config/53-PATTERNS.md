# Phase 53: Storage + Upload + Consent Config - Pattern Map

**Mapped:** 2026-06-27
**Files analyzed:** 18 (8 new backend, 5 modified backend, 4 new frontend, 1 modified frontend)
**Analogs found:** 14 / 18 (4 flagged greenfield or partial)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/src/prisma/schema.prisma` (extend ZonaHC, CirugiaCatalogo, add ConsentimientoZonaArchivo) | model | CRUD | existing ZonaHC/CirugiaCatalogo blocks in same file | exact-extend |
| `backend/src/modules/storage/storage.service.ts` | service | file-I/O | `backend/src/modules/presupuestos/presupuesto-pdf.service.ts` | partial (Injectable + Logger shape only) — **greenfield** for disk I/O |
| `backend/src/modules/storage/storage.module.ts` | module | — | `backend/src/modules/catalogo-hc/catalogo-hc.module.ts` | exact |
| `backend/src/modules/consentimientos/consentimientos.controller.ts` | controller | file-I/O + request-response | `backend/src/modules/catalogo-hc/catalogo-hc.controller.ts` | role-match (getProfesionalId, @Auth pattern) |
| `backend/src/modules/consentimientos/consentimientos.service.ts` | service | CRUD + file-I/O | `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` | role-match (per-profesional ownership guards, Prisma, Logger) |
| `backend/src/modules/consentimientos/consentimientos.module.ts` | module | — | `backend/src/modules/catalogo-hc/catalogo-hc.module.ts` | exact |
| `backend/src/modules/consentimientos/dto/upload-consentimiento.dto.ts` | utility | — | `backend/src/modules/catalogo-hc/dto/rename-item.dto.ts` | role-match |
| `backend/src/modules/uploads/uploads.controller.ts` | controller | streaming/file-I/O | `backend/src/modules/presupuestos/presupuesto-public.controller.ts` | partial (streaming res.set/res.end pattern) — **greenfield** for path-traversal guard |
| `backend/src/modules/uploads/uploads.module.ts` | module | — | `backend/src/modules/catalogo-hc/catalogo-hc.module.ts` | exact |
| `backend/src/app.module.ts` (add ThrottlerModule + APP_GUARD) | config | — | same file (BullModule.forRootAsync pattern for wiring) | partial — **greenfield** (no APP_GUARD today) |
| `backend/src/modules/presupuestos/presupuesto-public.controller.ts` (add @Throttle) | controller | request-response | itself — add `@Throttle` decorator | modify-in-place |
| `backend/src/modules/catalogo-hc/catalogo-hc.controller.ts` (add PATCH indicacionesUrl) | controller | CRUD | itself — same pattern as existing `@Patch('zonas/:id')` | modify-in-place |
| `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` (add actualizarIndicacionesUrl) | service | CRUD | itself — same renombrarZona pattern | modify-in-place |
| `frontend/src/app/dashboard/configuracion/page.tsx` (add "Consentimientos" tab) | component | request-response | itself — existing TabsTrigger/TabsContent blocks | modify-in-place |
| `frontend/src/app/dashboard/configuracion/components/GestionConsentimientos.tsx` | component | CRUD + file-I/O | `frontend/src/app/dashboard/configuracion/components/GestionCatalogoHC.tsx` | role-match |
| `frontend/src/hooks/useConsentimientos.ts` | hook | request-response | `frontend/src/hooks/useCatalogoHC.ts` | exact |
| `frontend/src/hooks/useConsentimientosMutations.ts` | hook | request-response | `frontend/src/hooks/useCatalogoHCMutations.ts` | exact |
| `frontend/src/types/consentimientos.ts` | utility | — | `frontend/src/types/catalogo-hc.ts` | exact |

---

## Pattern Assignments

### `backend/src/prisma/schema.prisma` — extend ZonaHC, CirugiaCatalogo, add ConsentimientoZonaArchivo

**Analog:** same file — ZonaHC block (lines 1379–1394), CirugiaCatalogo block (lines 941–957)

**Current ZonaHC block** (lines 1379–1394) — copy this structure then add two new fields:
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

**Add to ZonaHC (after `tratamientos` relation):**
```prisma
  indicacionesUrl        String?
  consentimientoArchivos ConsentimientoZonaArchivo[]
  cirugiasCatalogo       CirugiaCatalogo[]
```

**Current CirugiaCatalogo block** (lines 941–957) — add `zonaId` optional FK + inverse relation:
```prisma
// Add these two lines after `profesionalId String`:
  zonaId        String?
  zona          ZonaHC?         @relation(fields: [zonaId], references: [id])
// Add index:
  @@index([zonaId])
```

**New model to add** (after ZonaHC block, following the same field-ordering convention):
```prisma
model ConsentimientoZonaArchivo {
  id             String   @id @default(uuid())
  zonaId         String
  zona           ZonaHC   @relation(fields: [zonaId], references: [id], onDelete: Cascade)
  profesionalId  String
  path           String                        // relative path: {profesionalId}/{uuid}.pdf
  nombreOriginal String                        // original filename (metadata only)
  uploadedAt     DateTime @default(now())
  vigente        Boolean  @default(true)

  @@index([zonaId, vigente])
  @@index([profesionalId])
}
```

---

### `backend/src/modules/storage/storage.service.ts` (service, file-I/O) — GREENFIELD

**Closest structural analog:** `backend/src/modules/presupuestos/presupuesto-pdf.service.ts` (lines 1–8, 37–39)

**Injectable + Logger shape to copy** (lines 37–39 of presupuesto-pdf.service.ts):
```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PresupuestoPdfService {
  private readonly logger = new Logger(PresupuestoPdfService.name);
  // ... methods
}
```

**New StorageService — no existing disk I/O analog. Design from scratch using the above shape:**

The interface contract from CONTEXT.md D-01/D-13:
- `save(buffer: Buffer, filename: string): Promise<string>` — returns `relativePath` (`{profesionalId}/{uuid}.pdf`)
- No `delete` method (historial D-05)
- Helpers: `resolvePath(relativePath: string): string` (absolute path, with path-traversal guard)
- `getPublicUrl(relativePath: string): string` — uses BACKEND_URL pattern (see Shared Patterns below)

**Node.js builtins to use:** `node:fs/promises` (mkdir, writeFile), `node:path` (join, resolve, normalize, relative), `node:crypto` (randomUUID).

**Upload dir convention** (D-10): `uploads/{profesionalId}/{uuid}.pdf` — root at `process.cwd()/../uploads` or a configurable `UPLOAD_DIR` env var.

---

### `backend/src/modules/storage/storage.module.ts` (module)

**Analog:** `backend/src/modules/catalogo-hc/catalogo-hc.module.ts` (lines 1–11)

```typescript
import { Module } from '@nestjs/common';
import { CatalogoHCController } from './catalogo-hc.controller';
import { CatalogoHCService } from './catalogo-hc.service';

@Module({
  // PrismaModule is @Global() — PrismaService injected without imports
  controllers: [CatalogoHCController],
  providers: [CatalogoHCService],
  exports: [CatalogoHCService], // exported for cross-module injection
})
export class CatalogoHCModule {}
```

**Pattern for StorageModule:** omit `controllers` (StorageService has no own controller), keep `exports: [StorageService]` so ConsentimientosModule can inject it.

---

### `backend/src/modules/consentimientos/consentimientos.controller.ts` (controller, file-I/O + request-response)

**Primary analog:** `backend/src/modules/catalogo-hc/catalogo-hc.controller.ts`

**Imports + class structure to copy** (lines 1–24):
```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Req,
  Param,
  Body,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auth } from '../auth/decorators/auth.decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { RolUsuario } from '@prisma/client';

@Controller('consentimientos')
@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')
export class ConsentimientosController {
  constructor(
    private readonly service: ConsentimientosService,
    private readonly prisma: PrismaService,
  ) {}
  // ...
}
```

**getProfesionalId helper to copy verbatim** (lines 27–55 of catalogo-hc.controller.ts):
```typescript
private async getProfesionalId(
  user: any,
  targetProfesionalId?: string,
): Promise<string> {
  if (
    (user.rol === RolUsuario.SECRETARIA || user.rol === RolUsuario.ADMIN) &&
    targetProfesionalId
  ) {
    return targetProfesionalId;
  }

  if (user.rol !== RolUsuario.PROFESIONAL) {
    throw new ForbiddenException(
      'Se requiere profesionalId para gestionar consentimientos',
    );
  }

  const profesional = await this.prisma.profesional.findUnique({
    where: { usuarioId: user.userId },
  });

  if (!profesional) {
    throw new ForbiddenException('Perfil profesional no encontrado');
  }

  return profesional.id;
}
```

**Upload endpoint — combine `@UseInterceptors(FileInterceptor)` (greenfield) with per-prof guard:**
```typescript
@Post('zonas/:zonaId/pdf')
@UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
async uploadPdf(
  @Param('zonaId') zonaId: string,
  @UploadedFile() file: Express.Multer.File,
  @Req() req: any,
  @Query('profesionalId') profesionalId?: string,
) {
  if (!file) throw new BadRequestException('No se recibió ningún archivo');
  const pid = await this.getProfesionalId(req.user, profesionalId);
  return this.service.uploadConsentimiento(pid, zonaId, file.buffer, file.originalname);
}
```

**List/GET pattern** (mirrors `@Get()` in catalogo-hc.controller.ts lines 57–63):
```typescript
@Get('zonas')
async getZonasConConsentimiento(
  @Req() req: any,
  @Query('profesionalId') profesionalId?: string,
) {
  const pid = await this.getProfesionalId(req.user, profesionalId);
  return this.service.getZonasConConsentimiento(pid);
}
```

---

### `backend/src/modules/consentimientos/consentimientos.service.ts` (service, CRUD + file-I/O)

**Analog:** `backend/src/modules/catalogo-hc/catalogo-hc.service.ts`

**Injectable + Logger + constructor to copy** (lines 43–46):
```typescript
@Injectable()
export class CatalogoHCService {
  private readonly logger = new Logger(CatalogoHCService.name);

  constructor(private readonly prisma: PrismaService) {}
}
```

**Ownership guard pattern to copy** (lines 714–735 — renombrarZona):
```typescript
const zona = await this.prisma.zonaHC.findUnique({ where: { id: zonaId } });
if (!zona || zona.profesionalId !== profesionalId) {
  throw new NotFoundException('Zona no encontrada');
}
```

**$transaction pattern to copy** (lines 821–835 — eliminarZona):
```typescript
await this.prisma.$transaction([
  this.prisma.zonaHC.update({ where: { id: zonaId }, data: { activo: false } }),
  this.prisma.diagnosticoHC.updateMany({ where: { zonaId }, data: { activo: false } }),
]);
```

**ConflictException on P2002 pattern to copy** (lines 723–731):
```typescript
} catch (err: any) {
  if (err?.code === 'P2002') {
    throw new ConflictException('Ya existe un ítem con ese nombre en este perfil');
  }
  throw err;
}
```

**ConsentimientosService key methods:**
- `uploadConsentimiento(profesionalId, zonaId, buffer, originalName)` — guard ownership, call `StorageService.save()`, set previous `vigente=false` via updateMany, create new `ConsentimientoZonaArchivo` record, return updated zona.
- `getZonasConConsentimiento(profesionalId)` — `prisma.zonaHC.findMany({ where: { profesionalId, activo: true }, include: { consentimientoArchivos: { where: { vigente: true }, orderBy: { uploadedAt: 'desc' }, take: 1 } }, orderBy: { orden: 'asc' } })`.
- `getHistorialConsentimiento(profesionalId, zonaId)` — for future UI; list all `ConsentimientoZonaArchivo` for a zona in desc order.

---

### `backend/src/modules/consentimientos/consentimientos.module.ts` (module)

**Analog:** `backend/src/modules/catalogo-hc/catalogo-hc.module.ts` (lines 1–11)

Key difference: must import `StorageModule` to inject `StorageService`.

```typescript
@Module({
  imports: [StorageModule],           // needed for StorageService injection
  controllers: [ConsentimientosController],
  providers: [ConsentimientosService],
  exports: [ConsentimientosService],
})
export class ConsentimientosModule {}
```

---

### `backend/src/modules/consentimientos/dto/upload-consentimiento.dto.ts` (utility)

**Analog:** `backend/src/modules/catalogo-hc/dto/rename-item.dto.ts` (lines 1–11)

```typescript
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class RenameItemDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(80)
  @Transform(({ value }) => value?.trim())
  nombre: string;
}
```

For `UpdateIndicacionesDto`:
```typescript
import { IsUrl, IsOptional, MaxLength } from 'class-validator';

export class UpdateIndicacionesDto {
  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  indicacionesUrl: string | null;
}
```

Note: upload endpoint uses `@UploadedFile()` — no DTO class needed for the file itself. Only DTOs for JSON body fields (e.g. PATCH indicacionesUrl).

---

### `backend/src/modules/uploads/uploads.controller.ts` (controller, streaming) — PARTIAL GREENFIELD

**Analog for streaming response:** `backend/src/modules/presupuestos/presupuesto-public.controller.ts` (lines 1–2, 46–55)

**Streaming pattern to copy verbatim** (lines 46–55):
```typescript
@Get(':id/pdf')
async getPdf(@Param('id') id: string, @Res() res: Response) {
  const { buffer, filename } = await this.service.generatePdf(id);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': buffer.length,
  });
  res.end(buffer);
}
```

**Uploads controller — no auth (public by UUID), with path-traversal guard:**

```typescript
import { Controller, Get, Param, Res, NotFoundException, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import * as path from 'node:path';

// No @Auth() — intentionally public (UUID is the security)
@Controller('uploads')
export class UploadsController {
  @Get(':profesionalId/:filename')
  async serveFile(
    @Param('profesionalId') profesionalId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // PATH TRAVERSAL GUARD — mandatory (D-10)
    const relativePath = path.join(profesionalId, filename);
    const normalized = path.normalize(relativePath);
    if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
      throw new BadRequestException('Ruta inválida');
    }
    // ... read file buffer from StorageService.resolvePath(normalized) and stream
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.end(buffer);
  }
}
```

---

### `backend/src/modules/uploads/uploads.module.ts` (module)

**Analog:** `backend/src/modules/catalogo-hc/catalogo-hc.module.ts` (lines 1–11)

Must import `StorageModule` for `StorageService`. No auth import needed (public controller).

---

### `backend/src/app.module.ts` — add ThrottlerModule + APP_GUARD (GREENFIELD)

**Analog for `forRootAsync` wiring:** `BullModule.forRootAsync` block in `backend/src/app.module.ts` (lines 41–56)

```typescript
BullModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    connection: {
      host: config.get('REDIS_HOST', 'localhost'),
      port: config.get<number>('REDIS_PORT', 6379),
    },
  }),
}),
```

**ThrottlerModule to add** (follows same `forRootAsync` pattern — D-07 values: ttl=60s, limit=100):
```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// In imports[]:
ThrottlerModule.forRoot([{
  ttl: 60_000,   // 60 seconds in ms (v6 API)
  limit: 100,
}]),

// In providers[] (first APP_GUARD in the project):
{
  provide: APP_GUARD,
  useClass: ThrottlerGuard,
},
```

**Note:** ThrottlerModule v6 uses `ttl` in milliseconds. No `ConfigService` needed since values are constants per D-07/D-08.

---

### `backend/src/modules/presupuestos/presupuesto-public.controller.ts` — add @Throttle strict tier

**Modify in place.** Add `@Throttle` to the controller class (D-08: ~20 req/min public, ~10 req/min for any upload endpoints that end up here).

```typescript
import { Throttle } from '@nestjs/throttler';

// Add above @Controller('presupuestos/public'):
@Throttle({ default: { ttl: 60_000, limit: 20 } })
@Controller('presupuestos/public')
export class PresupuestoPublicController {
  // ... existing methods unchanged
}
```

---

### `backend/src/modules/catalogo-hc/catalogo-hc.controller.ts` — add PATCH indicacionesUrl

**Modify in place.** Add after the existing `@Patch('zonas/:id')` block (lines 103–112). Copy same signature:

```typescript
@Patch('zonas/:id/indicaciones')
async actualizarIndicaciones(
  @Param('id') id: string,
  @Body() dto: UpdateIndicacionesDto,
  @Req() req: any,
  @Query('profesionalId') profesionalId?: string,
) {
  const pid = await this.getProfesionalId(req.user, profesionalId);
  return this.service.actualizarIndicacionesUrl(pid, id, dto.indicacionesUrl);
}
```

---

### `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` — add actualizarIndicacionesUrl

**Modify in place.** Add after `renombrarZona` (line 735). Same ownership guard pattern:

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
  return this.prisma.zonaHC.update({
    where: { id: zonaId },
    data: { indicacionesUrl },
  });
}
```

---

### `frontend/src/app/dashboard/configuracion/page.tsx` — add "Consentimientos" tab

**Modify in place.** For the PROFESIONAL view, the current `TabsList` has `grid-cols-11` (lines 108–120). Add one more trigger/content pair following the exact same pattern:

```tsx
// In TabsList, add:
<TabsTrigger value="consentimientos">Consentimientos</TabsTrigger>

// In Tabs body, add:
<TabsContent value="consentimientos" className="mt-6">
  <GestionConsentimientos />
</TabsContent>
```

**Import to add** (follows pattern of existing imports lines 11–21):
```tsx
import GestionConsentimientos from "./components/GestionConsentimientos";
```

Also add to SECRETARIA view's TabsList (currently `grid-cols-6`, line 211) and its content block.

---

### `frontend/src/app/dashboard/configuracion/components/GestionConsentimientos.tsx` (component, CRUD + file-I/O)

**Analog:** `frontend/src/app/dashboard/configuracion/components/GestionCatalogoHC.tsx`

**Imports block to copy and extend** (lines 1–37 of GestionCatalogoHC.tsx):
```tsx
'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
// Add:
import { useCatalogoHC } from '@/hooks/useCatalogoHC'; // reuse for zone listing
import { useUploadConsentimiento, useUpdateIndicaciones } from '@/hooks/useConsentimientosMutations';
```

**Props signature** (line 48 of GestionCatalogoHC.tsx):
```tsx
export default function GestionConsentimientos({ profesionalId }: { profesionalId?: string }) {
```

**Zone iteration pattern** (lines 168–315 of GestionCatalogoHC.tsx): reuse the zone list from `useCatalogoHC` (already fetches all ZonaHC per professional). Per zone, render:
- A URL `<Input>` pre-filled with `zona.indicacionesUrl` + a Save button calling `useUpdateIndicaciones`.
- A file `<input type="file" accept=".pdf">` + an Upload button calling `useUploadConsentimiento`.
- Current vigente consent filename/uploadedAt (from `useConsentimientos` query).

**Loading/error/empty states** (lines 153–167 of GestionCatalogoHC.tsx):
```tsx
{isLoading && (
  <div className="flex justify-center py-8">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
)}
{error && <p className="text-center text-red-500 py-4">Error al cargar</p>}
{!isLoading && !error && (!zonas || zonas.length === 0) && (
  <p className="text-center text-muted-foreground py-4">No hay zonas configuradas</p>
)}
```

**Toast pattern** (lines 103–106):
```tsx
toast.success('Nombre actualizado');
// or on error:
toast.error('Error al renombrar');
```

---

### `frontend/src/hooks/useConsentimientos.ts` (hook, request-response)

**Analog:** `frontend/src/hooks/useCatalogoHC.ts` (lines 1–22) — exact copy, change endpoint/key:

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const CONSENTIMIENTOS_QUERY_KEY = 'consentimientos-zonas';

export function useConsentimientos(profesionalId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [CONSENTIMIENTOS_QUERY_KEY, profesionalId],
    queryFn: async () => {
      const { data } = await api.get('/consentimientos/zonas', {
        params: profesionalId ? { profesionalId } : {},
      });
      return data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
```

---

### `frontend/src/hooks/useConsentimientosMutations.ts` (hook, request-response)

**Analog:** `frontend/src/hooks/useCatalogoHCMutations.ts` (lines 1–96) — copy structure, change endpoints:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CONSENTIMIENTOS_QUERY_KEY } from '@/hooks/useConsentimientos';
import { CATALOGO_HC_QUERY_KEY } from '@/hooks/useCatalogoHC'; // invalidate both on indicacionesUrl update

export function useUploadConsentimiento(profesionalId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ zonaId, file }: { zonaId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post(
        `/consentimientos/zonas/${zonaId}/pdf`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          params: profesionalId ? { profesionalId } : {},
        },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONSENTIMIENTOS_QUERY_KEY] });
    },
  });
}

export function useUpdateIndicaciones(profesionalId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ zonaId, indicacionesUrl }: { zonaId: string; indicacionesUrl: string | null }) => {
      const { data } = await api.patch(
        `/catalogo-hc/zonas/${zonaId}/indicaciones`,
        { indicacionesUrl },
        { params: profesionalId ? { profesionalId } : {} },
      );
      return data;
    },
    onSuccess: () => {
      // Invalidate both keys since indicacionesUrl lives on ZonaHC
      queryClient.invalidateQueries({ queryKey: [CATALOGO_HC_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [CONSENTIMIENTOS_QUERY_KEY] });
    },
  });
}
```

---

### `frontend/src/types/consentimientos.ts` (utility/types)

**Analog:** `frontend/src/types/catalogo-hc.ts` (lines 1–24)

```typescript
export interface ConsentimientoZonaArchivo {
  id: string;
  zonaId: string;
  path: string;            // relative path for URL construction
  nombreOriginal: string;
  uploadedAt: string;      // ISO string
  vigente: boolean;
}

export interface ZonaConConsentimiento {
  id: string;
  nombre: string;
  orden: number;
  esSistema: boolean;
  indicacionesUrl: string | null;
  consentimientoVigente: ConsentimientoZonaArchivo | null;
}
```

---

## Shared Patterns

### Auth Decorator
**Source:** `backend/src/modules/auth/decorators/auth.decorator.ts` (lines 1–7)
**Apply to:** All new backend controllers that require JWT (`ConsentimientosController`)
```typescript
import { applyDecorators, UseGuards } from '@nestjs/common';
import { Roles } from './roles.decorator';
import { JwtRolesGuard } from '../guards/jwt-roles.guard';

export function Auth(...roles: string[]) {
  return applyDecorators(Roles(...roles), UseGuards(JwtRolesGuard));
}
```
Usage: `@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')` on the controller class.

Note: `UploadsController` must NOT use `@Auth()` — it is intentionally public (D-09).

### BACKEND_URL Public URL Construction
**Source:** `backend/src/modules/whatsapp/whatsapp.controller.ts` (lines 222–228)
**Apply to:** `StorageService.getPublicUrl()` and any service that builds file URLs
```typescript
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001';
if (!process.env.BACKEND_URL) {
  this.logger.warn(
    'BACKEND_URL is not set — using http://localhost:3001. Meta cannot fetch PDFs from localhost in production.',
  );
}
const filePublicUrl = `${backendUrl}/uploads/${relativePath}`;
```

### Per-Profesional Ownership Guard (getProfesionalId)
**Source:** `backend/src/modules/catalogo-hc/catalogo-hc.controller.ts` (lines 27–55)
**Apply to:** `ConsentimientosController` — copy verbatim, adjust error message.

The pattern resolves profesionalId from JWT for PROFESIONAL role; allows SECRETARIA/ADMIN to pass it as query param. `profesionalId` is NEVER read from request body.

### Response Streaming (Content-Disposition: attachment)
**Source:** `backend/src/modules/presupuestos/presupuesto-public.controller.ts` (lines 47–55)
**Apply to:** `UploadsController`
```typescript
res.set({
  'Content-Type': 'application/pdf',
  'Content-Disposition': `attachment; filename="${filename}"`,
  'Content-Length': buffer.length,
});
res.end(buffer);
```

### Multi-Tenant Filter Pattern (Prisma)
**Source:** `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` (lines 192–206)
**Apply to:** `ConsentimientosService.getZonasConConsentimiento()`
```typescript
const zonas = await this.prisma.zonaHC.findMany({
  where: { profesionalId, activo: true },
  orderBy: { orden: 'asc' },
  include: { /* related models */ },
});
```
Always filter by `profesionalId` from JWT scope — never from request body.

### Prisma Ownership Guard (service-level)
**Source:** `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` (lines 714–716)
**Apply to:** `ConsentimientosService` on any method operating on a specific zona
```typescript
const zona = await this.prisma.zonaHC.findUnique({ where: { id: zonaId } });
if (!zona || zona.profesionalId !== profesionalId) {
  throw new NotFoundException('Zona no encontrada');
}
```

### TanStack Query Hook Pattern (frontend)
**Source:** `frontend/src/hooks/useCatalogoHC.ts` (lines 1–22)
**Apply to:** `useConsentimientos.ts`
- Always use `queryKey: [KEY, profesionalId]` so SECRETARIA's selected professional scope is respected.
- `staleTime: 5 * 60 * 1000` for infrequently-changing catalog data.
- `enabled: options?.enabled ?? true` to allow conditional fetching.

### useMutation + Cache Invalidation Pattern (frontend)
**Source:** `frontend/src/hooks/useCatalogoHCMutations.ts` (lines 5–19)
**Apply to:** `useConsentimientosMutations.ts`
```typescript
const queryClient = useQueryClient();
return useMutation({
  mutationFn: async (...) => { /* api call */ },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
  },
});
```

### API Client Usage (frontend)
**Source:** `frontend/src/lib/api.ts` (lines 3–6, 27–35)
**Apply to:** All new frontend hooks
```typescript
import { api } from '@/lib/api';
// JWT token is automatically attached by the request interceptor.
// For multipart/form-data uploads, set the Content-Type header explicitly.
```

---

## No Analog Found (Greenfield)

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `backend/src/modules/storage/storage.service.ts` | service | file-I/O | No disk I/O / file persistence service exists in the repo. `presupuesto-pdf.service.ts` handles buffers in-memory only (no disk writes). All file handling is fully new. Use `node:fs/promises`, `node:path`, `node:crypto` builtins. |
| `backend/src/app.module.ts` APP_GUARD wiring | config | — | No `APP_GUARD` provider exists in the repo today. ThrottlerGuard will be the first global provider. Copy `BullModule.forRootAsync` style for ThrottlerModule registration but `APP_GUARD` is net-new. |
| `backend/src/modules/uploads/uploads.controller.ts` path-traversal guard | controller | file-I/O | The `Content-Disposition: attachment` streaming is analogous to `presupuesto-public.controller.ts`. The path-traversal guard (`path.normalize` + relative check) has no prior art in this codebase. |
| `@UseInterceptors(FileInterceptor(...))` upload pipeline | middleware | file-I/O | No `@nestjs/platform-express` FileInterceptor / multer usage anywhere in backend. Greenfield; use `memoryStorage()` (no disk temp files) and read `file.buffer` directly in the controller handler. |

---

## Metadata

**Analog search scope:** `backend/src/modules/`, `frontend/src/hooks/`, `frontend/src/app/dashboard/configuracion/`, `frontend/src/types/`, `backend/src/app.module.ts`, `backend/src/main.ts`, `backend/src/prisma/schema.prisma`
**Files scanned:** 17
**Pattern extraction date:** 2026-06-27
