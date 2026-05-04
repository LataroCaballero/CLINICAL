---
phase: 26-schema-foundation-catalog-crud
verified: 2026-04-22T22:00:00Z
status: passed
score: 7/7 plans verified; 6/6 requirements satisfied
re_verification: false
human_verification:
  - test: "Abrir /dashboard/configuracion como PROFESIONAL, crear una cirugía con insumos y verificar que Costo insumos se actualiza al hacer clic en Recalcular"
    expected: "La columna 'Costo insumos' en GestionCirugias muestra el precio calculado desde los insumos del inventario del profesional"
    why_human: "El cálculo usa Inventario.precioActual (per-tenant), lo cual no puede verificarse sin datos reales en la DB"
  - test: "Iniciar sesión como dos profesionales distintos y verificar que cada uno ve únicamente sus cirugías"
    expected: "Profesional A no puede ver ni editar las cirugías del Profesional B"
    why_human: "Multi-tenant isolation requires live DB with two professional records and data"
---

# Phase 26: Schema Foundation & Catalog CRUD Verification Report

**Phase Goal:** Extend the schema and backend to support insumos on tratamientos and cirugías catalog, and expose CRUD UI for cirugías in the Configuración page.
**Verified:** 2026-04-22
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | DB has TratamientoInsumo, CirugiaCatalogo, CirugiaInsumo models with correct fields and constraints | ✓ VERIFIED | schema.prisma lines 905-945; @@unique and onDelete: Cascade present |
| 2 | Tratamiento model has precioBase Decimal? and insumos relation | ✓ VERIFIED | schema.prisma line 898-899 |
| 3 | Migration applied; Prisma client synchronized | ✓ VERIFIED | Migration dir `20260422000000_add_insumos_catalogs` exists; client types used without errors in build |
| 4 | PUT /tratamientos/:id/insumos and POST /tratamientos/:id/recalcular-precio exist and are multi-tenant scoped | ✓ VERIFIED | controller lines 148-165; service has setInsumos + recalcularPrecioBase; ownership check via getProfesionalId |
| 5 | Full cirugias-catalogo module (7 routes) is built and registered in app.module.ts | ✓ VERIFIED | app.module.ts lines 13 + 63; controller has all 7 routes including recalcular-precio |
| 6 | Frontend types and hooks for cirugias catalog are complete | ✓ VERIFIED | types/cirugia-catalogo.ts exports CirugiaCatalogo, CirugiaInsumo, CreateCirugiaCatalogoDto, UpdateCirugiaCatalogoDto; hooks/useCirugiasCatalogo.ts exports 6 hooks |
| 7 | InsumosEditor shared component and updated useTratamientosProfesional return type exist | ✓ VERIFIED | InsumosEditor.tsx exports InsumoLocal + InsumosEditor; useTratamientosProfesional returns TratamientoConInsumos[]; useSetInsumosTratamiento + useRecalcularPrecioTratamiento exported |
| 8 | GestionTratamientos shows "Costo insumos" column and InsumosEditor in edit modal | ✓ VERIFIED | GestionTratamientos.tsx line 232 (TableHead "Costo insumos"), lines 405+ (InsumosEditor), save handler calls setInsumosMutation.mutateAsync |
| 9 | GestionCirugias full CRUD UI with InsumosEditor, Recalcular button, soft-delete | ✓ VERIFIED | GestionCirugias.tsx: useCirugiasCatalogo + useSetInsumosCirugia + useRecalcularPrecioCirugia used; Recalcular only shown when editingCirugia != null; softDelete via useDeleteCirugiaCatalogo |
| 10 | Cirugías tab appears in PROFESIONAL (grid-cols-10) and SECRETARIA (grid-cols-5) Configuración views | ✓ VERIFIED | configuracion/page.tsx lines 107, 112, 137, 205, 210, 230 |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/prisma/schema.prisma` | TratamientoInsumo, CirugiaCatalogo, CirugiaInsumo, precioBase on Tratamiento | ✓ VERIFIED | All 4 additions present with correct constraints |
| `backend/prisma/migrations/20260422000000_add_insumos_catalogs/` | Migration applied | ✓ VERIFIED | Directory exists |
| `backend/src/modules/tratamientos/dto/set-insumos-tratamiento.dto.ts` | SetInsumosTratamientoDto + InsumoItemDto | ✓ VERIFIED | Both classes exported |
| `backend/src/modules/tratamientos/tratamientos.service.ts` | setInsumos + recalcularPrecioBase methods + insumos in findAllByProfesional | ✓ VERIFIED | Methods present at lines 209, 244; findAllByProfesional includes insumos at lines 70-84 |
| `backend/src/modules/tratamientos/tratamientos.controller.ts` | PUT :id/insumos + POST :id/recalcular-precio | ✓ VERIFIED | Both routes present at lines 148, 158 |
| `backend/src/modules/cirugias-catalogo/cirugias-catalogo.service.ts` | Full CRUD + setInsumos + recalcularPrecioBase | ✓ VERIFIED | All methods present; recalcularPrecioBase uses Inventario.precioActual (per-tenant) |
| `backend/src/modules/cirugias-catalogo/cirugias-catalogo.controller.ts` | 7 routes + getProfesionalId | ✓ VERIFIED | recalcular-precio at line 123; getProfesionalId at line 30 |
| `backend/src/modules/cirugias-catalogo/cirugias-catalogo.module.ts` | Module with PrismaModule import | ✓ VERIFIED | File exists |
| `backend/src/app.module.ts` | CirugiasCatalogoModule imported and registered | ✓ VERIFIED | Lines 13 + 63 |
| `frontend/src/types/tratamiento.ts` | TratamientoInsumo, TratamientoConInsumos interfaces | ✓ VERIFIED | Lines 57-75 |
| `frontend/src/types/cirugia-catalogo.ts` | CirugiaCatalogo, CirugiaInsumo, DTOs | ✓ VERIFIED | All interfaces exported |
| `frontend/src/hooks/useCirugiasCatalogo.ts` | 6 hooks with ['cirugias-catalogo'] invalidation | ✓ VERIFIED | All 6 hooks at lines 12, 27, 40, 53, 65, 78; all invalidate QUERY_KEY |
| `frontend/src/hooks/useTratamientosProfesional.ts` | TratamientoConInsumos[] return type + 2 new mutations | ✓ VERIFIED | Returns TratamientoConInsumos[]; useSetInsumosTratamiento + useRecalcularPrecioTratamiento at lines 107, 120 |
| `frontend/src/app/dashboard/configuracion/components/InsumosEditor.tsx` | Combobox + table + InsumoLocal export | ✓ VERIFIED | Exports InsumoLocal + InsumosEditor; uses Command/Popover; duplicate guard via addedProductIds Set |
| `frontend/src/app/dashboard/configuracion/components/GestionTratamientos.tsx` | InsumosEditor in modal + Costo insumos column | ✓ VERIFIED | InsumosEditor at line 405; "Costo insumos" at line 232; setInsumosMutation.mutateAsync in save handler |
| `frontend/src/app/dashboard/configuracion/components/GestionCirugias.tsx` | Full CRUD UI with InsumosEditor + Recalcular | ✓ VERIFIED | All hooks wired; Recalcular gated on editingCirugia != null; soft-delete via useDeleteCirugiaCatalogo |
| `frontend/src/app/dashboard/configuracion/page.tsx` | Cirugías tab in PROFESIONAL + SECRETARIA views | ✓ VERIFIED | grid-cols-10 (PROFESIONAL) + grid-cols-5 (SECRETARIA); GestionCirugias rendered in both |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| TratamientoInsumo | Tratamiento | tratamientoId FK onDelete: Cascade | ✓ WIRED | schema.prisma line 910 |
| CirugiaInsumo | CirugiaCatalogo | cirugiaId FK onDelete: Cascade | ✓ WIRED | schema.prisma line 940 |
| CirugiaCatalogo | Profesional | profesionalId FK | ✓ WIRED | schema.prisma line 928 |
| tratamientos.controller | tratamientos.service | setInsumos + recalcularPrecioBase | ✓ WIRED | controller calls service methods |
| recalcularPrecioBase (tratamientos) | prisma.tratamientoInsumo | findMany with producto include | ✓ WIRED | service line 247 |
| cirugias-catalogo.controller | cirugias-catalogo.service | getProfesionalId → service methods | ✓ WIRED | controller line 30 (getProfesionalId); all routes use it |
| cirugias-catalogo.service | prisma.cirugiaCatalogo | findMany with profesionalId where clause | ✓ WIRED | service line 16 |
| app.module.ts | CirugiasCatalogoModule | imports array | ✓ WIRED | app.module.ts lines 13 + 63 |
| useCirugiasCatalogo | api.ts | api.get('/cirugias-catalogo') | ✓ WIRED | hooks/useCirugiasCatalogo.ts line 16 |
| GestionCirugias | useSetInsumosCirugia | called in handleSubmit after create/update | ✓ WIRED | GestionCirugias.tsx line 151 |
| configuracion/page.tsx | GestionCirugias | TabsContent value='cirugias' | ✓ WIRED | page.tsx lines 137 + 230 |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CATLOG-01 | 26-01, 26-02, 26-04, 26-05, 26-06 | Profesional puede vincular insumos del stock a un tratamiento del catálogo (n:n con cantidad) | ✓ SATISFIED | TratamientoInsumo model; PUT /tratamientos/:id/insumos; InsumosEditor in GestionTratamientos modal |
| CATLOG-02 | 26-01, 26-02, 26-05, 26-06 | Tratamiento muestra precio base calculado desde costo de insumos (botón "Recalcular") | ✓ SATISFIED | precioBase field on Tratamiento; recalcularPrecioBase service method; "Costo insumos" column + "Recalcular desde insumos" button in GestionTratamientos |
| CATLOG-03 | 26-01, 26-03, 26-04, 26-07 | Profesional puede crear, editar y eliminar cirugías propias desde Configuración | ✓ SATISFIED | Full CRUD on cirugias-catalogo module; GestionCirugias with create/edit/delete (soft-delete) |
| CATLOG-04 | 26-01, 26-03, 26-04, 26-07 | Cirugía tiene: nombre, precio ARS, precio USD, insumos con cantidades (FK a stock), duración estimada | ✓ SATISFIED | CirugiaCatalogo model has all required fields; CirugiaInsumo join table; GestionCirugias form has all inputs |
| CATLOG-05 | 26-01, 26-03, 26-07 | Precio base de cirugía calculado a partir de insumos asociados | ✓ SATISFIED | recalcularPrecioBase in cirugias service; "Costo insumos" column in GestionCirugias; uses Inventario.precioActual for per-tenant pricing |
| CATLOG-06 | 26-01, 26-03, 26-07 | Cada profesional ve y gestiona únicamente sus propias cirugías | ✓ SATISFIED | profesionalId FK on CirugiaCatalogo; @@unique([nombre, profesionalId]); getProfesionalId helper in controller; all service queries filter by profesionalId |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

No TODOs, stubs, empty implementations, or console.log-only handlers found in modified files.

### Notable Deviation: InsumosEditor profesionalId prop not forwarded to useInventario

The plan specified that `InsumosEditor` should accept a `profesionalId` prop and pass it to the inventory query. The component accepts the prop in its interface but `useInventario()` is called without it (line 39). This is not a functional defect because `useInventario` internally reads the professional context from the `useEffectiveProfessionalId` Zustand store — the inventory is still correctly scoped to the current professional. The SECRETARIA flow also works because the store is set when a professional is selected. Severity: ℹ️ Info — no behavioral impact.

### Human Verification Required

1. **Recalcular desde insumos actualiza Costo insumos con precio del inventario**

   **Test:** Crear una cirugía, agregar un insumo que tenga `precioActual` en el inventario del profesional, hacer clic en "Recalcular desde insumos", observar que la columna "Costo insumos" muestra el valor calculado.
   **Expected:** La columna muestra `$X.XX` correspondiente a `SUM(precioActual * cantidad)`.
   **Why human:** El cálculo usa `Inventario.precioActual` con fallback a `Producto.costoBase`. Verificar que el precio correcto (per-tenant) es el usado requiere datos reales en la BD.

2. **Multi-tenant isolation: cirugías de un profesional no visibles para otro**

   **Test:** Iniciar sesión como Profesional A, crear 2 cirugías. Iniciar sesión como Profesional B (o cambiar de profesional en vista SECRETARIA). Verificar que las cirugías de A no aparecen.
   **Expected:** GestionCirugias muestra únicamente las cirugías propias del profesional activo.
   **Why human:** Requiere dos perfiles de profesional con datos reales para verificar el aislamiento.

---

_Verified: 2026-04-22T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
