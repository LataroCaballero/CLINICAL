# Phase 52: PREOP HC Form + Chip Catalogs — Pattern Map

**Mapped:** 2026-06-26
**Files analyzed:** 13 new/modified files
**Analogs found:** 12 / 13

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/src/prisma/schema.prisma` (add model) | model | CRUD | `AlergiaCatalogoPro` / `MedicamentoCatalogoPro` (lines 1432–1458) | exact |
| `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` (add flat-catalog methods) | service | CRUD | existing `CatalogoHCService` (same file) | exact |
| `backend/src/modules/catalogo-hc/catalogo-hc.seed-data.ts` (add SEED_ANTECEDENTES) | config | batch | existing `SEED_ZONAS` + `normalizarNombre` (same file) | exact |
| `backend/src/modules/catalogo-hc/catalogo-hc.controller.ts` (add flat-catalog endpoints) | controller | request-response | existing `CatalogoHCController` (same file) | exact |
| `backend/src/modules/historia-clinica/historia-clinica.service.ts` (PREOP branch) | service | CRUD | `crearEntrada()` `primera_vez` branch (lines 96–336) | exact |
| `backend/src/modules/historia-clinica/dto/crear-entrada.dto.ts` (PREOP fields) | model/DTO | request-response | existing `CreateEntradaDto` (same file) | exact |
| `backend/src/modules/pacientes/pacientes.service.ts` (portal token generation) | service | request-response | `presupuesto-email.service.ts` `crypto.randomUUID()` + `createHash` pattern (line 97) | role-match |
| `frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx` (add swap branch) | component | request-response | existing `tipoSeleccionado === 'primera_vez'` branch (lines 229–236) | exact |
| `frontend/src/components/live-turno/tabs/hc/PreoperatorioForm.tsx` (NEW) | component | request-response | `PrimeraConsultaForm.tsx` | exact |
| `frontend/src/hooks/useCreateHistoriaClinicaEntry.ts` (add preop DTO fields + invalidation) | hook | request-response | existing `useCreateHistoriaClinicaEntry` (same file) | exact |
| `frontend/src/hooks/useAntecedentesCatalogo.ts` (NEW) | hook | CRUD | `useCatalogoHC.ts` | exact |
| `frontend/src/hooks/useAlergiasCatalogo.ts` (NEW) | hook | CRUD | `useCatalogoHC.ts` | exact |
| `frontend/src/hooks/useMedicamentosCatalogo.ts` (NEW) | hook | CRUD | `useCatalogoHC.ts` | exact |

---

## Pattern Assignments

### `backend/src/prisma/schema.prisma` — new model `AntecedenteCatalogoPro`

**Analog:** `AlergiaCatalogoPro` (line 1432) and `MedicamentoCatalogoPro` (line 1446) — copy field-for-field.

**Model pattern** (lines 1430–1458):
```prisma
// ─── Catálogos Prequirúrgico por profesional ─────────────────────────────────

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

model MedicamentoCatalogoPro {
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

**New model to add** — copy both models above and rename to `AntecedenteCatalogoPro`.

**Inverse relation on `Profesional`** (lines 137–138) — add `antecedentesCatalogo AntecedenteCatalogoPro[]` after `medicamentosCatalogo MedicamentoCatalogoPro[]`:
```prisma
  alergiasCatalogo     AlergiaCatalogoPro[]
  medicamentosCatalogo MedicamentoCatalogoPro[]
  antecedentesCatalogo AntecedenteCatalogoPro[]   // add this line
```

**Fields already in schema that the PREOP branch writes to** (`Paciente`, lines 213–221):
```prisma
  medicacion                 String[]
  adicciones                 String[]
  consentimientoFirmadoAt    DateTime?
  portalToken                String?   @unique // SHA-256 hash, never plaintext (PITFALL 1)
  portalTokenGeneradoAt      DateTime?
  // Staging fields — written only by the future patient portal (PITFALL 13)
  alergiasAutoReportadas     String[]
  antecedentesAutoReportados Json?
  medicacionAutoReportada    String[]
```
Note: `alergias[]` and `condiciones[]` exist earlier in the `Paciente` model. The PREOP branch merges INTO those arrays (unión-dedup). The `*AutoReportada(o)s` fields are NOT touched in F52.

**`HistoriaClinicaEntrada` fields** (lines 291–318) — already contain `estudiosComplementarios Json?` and `tipoEntrada TipoEntradaHC?`. The PREOP contenido JSONB goes in `contenido Json?`. Nothing new to add to `HistoriaClinicaEntrada` schema.

---

### `backend/src/modules/catalogo-hc/catalogo-hc.seed-data.ts` — add `SEED_ANTECEDENTES`

**Analog:** `normalizarNombre` + `SEED_ZONAS` constant (lines 1–119). SEED_ANTECEDENTES is a flat string array (no nesting).

**`normalizarNombre` to copy** (lines 25–27):
```typescript
export function normalizarNombre(nombre: string): string {
  return nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}
```

**New constant to add** (source: `CondicionesChips.tsx` `PREDEFINED` list, lines 11–22):
```typescript
// Seed for AntecedenteCatalogoPro — mirrors frontend CondicionesChips.PREDEFINED
export const SEED_ANTECEDENTES: string[] = [
  'Hipertensión',
  'Diabetes',
  'Asma',
  'Enfermedad cardíaca',
  'Obesidad',
  'Artritis',
  'Alergia severa',
  'Hipotiroidismo',
  'Cannabis',
  'Epilepsia',
];
```

---

### `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` — flat-catalog CRUD + seed + learning

**Analog:** existing `CatalogoHCService` methods. For FLAT catalogs (no nesting), the pattern simplifies dramatically vs. the ZonaHC nested approach.

**Imports to add**:
```typescript
import {
  SEED_ZONAS,
  SEED_ANTECEDENTES,   // add
  normalizarNombre,
} from './catalogo-hc.seed-data';
```

**Idempotent flat seed pattern** (model on `seedCatalogoInicial` lines 102–159, simplified):
```typescript
async seedAntecedentesInicial(profesionalId: string): Promise<void> {
  const count = await this.prisma.antecedenteCatalogoPro.count({
    where: { profesionalId },
  });
  if (count > 0) return;

  await this.prisma.antecedenteCatalogoPro.createMany({
    data: SEED_ANTECEDENTES.map((nombre) => ({
      nombre,
      activo: true,
      esSistema: true,
      profesionalId,
    })),
    skipDuplicates: true,
  });
}
// Same pattern for seedAlergiasInicial and seedMedicamentosInicial
```

**Lazy-seed list getter pattern** (model on `getCatalogoConSeed` lines 166–221, simplified for flat):
```typescript
async getAntecedentesConSeed(profesionalId: string) {
  let items = await this.prisma.antecedenteCatalogoPro.findMany({
    where: { profesionalId, activo: true },
    orderBy: [{ esSistema: 'desc' }, { nombre: 'asc' }],
  });
  if (items.length === 0) {
    await this.seedAntecedentesInicial(profesionalId);
    items = await this.prisma.antecedenteCatalogoPro.findMany({
      where: { profesionalId, activo: true },
      orderBy: [{ esSistema: 'desc' }, { nombre: 'asc' }],
    });
  }
  return items;
}
// Same for getAlergiasConSeed, getMedicamentosConSeed
```

**Best-effort upsert (learning) pattern** — called after `$transaction` commits (mirror of `aprenderDesdeZonas` lines 236–434, simplified for flat list):
```typescript
async aprenderDesdeFlat(
  profesionalId: string,
  nombres: string[],
  modelo: 'antecedenteCatalogoPro' | 'alergiaCatalogoPro' | 'medicamentoCatalogoPro',
): Promise<void> {
  if (!nombres.length) return;

  // Load snapshot (including inactive for reactivation)
  const snapshot = await (this.prisma[modelo] as any).findMany({
    where: { profesionalId },
    select: { id: true, nombre: true, activo: true },
  });

  const normMap = new Map<string, { id: string; activo: boolean }>();
  for (const s of snapshot) {
    normMap.set(normalizarNombre(s.nombre), { id: s.id, activo: s.activo });
  }

  for (const nombre of nombres) {
    const key = normalizarNombre(nombre);
    const existing = normMap.get(key);
    if (!existing) {
      // Create new
      await (this.prisma[modelo] as any).create({
        data: { nombre, activo: true, esSistema: false, profesionalId },
      });
    } else if (!existing.activo) {
      // Reactivate
      await (this.prisma[modelo] as any).update({
        where: { id: existing.id },
        data: { activo: true },
      });
    }
    // Already active → no-op
  }
}
```
Note: caller (`historia-clinica.service.ts`) wraps this in `try/catch` with `this.logger.warn(...)` — do NOT throw here.

**esSistema guard for delete/rename** (lines 444–605 — copy the pattern for `eliminarXxx` / `renombrarXxx`):
```typescript
if (item.esSistema) {
  throw new ForbiddenException('No se puede modificar un ítem del sistema');
}
```

---

### `backend/src/modules/catalogo-hc/catalogo-hc.controller.ts` — flat-catalog endpoints

**Analog:** existing `CatalogoHCController` (full file). Controller already has the `getProfesionalId()` helper scoping by JWT (lines 27–55). Copy it verbatim for new endpoints.

**Auth + scope pattern** (lines 18–55):
```typescript
@Controller('catalogo-hc')
@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')
export class CatalogoHCController {
  private async getProfesionalId(user: any, targetProfesionalId?: string): Promise<string> {
    if (
      (user.rol === RolUsuario.SECRETARIA || user.rol === RolUsuario.ADMIN) &&
      targetProfesionalId
    ) {
      return targetProfesionalId;
    }
    if (user.rol !== RolUsuario.PROFESIONAL) {
      throw new ForbiddenException('Se requiere profesionalId para gestionar el catálogo HC');
    }
    const profesional = await this.prisma.profesional.findUnique({
      where: { usuarioId: user.userId },
    });
    if (!profesional) throw new ForbiddenException('Perfil profesional no encontrado');
    return profesional.id;
  }

  @Get()
  async getCatalogo(@Req() req: any, @Query('profesionalId') profesionalId?: string) {
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.service.getCatalogoConSeed(pid);
  }
  // ...
}
```

**New endpoints pattern** — add `@Get('antecedentes')`, `@Get('alergias')`, `@Get('medicamentos')` following the same `getProfesionalId` guard. For upsert (learning from "Otro"), add `@Post('antecedentes')` etc.

---

### `backend/src/modules/historia-clinica/historia-clinica.service.ts` — PREOP branch

**Analog:** `crearEntrada()` method, lines 79–339. The `primera_vez` branch is the direct model.

**Import pattern** (lines 1–13):
```typescript
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateEntradaDto } from './dto/crear-entrada.dto';
import { resolverNuevoFlujo } from './historia-clinica.flujo.helpers';
import {
  construirContenidoPrimeraVez,
  derivarPerfilPrimeraVez,
} from './historia-clinica.contenido.helpers';
import { CatalogoHCService } from '../catalogo-hc/catalogo-hc.service';
import * as crypto from 'crypto';  // add for portal token sha256
```

**Dispatch pattern in `crearEntrada()`** (lines 96–113 — add `pre_quirurgico` branch here):
```typescript
if (dto.tipo === 'primera_vez') {
  contenido = construirContenidoPrimeraVez({ ... });
} else if (dto.tipo === 'pre_quirurgico') {
  // NEW: build PREOP contenido JSONB
  contenido = {
    tipo: 'pre_quirurgico',
    antecedentes: dto.antecedentes ?? [],
    alergias: dto.alergias ?? [],
    medicacion: dto.medicacion ?? [],
    estudiosComplementarios: dto.estudiosComplementarios ?? null,
    consentimientoInformadoAt: dto.consentimientoInformado
      ? new Date().toISOString()
      : null,
    ...(dto.zonas?.length ? { zonas: dto.zonas } : {}),
    comentario: dto.comentario ?? '',
  };
} else if (dto.tipo === 'tratamiento_en_consultorio') {
  // ...existing...
```

**Patient profile merge pattern** (model on lines 251–260 — union-dedup merge into `condiciones[]`, `alergias[]`, `medicacion[]`):
```typescript
// Inside $transaction, after creating the entrada:
if (dto.tipo === 'pre_quirurgico') {
  const pac = await tx.paciente.findUnique({
    where: { id: pacienteId },
    select: { condiciones: true, alergias: true, medicacion: true },
  });
  const mergeUnique = (existing: string[], incoming: string[]) =>
    Array.from(new Set([...existing, ...incoming]));

  await tx.paciente.update({
    where: { id: pacienteId },
    data: {
      condiciones: mergeUnique(pac?.condiciones ?? [], dto.antecedentes ?? []),
      alergias: mergeUnique(pac?.alergias ?? [], dto.alergias ?? []),
      medicacion: mergeUnique(pac?.medicacion ?? [], dto.medicacion ?? []),
    },
  });
}
```

**Portal token generation** (new, inside `$transaction` or immediately after, in PREOP branch only):
```typescript
// Inside $transaction (or after — depends on whether you need the id in the response):
const pac = await tx.paciente.findUnique({
  where: { id: pacienteId },
  select: { portalToken: true },
});
if (!pac?.portalToken) {
  const rawUuid = crypto.randomUUID();
  const hash = crypto.createHash('sha256').update(rawUuid).digest('hex'); // 64-char hex
  await tx.paciente.update({
    where: { id: pacienteId },
    data: {
      portalToken: hash,
      portalTokenGeneradoAt: new Date(),
    },
  });
  // Return rawUuid in the response so frontend can build the URL —
  // it is NEVER stored; only the hash lives in DB (PITFALL 1)
}
```
Note: If `portalToken` already exists, do NOT regenerate (D-12). Return the URL only for new tokens in the response body.

**Best-effort learning call pattern** (lines 313–336 — add PREOP call after existing `primera_vez` block):
```typescript
// Best-effort catalog learning — after $transaction commits
if (dto.tipo === 'primera_vez' && Array.isArray(dto.zonas) && dto.zonas.length > 0) {
  try {
    await this.catalogoHc.aprenderDesdeZonas(profesionalId, dto.zonas.map(...));
  } catch (e) {
    this.logger.warn(`Aprendizaje de catálogo HC falló (no bloqueante): ${e?.message ?? e}`);
  }
}

// NEW: PREOP learning
if (dto.tipo === 'pre_quirurgico') {
  try {
    await this.catalogoHc.aprenderDesdePreoperatorio(profesionalId, {
      antecedentes: dto.antecedentes ?? [],
      alergias: dto.alergias ?? [],
      medicacion: dto.medicacion ?? [],
    });
  } catch (e) {
    this.logger.warn(`Aprendizaje PREOP falló (no bloqueante): ${e?.message ?? e}`);
  }
}
```

---

### `backend/src/modules/historia-clinica/dto/crear-entrada.dto.ts` — PREOP fields

**Analog:** existing `CreateEntradaDto` (full file). Add PREOP fields following the same `@IsOptional()` + `@IsArray()` pattern (lines 67–98).

**Existing pattern** (lines 42–98):
```typescript
export class CreateEntradaDto {
  tipo: 'primera_vez' | 'pre_quirurgico' | 'control' | 'practica' | 'tratamiento_en_consultorio' | 'libre';

  @IsOptional()
  @IsArray()
  zonas?: ZonaSeleccionDto[];

  // ...
  @IsOptional()
  @IsBoolean()
  consumirInsumos?: boolean;
}
```

**New fields to add** (copy style from existing optional fields):
```typescript
  // PREOP-specific (Phase 52)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  antecedentes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alergias?: string[];        // redeclare as PREOP-specific (also sent for pre_quirurgico)

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medicacion?: string[];

  @IsOptional()
  estudiosComplementarios?: {  // D-09/D-10 shape: {laboratorio: bool, ecg: bool, imagenes: string[]}
    laboratorio: boolean;
    ecg: boolean;
    imagenes: string[];
  };

  @IsOptional()
  @IsBoolean()
  consentimientoInformado?: boolean;  // true = timestamp written to contenido JSONB (D-11)
```

---

### Portal token: `backend/src/modules/pacientes/pacientes.service.ts`

**Analog:** `presupuesto-email.service.ts` lines 97–103 — generates token via `crypto.randomUUID()`. For the portal token the spec requires `sha256(uuid)` as hash stored in DB; the raw UUID lives only in the URL.

**Import pattern** (from `encryption.service.ts` line 3):
```typescript
import * as crypto from 'crypto';
```

**Token generation pattern** (no analog exists yet — new logic to inline):
```typescript
// D-12: generate portal token only if not already present
const rawUuid = crypto.randomUUID();
const hash = crypto.createHash('sha256').update(rawUuid).digest('hex'); // 64-char hex
// Persist hash to DB; return rawUuid for URL construction
```
The URL is built by the service: `${process.env.FRONTEND_URL}/portal/${rawUuid}`. This follows the `presupuesto-email.service.ts` pattern of building the URL in the service (line 99–100).

---

### `frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx` — add swap branch

**Analog:** lines 229–236 — the `primera_vez` swap to `PrimeraConsultaForm`.

**Current pattern** (lines 229–236):
```tsx
{tipoSeleccionado === 'primera_vez' && (
  <PrimeraConsultaForm
    profesionalId={profesionalId}
    onChange={(state) => setPvState(state)}
    onGenerarPresupuesto={(items) => setPresupuestoModalItems(items)}
    obraSocialId={obraSocialId}
  />
)}
```

**New branch to add** (immediately after, same pattern):
```tsx
{tipoSeleccionado === 'pre_quirurgico' && (
  <PreoperatorioForm
    pacienteId={pacienteId}
    profesionalId={profesionalId}
    turnoId={turnoId}
    onChange={(state) => setPreopState(state)}
  />
)}
```

**State to add** (after `pvState`/`setPvState`, lines 63–65):
```tsx
const [preopState, setPreopState] = useState<PreoperatorioFormState | null>(null);
```

**`canSave` condition to add** (after line 104):
```tsx
: tipoSeleccionado === 'pre_quirurgico'
  ? preopState !== null
```

**`handleSave` branch to add** (after `primera_vez` branch, before `else`):
```tsx
} else if (tipoSeleccionado === 'pre_quirurgico') {
  if (!preopState) return;
  await createEntry.mutateAsync({
    pacienteId,
    dto: {
      tipo: 'pre_quirurgico',
      tipoEntrada: PLANTILLA_TO_TIPO_ENTRADA['pre_quirurgico'], // 'PREOPERATORIO'
      antecedentes: preopState.antecedentes,
      alergias: preopState.alergias,
      medicacion: preopState.medicacion,
      estudiosComplementarios: preopState.estudiosComplementarios,
      consentimientoInformado: preopState.consentimientoInformado,
      zonas: preopState.zonas ?? [],
      ...(selectedFecha ? { fecha: selectedFecha } : {}),
    },
  });
  toast.success('HC prequirúrgica guardada.');
```

**`PLANTILLA_TO_TIPO_ENTRADA` already maps** (lines 42–49):
```tsx
const PLANTILLA_TO_TIPO_ENTRADA: Record<string, TipoEntradaHCValue> = {
  primera_vez: 'CONSULTA_CIRUGIA',
  pre_quirurgico: 'PREOPERATORIO',   // already present — no change needed
  // ...
};
```

---

### `frontend/src/components/live-turno/tabs/hc/PreoperatorioForm.tsx` (NEW)

**Analog:** `PrimeraConsultaForm.tsx` (full file) — copy structure directly; it is the authoritative chip + "Otro" Enter→chip pattern. Key sections to replicate per section (antecedentes / alergias / medicación):

**Imports pattern** (lines 1–14):
```tsx
'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
```

**`Chip` sub-component** (lines 35–64) — copy verbatim, it is the unit of interaction:
```tsx
function Chip({ label, selected, dashed, onClick }: {
  label: string; selected: boolean; dashed?: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-sm border transition-colors capitalize',
        dashed && selected  ? 'bg-blue-600 text-white border-2 border-dashed border-blue-300'
        : dashed && !selected ? 'bg-white text-gray-700 border-2 border-dashed border-gray-400 hover:border-blue-400'
        : selected ? 'bg-blue-600 text-white border-blue-600'
        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400',
      )}>
      {label}
    </button>
  );
}
```

**Form state interface** (new, analogous to `PrimeraConsultaFormState` line 16):
```tsx
export interface PreoperatorioFormState {
  antecedentes: string[];
  alergias: string[];
  medicacion: string[];
  estudiosComplementarios: { laboratorio: boolean; ecg: boolean; imagenes: string[] };
  consentimientoInformado: boolean;
  zonas: ZonaSeleccionDto[];   // optional, only if "agregar dx/tratamiento" checked
}
```

**Flat-chips section pattern** (for each of antecedentes/alergias/medicación — model on how `CondicionesChips` works but using catalog from hook + dashed border for new items):
```tsx
// State for each chip group
const [inputAbierto, setInputAbierto] = useState(false);
const [inputTexto, setInputTexto] = useState('');
const [itemsNuevos, setItemsNuevos] = useState<string[]>([]);
const [selected, setSelected] = useState<string[]>(initialFromPaciente);

const handleEnter = () => {
  const nombre = formatearNombre(inputTexto);
  if (!nombre) return;
  if (selected.some((s) => s.toLowerCase() === nombre.toLowerCase())) {
    setInputTexto('');
    return;
  }
  setSelected((prev) => [...prev, nombre]);
  setItemsNuevos((prev) => [...prev, nombre]);
  setInputTexto('');
};
```

**Catalog data loading** (model on `useCatalogoHC` usage in PrimeraConsultaForm lines 94–97):
```tsx
const { data: antecedentes = [] } = useAntecedentesCatalogo(profesionalId);
const { data: alergias = [] }     = useAlergiasCatalogo(profesionalId);
const { data: medicacion = [] }   = useMedicamentosCatalogo(profesionalId);
```

**Pre-load from `Paciente` profile** (D-09 requirement — pass `pacienteId` prop, fetch patient and initialize `useState` from `paciente.condiciones`, `paciente.alergias`, `paciente.medicacion`):
```tsx
// Use usePaciente hook to pre-populate chips
const { data: paciente } = usePaciente(pacienteId);
const [selectedAntecedentes, setSelectedAntecedentes] = useState<string[]>([]);

useEffect(() => {
  if (paciente) {
    setSelectedAntecedentes(paciente.condiciones ?? []);
    setSelectedAlergias(paciente.alergias ?? []);
    setSelectedMedicacion(paciente.medicacion ?? []);
  }
}, [paciente]);
```

**Optional dx/tratamiento section** (D-08 — reuse PrimeraConsultaForm or import the zona-selection logic):
```tsx
const [agregarDxTratamiento, setAgregarDxTratamiento] = useState(false);

<div className="flex items-center gap-2">
  <Checkbox id="agregar-dx" checked={agregarDxTratamiento}
    onCheckedChange={(v) => setAgregarDxTratamiento(Boolean(v))} />
  <label htmlFor="agregar-dx" className="text-sm">Agregar diagnóstico/tratamiento</label>
</div>

{agregarDxTratamiento && (
  <PrimeraConsultaForm
    profesionalId={profesionalId}
    onChange={(state) => handleZonasChange(state.zonas)}
    onGenerarPresupuesto={() => {}}  // no-op for preop
    obraSocialId={undefined}
  />
)}
```

**Estudios complementarios section** (D-10 shape `{laboratorio: bool, ecg: bool, imagenes: string[]}`):
```tsx
const [estudios, setEstudios] = useState({ laboratorio: false, ecg: false, imagenes: [] as string[] });

const IMAGENES_OPCIONES = ['Ecografía', 'Tomografía', 'Mamografía', 'Otro'];

<section>
  <h3 className="text-sm font-semibold ...">Estudios complementarios</h3>
  <Checkbox id="lab" checked={estudios.laboratorio}
    onCheckedChange={(v) => setEstudios((p) => ({ ...p, laboratorio: Boolean(v) }))} />
  <label htmlFor="lab">Laboratorio</label>
  <Checkbox id="ecg" checked={estudios.ecg}
    onCheckedChange={(v) => setEstudios((p) => ({ ...p, ecg: Boolean(v) }))} />
  <label htmlFor="ecg">ECG</label>
  {IMAGENES_OPCIONES.map((op) => (
    <Checkbox key={op} id={`img-${op}`}
      checked={estudios.imagenes.includes(op)}
      onCheckedChange={(v) => setEstudios((p) => ({
        ...p,
        imagenes: v ? [...p.imagenes, op] : p.imagenes.filter((i) => i !== op),
      }))} />
  ))}
</section>
```

**Consentimiento informado check** (D-11 — timestamp in JSONB, NOT `consentimientoFirmadoAt`):
```tsx
const [consentimientoInformado, setConsentimientoInformado] = useState(false);

<div className="flex items-center gap-2">
  <Checkbox id="consentimiento" checked={consentimientoInformado}
    onCheckedChange={(v) => setConsentimientoInformado(Boolean(v))} />
  <label htmlFor="consentimiento" className="text-sm">
    Paciente informado del consentimiento
  </label>
</div>
```

---

### `frontend/src/hooks/useCreateHistoriaClinicaEntry.ts` — add PREOP fields + invalidation

**Analog:** existing file (full, 97 lines).

**DTO extension** (add after `turnoId?: string`, line 60):
```typescript
// PREOP fields (Phase 52)
antecedentes?: string[];
alergias?: string[];
medicacion?: string[];
estudiosComplementarios?: {
  laboratorio: boolean;
  ecg: boolean;
  imagenes: string[];
};
consentimientoInformado?: boolean;
```

**Invalidation additions in `onSuccess`** (lines 82–95 — add antecedentes/alergias/medicamentos catalog keys):
```typescript
onSuccess: (_, variables) => {
  qc.invalidateQueries({ queryKey: ['historia-clinica', variables.pacienteId] });
  qc.invalidateQueries({ queryKey: ['paciente', variables.pacienteId] });
  qc.invalidateQueries({ queryKey: ['pacientes'] });
  qc.invalidateQueries({ queryKey: ['contactos', variables.pacienteId] });
  qc.invalidateQueries({ queryKey: ['crm-kanban'] });
  qc.invalidateQueries({ queryKey: ['autorizaciones'] });
  qc.invalidateQueries({ queryKey: ['turnos', 'rango'] });
  qc.invalidateQueries({ queryKey: [CATALOGO_HC_QUERY_KEY] });
  // NEW: invalidate flat chip catalogs (Phase 52 learning)
  qc.invalidateQueries({ queryKey: ['antecedentes-catalogo'] });
  qc.invalidateQueries({ queryKey: ['alergias-catalogo'] });
  qc.invalidateQueries({ queryKey: ['medicamentos-catalogo'] });
},
```

---

### `frontend/src/hooks/useAntecedentesCatalogo.ts` (NEW), `useAlergiasCatalogo.ts` (NEW), `useMedicamentosCatalogo.ts` (NEW)

**Analog:** `useCatalogoHC.ts` (full file, 22 lines) — copy verbatim per catalog type.

**Full pattern from `useCatalogoHC.ts`** (lines 1–22):
```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ZonaHC } from '@/types/catalogo-hc';

export const CATALOGO_HC_QUERY_KEY = 'catalogo-hc';

export function useCatalogoHC(profesionalId?: string, options?: { enabled?: boolean }) {
  return useQuery<ZonaHC[], Error>({
    queryKey: [CATALOGO_HC_QUERY_KEY, profesionalId],
    queryFn: async () => {
      const { data } = await api.get('/catalogo-hc', {
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

**New hook shape** (substitute names and endpoint):
```typescript
// useAntecedentesCatalogo.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface CatalogoItem { id: string; nombre: string; esSistema: boolean; }

export const ANTECEDENTES_CATALOGO_QUERY_KEY = 'antecedentes-catalogo';

export function useAntecedentesCatalogo(profesionalId?: string) {
  return useQuery<CatalogoItem[]>({
    queryKey: [ANTECEDENTES_CATALOGO_QUERY_KEY, profesionalId],
    queryFn: async () => {
      const { data } = await api.get('/catalogo-hc/antecedentes', {
        params: profesionalId ? { profesionalId } : {},
      });
      return data;
    },
    enabled: !!profesionalId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
// Same for useAlergiasCatalogo ('alergias-catalogo', '/catalogo-hc/alergias')
// Same for useMedicamentosCatalogo ('medicamentos-catalogo', '/catalogo-hc/medicamentos')
```

---

## Shared Patterns

### Multi-tenant scope (PITFALL 12)
**Source:** `catalogo-hc.controller.ts` lines 27–55 (`getProfesionalId`)
**Apply to:** All new backend catalog endpoints and portal token endpoint
```typescript
private async getProfesionalId(user: any, targetProfesionalId?: string): Promise<string> {
  if ((user.rol === RolUsuario.SECRETARIA || user.rol === RolUsuario.ADMIN) && targetProfesionalId) {
    return targetProfesionalId;
  }
  if (user.rol !== RolUsuario.PROFESIONAL) {
    throw new ForbiddenException('Se requiere profesionalId');
  }
  const profesional = await this.prisma.profesional.findUnique({ where: { usuarioId: user.userId } });
  if (!profesional) throw new ForbiddenException('Perfil profesional no encontrado');
  return profesional.id;
}
```

### Auth guard
**Source:** `catalogo-hc.controller.ts` line 19, `historia-clinica.controller.ts` line 6
**Apply to:** All new endpoints
```typescript
@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')
```

### Best-effort learning wrapper
**Source:** `historia-clinica.service.ts` lines 313–336
**Apply to:** `crearEntrada()` PREOP branch
```typescript
try {
  await this.catalogoHc.aprenderDesde…(profesionalId, …);
} catch (e) {
  this.logger.warn(`Aprendizaje … falló (no bloqueante): ${e?.message ?? e}`);
}
```

### esSistema soft-delete guard
**Source:** `catalogo-hc.service.ts` lines 449–451, 479–481, 512–514, 549–551, 578–580, 597–599
**Apply to:** All `eliminarXxx` / `renombrarXxx` methods for new catalog models
```typescript
if (item.esSistema) {
  throw new ForbiddenException('No se puede eliminar un ítem del sistema');
}
```

### P2002 conflict on rename
**Source:** `catalogo-hc.service.ts` lines 452–465
**Apply to:** All `renombrarXxx` methods for flat catalogs
```typescript
try {
  return await this.prisma.antecedenteCatalogoPro.update({ where: { id }, data: { nombre } });
} catch (err: any) {
  if (err?.code === 'P2002') {
    throw new ConflictException('Ya existe un ítem con ese nombre en este perfil');
  }
  throw err;
}
```

### `normalizarNombre` (case/accent-insensitive dedup)
**Source:** `catalogo-hc.seed-data.ts` lines 25–27
**Apply to:** All learning methods (`aprenderDesdeFlat`, `aprenderDesdePreoperatorio`)
```typescript
export function normalizarNombre(nombre: string): string {
  return nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}
```

### Chip + "Otro" Enter→chip pattern
**Source:** `PrimeraConsultaForm.tsx` lines 202–240 (`handleDxNuevoEnter`)
**Apply to:** Each of the 3 chip sections in `PreoperatorioForm`
```tsx
// Input that converts text to chip on Enter
<Input
  value={inputTexto}
  onChange={(e) => setInputTexto(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleEnter(); }
  }}
  placeholder="Agregar... (Enter para agregar)"
  autoFocus
/>
```

### TanStack Query key invalidation
**Source:** `useCreateHistoriaClinicaEntry.ts` lines 82–95
**Apply to:** `useCreateHistoriaClinicaEntry.ts` `onSuccess` callback (add flat-catalog keys)

### Crypto imports
**Source:** `encryption.service.ts` line 3, `main.ts` line 1
**Apply to:** `historia-clinica.service.ts` (sha256 portal token) and any dedicated portal-token service
```typescript
import * as crypto from 'crypto';
// Usage:
const rawUuid = crypto.randomUUID();
const hash = crypto.createHash('sha256').update(rawUuid).digest('hex'); // 64-char hex
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| QR code component (e.g. `PortalShareSection.tsx`) | component | transform | No QR library or component exists yet. Planner should pick a library (e.g. `qrcode.react`) per CONTEXT.md D-13 |

---

## Metadata

**Analog search scope:** `backend/src/modules/catalogo-hc/`, `backend/src/modules/historia-clinica/`, `backend/src/prisma/schema.prisma`, `backend/src/modules/presupuestos/`, `backend/src/modules/whatsapp/crypto/`, `frontend/src/hooks/`, `frontend/src/components/live-turno/tabs/hc/`, `frontend/src/components/CondicionesChips.tsx`, `frontend/src/types/catalogo-hc.ts`
**Files scanned:** 17
**Pattern extraction date:** 2026-06-26
