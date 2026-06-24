# Milestones

## v1.11 HC Completa en Ficha de Paciente (Shipped: 2026-06-24)

**Phases completed:** 1 phase (50), 1 plan, 4 tasks (3 auto + 1 human-verify checkpoint)
**Stats:** 1 día (2026-06-24) | 2 archivos de código | +664 / -273 líneas | 6 commits
**Requirements:** 3/3 v1.11 (HCSHEET-01..03) | Audit: no ejecutado (milestone solo-frontend, verificado vía 50-01-VERIFICATION.md + visual check aprobado)
**Git range:** feat(50-01) `b62f96f` → docs(phase-50) `a060396`

**Key accomplishments:**
1. Componente de render HC compartido (HCSHEET-01): nuevo `HCEntryContent.tsx` que exporta `HCEntryChips` (variante tarjeta: badges de color de zona/diagnósticos/tratamientos, sin precios) y `HCEntryFullContent` (variante detalle: chips + bloque de observaciones `otroTexto` + precios ARS por tratamiento + total + comentario), manejando ambos shapes de `contenido` JSONB — v1.9 zona-agrupado (`zonas[]`) y legacy plano — además del caso de texto libre, sin romperse
2. Tarjetas de lista con chips (HCSHEET-02): `FreeEntryPreview` en `HistoriaClinica.tsx` delega en `HCEntryChips`, reemplazando el resumen truncado en texto plano por badges de color; `line-clamp-3` movido a `TemplateEntryPreview`-only para que los chips envuelvan naturalmente sin recortarse a media fila
3. Detalle expandido con paridad visual (HCSHEET-03): `FreeEntryFullContent` delega en `HCEntryFullContent`, logrando paridad visual completa con `HistorialClinicoPanel` (LiveTurno) y `TurnoHCModal` (agenda); mantenido como wrapper de delegación fino para conservar la firma esperada por `ExpandedEntryContent`; tipos duplicados locales eliminados (`ContenidoEntrada` aliaseado del export compartido)
4. Verificación visual aprobada por el usuario: shape v1.9, shape legacy, entradas de texto libre y entradas de plantilla renderizan correctamente tanto en tarjeta como en detalle, sin regresiones; tsc build limpio, ESLint limpio en ambos archivos modificados

**Convención de chips establecida:** zona → `Badge secondary capitalize font-semibold`; diagnósticos → `Badge outline`; tratamientos → `Badge bg-blue-50 text-blue-700 border-blue-200`.

**Tech debt / consolidación futura (no bloqueante):** `HistorialClinicoPanel.tsx` y `TurnoHCModal.tsx` no migrados al componente compartido `HCEntryContent.tsx` (diferido explícitamente por scope; el componente queda disponible para esa consolidación). Pre-existente `no-explicit-any` en `getTituloEntrada` (HistoriaClinica.tsx) fuera de scope.

---

## v1.10 Refinamiento Planilla de Tratamientos (Shipped: 2026-06-22)

**Phases completed:** 2 phases (48–49), 3 plans, 6 tasks
**Stats:** 1 día (2026-06-22) | 22 archivos | +1,431 / -233 líneas | 11 commits
**Requirements:** 6/6 v1.10 (TRAT-01..06) | Audit: ✅ PASSED (6/6 req, 2/2 phases, integración WIRED)

**Key accomplishments:**
1. Read-path por-turno de "Último tratamiento" (TRAT-01/02): extractor puro `resumirTratamientosDeContenido` que normaliza los 3 shapes de contenido HC — v1.9 zona-agrupado (`contenido.zonas[].tratamientos`), legacy plano (`contenido.tratamientos`) y texto libre / tratamiento en consultorio — a `string|null` con resumen-con-conteo (1 nombre → nombre; N → `first +N-1`); integrado en `obtenerTurnosPorRango` resolviendo el tratamiento por turno y eliminando el query N+1 `historiaClinica.findMany`; 14 tests nuevos (25/25 pass), tsc build limpio
2. Write-path snapshot incondicional (TRAT-03, fix tech debt LIVHC-05): `crearEntrada` persiste `contenido.tratamientos` siempre que haya `tratamientoIds`, independiente de `consumirInsumos`; la agregación de insumos y la `OrdenConsumo` siguen condicionadas a `consumirInsumos=true` (separación de responsabilidades); pre-fetch fuera de `$transaction` (patrón pgBouncer preservado), sin regresión de stock — las entradas nuevas siempre pueblan la columna
3. Filtro automático source-B (TRAT-04/05): predicado client-side `isFuenteB(t) && t.ultimoTratamiento != null` oculta de la planilla a los pacientes CIRUGIA sin tratamiento real, sin mutar el backend ni romper el estado dual de v1.8 (etapaCRM/flujo intactos); los pacientes CIRUGIA con tratamiento real siguen visibles simultáneamente en kanban y planilla
4. Color-coding semántico de EstadoTurno (TRAT-06): helper puro `getEstadoTurnoChip` en `@/lib/estadoTurno` que mapea los 7 valores reales del enum (PENDIENTE, CONFIRMADO, EN_ESPERA → violet, SIENDO_ATENDIDO → sky, FINALIZADO, AUSENTE, CANCELADO) a `{label, className}` Tailwind, reemplazando las keys legacy inexistentes PROGRAMADO/REALIZADO; header breakdown remapeado a realizados/programados/cancelados derivado de filas visibles post-filtro

**Tech debt (no bloqueante):** `AppointmentDetailModal` y `CalendarGrid` no migrados a `getEstadoTurnoChip` (diferido para evitar scope creep; helper disponible en `@/lib/estadoTurno` para consolidación futura).

---

## v1.9 Plantilla Primera Consulta (Shipped: 2026-06-13)

**Phases completed:** 4 phases (44–47), 12 plans
**Stats:** 1 día (2026-06-12 → 2026-06-13) | 69 archivos | +9,331 / -460 líneas | 53 commits
**Requirements:** 14/14 v1.9 (ZONA-01..03, FORM-01..04, APR-01..04, ADM-01..03)

**Key accomplishments:**
1. Catálogo HC en BD por profesional (ZONA-01/02/03): 3 modelos Prisma nuevos (ZonaHC/DiagnosticoHC/TratamientoHC) con FK al profesional, flag `esSistema` y soft-delete; migración DDL pura (patrón pgBouncer `migrate deploy`); `CatalogoHCModule` con seed idempotente de 6 zonas (Abdomen, Mamas, Nariz, Facial, Locales, Otros) lazy + hook al crear usuario PROFESIONAL; `GET /catalogo-hc` con diagnósticos/tratamientos anidados y precio resuelto — reemplaza el JSON hardcodeado `zonas-diagnostico.json` (eliminado)
2. PrimeraConsultaForm rediseñado zona-céntrico (FORM-01/02/03/04): la zona es el eje único, seleccionarla despliega sus grupos de diagnósticos y tratamientos; con dos o más zonas la selección se agrupa visualmente por zona; la HC persiste JSONB agrupado por zona vía helper puro `construirContenidoPrimeraVez` (dual-shape, sin migración de entradas legacy); 3 lectores de historial renderizan ambos shapes; lookup de precio catálogo→fallback `tratamientosProfesional` preservado con el flujo "Generar presupuesto"
3. Auto-aprendizaje vía "Otros" (APR-01/02/03/04): motor puro `detectarAprendizaje` (TDD) computa zonas/diagnósticos/tratamientos a crear o reactivar; `aprenderDesdeZonas` aplica los cambios en BD best-effort post-transacción al crear la entrada; lo escrito en "Otros" persiste para la próxima consulta; un tratamiento aprendido se crea también en el catálogo del profesional con precio 0 y FK opcional; UX Enter→chip en el formulario
4. Admin UI "Catálogo HC" en Configuración (ADM-01/02/03): endpoints `PATCH` (renombrar) y `DELETE` (soft-delete con cascada lógica a hijos) para zonas/diagnósticos/tratamientos con guard `esSistema` y detección de conflictos; hook `useCatalogoHCMutations` (6 mutations); componente `GestionCatalogoHC` con jerarquía expandible, rename inline y delete; pestaña cableada para PROFESIONAL y SECRETARIA — las HC históricas quedan intactas

**Post-audit fix:** FORM-04 SECRETARIA price fallback — `PrimeraConsultaForm` forwards `profesionalId` a `useTratamientosProfesional` (commit 22a790e).

---

## v1.8 Tipos de Turno y Flujo Clínico (Shipped: 2026-06-09)

**Phases completed:** 4 phases (40–43), 8 plans
**Stats:** 2 días (2026-06-08 → 2026-06-09) | 46 archivos | +3,125 / -84 líneas | 36 commits
**Requirements:** 17/17 v1.8 (TIPO-01..06, HC-01..04, DUAL-01..03, ARCH-01..04)

**Key accomplishments:**
1. Migración de datos TipoTurno a 4 tipos públicos claros (Consulta, Control, Pre-Quirúrgico, Tratamiento): SQL data-only sin DDL, configs de TipoTurnoProfesional transferidas vía INSERT ON CONFLICT, filtro `esCirugia=false` en `findAll()` que preserva el tipo interno Cirugía para la agenda quirúrgica; seed idempotente (`seed-tipos-turno.ts`) + branch de color naranja para Pre-Quirúrgico en CalendarGrid
2. Tipo de Entrada en Historia Clínica: enum `TipoEntradaHC` (CONSULTA_CIRUGIA, TRATAMIENTO, CONTROL, SEGUIMIENTO, PREOPERATORIO) + campo `tipoEntrada` opcional; helper puro `resolverNuevoFlujo` con suite de 10 casos (extracción a `*.flujo.helpers.ts` para tests Jest sin deps NestJS); selector obligatorio "Tipo de consulta" en HCCreatorForm con mapeo PLANTILLA_TO_TIPO_ENTRADA editable
3. Transición automática de flujo/etapa CRM al cerrar sesión (HC-03/HC-04): CONSULTA_CIRUGIA en paciente PENDIENTE → flujo CIRUGIA + etapa CONSULTADO; TRATAMIENTO en paciente PENDIENTE → flujo TRATAMIENTO; TRATAMIENTO en paciente CIRUGIA → dual-state preservado (sin cambio de flujo); pre-fetch de `turno.esCirugia` fuera de `$transaction` (patrón pgBouncer)
4. Estado dual en TratamientosTab: `obtenerTurnosPorRango` expone `tipoEntradaHC` vía nested select (sin N+1); predicado dual fuente A (`flujoPaciente=TRATAMIENTO`) OR fuente B (Consulta + `tipoEntradaHC=TRATAMIENTO`) con columna "Consulta → Tratamiento" y filtro sintético CONSULTA_TRATAMIENTO; pacientes de cirugía con tratamientos visibles simultáneamente en kanban CRM y planilla — verificado end-to-end (DUAL-01/02/03)
5. Archivar del embudo CRM: campo `crmArchivado` Boolean + migración; endpoint `PATCH /pacientes/:id/crm-archivo` toggle (patrón whatsapp-opt-in); `getKanban` y `getListaAccion` excluyen archivados automáticamente; hook `useUpdateCrmArchivo` + botón "Archivar del embudo" con Dialog de confirmación (patrón Dialog-from-Sheet) e invalidación `onSettled` por key prefix — verificado end-to-end (ARCH-04)

---

## v1.7 CRM Flexible (Shipped: 2026-05-28)

**Phases completed:** 5 phases (35–39), 10 plans
**Stats:** 6 días (2026-05-23 → 2026-05-28) | 53 archivos | +7,798 / -323 líneas | 57 commits

**Key accomplishments:**
1. Movimiento libre de etapas CRM: eliminada la validación CONFIRMADO+presupuesto en updateEtapaCRM; guard forward-only (`isAutoTransitionBlocked` + `ETAPA_ORDEN`) en 5 call sites de auto-transición — las decisiones manuales del profesional ya no son sobreescritas por eventos del sistema
2. Warning infrastructure: `getEtapaWarning` en lib dedicada (`crm-warnings.ts`) + `KanbanPatient.flujo` field; drag-and-drop con toast amber no bloqueante para PRESUPUESTO_ENVIADO y CONFIRMADO; snap-back preservado vía `onSettled`
3. Sheet rediseñado: 4 nuevos sub-componentes CRM (`CRMFlujoBadge`, `EtapaStepper` 6-pasos + PERDIDO separado, `ContactoRapidoModal` Dialog, `ListaEsperaDialog` dual-mode); `CardActionsSheet` refactorizado como stepper-centric; panel de acciones rápidas removido
4. Stepper interactivo: 7 pasos clickeables con `handleStepClick`, optimistic display, `LossReasonModal` para PERDIDO, botones contextuales por etapa (ver presupuesto, registrar HC, marcar realizado)
5. Tech debt cierre — TD-1: guard `etapasProtegidas` en `rechazar()` espeja `rechazarByToken()`; TD-2: `STEPPER_CHAIN` alineado con `ETAPA_ORDEN` backend (CONFIRMADO→PROCEDIMIENTO_REALIZADO); TD-3: `getKanban` ACEPTADO-first elimina falsos positivos CRM-03

---

## v1.6 Agenda Operativa (Shipped: 2026-05-23)

**Phases completed:** 3 phases (32–34), 6 plans
**Stats:** 2 días (2026-05-13 → 2026-05-14) | 56 archivos | +3,004 / -250 líneas | ~34,600 LOC TypeScript total

**Key accomplishments:**
1. EstadoTurno extendido con EN_ESPERA y SIENDO_ATENDIDO en schema PostgreSQL/Prisma; migración SQL manual (pgBouncer workaround); 3 endpoints PATCH de transición de estado (marcarEnEspera, marcarAusente, reactivar) + iniciarSesion corregido a SIENDO_ATENDIDO
2. UpcomingAppointments actualizado a herramienta operativa diaria: columnas reordenadas (Tipo de Turno antes de Tratamiento), nombre del paciente clickeable abre PatientDrawer, badges amber (EN_ESPERA) e indigo+pulse (SIENDO_ATENDIDO)
3. Menú ⋮ contextual por estado: En espera / Ausente / Reactivar / Llamar (placeholder) según estado del turno; SIENDO_ATENDIDO excluido del menú (debe cerrar sesión primero)
4. Timer eliminado de todas las superficies LiveTurno (Header, Footer, Indicator, Banner, RecoveryDialog); hook useLiveTurnoTimer.ts borrado; tipoTurno badge en Indicator como reemplazo
5. Switch-session sin fricción: AlertDialog de confirmación al intentar iniciar otro turno con sesión activa; secuencia cerrar→abrir con aviso de HC borrador si hay draft sin guardar

---

## v1.5 Catálogos Clínicos y Flujos de Atención (Shipped: 2026-05-13)

**Phases completed:** 6 phases (26–31), 16 plans
**Stats:** 21 días (2026-04-22 → 2026-05-13) | 120 archivos | +10,444 / -6,571 líneas

**Key accomplishments:**
1. Schema extendido con TratamientoInsumo, CirugiaCatalogo y CirugiaInsumo; full CRUD de catálogos de cirugías por profesional en Configuración con precios ARS/USD, insumos y cálculo de precio base desde inventario
2. HCCreatorForm extraído como componente reutilizable; LiveTurno HC recibe selector multi-catálogo "Tratamiento en Consultorio" con checkbox de insumos — al guardar, crea OrdenConsumo PENDIENTE en $transaction atómica
3. PatientDrawer: botón "+ Nueva HC" lanza el mismo HCCreatorForm sin turno activo, con DatePicker retroactivo; unificación total del creator de HC en un único componente
4. GenerarPresupuestoModal: panel Popover/Command con grupos Cirugías y Tratamientos del catálogo del profesional; snapshot de nombre y precio (ARS/USD) inmutable al momento de selección; ítems libres preservados
5. CambiarFlujoModal desde PatientDrawer: update optimista del FlujoBadge, etapaCRM reset a null + ContactoLog "Paciente pendiente de clasificación" en la misma $transaction; toast con link al CRM
6. Tab Tratamientos: 5ta columna "Último tratamiento" via batch subquery en getTurnosPorRango, invalidación de caché al guardar HC nueva
7. Consumo de stock end-to-end: POST /ordenes-consumo/:id/confirmar con guard de idempotencia, validación de stock suficiente, MovimientoStock SALIDA + stockActual decrementado en $transaction; página /dashboard/stock/consumo con skeleton/error/empty states

**Known gaps (tech debt accepted):**
- LIVHC-05/PAC-01: `contenido.tratamientos` snapshot no se escribe cuando `consumirInsumos=false`; columna "Último tratamiento" muestra `—` para tratamientos sin insumos
- STOCK-03: backend `@Auth` excluye FACTURADOR de ordenes-consumo (frontend sí le da acceso)

---

## v1.4 Flujo de Pacientes (Shipped: 2026-04-20)

**Phases completed:** 4 phases (22–25), 10 plans
**Stats:** 5 días (2026-04-15 → 2026-04-20) | 51 archivos | +5,197 / -77 líneas | 82,500 LOC TypeScript total

**Key accomplishments:**
1. Schema FlujoPaciente: enum PostgreSQL + Paciente.flujo + TipoTurno.flujoPaciente con migración transaccional y backfill de pacientes existentes (CIRUGIA para pacientes con historial de cirugía, null para el resto)
2. 5 nuevos tipos de turno (Consulta para cirugía, Consulta para tratamiento en consultorio, Pre-operatorio, Control, Consulta pendiente) reemplazando los 3 tipos legacy
3. Auto-clasificación en booking: crearTurno() actualiza flujo a CIRUGIA/TRATAMIENTO según tipo de turno (guard PENDIENTE-only preserva clasificaciones existentes)
4. CRM/kanban filtrado a cirugía: getKanban, getListaAccion y todos los KPIs del dashboard excluyen pacientes TRATAMIENTO; pacientes legacy (flujo IS NULL con etapaCRM activo) preservados
5. LiveTurno classification banner: banner amber no bloqueante para pacientes PENDIENTE con botones Cirugía/Tratamiento, dismissible por sesión
6. Tratamientos Tab: nuevo tab mensual en /dashboard/pacientes con navegación por mes, filtro por tipo de tratamiento, y FlujoBadge por paciente en la tabla general

---

## v1.2 AFIP Real (Shipped: 2026-03-31)

**Phases completed:** 8 phases (12–19), 24 plans
**Stats:** 50 días (2026-02-09 → 2026-03-31) | 399 archivos | +70,242 líneas | ~82K LOC TypeScript total

**Key accomplishments:**
1. Schema AFIP completo por tenant: ConfiguracionAFIP (cert+key AES-256-GCM), CaeaVigente, AFIP fields en Factura, cert expiry email scheduler
2. WSAA Token Service: firma CMS in-process con node-forge, Redis cache con mutex por CUIT — elimina openssl subprocess y exposición de clave en /tmp
3. Emisión CAE real via WSFEv1: pg_advisory_xact_lock dentro de $transaction(45s), AfipBusinessError → DLQ inmediato, AfipTransientError → backoff exponencial
4. QR AFIP obligatorio RG 5616/2024: PDF con QR escaneable, FacturaDetailModal con CAE + QR + USD tipoCambio con link BNA
5. CAEA contingency mode: cron bimensual prefetch, fallback automático a CAEA_PENDIENTE_INFORMAR, FECAEAInformar 72 reintentos en ventana 8 días, alertas de deadline
6. CAE Emission UX + error display: useEmitirFactura, polling TanStack Query, panel de errores AFIP en español (2 logic bugs del audit corregidos)

---

## v1.1 Vista del Facturador (Shipped: 2026-03-16)

**Phases completed:** 4 phases (8–11), 9 plans
**Stats:** 3 días (2026-03-13 → 2026-03-16) | 47 archivos | +7,174 líneas

**Key accomplishments:**
1. Schema DB extendido con tipos AFIP-ready (CondicionIVA, MonedaFactura), modelo LimiteFacturacionMensual y campos de auditoría en PracticaRealizada vía migración hand-written segura
2. Documento de referencia AFIP/ARCA (774 líneas) con contrato TypeScript EmitirComprobante, patrones WSAA, WSFEv1, CAEA y advisory lock para CAE — listo para implementación real en v1.2
3. Capa backend de facturación: getMonthBoundariesART() UTC-3 + 5 métodos FinanzasService + 7 endpoints nuevos (ADMIN+FACTURADOR) + AfipStubService tipado
4. Routing exclusivo para FACTURADOR: `/dashboard/facturador` con redirect automático, KPI cards de prácticas pendientes por OS, barra de progreso límite mensual, e input de configuración
5. Flujo de liquidación completo: edición inline de montoPagado por práctica, navegación por OS, CerrarLoteModal con confirmación, transacción atómica que crea LiquidacionObraSocial y marca prácticas como PAGADO

---

## v1.0 CRM Conversion (Shipped: 2026-03-03)

**Phases completed:** 9 phases, 23 plans, 9 tasks

**Stats:** 114 commits | 163 archivos | +23,597 líneas | 8 días (2026-02-23 → 2026-03-02)

**Key accomplishments:**
1. Infraestructura BullMQ + Redis con retry exponencial y credenciales WABA cifradas AES-256-GCM por tenant
2. Sistema de log de contactos con scoring automático de prioridad y Lista de Acción diaria del coordinador
3. Presupuestos completos: PDF con branding, envío por email, página pública de aceptación/rechazo con token, CRM auto-transitions
4. Integración WhatsApp Cloud API: templates, mensajes libres, webhook Meta con HMAC-SHA256, hilo de mensajes con delivery status, 3 puntos de envío, null-guard para rol SECRETARIA
5. Dashboard de conversión: embudo 6 etapas con tasas de paso, KPIs por período, motivos de pérdida, pipeline income, performance del coordinador con atribución real
6. 4 fases de gap-closure (2.1, 4.1, 6, 7): SECRETARIA FK fix, email-channel removal, registradoPorId attribution, PROCEDIMIENTO_REALIZADO en funnel, historial completo de contactos

**Known tech debt:**
- EncryptionService dev fallback key — requiere ENCRYPTION_KEY en .env de producción
- console.log('DTO RECIBIDO') en pacientes.service.ts — expone PII en logs
- SMTP password decryption no implementada per-tenant

---

