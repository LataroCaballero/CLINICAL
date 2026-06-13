# Phase 46: Auto-aprendizaje vía "Otros" - Context

**Gathered:** 2026-06-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Lo que el profesional escribe en los campos "Otros" del formulario Primera Consulta — zona (APR-01), diagnóstico (APR-02), tratamiento (APR-03) — se persiste en el catálogo per-profesional (ZonaHC/DiagnosticoHC/TratamientoHC) y aparece en el formulario de la próxima consulta. Un tratamiento aprendido por primera vez se crea además en el catálogo de tratamientos del profesional con precio 0 (APR-04). El admin UI del catálogo es Phase 47; el schema y seed son Phase 44 (completa).

</domain>

<decisions>
## Implementation Decisions

### UX de captura (diagnósticos y tratamientos "Otros")
- Click en el chip "Otros" de diagnósticos/tratamientos despliega un Input debajo — mismo patrón que ya existe para la zona "Otros" en `PrimeraConsultaForm.tsx`
- **Enter convierte el texto en chip seleccionado** y deja el input libre para escribir otro — se permiten múltiples ítems nuevos por zona en la misma consulta
- Zona nueva (APR-01): al presionar Enter, el texto se convierte en **zona completa al instante** — chip de zona seleccionada con sus grupos Diagnósticos/Tratamientos (solo "Otros" como opción inicial) usables en esa misma consulta. Estado client-side hasta guardar
- Tratamiento nuevo entra al presupuesto de esa misma consulta con **precio 0, editable en el flujo de presupuesto**; el precio definitivo se completa en Configuración

### Momento del aprendizaje
- El catálogo aprende **en el backend al guardar la HC** (`crearEntrada()` en historia-clinica.service.ts) — los chips nuevos viven solo en el estado del formulario hasta el guardado; formularios abandonados no ensucian el catálogo
- **Best-effort:** si el aprendizaje falla, la HC se guarda igual (el texto queda intacto en el JSONB; warning logueado) — mismo patrón que el seed de Phase 44. Nunca bloquear el guardado de una consulta por el catálogo
- **Solo se aprende lo seleccionado al guardar** — un chip nuevo deseleccionado antes de guardar se descarta (evita aprender typos corregidos)
- Aplica a **todos los flujos que envían el shape nuevo `zonas[]`** (LiveTurno y PatientDrawer, incluidas entradas retroactivas). El shape legacy (LiveTurnoFooter draft) NO aprende

### Duplicados y normalización
- **Match insensible a mayúsculas y tildes** contra el catálogo existente (reusar `normalizarNombre` de Phase 44): si lo escrito ya existe en esa zona (o como zona), se reutiliza el ítem existente — no se crean duplicados
- Nombre guardado: **trim + primera letra mayúscula** ("flacidez abdominal " → "Flacidez abdominal"); el resto del texto se respeta tal cual — consistente con la convención del seed de Phase 44
- APR-04: si ya existe un `Tratamiento` en el catálogo de precios con match insensible, el TratamientoHC aprendido se **vincula vía FK `tratamientoId` y hereda su precio real** — no se crea duplicado a precio 0. Solo se crea Tratamiento nuevo (precio 0) cuando no hay match
- Si el match encuentra un ítem **soft-deleted** (inactivo), se **reactiva** (conserva id y vínculo a precio) en vez de crear uno nuevo

### Feedback al profesional
- **Aprendizaje silencioso** — sin toast extra al guardar, sin recordatorio de precios pendientes; el profesional descubre los ítems en la próxima consulta y los precios 0 en Configuración → Tratamientos
- **Invalidar la query de `useCatalogoHC` al guardar la HC** (patrón onSettled por key prefix del repo) — el próximo formulario que se abra en la misma sesión ya trae el catálogo actualizado
- Chips recién creados por Enter llevan **distinción visual sutil** (ej. borde punteado o ícono) antes de guardar — el profesional ve qué va a sumarse a su catálogo y puede deseleccionarlo

### Claude's Discretion
- Detalle exacto del estilo del chip "nuevo" (borde punteado vs ícono)
- Shape del payload para transportar los ítems nuevos al backend (flags en `ZonaSeleccionDto` vs detección server-side por ausencia de id de catálogo)
- Implementación interna del aprendizaje en backend (orden de operaciones, dónde vive la lógica — catalogo-hc.service vs historia-clinica.service)
- Atribución del profesional cuando guarda una secretaria (usar el profesionalId efectivo de la entrada, como ya hace el resto del flujo)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `catalogo-hc.service.ts:39 crearZona()` — transaccional, crea ZonaHC + DiagnosticoHC "Otros" + TratamientoHC "Otros" de sistema; diseñado en Phase 44 para que APR-01 lo reutilice
- `normalizarNombre` (catalogo-hc, Phase 44) — NFD + strip de combining marks, para el match insensible a tildes/mayúsculas
- `PrimeraConsultaForm.tsx` — patrón existente de input para zona "Otros" (`otroTexto` + `handleOtroTextoChange`); base del nuevo patrón Enter→chip
- `useCatalogoHC` hook — query a invalidar al guardar
- `historia-clinica.service.ts crearEntrada()` — punto de enganche backend; ya resuelve profesionalId y construye contenido JSONB vía `construirContenidoPrimeraVez`

### Established Patterns
- `ZonaSeleccionDto` (frontend hook + backend `crear-entrada.dto.ts`): `{ zonaId, zona, diagnosticos: string[], otroTexto?, tratamientos: TratamientoItemDto[] }` — diagnósticos viajan como strings, tratamientos como `{ nombre, tratamientoId?, precio }`; necesitará extensión para distinguir ítems nuevos (o detección server-side)
- Best-effort fuera de transacción con warn-log (seed Phase 44 en usuarios.service)
- Invalidación onSettled por key prefix (patrón v1.7+)
- Multi-tenant por profesionalId con catálogos per-profesional

### Integration Points
- `backend/src/modules/historia-clinica/historia-clinica.service.ts` — crearEntrada llama al aprendizaje (inyectar CatalogoHcService o servicio dedicado)
- `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` — nuevos métodos de aprendizaje (aprenderZona/aprenderDiagnostico/aprenderTratamiento) junto a crearZona
- `backend/src/modules/tratamientos/` — creación del Tratamiento precio 0 para APR-04 (o vínculo a existente)
- `frontend/src/components/live-turno/tabs/hc/PrimeraConsultaForm.tsx` — inputs Enter→chip para dx/tx "Otros" y zona nueva instantánea
- `frontend/src/hooks/useCreateHistoriaClinicaEntry.ts` — invalidación de useCatalogoHC en onSettled

</code_context>

<specifics>
## Specific Ideas

- El input de "Otros" en dx/tx replica visualmente el de zona "Otros" actual (Input debajo del grupo de chips, placeholder tipo "Describir diagnóstico...")
- Zona nueva instantánea: el grupo desplegado muestra solo "Otros" en diagnósticos y tratamientos (invariante de Phase 44), permitiendo cargar dx/tx nuevos de esa zona en la misma consulta
- "Solo se aprende lo seleccionado" + "distinción visual sutil" trabajan juntos: el profesional puede descartar un typo deseleccionando el chip antes de guardar

</specifics>

<deferred>
## Deferred Ideas

- Badge "N sin precio" en Configuración → Tratamientos para tratamientos aprendidos a precio 0 — posible mejora de Phase 47 o backlog

</deferred>

---

*Phase: 46-auto-aprendizaje-via-otros*
*Context gathered: 2026-06-12*
