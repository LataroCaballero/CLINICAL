# Phase 48: Backend — Lectura y Snapshot de Tratamientos - Context

**Gathered:** 2026-06-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Backend únicamente. La columna "Último tratamiento" de la planilla de Tratamientos (`/dashboard/pacientes`) debe:

1. Resolverse **por turno** — desde la entrada de HC correspondiente a ese turno — en lugar del último tratamiento global del paciente (TRAT-01).
2. Resolver los **tres shapes** de contenido de HC: v1.9 agrupado por zona (`contenido.zonas[].tratamientos`), legacy plano (`contenido.tratamientos`) y texto libre / tratamiento en consultorio (TRAT-02).
3. Persistir el **snapshot de tratamientos siempre**, aun cuando `consumirInsumos=false` (fix LIVHC-05/PAC-01), de modo que las entradas nuevas siempre pueblen la columna (TRAT-03).

Fuera de esta fase: cambios de frontend (filtro CIRUGIA y color-coding de estado → Phase 49), backfill de entradas legacy, e inferencia de tratamiento "planificado" para turnos futuros sin HC.

</domain>

<decisions>
## Implementation Decisions

### Formato de la columna (texto visible)
La salida del backend es un string por turno. Decisiones de formato:

- **Multi-tratamiento (varias zonas / varios tratamientos)** → **resumen con conteo**: primer tratamiento + cantidad restante, ej. `"Lipoaspiración +2"`. No lista plana completa ni agrupación por zona.
- **Tratamiento en consultorio** (snapshot de catálogo + texto libre complementario) → **catálogo con fallback a texto**: si hay tratamientos del catálogo, mostrar esos nombres (aplicando el formato resumen-con-conteo si son varios); si no hay ninguno, mostrar el texto libre.
- **Texto libre puro** (sin catálogo, solo `contenido.texto`) → **recortar en backend** a un máximo de caracteres con sufijo `…`. Consecuencia aceptada: el tooltip (`title`) del frontend solo tendrá el texto recortado, no el completo.
- **Celda sin tratamiento** (turno sin tratamientos en su HC, o sin HC vinculada) → backend devuelve **`null`** (contrato actual sin cambios); el frontend ya tiene rama para celda vacía. No se introduce guion ni etiqueta en el backend.

### Resolución por turno (TRAT-01)
- Resolver el tratamiento desde la entrada de HC **propia del turno**, no recorriendo las últimas N entradas del paciente para tomar la más reciente con tratamientos.
- El turno ya expone la relación `entradaHC` (usada hoy para `tipoEntradaHC` en `obtenerTurnosPorRango`); es el hook natural para leer el `contenido` de la entrada de ese turno.
- Turnos sin HC vinculada → `null` (consistente con "turnos futuros sin HC quedan vacíos", Out of Scope).

### Resolución de shapes (TRAT-02)
- Un único extractor puro debe normalizar los tres shapes a la lista de nombres de tratamiento (y, si aplica, al texto libre de fallback):
  1. v1.9 agrupado: `contenido.zonas[].tratamientos[].nombre` (aplanar a través de zonas).
  2. Legacy plano: `contenido.tratamientos[].nombre`.
  3. Texto libre / consultorio: `contenido.texto` (con la regla catálogo→fallback para `tratamiento_en_consultorio`).
- Distinción de shape v1.9 vs legacy via `Array.isArray(contenido.zonas)` (patrón ya establecido en `historia-clinica.contenido.helpers.ts`).

### Snapshot siempre (TRAT-03 / fix LIVHC-05)
- En `crearEntrada`, el cálculo de `tratamientosSnapshot` desde `dto.tratamientoIds` y su escritura en `contenido.tratamientos` (para `tratamiento_en_consultorio`) deben ejecutarse **independientemente** de `consumirInsumos`.
- Solo la creación de la `OrdenConsumo` (insumos) permanece condicionada a `consumirInsumos=true`. Es decir: separar "poblar el snapshot del contenido" (siempre) de "crear orden de consumo de insumos" (condicional).

### Claude's Discretion
- Límite exacto de caracteres para el recorte de texto libre (sugerido ~80) y el carácter de elipsis.
- Si el extractor de shapes vive como helper puro nuevo (estilo `*.helpers.ts`, testeable sin NestJS) o se amplía `historia-clinica.contenido.helpers.ts`.
- Manejo de bordes: entrada con zonas vacías, tratamientos sin `nombre`, múltiples entradas de HC ligadas al mismo turno.
- Wording exacto del resumen-con-conteo (separador, idioma del "+N").

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `historia-clinica.contenido.helpers.ts`: ya distingue shape v1.9 (`zonas[]`) de legacy via `Array.isArray`; `construirContenidoPrimeraVez` / `derivarPerfilPrimeraVez` muestran el patrón de helper puro testeable a reutilizar para el extractor de lectura.
- Relación `turno.entradaHC` ya seleccionada en `obtenerTurnosPorRango` (turnos.service.ts:543) para `tipoEntrada`; ampliar el `select` a `contenido` habilita la resolución por-turno sin query extra.

### Established Patterns
- Pre-fetch fuera de `$transaction` (patrón pgBouncer): los lookups de tratamientos/insumos ya se hacen antes de la tx en `crearEntrada` — el snapshot incondicional encaja en ese pre-fetch.
- Helpers puros `*.flujo.helpers.ts` / `*.contenido.helpers.ts` con suites RED/GREEN: el extractor de shapes debería seguir ese patrón para tests unitarios sin NestJS/Prisma.
- Map por entidad en el read-path para evitar N+1 (hoy `ultimoTratamientoMap` por paciente) — la versión por-turno usará el `contenido` ya traído en el `select` del turno.

### Integration Points
- **Read-path:** `turnos.service.ts` `obtenerTurnosPorRango` (~493–597) — reemplazar el bloque `ultimoTratamientoMap` por-paciente (567–587) por resolución por-turno; el campo de salida `ultimoTratamiento` (string|null) no cambia de contrato.
- **Write-path:** `historia-clinica.service.ts` `crearEntrada` — mover el cálculo/escritura de `tratamientosSnapshot` (165–201) fuera del guard `if (dto.consumirInsumos…)`; mantener `OrdenConsumo` (284–299) condicional.
- **Frontend (sin cambios en esta fase):** `TratamientosTab.tsx` consume `ultimoTratamiento` (mapeado a `n`) truncado con tooltip `title`; `useTurnosRangos.ts` tipa `ultimoTratamiento?: string | null`.

</code_context>

<specifics>
## Specific Ideas

- La columna prioriza compacidad sobre completitud: "Lipoaspiración +2" preferido a una lista larga, porque la celda se trunca igual.
- Lo estructurado (catálogo) gana sobre lo escrito (texto libre) cuando ambos existen en un tratamiento en consultorio.

</specifics>

<deferred>
## Deferred Ideas

None — la discusión se mantuvo dentro del scope de Phase 48.

</deferred>

---

*Phase: 48-backend-lectura-y-snapshot-de-tratamientos*
*Context gathered: 2026-06-21*
