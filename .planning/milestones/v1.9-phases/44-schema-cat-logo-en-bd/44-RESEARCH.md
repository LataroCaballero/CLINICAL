# Phase 44: Schema + Catálogo en BD - Research

**Researched:** 2026-06-12
**Domain:** NestJS + Prisma schema design, idempotent seed, per-professional catalog pattern
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Normalización de nombres en el seed**
- Diagnósticos: capitalizar primera letra ("Piel", "Dorso alto", "Hipomastia")
- Tratamientos: corregir tildes/ortografía ("Dermolipectomía", "Reducción de volumen", "Ácido hialurónico")
- 6 zonas confirmadas: Abdomen, Mamas, Nariz, Facial, Locales, Otros
- Mapeo: abdominoplastia→Abdomen, mastoplastia→Mamas, rinoplastia→Nariz, tratamiento_facial→Facial, lunar_cirugia_local→Locales
- Duplicados entre zonas tal cual: "Hernia" se siembra en Abdomen y Mamas como filas independientes

**Representación de "Otros"**
- "Otros" es fila real con flag de sistema (`esSistema: Boolean`): cada zona nace con un DiagnosticoHC "Otros" y un TratamientoHC "Otros" flaggeados
- Los ítems de sistema NO se pueden renombrar ni eliminar (Phase 47 los bloquea en UI)
- La zona "Otros" tiene doble rol: zona utilizable + punto de entrada para crear zonas nuevas (Phase 46 APR-01)
- **Invariante del catálogo:** toda zona nace con diagnóstico "Otros" + tratamiento "Otros". El servicio DEBE exponer un helper `crearZona()` que garantice este invariante — reutilizable por Phase 46

**Vínculo con catálogo de precios**
- `TratamientoHC.tratamientoId` → FK opcional (nullable) al modelo `Tratamiento`
- El seed hace match insensible a tildes y mayúsculas (normalize ambos lados: lowercase + sin diacríticos)
- Si no hay match, la FK queda null — sin crear Tratamiento huérfanos a precio 0
- El endpoint GET devuelve el precio resuelto por join: cada TratamientoHC incluye `{ tratamientoId, precio }`

**Mecanismo de seed y orden**
- Seed lazy en primer GET (catálogo vacío → sembrar) + hook al crear profesional
- La migración SQL solo crea tablas (DDL puro); la lógica de seed vive en TypeScript
- Profesionales existentes en producción se pueblan vía lazy seed al primer GET — sin backfill SQL
- Campo `orden` en ZonaHC: orden fijo del seed — Abdomen(1), Mamas(2), Nariz(3), Facial(4), Locales(5), Otros(siempre último)
- Zonas aprendidas (Phase 46) se ubican al final antes de "Otros"

### Claude's Discretion
- Nombre exacto del flag de sistema (`esSistema` u otro) y si va en los 3 modelos o solo donde haga falta
- Shape exacto del endpoint GET (ruta, DTO, nesting) siguiendo convenciones del repo
- Estrategia de orden para diagnósticos/tratamientos dentro de cada zona (campo `orden` o createdAt; "Otros" al final)
- Soft delete (`activo: Boolean`, patrón Phase 26) vs hard delete a nivel schema
- Detalles de la implementación de normalización de diacríticos para el match

### Deferred Ideas (OUT OF SCOPE)
- Reordenamiento manual de zonas por el profesional — fuera de scope de v1.9
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ZONA-01 | El catálogo de zonas/diagnósticos/tratamientos de HC se persiste en BD por profesional (reemplaza `zonas-diagnostico.json`) | Modelos Prisma ZonaHC/DiagnosticoHC/TratamientoHC con FK al Profesional; patrón idéntico al modelo Tratamiento per-profesional existente |
| ZONA-02 | Seed inicial con 6 zonas (Abdomen, Mamas, Nariz, Facial, Locales, Otros) con diagnósticos y tratamientos mapeados por zona | JSON hardcodeado analizado; mapeo categoría→zona documentado; seed idempotente vía `findFirst` + `createMany` patrón confirmado |
| ZONA-03 | Facial y Locales arrancan con diagnósticos = [Otros] (hoy no tienen diagnósticos definidos) | Confirmado en JSON actual — tratamiento_facial y lunar_cirugia_local solo tienen `tratamientos[]`, sin `diagnosticos[]`; el seed debe crear únicamente DiagnosticoHC "Otros" para esas zonas |
</phase_requirements>

---

## Summary

Phase 44 crea la infraestructura de base de datos para el catálogo de zonas/diagnósticos/tratamientos de la Historia Clínica de Primera Consulta. Actualmente este catálogo vive en un JSON hardcodeado (`frontend/src/lib/zonas-diagnostico.json`) que no permite personalización por profesional ni auto-aprendizaje. La fase introduce tres modelos Prisma (ZonaHC, DiagnosticoHC, TratamientoHC), una migración DDL manual, un servicio de seed idempotente que transforma el JSON a filas en PostgreSQL por profesional, y un endpoint GET que devuelve el catálogo completo anidado con precios resueltos.

El proyecto tiene un patrón bien establecido para catálogos per-profesional: el modelo `Tratamiento` y `CirugiaCatalogo` son ejemplos directos de la estructura a replicar — con FK a Profesional, campo `activo`, índice en `[profesionalId]`, y `@@unique([nombre, profesionalId])`. El módulo `tratamientos/` también define el patrón del helper `getProfesionalId()` en el controller. El módulo nuevo `catalogo-hc/` debe seguir exactamente este blueprint.

La complejidad está concentrada en tres áreas: (1) el mapeo y normalización de datos del JSON al seed (categoría vs zona son estructuras distintas en el JSON — la estructura actual del JSON tiene `zonas_diagnosticos` y `tratamientos` separados, no mapeados entre sí), (2) el match insensible a diacríticos contra el catálogo de precios `Tratamiento`, y (3) el helper `crearZona()` que garantiza el invariante de "cada zona nace con Otros" y que Phase 46 reutilizará.

**Primary recommendation:** Crear un módulo NestJS independiente `catalogo-hc/` con servicio, controller y módulo propios. El servicio expone `getCatalogoConSeed(profesionalId)` (lógica lazy) y `crearZona(profesionalId, nombre)` (helper reutilizable). El controller expone `GET /catalogo-hc` con el `profesionalId` resuelto via `getProfesionalId()`. La migración es DDL puro.

---

## Standard Stack

### Core
| Library/Tool | Version | Purpose | Why Standard |
|---|---|---|---|
| Prisma | Same as repo (ver en package.json) | Schema + client generado | Ya en uso, patrón de migración establecido |
| NestJS | Same as repo | Módulo, controller, service | Framework del proyecto |
| PostgreSQL | Same as repo | Base de datos | Única BD del proyecto |

### Supporting
| Library | Version | Purpose | When to Use |
|---|---|---|---|
| `@prisma/client` | Repo version | Queries tipadas | Dentro del service para todas las queries |
| TanStack Query | Repo version | Hook frontend para GET catálogo | Phase 45 consume el hook, Phase 44 lo crea |
| class-validator | Repo version | Validar DTO del endpoint GET (query params) | Si GET acepta `profesionalId` como query param |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|---|---|---|
| Módulo propio `catalogo-hc/` | Extender `historia-clinica/` | Extensión mantiene el módulo simple ahora pero viola SRP cuando Phase 46/47 agreguen mutaciones — módulo propio es más limpio |
| Campo `orden: Int` | Ordenar por `createdAt` | `createdAt` no garantiza orden estable si se insertan en bulk; `orden` explícito es más predecible |
| `activo: Boolean` soft delete | Hard delete | Patrón del repo (Tratamiento, CirugiaCatalogo usan `activo`); Phase 47 define semántica de borrado — el schema debe anticiparlo con `activo` |

**Installation:** No new packages needed. All dependencies already in the repo.

---

## Architecture Patterns

### Recommended Project Structure
```
backend/src/
├── modules/
│   └── catalogo-hc/                 # Nuevo módulo
│       ├── catalogo-hc.module.ts
│       ├── catalogo-hc.controller.ts
│       ├── catalogo-hc.service.ts   # Contiene getCatalogoConSeed() y crearZona()
│       └── dto/
│           └── zona-hc.dto.ts       # Response DTO anidado
├── prisma/
│   ├── schema.prisma                # + ZonaHC, DiagnosticoHC, TratamientoHC
│   └── migrations/
│       └── 20260612000000_add_catalogo_hc/
│           └── migration.sql        # DDL puro: CREATE TABLE x3 + índices
```

### Pattern 1: Prisma Schema para Catálogos Per-Profesional

**What:** Tres modelos con FK a Profesional, `activo` boolean, `esSistema` boolean, campo `orden`, relaciones anidadas entre sí.

**When to use:** Siempre que el catálogo sea personalizable por profesional y necesite protección de ítems de sistema.

**Example:**
```prisma
// Referencia directa al patrón de Tratamiento (schema.prisma:891) y CirugiaCatalogo (schema.prisma:923)

model ZonaHC {
  id            String          @id @default(uuid())
  nombre        String
  orden         Int
  activo        Boolean         @default(true)
  esSistema     Boolean         @default(false)
  profesionalId String
  profesional   Profesional     @relation(fields: [profesionalId], references: [id])
  diagnosticos  DiagnosticoHC[]
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@unique([nombre, profesionalId])
  @@index([profesionalId, activo])
}

model DiagnosticoHC {
  id            String          @id @default(uuid())
  nombre        String
  orden         Int             @default(0)
  activo        Boolean         @default(true)
  esSistema     Boolean         @default(false)
  zonaId        String
  zona          ZonaHC          @relation(fields: [zonaId], references: [id], onDelete: Cascade)
  profesionalId String
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@unique([nombre, zonaId])
  @@index([zonaId, activo])
  @@index([profesionalId])
}

model TratamientoHC {
  id              String       @id @default(uuid())
  nombre          String
  orden           Int          @default(0)
  activo          Boolean      @default(true)
  esSistema       Boolean      @default(false)
  zonaId          String
  zona            ZonaHC       @relation(fields: [zonaId], references: [id], onDelete: Cascade)
  profesionalId   String
  tratamientoId   String?      // FK opcional al catálogo de precios
  tratamiento     Tratamiento? @relation(fields: [tratamientoId], references: [id])
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@unique([nombre, zonaId])
  @@index([zonaId, activo])
  @@index([profesionalId])
}
```

**Nota sobre relaciones inversas:** Agregar `zonasHC ZonaHC[]` en `Profesional`, y `tratamientosHC TratamientoHC[]` en `Tratamiento`. Prisma requiere relaciones bidireccionales declaradas.

### Pattern 2: Seed Idempotente con Helper `crearZona()`

**What:** Función que recibe `profesionalId` y crea una zona completa (con diagnóstico "Otros" + tratamiento "Otros"). Es la unidad atómica de creación — tanto el seed inicial como Phase 46 (auto-aprendizaje) la invocan.

**When to use:** Cada vez que se necesita garantizar el invariante "toda zona nace con Otros".

**Example:**
```typescript
// Dentro de catalogo-hc.service.ts
async crearZona(
  profesionalId: string,
  nombre: string,
  orden: number,
  esSistema = false,
): Promise<ZonaConAnidados> {
  // Idempotente: retorna existente si ya existe
  const existing = await this.prisma.zonaHC.findUnique({
    where: { nombre_profesionalId: { nombre, profesionalId } },
  });
  if (existing) return this.getZonaConAnidados(existing.id);

  return this.prisma.$transaction(async (tx) => {
    const zona = await tx.zonaHC.create({
      data: { nombre, orden, esSistema, profesionalId },
    });
    // Invariante: toda zona nace con diagnóstico "Otros" y tratamiento "Otros"
    await tx.diagnosticoHC.create({
      data: { nombre: 'Otros', orden: 9999, esSistema: true, zonaId: zona.id, profesionalId },
    });
    await tx.tratamientoHC.create({
      data: { nombre: 'Otros', orden: 9999, esSistema: true, zonaId: zona.id, profesionalId, tratamientoId: null },
    });
    return this.getZonaConAnidados(zona.id, tx);
  });
}
```

### Pattern 3: Lazy Seed en GET

**What:** Si el profesional no tiene ninguna ZonaHC, se invoca el seed completo antes de devolver el catálogo.

**When to use:** Primer GET de cualquier profesional existente en producción que no tenga catálogo.

**Example:**
```typescript
async getCatalogoConSeed(profesionalId: string): Promise<ZonaHC[]> {
  const count = await this.prisma.zonaHC.count({
    where: { profesionalId, activo: true },
  });

  if (count === 0) {
    await this.seedCatalogoInicial(profesionalId);
  }

  return this.prisma.zonaHC.findMany({
    where: { profesionalId, activo: true },
    orderBy: { orden: 'asc' },
    include: {
      diagnosticos: {
        where: { activo: true },
        orderBy: { orden: 'asc' },
      },
      tratamientos: {
        where: { activo: true },
        orderBy: { orden: 'asc' },
        include: {
          tratamiento: { select: { id: true, precio: true } },
        },
      },
    },
  });
}
```

### Pattern 4: Normalización de Diacríticos para Match de Precios

**What:** Comparar nombres de TratamientoHC contra el catálogo de `Tratamiento` sin importar tildes ni mayúsculas.

**When to use:** Durante el seed, al vincular cada TratamientoHC con su `tratamientoId`.

**Example:**
```typescript
// Normalización sin dependencias externas (Node.js nativo)
function normalizarNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')                    // descompone caracteres con diacrítico
    .replace(/[̀-ͯ]/g, '')    // elimina los diacríticos
    .trim();
}

// Uso en el seed:
const tratamientosExistentes = await this.prisma.tratamiento.findMany({
  where: { profesionalId },
  select: { id: true, nombre: true, precio: true },
});

const matchMap = new Map(
  tratamientosExistentes.map((t) => [normalizarNombre(t.nombre), t]),
);

// Para cada tratamiento a sembrar:
const match = matchMap.get(normalizarNombre(nombreTratamiento));
const tratamientoId = match?.id ?? null;
```

### Pattern 5: Controller con `getProfesionalId()` Helper

**What:** Mismo helper que usa `tratamientos.controller.ts` — soporta PROFESIONAL resolviendo desde JWT y SECRETARIA/ADMIN recibiendo `profesionalId` por query param.

**When to use:** En todo endpoint que opera sobre datos de un profesional específico.

**Example:**
```typescript
// Source: backend/src/modules/tratamientos/tratamientos.controller.ts (líneas 30-58)
@Controller('catalogo-hc')
@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')
export class CatalogoHCController {
  constructor(
    private readonly service: CatalogoHCService,
    private readonly prisma: PrismaService,
  ) {}

  private async getProfesionalId(user: any, targetProfesionalId?: string): Promise<string> {
    if (
      (user.rol === RolUsuario.SECRETARIA || user.rol === RolUsuario.ADMIN) &&
      targetProfesionalId
    ) {
      return targetProfesionalId;
    }
    if (user.rol !== RolUsuario.PROFESIONAL) {
      throw new ForbiddenException('Se requiere profesionalId para acceder al catálogo');
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
}
```

### Pattern 6: Migración DDL Manual

**What:** Carpeta timestamped en `migrations/` con `migration.sql` de DDL puro. El proyecto usa `migrate deploy` (no `migrate dev`) con pgBouncer — no acepta comandos interactivos.

**When to use:** Siempre en este proyecto para cambios de schema (patrón establecido desde v1.2).

**Example:**
```sql
-- migration.sql (DDL puro, sin data)
CREATE TABLE "ZonaHC" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "nombre" TEXT NOT NULL,
  "orden" INTEGER NOT NULL,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "esSistema" BOOLEAN NOT NULL DEFAULT false,
  "profesionalId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZonaHC_pkey" PRIMARY KEY ("id")
);

-- (similar para DiagnosticoHC y TratamientoHC)

ALTER TABLE "ZonaHC"
  ADD CONSTRAINT "ZonaHC_profesionalId_fkey"
  FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TratamientoHC"
  ADD CONSTRAINT "TratamientoHC_tratamientoId_fkey"
  FOREIGN KEY ("tratamientoId") REFERENCES "Tratamiento"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ZonaHC_nombre_profesionalId_key" ON "ZonaHC"("nombre", "profesionalId");
CREATE INDEX "ZonaHC_profesionalId_activo_idx" ON "ZonaHC"("profesionalId", "activo");
-- (índices similares para las otras tablas)
```

### Pattern 7: Hook Frontend (TanStack Query)

**What:** Hook `useCatalogoHC` siguiendo el patrón de `useCirugiasCatalogo` y `useTratamientosProfesional` ya existentes.

**Example:**
```typescript
// frontend/src/hooks/useCatalogoHC.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const CATALOGO_HC_QUERY_KEY = 'catalogo-hc';

export function useCatalogoHC(profesionalId?: string) {
  return useQuery({
    queryKey: [CATALOGO_HC_QUERY_KEY, profesionalId],
    queryFn: async () => {
      const { data } = await api.get('/catalogo-hc', {
        params: profesionalId ? { profesionalId } : {},
      });
      return data as ZonaHCConAnidados[];
    },
  });
}
```

### Anti-Patterns to Avoid
- **No hacer `migrate dev` en producción:** El proyecto usa `migrate deploy` con pgBouncer — correr `prisma migrate dev` en producción causaría error. La migración manual (DDL en archivo SQL) es el patrón correcto.
- **No duplicar el helper `getProfesionalId()`:** Existe en `tratamientos.controller.ts` — copiar la lógica (no extraer a shared service porque el resto del repo tampoco lo hace).
- **No crear Tratamiento huérfanos a precio 0 desde el seed:** Si no hay match con el catálogo de precios, `tratamientoId` queda null. Los Tratamiento a precio 0 son exclusivos de Phase 46 APR-04.
- **No olvidar `updatedAt @updatedAt` en los modelos:** Prisma requiere este campo para saber qué actualizar en upserts futuros.
- **No sembrar los ítems "Otros" del JSON como filas adicionales:** El "otros"/"Otros" que ya existe en las listas del JSON ES el ítem de sistema — no duplicar.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Normalización de diacríticos | Regex o tabla de reemplazos custom | `String.prototype.normalize('NFD')` + regex Unicode nativo de Node.js | Cubre todos los caracteres Unicode, no solo español |
| Idempotencia en upserts | Lógica manual de "find then create" | `prisma.modelo.upsert()` con `where` en el unique compuesto | Prisma maneja la race condition con ON CONFLICT |
| Validación de DTO | Validaciones manuales en service | `class-validator` decorators en DTO | Patrón establecido en todo el repo |
| Transacciones multi-insert | Múltiples awaits separados | `prisma.$transaction([...ops])` | Atomicidad garantizada — si falla el segundo insert, el primero revierte |

**Key insight:** El JSON hardcodeado ya es la fuente de verdad del seed — no inventar datos nuevos. La complejidad es la transformación (JSON separado en `zonas_diagnosticos` + `tratamientos` → filas unificadas por zona).

---

## Common Pitfalls

### Pitfall 1: El JSON tiene estructura separada para zonas y tratamientos
**What goes wrong:** `zonas_diagnosticos` en el JSON contiene `{abdomen, Nariz, Mamas, Otros}` con sus diagnósticos, pero los tratamientos están en `tratamientos` con claves de categoría (`abdominoplastia`, `mastoplastia`, etc.) — las claves NO coinciden con los nombres de zona.
**Why it happens:** El JSON fue diseñado para el formulario actual que hace un match manual, no para un seed por zona.
**How to avoid:** El seed debe tener una tabla de mapeo hardcodeada (constante en el servicio):
```typescript
const MAPEO_CATEGORIA_ZONA: Record<string, string> = {
  abdominoplastia: 'Abdomen',
  mastoplastia: 'Mamas',
  rinoplastia: 'Nariz',
  tratamiento_facial: 'Facial',
  lunar_cirugia_local: 'Locales',
  otros: 'Otros',
};
```
**Warning signs:** Si el seed intenta hacer `data.tratamientos['Abdomen']`, fallará silenciosamente devolviendo undefined.

### Pitfall 2: Facial y Locales no tienen diagnósticos en el JSON
**What goes wrong:** Al iterar el JSON para sembrar diagnósticos de Facial y Locales, no hay keys correspondientes en `zonas_diagnosticos` — se sembrarían sin diagnósticos.
**Why it happens:** El JSON original solo tiene 4 zonas en `zonas_diagnosticos`: abdomen, Nariz, Mamas, Otros. Facial y Locales no existen ahí.
**How to avoid:** El seed debe crear explícitamente `DiagnosticoHC "Otros"` para Facial y Locales (ZONA-03), sin intentar leerlos del JSON. El helper `crearZona()` garantiza esto automáticamente ya que siempre crea el "Otros" inicial.
**Warning signs:** Si el catálogo de Facial tiene 0 diagnósticos después del seed, este pitfall ocurrió.

### Pitfall 3: Prisma schema sin las relaciones inversas en Profesional y Tratamiento
**What goes wrong:** Prisma genera error de validación del schema si ZonaHC/TratamientoHC referencian a Profesional/Tratamiento sin declarar la relación inversa en esos modelos.
**Why it happens:** Prisma requiere relaciones bidireccionales explícitas.
**How to avoid:** Agregar en el modelo Profesional: `zonasHC ZonaHC[]` y en el modelo Tratamiento: `tratamientosHC TratamientoHC[]`.
**Warning signs:** Error `npx prisma generate` tipo "The relation field ... on model ... is missing an opposite relation field".

### Pitfall 4: Seed no idempotente rompe al correr dos veces
**What goes wrong:** Si el seed hace `createMany` sin `skipDuplicates`, la segunda ejecución falla con violación de unique constraint.
**Why it happens:** El lazy seed puede ejecutarse múltiples veces en un entorno de desarrollo o si hay un bug de concurrencia.
**How to avoid:** Usar `prisma.zonaHC.upsert()` por item, o `createMany` con `skipDuplicates: true`, o verificar `count > 0` antes de sembrar (patrón elegido en este proyecto: verificar count).
**Warning signs:** Error P2002 (unique constraint violation) en logs al hacer GET doble.

### Pitfall 5: La FK `tratamientoId` con `onDelete: Restrict` bloquea borrado de Tratamiento
**What goes wrong:** Si un Tratamiento tiene TratamientoHC referenciándolo y alguien hace soft-delete del Tratamiento desde el módulo de configuración, la FK restricción puede causar problemas.
**Why it happens:** La FK de TratamientoHC → Tratamiento necesita una acción `onDelete` apropiada.
**How to avoid:** Usar `onDelete: SetNull` en la FK — si el Tratamiento de precios se elimina, `tratamientoId` queda null (el ítem HC sigue existiendo sin precio).
**Warning signs:** Error P2003 (FK constraint) al intentar eliminar un Tratamiento que tiene TratamientoHC vinculados.

### Pitfall 6: Hook frontend se llama antes de que exista profesionalId
**What goes wrong:** Si `useCatalogoHC` se llama sin `profesionalId` y el usuario es SECRETARIA, el backend lanza ForbiddenException.
**Why it happens:** El hook se puede montar antes de que el store de professional context haya cargado.
**How to avoid:** Pasar `enabled: !!profesionalId` en el `useQuery` cuando el rol requiere profesionalId explícito, igual que `useCirugiasCatalogo`.

---

## Seed Data Reference

El seed completo (datos ya normalizados per las decisiones locked):

**ZonaHC a crear (orden 1-5, "Otros" orden 9999):**
| nombre | orden | esSistema | Diagnósticos | Tratamientos |
|---|---|---|---|---|
| Abdomen | 1 | false | Piel, Musculo, Grasa, Pared, Hernia, [Otros* sistema] | Dermolipectomía, Dermoliposucción, Minidermoliposucción, Gluteoplastia, [Otros* sistema] |
| Mamas | 2 | false | Hipomastia, Hipertrofia, Ptosis, Contractura capsular, Hernia, [Otros* sistema] | Aumento de volumen, Reducción de volumen, Levantamiento con implante, Levantamiento sin implante, Reconstrucción de mama, Recambio de implante, [Otros* sistema] |
| Nariz | 3 | false | Dorso alto, Dorso bajo, Giba, Dorso ancho, Punta ancha, Punta caída, Punta indefinida, Punta rotada, Base ancha, Base colapsada, Laterorrinia, [Otros* sistema] | Rinoplastia, Rinoplastia estructural, [Otros* sistema] |
| Facial | 4 | false | [Otros* sistema] | Botox frente, Botox entrecejo, Botox patas de gallo, Ácido hialurónico rinomodelación, Ácido hialurónico labios, Ácido hialurónico surco nasogeniano, Ácido hialurónico pómulos, Ácido hialurónico mentón, Armonización facial, [Otros* sistema] |
| Locales | 5 | false | [Otros* sistema] | Electrocauterio, Resección y plastia, [Otros* sistema] |
| Otros | 9999 | true | [Otros* sistema] | [Otros* sistema] |

`[Otros* sistema]` = DiagnosticoHC o TratamientoHC con nombre "Otros", `esSistema: true`, orden 9999.

**Correcciones de nombres vs JSON original:**
- "Dermolipectomia" → "Dermolipectomía"
- "Dermoliposuccion" → "Dermoliposucción"
- "Minidermoliposuccion" → "Minidermoliposucción"
- "Reduccion de volumen" → "Reducción de volumen"
- "Reconstruccion de mama" → "Reconstrucción de mama"
- "Levantamiento con implante" → sin cambio
- "Acido hialuronico rinomodelacion" → "Ácido hialurónico rinomodelación"
- "Acido hialuronico labios" → "Ácido hialurónico labios"
- "Acido hialuronico surco nasogeniano" → "Ácido hialurónico surco nasogeniano"
- "Acido hialuronico pomulos" → "Ácido hialurónico pómulos"
- "Acido hialuronico menton" → "Ácido hialurónico mentón"
- "Armonizacion facial" → "Armonización facial"
- Diagnósticos: "piel"→"Piel", "musculo"→"Musculo", "grasa"→"Grasa", "pared"→"Pared", "hernia"→"Hernia", "dorso alto"→"Dorso alto", etc.

---

## Architecture Patterns Summary

### Módulo `catalogo-hc/`
Módulo NestJS autónomo registrado en `app.module.ts`. Exporta `CatalogoHCService` para que `ProfesionalesModule` pueda invocar el seed al crear un profesional.

**Registro en app.module.ts:** Agregar `CatalogoHCModule` al array de `imports`. Importar `PrismaModule` en `CatalogoHCModule` (como hace el resto de módulos que usan PrismaService directamente).

**Cross-module dependency para seed al crear profesional:**
```typescript
// profesionales.module.ts — agregar imports
@Module({
  imports: [CatalogoHCModule],  // para poder inyectar CatalogoHCService
  controllers: [ProfesionalesController],
  providers: [ProfesionalesService],
})
```

```typescript
// profesionales.service.ts — en el método que crea un profesional
// (actualmente no existe createProfesional visible — verificar en controller)
constructor(
  private prisma: PrismaService,
  private catalogoHCService: CatalogoHCService,
) {}

// Al final de createProfesional():
await this.catalogoHCService.seedCatalogoInicial(nuevoProfesional.id);
```

**Nota:** El hook al crear profesional requiere identificar dónde se crea — puede estar en `usuarios.service.ts` cuando se crea un usuario con rol PROFESIONAL. Verificar en implementación.

### Response DTO anidado

```typescript
// dto/zona-hc.dto.ts
export class TratamientoHCResponseDto {
  id: string;
  nombre: string;
  orden: number;
  esSistema: boolean;
  tratamientoId: string | null;
  precio: number | null;  // resuelto desde tratamiento.precio
}

export class DiagnosticoHCResponseDto {
  id: string;
  nombre: string;
  orden: number;
  esSistema: boolean;
}

export class ZonaHCResponseDto {
  id: string;
  nombre: string;
  orden: number;
  esSistema: boolean;
  diagnosticos: DiagnosticoHCResponseDto[];
  tratamientos: TratamientoHCResponseDto[];
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| JSON hardcodeado por zona | PostgreSQL per-profesional | Phase 44 (v1.9) | Habilita personalización, auto-aprendizaje, admin UI |
| Match de precio por nombre en frontend | FK `tratamientoId` con join en query | Phase 44 (v1.9) | Una sola query resuelve precio; elimina lógica de match en frontend |
| Seed manual o inexistente | Seed lazy + hook al crear profesional | Phase 44 (v1.9) | Todo profesional nuevo tiene catálogo automáticamente |

**Deprecated after this phase:**
- `frontend/src/lib/zonas-diagnostico.json` — ya no es fuente de verdad para instalaciones nuevas; Phase 45 eliminará las referencias en `PrimeraConsultaForm.tsx`
- `frontend/src/lib/zonas-diagnostico.ts` — deprecado en Phase 45

---

## Open Questions

1. **Dónde se crea el Profesional (para el hook de seed)**
   - What we know: `ProfesionalesService` tiene `findAll`, `findOne`, `findByUserId`, `update`, `getAgenda`, `updateAgenda` — ningún `create`.
   - What's unclear: La creación de un Profesional puede estar en `UsuariosService` cuando se crea un `Usuario` con rol `PROFESIONAL`.
   - Recommendation: El planificador debe identificar el punto de creación de Profesional en la implementación. Si está en `UsuariosService`, el hook de seed va ahí (inyectar `CatalogoHCService` en ese módulo). Si no existe (solo se crea vía seed de DB), el lazy seed al GET es suficiente por ahora.

2. **Campo `orden` en DiagnosticoHC y TratamientoHC**
   - What we know: El CONTEXT.md deja esto a discretion — "campo `orden` o createdAt; Otros al final".
   - What's unclear: Si `orden` debe ser explícito para futura reordenación (Phase 47) o si `createdAt` es suficiente.
   - Recommendation: Usar `orden: Int @default(0)` en ambos modelos para no romper futuras necesidades. Sembrar los ítems no-sistema con orden 1..N y "Otros" con orden 9999. El `@default(0)` permite que Phase 46 auto-aprenda sin especificar orden.

3. **`esSistema` en los 3 modelos o solo en algunos**
   - What we know: CONTEXT.md deja esto a discretion.
   - Recommendation: Poner `esSistema` en los 3 modelos (ZonaHC, DiagnosticoHC, TratamientoHC). La zona "Otros" también es de sistema. Phase 47 necesitará saber en los 3 niveles cuáles no se pueden editar.

---

## Validation Architecture

> `nyquist_validation_enabled` está en `false` en `.planning/config.json`. Esta sección se incluye de forma reducida.

Los tests E2E/unitarios no son requeridos por el workflow para esta fase. La verificación de correctness se hace manualmente:

- `npx prisma generate` — valida que el schema compile
- `npx prisma migrate deploy` — aplica la migración DDL
- `GET /catalogo-hc` con un profesional existente — verifica el lazy seed y el response anidado
- `GET /catalogo-hc` segunda vez — verifica idempotencia (sin duplicados)
- Verificar en DB que Facial y Locales tengan exactamente 1 DiagnosticoHC ("Otros") (ZONA-03)

---

## Sources

### Primary (HIGH confidence)
- Código fuente verificado directamente:
  - `backend/src/prisma/schema.prisma` — modelos Tratamiento (línea 891) y CirugiaCatalogo (línea 923) como blueprint
  - `backend/src/modules/tratamientos/tratamientos.service.ts` — patrón de catálogo per-profesional con `activo`
  - `backend/src/modules/tratamientos/tratamientos.controller.ts` — patrón `getProfesionalId()` helper
  - `backend/src/modules/tipos-turno/tipos-turno.service.ts` — patrón upsert idempotente per-profesional
  - `backend/src/prisma/migrations/20260608000000_migracion_tipos_turno_v18/migration.sql` — patrón migración DDL manual
  - `frontend/src/lib/zonas-diagnostico.json` — datos de seed fuente
  - `frontend/src/hooks/useCirugiasCatalogo.ts` y `useTratamientosProfesional.ts` — patrón hook TanStack Query
  - `backend/src/app.module.ts` — patrón registro de módulos

### Secondary (MEDIUM confidence)
- `.planning/phases/44-schema-cat-logo-en-bd/44-CONTEXT.md` — decisiones de diseño del usuario
- `.planning/REQUIREMENTS.md` — requisitos ZONA-01, ZONA-02, ZONA-03
- `.planning/STATE.md` — contexto acumulado y decisiones de milestones anteriores

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — todo el stack es el existente en el repo, sin dependencias nuevas
- Architecture patterns: HIGH — patrones copiados directamente de módulos existentes en el repo
- Seed data: HIGH — verificado contra el JSON fuente real
- Pitfalls: HIGH — identificados analizando el código y la estructura real del JSON

**Research date:** 2026-06-12
**Valid until:** 2026-12-12 (schema estable; patrón Prisma no cambia frecuentemente)
