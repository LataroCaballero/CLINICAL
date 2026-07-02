# Phase 44: Schema + Catálogo en BD - Context

**Gathered:** 2026-06-12
**Status:** Ready for planning

<domain>
## Phase Boundary

El catálogo de zonas, diagnósticos y tratamientos de HC pasa del JSON hardcodeado (`frontend/src/lib/zonas-diagnostico.json`) a PostgreSQL por profesional: modelos Prisma `ZonaHC` / `DiagnosticoHC` / `TratamientoHC`, migración SQL manual (DDL), seed idempotente desde el JSON actual, y endpoint GET que devuelve el catálogo completo anidado del profesional. El formulario (Phase 45), el auto-aprendizaje (Phase 46) y el admin UI (Phase 47) consumen lo que esta fase crea.

</domain>

<decisions>
## Implementation Decisions

### Normalización de nombres en el seed
- Diagnósticos: capitalizar primera letra ("Piel", "Dorso alto", "Hipomastia") — consistente con tratamientos ya capitalizados
- Tratamientos: corregir tildes/ortografía ("Dermolipectomía", "Reducción de volumen", "Ácido hialurónico")
- 6 zonas confirmadas: Abdomen, Mamas, Nariz, Facial, Locales, Otros (lunar_cirugia_local→Locales, tratamiento_facial→Facial)
- Duplicados entre zonas tal cual: "Hernia" se siembra en Abdomen y en Mamas como filas independientes (cada zona tiene sus propios ítems)

### Representación de "Otros"
- "Otros" es **fila real con flag de sistema** (ej. `esSistema: Boolean`): cada zona se siembra con un DiagnosticoHC "Otros" y un TratamientoHC "Otros" flaggeados; la zona "Otros" también lleva el flag
- Los ítems de sistema NO se pueden renombrar ni eliminar (Phase 47 los muestra sin acciones de edición)
- La zona "Otros" tiene doble rol: zona utilizable (con su diagnóstico/tratamiento "Otros" propios, como hoy) Y punto de entrada para crear zonas nuevas en Phase 46 (APR-01)
- **Invariante del catálogo:** toda zona (sembrada o aprendida) nace con su diagnóstico "Otros" + tratamiento "Otros". El servicio de Phase 44 debe exponer un helper de creación de zona que garantice esto, para que Phase 46 lo reutilice

### Vínculo con catálogo de precios
- `TratamientoHC.tratamientoId` → FK **opcional** (nullable) al modelo `Tratamiento` (catálogo de precios de Configuración)
- El seed vincula por nombre con **match insensible a tildes y mayúsculas** (normalizar ambos lados: lowercase + sin diacríticos). Los nombres del catálogo de precios existente NO se modifican
- Si no hay match, la FK queda **null** — el ítem existe en el formulario sin precio; no se crean Tratamiento huérfanos a precio 0 desde el seed (eso es exclusivo del auto-aprendizaje APR-04 en Phase 46)
- El endpoint GET devuelve el precio resuelto por join: cada TratamientoHC trae `{ tratamientoId, precio }` — una sola query para el formulario

### Mecanismo de seed y orden
- Seed **lazy en primer GET** (si el catálogo del profesional está vacío, sembrar) **+ hook al crear profesional**. Idempotente por diseño
- La migración SQL solo crea tablas (DDL); la lógica de seed vive en el servicio TypeScript (única fuente de verdad, incluye el match de precios). Los profesionales existentes en producción se pueblan vía el lazy seed al primer GET — sin backfill SQL
- Campo `orden` en ZonaHC: orden fijo del seed — Abdomen, Mamas, Nariz, Facial, Locales, y "Otros" siempre último
- Zonas aprendidas (Phase 46) se ubican al final en orden de creación, antes de "Otros" (que permanece último)

### Claude's Discretion
- Nombre exacto del flag de sistema (`esSistema` u otro) y si va en los 3 modelos o solo donde haga falta
- Shape exacto del endpoint GET (ruta, DTO, nesting) siguiendo convenciones del repo
- Estrategia de orden para diagnósticos/tratamientos dentro de cada zona (campo `orden` o createdAt; "Otros" al final)
- Soft delete (`activo: Boolean`, patrón Phase 26) vs hard delete a nivel schema — Phase 47 define la semántica de borrado, pero el schema puede anticiparlo
- Detalles de la implementación de normalización de diacríticos para el match

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/lib/zonas-diagnostico.json` + `zonas-diagnostico.ts` — fuente de datos para el seed (zonas_diagnosticos con casing inconsistente; tratamientos por categoría). Tras esta fase deja de ser fuente de verdad
- `frontend/src/components/live-turno/tabs/hc/PrimeraConsultaForm.tsx` — consumidor actual; hoy hace match de precio por nombre contra `useTratamientosProfesional()`. No se modifica en esta fase (Phase 45)
- Modelo `Tratamiento` (schema.prisma:891) — catálogo de precios destino de la FK `tratamientoId`
- `backend/src/modules/tratamientos/` — patrón de módulo de catálogo per-profesional con `getProfesionalId()` helper

### Established Patterns
- Multi-tenant por `profesionalId` con FK a Profesional + índices `@@index([profesionalId])` — replicar en los 3 modelos nuevos
- Migración SQL manual en `backend/src/prisma/migrations/` (patrón Phase 40: carpeta timestamped + migration.sql) — esta vez solo DDL, sin data migration
- Upsert idempotente per-profesional (patrón `tipos-turno.service.ts:43`)
- Soft delete con `activo: Boolean` en catálogos (Tratamiento, CirugiaCatalogo)
- TanStack Query hooks en `frontend/src/hooks/` para el GET (consumido en Phase 45)

### Integration Points
- `backend/src/prisma/schema.prisma` — agregar ZonaHC, DiagnosticoHC, TratamientoHC con relaciones a Profesional y FK opcional TratamientoHC→Tratamiento
- Nuevo módulo backend (ej. `catalogo-hc/`) o extensión de `historia-clinica/` — endpoint GET catálogo anidado + servicio de seed con helper `crearZona` reutilizable por Phase 46
- `backend/src/modules/profesionales/profesionales.service.ts` — hook de seed al crear profesional

</code_context>

<specifics>
## Specific Ideas

- El seed corrige el contenido al migrar: "abdomen"→"Abdomen" (zona), "piel"→"Piel", "Dermolipectomia"→"Dermolipectomía", "Acido hialuronico labios"→"Ácido hialurónico labios", etc.
- Mapeo categoría→zona del seed (de STATE.md): abdominoplastia→Abdomen, mastoplastia→Mamas, rinoplastia→Nariz, tratamiento_facial→Facial, lunar_cirugia_local→Locales; categoría "otros"→zona Otros
- Facial y Locales arrancan con diagnósticos = [Otros] únicamente (ZONA-03); sus tratamientos vienen de tratamiento_facial y lunar_cirugia_local
- Los ítems "otros"/"Otros" que ya existen en las listas del JSON se siembran como los ítems de sistema (no duplicar: el "otros" del JSON ES el ítem de sistema)

</specifics>

<deferred>
## Deferred Ideas

- Reordenamiento manual de zonas por el profesional (drag o campo editable) — fuera de scope de v1.9; el orden es fijo del seed + orden de creación

</deferred>

---

*Phase: 44-schema-cat-logo-en-bd*
*Context gathered: 2026-06-12*
