# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

---

## Milestone: v1.11 — HC Completa en Ficha de Paciente

**Shipped:** 2026-06-24
**Phases:** 1 (50) | **Plans:** 1 | **Timeline:** 1 day (2026-06-24)
**Stats:** 2 archivos de código | +664 / -273 líneas | 6 commits | 3/3 requisitos (HCSHEET-01..03)

### What Was Built
- Componente de render HC compartido `HCEntryContent.tsx` con dos variantes: `HCEntryChips` (tarjeta — chips de color zona/diagnósticos/tratamientos, sin precios) y `HCEntryFullContent` (detalle — chips + bloque de observaciones `otroTexto` + precios ARS por tratamiento + total + comentario), manejando los 2 shapes de `contenido` JSONB (v1.9 `zonas[]` y legacy plano) más el texto libre
- `FreeEntryPreview` (tarjetas de la lista HC en PatientSheet) cableado a `HCEntryChips`, reemplazando el resumen truncado en texto plano por badges de color
- `FreeEntryFullContent` (detalle expandido) cableado a `HCEntryFullContent`, logrando paridad visual con `HistorialClinicoPanel` (LiveTurno) y `TurnoHCModal` (agenda); mantenido como wrapper de delegación fino para conservar la firma de `ExpandedEntryContent`
- Verificación visual humana aprobada (shape v1.9, legacy, texto libre y plantilla); tsc + ESLint limpios

### What Worked
- **Reuso de lógica probada como referencia**: la lógica de chips ya existía y estaba probada en `HistorialClinicoPanel` y `TurnoHCModal`; extraerla a un componente compartido nuevo (en vez de inline) hizo el port mecánico y de bajo riesgo, con paridad visual garantizada al espejar el original
- **Scope minúsculo y honesto (1 fase / 1 plan, solo frontend)**: el milestone reconoció que los datos completos ya llegaban vía `useHistoriaClinica` — el gap era puramente de renderizado; nada de backend ni data fetching, ejecución en horas
- **Diferir la consolidación conscientemente**: no migrar `HistorialClinicoPanel`/`TurnoHCModal` al componente nuevo evitó scope creep; el componente queda disponible para esa consolidación futura sin forzarla ahora
- **Wrapper de delegación fino**: mantener `FreeEntryFullContent` como wrapper en vez de eliminarlo preservó la firma esperada por `ExpandedEntryContent` — cambio quirúrgico sin tocar el contrato

### What Was Inefficient
- **Las tres deudas de tooling de cierre siguen crónicas (6to milestone)**: `gsd-tools milestone complete` volvió a devolver `accomplishments: []`, omitió la línea de Stats, y dejó la fila de Phase 50 en la Progress table malformada (sin columna Milestone, separadores corridos). Idéntico a v1.8/v1.9/v1.10 — la retro de v1.10 ya recomendó un fix real en `gsd-tools`; sigue sin hacerse y cuesta trabajo manual cada cierre
- **Sin audit formal este milestone**: a diferencia de v1.9/v1.10 no se corrió `/gsd:audit-milestone` (decisión consciente del usuario por ser solo-frontend y ya verificado vía VERIFICATION.md + visual check). Aceptable para un milestone tan chico, pero rompe la racha de "audit previo paga"
- **Triplicación de chips aún viva**: ahora hay 3 lugares que renderizan chips de HC (`HistorialClinicoPanel`, `TurnoHCModal`, `HCEntryContent`); el componente compartido existe pero la consolidación se difirió un milestone más — misma forma de tech debt consciente que el chip de EstadoTurno en v1.10

### Patterns Established
- **Componente de render compartido con variantes tarjeta/detalle**: extraer la lógica de render de contenido multi-shape a un componente dedicado con una variante compacta (chips) y una rica (chips + precios + observaciones) es el patrón para mostrar `contenido` HC en cualquier vista
- **Convención de chips HC**: zona → `Badge secondary capitalize font-semibold`; diagnósticos → `Badge outline`; tratamientos → `Badge bg-blue-50 text-blue-700 border-blue-200` — convención visual reutilizable
- **Delegación fina para preservar contratos**: cuando una función local tiene una firma que otros componentes esperan, convertirla en wrapper que delega al componente compartido evita romper el contrato

### Key Lessons
- **El fix de `gsd-tools` ya no es opcional**: 6 milestones consecutivos con las mismas 3 deudas de cierre (accomplishments vacíos, archivo scoped sobrescrito, progress table rota). Cada cierre paga el mismo costo manual. Priorizar poblar `one_liner` en los SUMMARY y arreglar el CLI antes del próximo milestone grande
- **Un milestone de "paridad visual" se beneficia de tener el original como oráculo**: cuando el objetivo es replicar UI ya existente, espejar el componente de referencia (no reinventar) hace la verificación trivial — el checkpoint visual humano confirmó la paridad en una pasada

### Cost Observations
- Milestone mínimo (1 fase, 1 plan, 2 archivos) ejecutado en horas — port de render puro sin backend
- 3 tareas auto + 1 checkpoint de verificación visual humana (aprobado); sin tests automatizados nuevos (cambio puramente de presentación)

---

## Milestone: v1.10 — Refinamiento Planilla de Tratamientos

**Shipped:** 2026-06-22
**Phases:** 2 (48–49) | **Plans:** 3 | **Timeline:** 1 day (2026-06-22)
**Stats:** 22 archivos | +1,431 / -233 líneas | 11 commits | 6/6 requisitos (TRAT-01..06)

### What Was Built
- Read-path por-turno de "Último tratamiento": extractor puro `resumirTratamientosDeContenido` que normaliza los 3 shapes de HC (v1.9 zona-agrupado, legacy plano, texto libre/consultorio) a `string|null` con resumen-con-conteo; integrado en `obtenerTurnosPorRango` con `contenido: true` en el select, eliminando el query N+1 `historiaClinica.findMany`; 14 tests nuevos (25/25 pass)
- Write-path snapshot incondicional (fix LIVHC-05): `crearEntrada` persiste `contenido.tratamientos` siempre que haya `tratamientoIds`, independiente de `consumirInsumos`; insumos + `OrdenConsumo` bajo `if (consumirInsumos)`, sin regresión de stock
- Filtro automático source-B: predicado client-side `isFuenteB(t) && t.ultimoTratamiento != null` oculta CIRUGIA sin tratamiento real, sin mutar backend ni romper el estado dual v1.8
- Color-coding semántico: helper puro `getEstadoTurnoChip` en `@/lib/estadoTurno` mapea los 7 EstadoTurno reales a `{label, className}`, reemplazando keys legacy PROGRAMADO/REALIZADO; header breakdown remapeado sobre filas visibles

### What Worked
- **Extractor puro + TDD (reuso de v1.8/v1.9)**: `resumirTratamientosDeContenido` se construyó como helper sin deps con 14 specs cubriendo los 3 shapes y edge cases antes de tocar `turnos.service.ts` — refactor de read-path con confianza (eliminó el N+1) sin romper el contrato frontend
- **Separación de responsabilidades en el write-path**: dividir "snapshot del contenido" (siempre) de "agregar insumos + OrdenConsumo" (condicional) hizo el fix LIVHC-05 quirúrgico — `insumosAgregados=[]` cuando false dejó el guard de stock intacto sin tocarlo
- **Audit formal antes de completar (reuso de v1.9)**: `/gsd:audit-milestone` cruzó 3 fuentes y verificó la integración cross-phase (WIRED, field-by-field) — entró a complete-milestone con PASSED limpio y cero sorpresas
- **Fix client-side de bajo riesgo**: el filtro source-B y el color map se resolvieron 100% en frontend sin tocar el backend, manteniendo el contrato `ultimoTratamiento: string|null` y el estado dual

### What Was Inefficient
- **MILESTONES.md accomplishments vacíos (5to milestone seguido)**: `gsd-tools milestone complete` volvió a devolver `accomplishments: []` y además omitió la línea de Stats — exactamente lo que la retro de v1.9 ya había señalado. El campo `one_liner:` sigue sin estandarizarse en los SUMMARY.md. Deuda de tooling que ya cuesta trabajo manual cada cierre
- **CLI sobrescribe el archivo milestone-scoped (recurrente)**: `milestones/v1.10-ROADMAP.md` (snapshot scoped de 53 líneas creado al definir el roadmap) fue reemplazado por una copia íntegra del ROADMAP.md raíz (243 líneas, todos los milestones) — hubo que reescribirlo a mano con el template de archivo. Idéntico a v1.8/v1.9
- **Progress table malformada en ROADMAP (recurrente, 3er milestone)**: la fila de Phase 49 quedó sin columna Milestone y con separadores corridos durante la ejecución — mismo síntoma que v1.8/v1.9, corregido al completar
- **Tech debt de UI consciente**: `AppointmentDetailModal` y `CalendarGrid` siguen con su propia lógica de chips; el helper compartido existe pero la consolidación se difirió — decisión correcta para no inflar el scope, pero deja la triplicación viva un milestone más

### Patterns Established
- **Extractor puro de contenido multi-shape**: normalizar JSONB heterogéneo (v1.9+ vs legacy vs texto) a un tipo de retorno único en un helper testeable es ahora el patrón para leer HC — replicable para futuros lectores de `contenido`
- **Snapshot-vs-efecto separados en writes**: cuando un write tiene una parte de datos (snapshot) y una parte de efecto (OrdenConsumo/insumos), guardarlas bajo guards independientes evita acoplar la persistencia del dato a un flag de efecto
- **Helper de presentación compartido en `@/lib/`**: mapear un enum a `{label, className}` como módulo puro de cero deps (como `getEstadoTurnoChip`) antes de que se triplique

### Key Lessons
- **Las tres deudas de tooling de cierre son ahora crónicas** (accomplishments vacíos, archivo scoped sobrescrito, progress table malformada): aparecieron en v1.8, v1.9 y v1.10. Vale la pena un fix real en `gsd-tools` (poblar `one_liner`, no pisar el archivo scoped, no romper la tabla) en vez de seguir parchando a mano cada milestone
- **El audit previo paga**: por segundo milestone consecutivo, entrar a complete-milestone con un audit PASSED hizo el cierre mecánico — la disciplina de v1.9 se sostuvo

### Cost Observations
- Milestone chico y enfocado (2 fases, 3 planes) ejecutado en 1 día — read-path/write-path/frontend bien separados en fases secuenciales
- Backend cubierto por specs (TDD); frontend con un único checkpoint de verificación visual humana (aprobado)

---

## Milestone: v1.9 — Plantilla Primera Consulta

**Shipped:** 2026-06-13
**Phases:** 4 (44–47) | **Plans:** 12 | **Timeline:** 1 day (2026-06-12 → 2026-06-13)

### What Was Built
- Catálogo de HC en BD por profesional: 3 modelos Prisma (ZonaHC/DiagnosticoHC/TratamientoHC) con FK + `esSistema` + soft-delete; migración DDL pura (`migrate deploy`); `CatalogoHCModule` con seed idempotente de 6 zonas (lazy + hook al crear PROFESIONAL); `GET /catalogo-hc` con anidados y precio resuelto — reemplaza `zonas-diagnostico.json` (eliminado)
- PrimeraConsultaForm rediseñado zona-céntrico: zona como eje único, despliegue de diagnósticos/tratamientos por zona, agrupación visual multi-zona; HC persiste JSONB agrupado por zona vía helper puro `construirContenidoPrimeraVez` (dual-shape, sin migrar legacy); 3 lectores renderizan ambos shapes; lookup de precio catálogo→fallback preservado (FORM-04)
- Auto-aprendizaje vía "Otros": motor puro `detectarAprendizaje` (TDD) + `aprenderDesdeZonas` best-effort post-transacción; zonas/diagnósticos/tratamientos nuevos persisten; tratamiento aprendido se crea en el catálogo del profesional con precio 0; UX Enter→chip
- Admin UI "Catálogo HC" en Configuración: `PATCH` (rename) + `DELETE` (soft-delete con cascada lógica) con guard `esSistema` y detección de conflictos; hook `useCatalogoHCMutations`; componente `GestionCatalogoHC` expandible para PROFESIONAL y SECRETARIA — HC históricas intactas

### What Worked
- **Audit formal antes de completar**: `/gsd:audit-milestone` cruzó 3 fuentes (REQUIREMENTS `[x]` + SUMMARY frontmatter + VERIFICATION) y detectó un único gap de wiring (FORM-04 SECRETARIA price fallback) que se corrigió en el acto — el audit recuperó disciplina que v1.8 había salteado
- **Pure-helper + TDD (reuso de v1.8)**: `construirContenidoPrimeraVez` y `detectarAprendizaje` se construyeron como módulos sin deps de framework con specs RED/GREEN — la lógica de agrupación y aprendizaje quedó cubierta antes de tocar el service
- **Dual-shape sin migración**: `Array.isArray(contenido.zonas)` permitió convivir el formato nuevo con las entradas legacy sin backfill — las HC históricas quedan como snapshot, consistente con el out-of-scope declarado
- **Best-effort post-transacción (patrón v1.4)**: el aprendizaje del catálogo no bloquea la creación de la entrada; resilience > exactitud, reutilizando el patrón de `crearTurno` step 5.5
- **Velocidad**: 12 planes en 1 día apoyándose en catálogos per-profesional ya maduros (cirugias-catalogo, tratamientos) como plantilla para ZonaHC

### What Was Inefficient
- **MILESTONES.md accomplishments vacíos (4to milestone seguido)**: `gsd-tools milestone complete` volvió a devolver `accomplishments: []` — el campo `one_liner` sigue sin poblarse en los SUMMARY.md. Deuda de tooling acumulada: estandarizar `one_liner:` en el template o ajustar el extractor de una vez
- **CLI sobrescribe el archivo de archivo milestone-scoped**: el `milestones/v1.9-ROADMAP.md` creado al definir el roadmap (78 líneas, scoped) fue reemplazado por el snapshot completo de ROADMAP.md (265 líneas) — consistente con v1.8 pero pierde el resumen scoped original
- **Progress table malformada en ROADMAP (recurrente)**: las filas de v1.9 quedaron sin columna Milestone durante la ejecución — mismo síntoma que v1.8, corregido al completar

### Patterns Established
- **Dual-shape JSONB con discriminador `Array.isArray`**: para evolucionar la forma de un campo JSONB sin migrar registros históricos, ramificar por presencia de la nueva clave en cada lector
- **Catálogo auto-enriquecido vía campo "Otros"**: capturar lo que el usuario escribe en el escape-hatch ("Otros") y persistirlo best-effort convierte un input libre en datos estructurados para la próxima vez
- **`esSistema` flag para proteger seed**: marcar ítems del seed como inmutables permite exponer rename/delete al usuario sin riesgo de romper los puntos de partida del sistema

### Key Lessons
1. **Correr el audit formal paga**: v1.8 se completó sin audit; v1.9 lo corrió y atrapó un gap real de wiring antes de taggear — el cruce de 3 fuentes vale el paso extra
2. **El escape-hatch ("Otros") es una fuente de datos, no solo un input libre**: diseñar la persistencia del campo libre desde el inicio convierte fricción en enriquecimiento del catálogo
3. **La deuda de tooling no atendida se repite**: el campo `one_liner` vacío lleva 4 milestones de edición manual — los problemas de proceso conocidos hay que cerrarlos, no rodearlos cada vez

### Cost Observations
- Model: balanced profile (sonnet/opus mix)
- Sessions: 12 plan executions en 1 día | 53 commits | 69 archivos (+9,331/-460)
- Notable: milestone con audit formal previo (`status: passed`, 14/14 reqs, 23/23 integración, 3/3 flows) — el gap detectado se resolvió post-audit sin re-planificar fases

---

## Milestone: v1.8 — Tipos de Turno y Flujo Clínico

**Shipped:** 2026-06-09
**Phases:** 4 (40–43) | **Plans:** 8 | **Timeline:** 2 days (2026-06-08 → 2026-06-09)

### What Was Built
- Migración data-only de TipoTurno a 4 tipos públicos (Consulta, Control, Pre-Quirúrgico, Tratamiento) con secuencia que mantiene integridad referencial; tipo interno Cirugía preservado vía filtro `esCirugia=false` en findAll; seed idempotente + color naranja Pre-Quirúrgico en CalendarGrid
- Enum `TipoEntradaHC` + campo `tipoEntrada` en HistoriaClinicaEntrada; selector obligatorio "Tipo de consulta" en HCCreatorForm con mapeo PLANTILLA_TO_TIPO_ENTRADA editable; helper puro `resolverNuevoFlujo` con suite TDD de 10 casos
- Clasificación automática de flujo/etapa CRM al cerrar sesión (HC-03/HC-04): CONSULTA_CIRUGIA→CIRUGIA+CONSULTADO, TRATAMIENTO→TRATAMIENTO, dual-state preservado para pacientes CIRUGIA
- TratamientosTab dual-source: `tipoEntradaHC` vía nested select (sin N+1), predicado fuente A OR B, columna "Consulta → Tratamiento", filtro sintético CONSULTA_TRATAMIENTO
- Archivar del embudo CRM: campo `crmArchivado` + endpoint PATCH toggle + filtros automáticos en getKanban/getListaAccion + botón con Dialog de confirmación (patrón Dialog-from-Sheet)

### What Worked
- **TDD en lógica de dominio compleja**: extraer `resolverNuevoFlujo` a un helper puro (`*.flujo.helpers.ts`) permitió 10 tests unitarios directos sin pelear con el moduleNameMapper de Jest — las transiciones HC-03/HC-04 quedaron cubiertas antes de tocar el service
- **Reuso de patrones establecidos**: Dialog-from-Sheet y onSettled-invalidation (heredados de v1.7) se aplicaron en Phase 43 sin re-descubrirlos — el RETROSPECTIVE/PROJECT decision log paga dividendos
- **Migración data-only sin DDL**: reconocer que el cambio era puro reordenamiento de datos (no schema) evitó la migración vacía que `prisma migrate dev` habría generado; SQL manual con INSERT ON CONFLICT preservó las configs de TipoTurnoProfesional
- **Velocidad**: 8 planes en 2 días — el milestone más rápido por plan, apoyado en patrones maduros del CRM y la HC

### What Was Inefficient
- **MILESTONES.md accomplishments vacíos (recurrente, 3er milestone seguido)**: `gsd-tools milestone complete` sigue devolviendo `accomplishments: []` porque los SUMMARY.md no pueblan el campo `one_liner` en el frontmatter — edición manual obligatoria cada vez. Vale la pena estandarizar `one_liner:` en el template de SUMMARY o ajustar el extractor
- **Progress table malformada en ROADMAP**: las filas de v1.8 quedaron con columnas desalineadas (falta columna Milestone) durante la ejecución — se corrigió al completar, pero indica que el update incremental de la tabla durante las fases no respetó el header

### Patterns Established
- **Pure-helper extraction para lógica con muchas ramas**: cuando una regla de negocio tiene >5 casos, extraerla a `*.helpers.ts` sin deps de framework habilita tests unitarios baratos
- **Service-layer filtering para ocultar sin eliminar**: filtrar `esCirugia=false` (y `crmArchivado=false`) en el método de lectura, no en el controller ni borrando datos — mantiene el registro accesible internamente
- **Migración por reordenamiento de registros**: para catálogos almacenados como filas (no enums), la migración es una secuencia ordenada de INSERT/UPDATE/DELETE que preserva FKs en cada paso

### Key Lessons
1. **Distinguir migración de datos vs migración de schema temprano**: ahorra generar migraciones vacías y clarifica que la herramienta correcta es SQL manual + `migrate deploy`
2. **El dual-state se modela mejor con predicados de lectura que con cambios de estado**: en vez de mover al paciente entre flujos, exponer ambas fuentes en la query mantiene una sola fuente de verdad y evita inconsistencias
3. **Los patrones documentados se reusan; los no documentados se re-descubren**: Phase 43 fue rápida porque Dialog-from-Sheet ya estaba en el decision log — reforzar la disciplina de registrar decisiones

### Cost Observations
- Model: balanced profile (sonnet/opus mix)
- Sessions: 8 plan executions en 2 días | 36 commits | 46 archivos (+3,125/-84)
- Notable: milestone sin audit previo (se procedió directo a completar con 17/17 requisitos verificados manualmente en Phases 42-02 y 43-02) — los human-verify checkpoints intra-fase sustituyeron al audit formal

---

## Milestone: v1.7 — CRM Flexible

**Shipped:** 2026-05-28
**Phases:** 5 (35–39) | **Plans:** 10 | **Timeline:** 6 days (2026-05-23 → 2026-05-28)

### What Was Built
- Guard forward-only (`isAutoTransitionBlocked` + `ETAPA_ORDEN`) en 5 call sites de auto-transición: las etapas avanzadas puestas a mano nunca son sobreescritas por eventos del sistema
- `getEtapaWarning` en lib dedicada (`crm-warnings.ts`) + drag-and-drop con toast amber no bloqueante; snap-back preservado vía onSettled en caso de error de red
- 4 nuevos sub-componentes CRM (`CRMFlujoBadge`, `EtapaStepper`, `ContactoRapidoModal`, `ListaEsperaDialog`); `CardActionsSheet` refactorizado en layout stepper-centric; panel de acciones rápidas removido
- Stepper clickeable con `handleStepClick`, optimistic display, `LossReasonModal` para PERDIDO, botones contextuales por etapa (presupuesto nav, HC creation, marcar realizado)
- Tech debt Phase 39: `rechazar()` con `etapasProtegidas` guard, `STEPPER_CHAIN` alineado con `ETAPA_ORDEN`, `getKanban` ACEPTADO-first

### What Worked
- **Audit-before-milestone como patrón establecido**: el audit v1.7 detectó 3 asimetrías (TD-1/2/3) que se cerraron con Phase 39 antes de completar el milestone — el sistema de auditoría previene gaps silenciosos
- **`getEtapaWarning` en lib separada**: la decisión de no acoplarla al componente permitió que Phase 38 reutilizara la función directamente desde `EtapaStepper` sin tocar `KanbanBoard` — zero coupling pay-off
- **Dialog-from-Sheet pattern**: resolver z-index/focus-trap con `DialogPortal` en `document.body` fue limpio y sin hacks; patrón reutilizable para cualquier modal dentro de un Sheet
- **Optimistic display pattern**: `displayEtapa = optimisticEtapa ?? etapaActual` — guardia de clickability en estado real, display en estado optimista — separación clara sin estado inconsistente

### What Was Inefficient
- **MILESTONES.md accomplishments vacíos (recurrente)**: el CLI `gsd-tools` no puede extraer `one_liner` porque los SUMMARY.md no tienen el campo poblado — siempre requiere edición manual post-archivado
- **Phase 37 requirió audit-level research post-hoc**: la discrepancia STEPPER_CHAIN vs ETAPA_ORDEN no fue detectada durante la implementación de Phase 37/38 — solo emergió en el audit. Un quick-check de alineación backend↔frontend debería ser parte del plan de cada fase CRM

### Patterns Established
- `Dialog-from-Sheet`: usar shadcn `Dialog` (no `Sheet` anidado) para modales dentro de un Sheet — `DialogPortal` en `document.body`, sin z-index/focus-trap issues
- `ETAPA_ORDEN` por módulo (no shared): duplicar en cada archivo de servicio evita acoplamiento cross-module; si se centraliza, common/crm-helpers.ts
- `etapasProtegidas` pattern: cualquier staff action que pueda regresar CRM stage a PERDIDO debe llevar lista explícita de etapas protegidas
- `find(ACEPTADO) ?? arr[0]` en queries multi-presupuesto: previene false positives cuando hay presupuestos más nuevos en estado BORRADOR

### Key Lessons
1. **El audit descubre lo que la implementación asume**: Phase 39 cierra 3 bugs silenciosos que habían pasado code review — el audit es indispensable, no opcional
2. **Libs puras > componentes acoplados para lógica cross-phase**: `getEtapaWarning` en `crm-warnings.ts` fue correcta desde el día 1; vale la pena plantear esto en el plan antes de implementar
3. **El stepper visual ≠ stepper backend**: `ETAPA_ORDEN` en backend excluye `PROCEDIMIENTO_REALIZADO` del kanban pero el stepper debe mostrarlo — la divergencia es intencional, hay que documentarla en el plan para evitar confusión futura

### Cost Observations
- Model: claude-sonnet-4-6 (balanced profile)
- Sessions: 10 plan executions (~5 dias)
- Notable: Phase 35 completada en 11 min (2 planes); Phase 36 demoró 26h por human-verify checkpoint de UX en browser — la verificación manual es el bottleneck real, no la implementación

---

## Milestone: v1.6 — Agenda Operativa

**Shipped:** 2026-05-23
**Phases:** 3 (32–34) | **Plans:** 6 | **Timeline:** 2 days (2026-05-13 → 2026-05-14)

### What Was Built
- EstadoTurno extendido con EN_ESPERA y SIENDO_ATENDIDO; migration SQL manual (pgBouncer workaround); 3 endpoints de transición + iniciarSesion corregido
- useTurnoEstadoActions hook: 3 mutations TanStack Query con cache invalidation y sonner toasts
- UpcomingAppointments convertido en herramienta operativa: columnas reordenadas, nombre clickeable (PatientDrawer), menú ⋮ contextual con acciones por estado, badges EN_ESPERA/SIENDO_ATENDIDO
- Timer eliminado de todas las superficies LiveTurno; hook useLiveTurnoTimer.ts borrado; tipoTurno badge como reemplazo en Indicator
- "Cerrar sin guardar entrada de HC" button en LiveTurnoFooter: AlertDialog → cerrarSesion sin entradaHCId
- Switch-session: AlertDialog en UpcomingAppointments, secuencia cerrar→abrir async con aviso de HC borrador, e.preventDefault() para controlar cierre manual del dialog

### What Worked
- **Milestone más corto hasta la fecha**: 6 planes en 2 días — scope muy acotado y requisitos sin ambigüedad de implementación
- **Mutations-only hook separado (Plan 33-01)**: separar useTurnoEstadoActions del componente que lo usa permitió que Plan 33-02 solo se enfocara en UI, sin lógica de red mezclada
- **Patrones establecidos en fases anteriores reusados sin fricción**: cerrarSesion/iniciarSesion de useLiveTurnoActions, PatientDrawer drawer-pattern con useState(id), TanStack Query invalidation — todo copy-adaptado sin reimplementar
- **Todos los requisitos cubiertos en solo 2 planes por fase**: la granularidad fue correcta; ningún plan fue demasiado grande ni demasiado pequeño

### What Was Inefficient
- **MILESTONES.md accomplishments vacíos (recurrente)**: el CLI gsd-tools sigue sin poder extraer one_liners — requirió edición manual post-archivado
- **No hay audit de milestone v1.6**: se procedió sin /gsd:audit-milestone; dados los 14/14 requirements completos el riesgo fue bajo, pero el patrón establecido (audit antes de complete-milestone) no se siguió

### Patterns Established
- `AlertDialogAction + e.preventDefault()` para manejar acciones async en shadcn AlertDialog — sin preventDefault el dialog se cierra antes de que termine la mutation
- Switch-session pattern: cerrarSesion.mutateAsync primero → si falla, abortar (no abrir nuevo turno); si ok, iniciarSesion.mutate — orden estricto, sin optimistic updates
- `opacity-0 group-hover:opacity-100` en trigger de DropdownMenu: columna Acciones limpia por defecto

### Key Lessons
1. **Scope de 2-3 días es el óptimo para milestones operativos** (UI-focused, sin schema changes complejas): suficiente para cerrar una feature completa sin acumular deuda de planificación
2. **Migration pgBouncer workaround ya es patrón conocido**: documentar la solución una vez y referir al pattern en fases posteriores — no re-investigar cada vez
3. **La tabla de agenda como herramienta de operación es más usada que LiveTurno**: las mejoras al widget (menú ⋮, PatientDrawer, estados visibles) tienen más impacto diario que refinamientos al panel de consulta

### Cost Observations
- Model: claude-sonnet-4-6 (balanced profile)
- Sessions: ~6 plan executions
- Notable: Plan 33-02 completado en 2 min — cuando el componente objetivo y los hooks ya están listos, la implementación de UI es casi mecánica

---

## Milestone: v1.5 — Catálogos Clínicos y Flujos de Atención

**Shipped:** 2026-05-13
**Phases:** 6 (26–31) | **Plans:** 16 | **Timeline:** 21 days

### What Was Built
- Schema TratamientoInsumo + CirugiaCatalogo + CirugiaInsumo; full CRUD catálogos de cirugías con precios ARS/USD y costo desde inventario
- HCCreatorForm extraído como componente único; LiveTurno HC con multi-selector de catálogo, OrdenConsumo PENDIENTE atómica al guardar
- PatientDrawer: "+ Nueva HC" sin turno activo usando el mismo creator; DatePicker retroactivo
- GenerarPresupuestoModal con panel Popover/Command, snapshot de precio al seleccionar del catálogo, ítems libres preservados
- CambiarFlujoModal optimista desde PatientDrawer; etapaCRM reset + ContactoLog en $transaction
- Tab Tratamientos: 5ta columna "Último tratamiento" via batch subquery
- Consumo de stock end-to-end: confirmarOrden con idempotencia + guard de stock insuficiente + /dashboard/stock/consumo

### What Worked
- **Wave parallelization**: ejecutar 31-01 (backend) y 31-02 (frontend) en paralelo ahorró tiempo en la fase final
- **HCCreatorForm component extraction**: refactor previo en Phase 27 pagó dividendos en Phase 28 y 30 (misma lógica sin duplicar)
- **pgBouncer-safe two-step pattern**: pre-fetch outside $transaction, re-fetch inside como idempotency guard — patrón reutilizable para futuras confirmaciones

### What Was Inefficient
- **PRESUP-01-04 stale in REQUIREMENTS.md**: el estado "Pending" no se actualizó al completar Phase 28 — requirió corrección manual en el cierre del milestone
- **Treatment snapshot gap**: el guard `consumirInsumos` ocultó el bug de LIVHC-05/PAC-01 hasta el audit de integración — debería haberse detectado en Phase 27

### Key Lessons
- Separar el snapshot de tratamientos del guard de consumirInsumos desde el diseño inicial; son dos concerns independientes
- Verificar roles en @Auth() contra frontend permissions.ts antes de hacer PR — el FACTURADOR gap era visible con una simple comparación
- El componente reutilizable (HCCreatorForm) vale más que un componente específico; extraer desde el inicio cuando se vislumbra re-uso

---

## Milestone: v1.1 — Vista del Facturador

**Shipped:** 2026-03-16
**Phases:** 4 (8–11) | **Plans:** 9 | **Timeline:** 3 days

### What Was Built
- Schema DB extendido con tipos AFIP-ready (CondicionIVA, MonedaFactura, LimiteFacturacionMensual) y campos de auditoría en PracticaRealizada vía migración SQL manual segura
- Documento de referencia técnica AFIP/ARCA de 774 líneas con contrato TypeScript EmitirComprobante — elimina necesidad de re-research para v1.2
- Capa backend de facturación completa: timezone utility getMonthBoundariesART(), 5 métodos FinanzasService con TDD, 7 endpoints nuevos (ADMIN+FACTURADOR), AfipStubService inyectable
- Dashboard exclusivo `/dashboard/facturador` con redirect automático, KPI cards por OS, barra de progreso límite mensual, configuración de límite
- Flujo de liquidación completo: edición inline montoPagado por práctica con estado local, modal de confirmación CerrarLote, transacción atómica `$transaction`

### What Worked
- **TDD RED-GREEN en Phase 9**: escribir tests fallidos primero y luego implementar aceleró la verificación y produjo código más robusto
- **AFIP research como Phase separada**: documentar primero antes de implementar (stub) evitó decisiones de arquitectura tardías; el stub de Phase 9 implementó la interfaz exacta del doc
- **Migración SQL manual**: escribir el SQL a mano (no auto-generado por Prisma) permitió el patrón add-nullable → backfill → NOT NULL → drop que Prisma no habría manejado correctamente
- **profesionalId explícito como convención**: decidir en Phase 9 que FACTURADOR no tiene Profesional record y que profesionalId siempre es parámetro explícito previno problemas de JWT lookup en todas las fases siguientes
- **Velocidad**: 9 planes en 3 días (est. ~57min total de ejecución); milestone cerrado sin blockers reales

### What Was Inefficient
- **ROADMAP.md no actualizado en tiempo real**: Phase 8 estaba marcada `[ ]` en lugar de `[x]` al completarse; los requisitos SCHEMA-01..03 y AFIP-01 nunca se marcaron como completados en REQUIREMENTS.md — requirió reconciliación manual en el archivado
- **STATE.md con datos desactualizados**: el progress quedó en 33% (Phase 9 Plan 01) en lugar de actualizarse al 100%; el campo `last_activity` tampoco se actualizó durante la ejecución
- **Accomplishments vacíos en gsd-tools**: el CLI no pudo extraer one_liners porque los SUMMARY.md no tienen ese campo — requirió edición manual de MILESTONES.md

### Patterns Established
- `getMonthBoundariesART()`: patrón `Date.UTC(year, month-1, 1, 3, 0, 0, 0)` para boundaries ART correctos — replicar en cualquier cálculo de período mensual en finanzas
- Transacción atómica: siempre usar la forma callback de `$transaction(async tx => {...})` cuando el segundo statement necesita el ID del primero (no la forma array)
- Server-side totals: calcular `montoTotal` dentro de `$transaction` desde los datos reales, nunca aceptar del cliente — regla para todos los endpoints financieros
- AfipStubService como contrato: el stub registrado en providers+exports permite swap-out sin cambiar consumidores en v1.2
- `prisma migrate deploy` para entornos sin TTY: documentar el SQL manualmente y aplicar con deploy (diseñado para CI/prod)

### Key Lessons
1. **Actualizar ROADMAP.md y REQUIREMENTS.md dentro del mismo commit de cada plan** — no al final del milestone; la reconciliación tardía crea trabajo extra
2. **La interfaz TypeScript primero**: definir `EmitirComprobanteParams/Result` en el doc de research antes de escribir el stub garantizó alineación; el mismo patrón aplica a cualquier integración externa
3. **Advertir sobre restricciones regulatorias en el research**: documentar explícitamente la restricción CAEA-contingency-only (RG 5782/2025) con flag de verificación evita decisiones incorrectas en v1.2
4. **El rol FACTURADOR como ciudadano de primera clase**: diseñar el dashboard y los endpoints desde el rol (no como extensión del Profesional) simplificó permisos y evitó hacks de JWT lookup

### Cost Observations
- Model: claude-sonnet-4-6 (balanced profile)
- Sessions: ~9 plan executions
- Notable: Phase 9 Plan 03 (AfipStubService) completada en 1m 27s — los planes más pequeños y bien definidos son los más eficientes

---

## Milestone: v1.2 — AFIP Real

**Shipped:** 2026-03-31
**Phases:** 8 (12–19) | **Plans:** 24 | **Timeline:** 50 days (2026-02-09 → 2026-03-31)

### What Was Built
- Schema AFIP completo por tenant: ConfiguracionAFIP con cert+key AES-256-GCM, CaeaVigente, campos AFIP en Factura, scheduler de alertas de vencimiento de certificado
- WSAA Token Service: firma CMS in-process con node-forge (sin openssl subprocess, sin exposición de clave en /tmp), Redis cache por CUIT con async-mutex, ~11hs TTL
- Emisión CAE real via WSFEv1: pg_advisory_xact_lock dentro de $transaction(45000ms), clasificación AfipBusinessError → DLQ inmediato vs AfipTransientError → backoff exponencial
- QR AFIP obligatorio (RG 5616/2024): URL base64 con 13 campos en Factura.qrData, embebido en PDF con PDFKit, FacturaDetailModal con CAE + QR + USD tipoCambio con link BNA
- CAEA contingency mode: cron bimensual prefetch, fallback automático en AfipUnavailableException, FECAEAInformar con 72 reintentos distribuidos en ventana 8 días, email de deadline alert
- CAE Emission UX + error display: useEmitirFactura, polling TanStack Query por estado, panel de errores AFIP en español — incluyendo corrección de 2 bugs lógicos detectados por integration checker

### What Worked
- **TDD RED-GREEN estricto para cada plan**: Test N (RED en plan -01, GREEN en plan -02) detectó el BUG-1 del audit antes de que fuera un problema de producción. El patrón "spec primero" fue especialmente valioso para el integration layer (WSAA + CAEA)
- **Audit + integration checker antes de cerrar milestone**: el gsd-integration-checker detectó BUG-1 y BUG-2 en CAE-03 que los verificadores de fase no habían visto — los bugs eran de lógica correcta en código correcto estructuralmente. El audit pagó su costo
- **Decimal phases para gap closure (18, 19)**: insertar phases posteriores al audit para cerrar gaps específicos sin renumerar fue limpio y mantuvo la trazabilidad REQ → PHASE → PLAN
- **DI token pattern (AFIP_SERVICE, WSAA_SERVICE)**: permitió swap real/stub sin cambiar callers; USE_AFIP_STUB=true fue valioso en desarrollo sin acceso a homologación
- **Decisions log granular en STATE.md**: 60+ decisiones documentadas con contexto evitaron re-investigar el mismo tema en planes posteriores (ej. namespace SOAP ar:, advisory lock timeout, mock de signTra)

### What Was Inefficient
- **Ciclos de audit prolongados**: dos rounds de audit (v1.2-primera, v1.2-segunda) con phases intermedias. El segundo audit fue necesario porque el integration checker encontró bugs que el verifier de fase perdió. Lección: integration checker debe correr antes del primer "passed" del verifier
- **CAE-03 fue el req más costoso**: necesitó planes en Phase 14 + 17 + 18 para estar completo — la feature parecía simple (mostrar error) pero los bugs de lógica (guard incorrecto + condición modal incompleta) requirieron TDD dedicado
- **getCierreMensual facturaId (Phase 19)**: la deuda técnica de "null cast temporal" de Phase 17 terminó necesitando su propia phase. La extensión era pequeña pero el overhead de planning/execution fue el mismo. Considerar incluir extensiones pequeñas como tasks dentro del plan padre
- **MILESTONES.md accomplishments vacíos (de nuevo)**: mismo problema que v1.1 — gsd-tools no puede extraer one_liners del formato de SUMMARY.md actual. Requirió edición manual

### Patterns Established
- `pg_advisory_xact_lock(hashtext(cuit:ptoVta:cbteTipo))` dentro de `$transaction({ timeout: 45000 })`: patrón estándar para serializar operaciones AFIP que requieren numeración secuencial sin duplicados
- `WSAA_SERVICE` / `AFIP_SERVICE` DI tokens: patrón string-constant + useFactory(env) para swap real/stub. Replicar para cualquier integración externa que tenga modo desarrollo
- Redis cache key format `afip_ta:{profesionalId}:{cuit}:{service}` con TTL = `floor((expiresAt-now)/1000 - 300)`: patrón para caché de tokens OAuth/AFIP con margen de seguridad
- `prisma.X.update` antes del guard condicional en `onFailed`: cualquier persistencia de estado de error debe ser incondicional (no dentro de `if attemptsMade >= maxAttempts`) para cubrir UnrecoverableError
- Modal condition inclusiva para estados transitorios: al mostrar información de error, incluir todos los estados intermedios relevantes, no solo el estado terminal

### Key Lessons
1. **Integration checker como parte del verify, no del audit**: correr gsd-integration-checker al verificar cada phase (no solo al auditear el milestone) habría detectado BUG-1/BUG-2 antes de necesitar Phase 18
2. **"Null cast temporal" siempre se convierte en deuda real**: la decisión de Phase 17 de abrir modal con facturaId=null como "deferred tech debt" terminó siendo Phase 19. Si la fix es <1 plan, incluirla en el plan actual
3. **El audit paga su costo cuando hay integración cross-service**: WSAA → FinanzasModule → BullMQ → CaeaService es una cadena con N puntos de falla; el integration checker encontró bugs que el analysis estático y los unit tests no cubren
4. **node-forge para firma CMS in-process es la decisión correcta para self-hosted**: evita subprocess, exposición de /tmp, y dependencia en openssl del sistema operativo. Patrón aplicable a cualquier integración que requiera criptografía en el proceso
5. **CAEA como phase separada de CAE fue correcto**: la complejidad regulatoria (RG 5782/2025, ventana 8 días, 72 reintentos) justificó su propio ciclo TDD y verification

### Cost Observations
- Model: claude-sonnet-4-6 (balanced profile) + claude-opus-4-6 para phases de research
- Sessions: ~24 plan executions + 2 audit rounds + 1 integration check
- Notable: Phase 14 (WSFEv1) fue la más densa en contexto — 4 planes secuenciales con dependencias estrictas entre spec, implementación, processor y wiring

---

## Milestone: v1.4 — Flujo de Pacientes

**Shipped:** 2026-04-20
**Phases:** 4 (22–25) | **Plans:** 10 | **Timeline:** 5 days (2026-04-15 → 2026-04-20)

### What Was Built
- Schema FlujoPaciente: enum PostgreSQL + Paciente.flujo + TipoTurno.flujoPaciente con migración transaccional y backfill de pacientes existentes (null = legacy, PENDIENTE = nuevos inserts)
- 5 nuevos tipos de turno con semántica de flujo explícita reemplazando 3 tipos legacy (UPDATE en lugar de INSERT por UNIQUE constraint en nombre)
- Auto-clasificación en crearTurno() como step 5.5 best-effort: guard PENDIENTE-only preserva clasificaciones manuales previas
- CRM filtrado a CIRUGIA: getKanban, getListaAccion, crm-dashboard, crm-metrics — pacientes legacy (flujo IS NULL + etapaCRM) preservados
- LiveTurnoFlujoBanner: store extension con bannerDismissed por sesión, PATCH /pacientes/:id/flujo, clasificación in-situ sin interrumpir el flujo de atención
- TratamientosTab: useTratamientosMes hook, tabla con navegación mensual y filtro por tipo, FlujoBadge component reutilizable en tabla de pacientes y drawer

### What Worked
- **Milestone más rápido hasta la fecha**: 4 fases + 10 planes en 5 días — la claridad del objetivo (separar dos funnels) se tradujo en planes sin ambigüedad
- **Audit pre-completion**: tener el audit hecho antes de iniciar el archivado eliminó sorpresas; 20/20 satisfechos sin rondas de fix
- **Guard PENDIENTE-only** como regla simple: en lugar de lógica compleja de "cuándo sobreescribir", la regla "solo si PENDIENTE" simplificó el código y la comunicación al equipo
- **Phase 22 como fundación sólida**: invertir en la migración SQL correcta (DDL + data migration transaccional + backfill) eliminó cualquier issue de datos en las fases siguientes

### What Was Inefficient
- **Tech debt conocido al cerrar**: `(paciente.flujo as any)` cast en PacienteDetails.tsx — el componente recibe `paciente` como any; corregible con un tipo explícito en el DTO de drawer
- **MILESTONES.md accomplishments vacíos** (recurrente): el CLI gsd-tools no extrae `one_liner` porque los SUMMARY.md no usan ese campo — sigue requiriendo edición manual
- **Walk-in patients sin auto-clasificación TRATAMIENTO**: el diseño conservador (guard PENDIENTE-only excluye flujo=null) es correcto pero implica que pacientes walk-in quedan sin clasificar hasta acción manual; documentado como deuda

### Patterns Established
- `FlujoPaciente enum` colocated con enums CRM en schema.prisma — agrupar por dominio de negocio, no por tipo técnico
- Migración split: DDL fuera de BEGIN/COMMIT (restricción PostgreSQL), data migration dentro de transacción
- Best-effort update pattern: side effects de negocio (actualizar flujo) que no deben bloquear la operación principal (crear turno) van en try/catch con Logger.error
- PATCH endpoint restrictivo con `@Auth(Role.PROFESIONAL, Role.ADMIN)` para operaciones de reclasificación manual

### Key Lessons
1. **Separar el "qué" del embudo del "qué" de la lista**: el insight de que cirugías y tratamientos tienen KPIs incompatibles (tasa de conversión vs. volumen mensual) fue el driver correcto; dos vistas distintas en lugar de filtrar una
2. **Null semántico vs. null técnico**: usar null = legacy (no PENDIENTE) fue la decisión correcta para no vaciar el kanban CRM post-migración; documentar esta distinción explícitamente en el schema comment
3. **Banner dismissible sin DB write**: resistir la tentación de persistir el dismiss en DB simplificó el backend y la UX (el profesional puede siempre volver a ver el banner en nueva sesión si lo olvidó)
4. **Audit antes de archivar** (validado de nuevo): tener el AUDIT.md con 20/20 antes de correr `/gsd:complete-milestone` hizo el archivado lineal sin retrocesos

### Cost Observations
- Model: claude-sonnet-4-6 (balanced profile)
- Sessions: ~10 plan executions + 1 audit (pre-completion)
- Notable: v1.4 fue el milestone con mejor ratio plans/days de todos — objetivo bien acotado + schema sólido = ejecución fluida

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Timeline | Avg/Plan | Key Change |
|-----------|--------|-------|----------|----------|------------|
| v1.0 CRM Conversión | 9 | 23 | 8 días | ~21min | Baseline |
| v1.1 Vista Facturador | 4 | 9 | 3 días | ~6min est. | Planes más pequeños y focalizados |
| v1.2 AFIP Real | 8 | 24 | 50 días | ~variable | Complejidad regulatoria + audit rounds; 2 gap-closure phases |
| v1.3 Historial Consultas | 2 | 4 | 7 días | ~variable | Milestone corto, widget-focused |
| v1.4 Flujo de Pacientes | 4 | 10 | 5 días | ~variable | Mejor ratio plans/days — objetivo acotado y schema sólido |
| v1.5 Catálogos Clínicos | 6 | 16 | 21 días | ~variable | Milestone más amplio; component extraction (HCCreatorForm) como patrón clave |
| v1.6 Agenda Operativa | 3 | 6 | 2 días | ~variable | Milestone más corto — scope UI-focused sin schema compleja, patrones reutilizados |
| v1.7 CRM Flexible | 5 | 10 | 6 días | ~variable | Audit detectó 3 asimetrías cerradas en Phase 39; human-verify de UX como bottleneck |
| v1.8 Tipos de Turno y Flujo Clínico | 4 | 8 | 2 días | ~variable | Milestone más rápido por plan — patrones CRM/HC maduros + migración data-only |
| v1.9 Plantilla Primera Consulta | 4 | 12 | 1 día | ~variable | 12 planes en 1 día — catálogo en BD nuevo + dual-shape JSONB sin migración; audit formal retomado |
| v1.10 Refinamiento Planilla Tratamientos | 2 | 3 | 1 día | ~variable | Read-path/write-path/frontend en fases secuenciales; extractor puro + TDD; audit PASSED |
| v1.11 HC Completa en Ficha de Paciente | 1 | 1 | 1 día | ~variable | Milestone mínimo solo-frontend — port de render con componente compartido; sin audit (verificado vía VERIFICATION + visual) |

### Cumulative Quality

| Milestone | Tests added | Coverage est. | New deps |
|-----------|-------------|---------------|----------|
| v1.0 | ~minimal | <6% | BullMQ (ya existía) |
| v1.1 | 9 TDD tests (timezone + service) | <6% | ninguna |
| v1.2 | ~40+ TDD tests (WSAA, AfipReal, CAEA, processor) | <10% | node-forge 1.3.3, qrcode 1.5.4, async-mutex |
| v1.3 | ~minimal | <10% | ninguna |
| v1.4 | ~minimal | <10% | ninguna |
| v1.5 | ~minimal | <10% | ninguna |
| v1.6 | ~minimal | <10% | ninguna |
| v1.7 | ~minimal | <10% | ninguna |
| v1.8 | 10 TDD tests (resolverNuevoFlujo) | <10% | ninguna |
| v1.9 | TDD tests (construirContenidoPrimeraVez, detectarAprendizaje, aprenderDesdeZonas, seed-data) | <10% | ninguna |
| v1.10 | 14 TDD tests (resumirTratamientosDeContenido — 25/25 pass) | <10% | ninguna |
| v1.11 | ninguno (cambio puramente de presentación) | <10% | ninguna |

### Recurring Process Debt

| Issue | v1.1 | v1.2 | v1.4 | v1.5 | v1.6 | v1.7 | v1.8 | v1.9 | v1.10 | v1.11 | Fix |
|-------|------|------|------|------|------|------|------|------|-------|-------|-----|
| MILESTONES.md accomplishments vacíos | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | Actualizar formato SUMMARY.md con `one_liner:` field |
| STATE.md progress desactualizado durante ejecución | ✗ | parcial | parcial | parcial | parcial | parcial | parcial | parcial | parcial | parcial | GSD executor actualiza STATE al final de cada plan |
| Integration bugs detectados tarde (audit, no verify) | — | ✗ | ✓ | ✓ | sin audit | ✓ | sin audit | ✓ | ✓ | sin audit | Audit antes de complete-milestone elimina retrabajo |
| Audit saltado antes de archivar | — | — | — | — | ✗ | ✓ | ✗ | ✓ | ✓ | ✗ | Correr /gsd:audit-milestone antes de /gsd:complete-milestone |
| Progress table ROADMAP desalineada durante ejecución | — | — | — | — | — | — | ✗ | ✗ | ✗ | ✗ | Executor debe respetar header de columnas al agregar filas |
| CLI sobrescribe archivo milestone-scoped con snapshot completo | — | — | — | — | — | — | — | ✗ | ✗ | n/a | `milestone complete` debería preservar el ROADMAP scoped del roadmapper |
| CLI omite línea de Stats en MILESTONES.md | — | — | — | — | — | — | — | — | ✗ | ✗ | `milestone complete` debería poblar Stats desde git/summaries |
