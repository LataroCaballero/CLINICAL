# CLINICAL — Plataforma SaaS para Clínicas de Cirugía Estética

## What This Is

Plataforma SaaS multi-tenant de gestión de clínicas, orientada especialmente a cirujanos plásticos y estéticos. Cubre la administración completa de la clínica (pacientes, turnos, historia clínica, finanzas, stock) con un diferencial competitivo en **conversión de pacientes en cirugías**: el módulo CRM permite registrar interacciones, enviar presupuestos con PDF, comunicarse por WhatsApp, y ver el dashboard de conversión completo (embudo, KPIs, motivos de pérdida, performance del coordinador).

El producto se vende por suscripción con tiers: el tier base incluye gestión de pacientes, turnos, estadísticas y CRM de conversión; los tiers superiores agregan módulos financieros y reportes ejecutivos.

## Core Value

**Que un cirujano plástico cierre más cirugías** — el sistema debe hacer visible qué pacientes seguir, cuándo contactarlos y cómo, de la manera más automatizada y simple posible para profesionales sin background en marketing o sistemas.

## Current Milestone: v1.14 Portal — Firma Gated e Indicaciones Separadas

**Goal:** Endurecer el flujo legal del portal del paciente (firmar el consentimiento requiere abrir el PDF y tildar leído), separar las indicaciones en su propia sección con acuse de lectura registrado en el perfil, y cerrar la deuda W-1 (el board CRM refleja consentimiento/indicaciones completos vía invalidación inmediata).

**Target features:**
- **Gate de firma del consentimiento:** el paciente debe abrir/ver el PDF del consentimiento **y** tildar "Leí el consentimiento" para habilitar la firma. Se desacopla del checkbox de indicaciones (hoy la firma depende de `indicacionesLeidas`).
- **Indicaciones como sección aparte:** separada del consentimiento; se marcan como leídas al abrir el link (sin firma dibujada); el acuse se registra en el perfil del paciente.
- **Cierre W-1:** el board del staff refleja consentimiento/indicaciones completos vía invalidación `['crm-kanban']` + refetch on focus (sin infra nueva).

**Estado:** Phase 61 completa y verificada (2026-07-17, 5/5 planes, verificación 5/5) — backend listo: `Paciente.indicacionesLeidasAt` migrado (patrón pgBouncer), `firmarConsentimiento` desacoplado de indicaciones (CONS-11), endpoint portal-scoped de acuse set-once (INDIC-03), `computePasosCrm` deriva `indicacionesPreop` del perfil sin truncación `take:1` + guard de regresión durable (INDIC-04). Próximo: Phase 62 (frontend portal + staff).

## Requirements

### Validated

- ✓ Autenticación con JWT y roles (ADMIN, PROFESIONAL, SECRETARIA, PACIENTE, FACTURADOR) — existente
- ✓ Gestión de pacientes (CRUD, búsqueda, drawer con datos completos) — existente
- ✓ Calendario de turnos con estados y sesión en vivo (LiveTurno) — existente
- ✓ Historia clínica con templates y entradas por turno — existente
- ✓ Gestión de obras sociales y planes — existente
- ✓ Módulos financieros (presupuestos, pagos, cuentas corrientes, stock) — existente
- ✓ CRM base: etapas (EtapaCRM), temperatura de paciente, kanban board, scheduler de seguimiento diario — existente
- ✓ Filtrado por contexto profesional (multi-profesional en misma clínica) — existente
- ✓ Reportes operativos y financieros base — existente
- ✓ Infraestructura BullMQ + Redis con retry exponencial — v1.0
- ✓ Credenciales WABA per-tenant con cifrado AES-256-GCM — v1.0
- ✓ Consentimiento WhatsApp (whatsappOptIn) por paciente con timestamp — v1.0
- ✓ Registro estado de entrega de mensajes WhatsApp — v1.0
- ✓ Log de contactos (llamada/mensaje/presencial) con atribución de coordinador — v1.0
- ✓ Historial completo de interacciones con expansión in-place — v1.0
- ✓ Actualización CRM+temperatura al registrar interacción en el mismo paso — v1.0
- ✓ Indicador de días sin contacto por paciente — v1.0
- ✓ Lista de acción diaria con scoring automático (días × temp × etapa) — v1.0
- ✓ Prioridad automática en lista de acción — v1.0
- ✓ Registrar interacción desde lista de acción (incluye rol SECRETARIA) — v1.0
- ✓ Pacientes contactados hoy desaparecen de la lista hasta mañana — v1.0
- ✓ Presupuestos con ítems, montos, moneda (ARS/USD) y fecha de validez — v1.0
- ✓ PDF del presupuesto con branding de la clínica (logo, profesional, desglose) — v1.0
- ✓ Envío de presupuesto por email con PDF adjunto y link de aceptación — v1.0
- ✓ Envío de presupuesto por WhatsApp como documento PDF — v1.0
- ✓ Estados de presupuesto: borrador/enviado/aceptado/rechazado/vencido — v1.0
- ✓ Al enviar presupuesto → CRM sube a PRESUPUESTO_ENVIADO automáticamente — v1.0
- ✓ Al aceptar presupuesto → CRM cierra como CONFIRMADO automáticamente — v1.0
- ✓ Al rechazar presupuesto → captura motivo de pérdida y baja a PERDIDO — v1.0
- ✓ Envío de mensajes WhatsApp desde perfil/turno/presupuesto con templates Meta — v1.0
- ✓ Estado de entrega por mensaje (enviado/entregado/leído/fallido) en tiempo real — v1.0
- ✓ Mensajes inbound de pacientes → log de contactos automático — v1.0
- ✓ Webhook Meta con validación HMAC-SHA256 — v1.0
- ✓ Retry de mensaje fallido — v1.0
- ✓ Auto TURNO_AGENDADO al crear turno para paciente sin etapa CRM — v1.0
- ✓ Auto CONSULTADO/PROCEDIMIENTO_REALIZADO al cerrar sesión (LiveTurno) — v1.0
- ✓ Auto PRESUPUESTO_ENVIADO al enviar presupuesto — v1.0
- ✓ Auto CONFIRMADO al aceptar presupuesto — v1.0
- ✓ Inbound WA sube temperatura a CALIENTE automáticamente — v1.0
- ✓ Dashboard: embudo 6 etapas con tasas de paso (incl. PROCEDIMIENTO_REALIZADO) — v1.0
- ✓ Dashboard: ingreso potencial del pipeline (presupuestos ENVIADOS de pacientes CALIENTES) — v1.0
- ✓ Dashboard: motivos de pérdida con porcentajes — v1.0
- ✓ Dashboard: KPIs por período (nuevos, confirmados, tasa de conversión) — v1.0
- ✓ Dashboard: performance del coordinador con atribución real por usuario — v1.0
- ✓ Schema DB AFIP-ready: CondicionIVA/MonedaFactura enums, LimiteFacturacionMensual model, PracticaRealizada audit fields — v1.1
- ✓ Documento de integración AFIP/ARCA (774 líneas): WSAA, WSFEv1, CAEA, RG 5616/2024, contrato TypeScript EmitirComprobante — v1.1
- ✓ Capa backend de facturación: getMonthBoundariesART() UTC-3, 5 FinanzasService methods, 7 endpoints (ADMIN+FACTURADOR), AfipStubService — v1.1
- ✓ Dashboard FACTURADOR: routing exclusivo `/dashboard/facturador`, KPIs por OS, barra progreso límite mensual, configuración de límite — v1.1
- ✓ Flujo de liquidación: edición inline montoPagado, CerrarLoteModal, transacción atómica LiquidacionObraSocial — v1.1
- ✓ Emisión de comprobantes electrónicos AFIP/ARCA reales (CAE real, certificado por tenant) — v1.2
- ✓ CAEA contingency mode para cuando ARCA no responde — v1.2
- ✓ QR AFIP en PDF de comprobantes (RG 5616/2024, 13 campos) — v1.2
- ✓ Errores AFIP en español en modal con error panel (BUG-1 + BUG-2 corregidos) — v1.2
- ✓ 5 tipos de turno con semántica de flujo (Consulta para cirugía, Consulta para tratamiento, Pre-operatorio, Control, Consulta pendiente) — v1.4
- ✓ Campo `flujo` (CIRUGIA | TRATAMIENTO | PENDIENTE) en Paciente con auto-update al crear turno (guard PENDIENTE-only) — v1.4
- ✓ Embudo CRM filtrado exclusivamente a pacientes CIRUGIA; legacy (flujo IS NULL con etapaCRM) preservados — v1.4
- ✓ Banner LiveTurno amber no bloqueante para clasificar pacientes PENDIENTE (dismissible por sesión) — v1.4
- ✓ Tab "Tratamientos" en /dashboard/pacientes — lista mensual navegable, filtro por tipo, FlujoBadge por paciente — v1.4
- ✓ Catálogo de tratamientos extendido con insumos del stock y precio base calculado (TratamientoInsumo n:n, recalcular-precio, InsumosEditor) — v1.5
- ✓ Catálogo de cirugías por profesional con precios ARS/USD, insumos con cantidades y cálculo de costo desde inventario — v1.5
- ✓ LiveTurno HC: "Tratamiento en Consultorio" con multi-selector de catálogo, texto libre como complemento, checkbox de insumos condicional — v1.5
- ✓ Órdenes de consumo de stock creadas atomicamente al guardar HC con insumos; confirmación end-to-end en /dashboard/stock/consumo — v1.5
- ✓ Presupuestos con panel de selección de catálogo (cirugías + tratamientos), snapshot de precio al seleccionar, ítems libres preservados — v1.5
- ✓ Tab Tratamientos: columna "Último tratamiento" por paciente via batch subquery — v1.5
- ✓ Cambio de flujo desde PatientDrawer con update optimista, etapaCRM reset y ContactoLog automático — v1.5
- ✓ Entrada de HC desde PatientDrawer usando HCCreatorForm reutilizable, sin turno activo, con fecha retroactiva — v1.5
- ✓ EstadoTurno extendido con EN_ESPERA y SIENDO_ATENDIDO; 3 endpoints de transición (marcarEnEspera, marcarAusente, reactivar); iniciarSesion establece SIENDO_ATENDIDO — v1.6
- ✓ Widget Agenda Operativo: columna Tipo de Turno reordenada, nombre del paciente clickeable abre PatientDrawer, menú ⋮ contextual con acciones por estado — v1.6
- ✓ LiveTurno simplificado: sin timer, exit sin HC llama cerrarSesion (turno FINALIZADO), switch-session mediante AlertDialog — v1.6
- ✓ Movimiento libre entre etapas CRM via drag-and-drop; guard forward-only (`isAutoTransitionBlocked` + `ETAPA_ORDEN`) protege auto-transiciones del sistema en 5 call sites — v1.7
- ✓ Toast no bloqueante PRESUPUESTO_ENVIADO (sin presupuesto) y CONFIRMADO (sin presupuesto aceptado); drag siempre persiste; snap-back vía onSettled — v1.7
- ✓ EtapaStepper interactivo: 7 pasos clickeables, misma warning logic que drag-and-drop, PERDIDO abre LossReasonModal — v1.7
- ✓ Sheet lateral rediseñado: CRMFlujoBadge (Cirugía/Tratamiento/Pendiente), ContactoRapidoModal Dialog, botón lista de espera compacto, panel de acciones rápidas removido — v1.7
- ✓ Acciones contextuales por etapa: presupuesto nav (PRESUPUESTO_ENVIADO), HC creation (CONSULTADO), marcar realizado (PROCEDIMIENTO_REALIZADO) — v1.7
- ✓ rechazar() guard etapasProtegidas; STEPPER_CHAIN alineado con ETAPA_ORDEN; getKanban ACEPTADO-first elimina falsos positivos CRM-03 — v1.7
- ✓ 4 tipos de turno públicos (Consulta, Control, Pre-Quirúrgico, Tratamiento) con migración de datos sin pérdida; tipo interno Cirugía preservado vía filtro `esCirugia=false`; seed idempotente + color Pre-Quirúrgico en CalendarGrid — v1.8
- ✓ Tipo de entrada en HC (`TipoEntradaHC`: CONSULTA_CIRUGIA/TRATAMIENTO/CONTROL/SEGUIMIENTO/PREOPERATORIO) con selector obligatorio en HCCreatorForm y helper puro `resolverNuevoFlujo` con suite de 10 casos — v1.8
- ✓ Clasificación automática de flujo/etapa CRM al cerrar sesión basada en tipoEntrada (CONSULTA_CIRUGIA→CIRUGIA+CONSULTADO; TRATAMIENTO→TRATAMIENTO; dual-state preservado para CIRUGIA) — v1.8
- ✓ Estado dual: paciente CIRUGIA con turno/HC de tratamiento aparece simultáneamente en kanban CRM y TratamientosTab sin perder etapa — v1.8
- ✓ TratamientosTab dual-source: turnos de tipo Tratamiento (fuente A) + Consultas con HC tipo TRATAMIENTO (fuente B) vía `tipoEntradaHC` en obtenerTurnosPorRango, columna "Consulta → Tratamiento" y filtro CONSULTA_TRATAMIENTO — v1.8
- ✓ Archivar del embudo CRM: campo `crmArchivado`, endpoint `PATCH /pacientes/:id/crm-archivo` toggle, exclusión automática en getKanban/getListaAccion, botón "Archivar del embudo" con confirmación — v1.8
- ✓ Catálogo de zonas/diagnósticos/tratamientos de HC en BD por profesional (ZonaHC/DiagnosticoHC/TratamientoHC, FK + esSistema + soft-delete), seed idempotente de 6 zonas desde el JSON anterior; reemplaza `zonas-diagnostico.json` — v1.9
- ✓ Plantilla Primera Consulta con la zona como eje único: seleccionar zona despliega sus diagnósticos y tratamientos; multi-zona agrupada visualmente; HC persiste JSONB agrupado por zona (dual-shape); lookup de precio catálogo→fallback preservado — v1.9
- ✓ Tratamiento aprendido se crea también en el catálogo del profesional con precio 0 y FK opcional, listo para completar en Configuración — v1.9
- ✓ Admin UI "Catálogo HC" en Configuración: ver, renombrar (PATCH) y eliminar (soft-delete con cascada lógica, guard esSistema) zonas/diagnósticos/tratamientos; HC históricas intactas — v1.9
- ✓ Columna "Último tratamiento" resuelta por turno: extractor puro `resumirTratamientosDeContenido` normaliza los 3 shapes de HC (v1.9 zona-agrupado, legacy plano, texto libre/consultorio) en `obtenerTurnosPorRango`, eliminando el query N+1 — v1.10 (TRAT-01/02)
- ✓ Snapshot de tratamientos persistido siempre que haya `tratamientoIds`, independiente de `consumirInsumos` (fix LIVHC-05); insumos y OrdenConsumo siguen condicionados al consumo — v1.10 (TRAT-03)
- ✓ Filtro automático: pacientes CIRUGIA sin tratamiento real ocultos de la planilla (predicado client-side source-B null) preservando el estado dual v1.8 — v1.10 (TRAT-04/05)
- ✓ Chips de "Estado" con color-coding semántico para los 7 valores reales de `EstadoTurno` vía helper puro `getEstadoTurnoChip` en `@/lib/estadoTurno` — v1.10 (TRAT-06)
- ✓ Componente compartido `HCEntryContent.tsx` (`HCEntryChips` tarjeta + `HCEntryFullContent` detalle) que renderiza el contenido completo de una entrada HC (chips zona/diagnósticos/tratamientos + observaciones + precios + comentario), soportando los 2 shapes de `contenido` (v1.9 `zonas[]` y legacy plano) y texto libre — v1.11 (HCSHEET-01)
- ✓ Tarjetas de la lista de HC en PatientSheet con chips de color (reemplazan el resumen truncado en texto plano) vía `HCEntryChips` — v1.11 (HCSHEET-02)
- ✓ Detalle expandido de una entrada HC en PatientSheet con contenido completo (chips + observaciones + comentario) y paridad visual con `HistorialClinicoPanel` y `TurnoHCModal` vía `HCEntryFullContent` — v1.11 (HCSHEET-03)
- ✓ Schema big-bang del milestone en una migración atómica (catálogos preop por profesional, guard fields CHAT, campos portal/staging, estudiosComplementarios JSON) — v1.12 (Phase 51)
- ✓ Fix del spam "Seguimiento CRM": scheduler alerta cada tarea una sola vez vía guard `notificada` + limpieza del flood histórico en el mismo release atómico — v1.12 (CHAT-01, CHAT-02)
- ✓ Plantilla HC Prequirúrgico estructurada por secciones con chips de antecedentes/alergias/medicación desde catálogos por profesional, auto-learning vía "Otro", checklist de estudios, check de consentimiento con timestamp y compartir link (WhatsApp/QR/email); sincroniza al perfil del paciente (`condiciones[]`/`alergias[]`/`medicacion[]`) — v1.12 (PREOP-01..12)
- ✓ `StorageService` en disco local cloud-ready + upload de PDF validado por magic-bytes (nombres UUID, `Content-Disposition: attachment`) + `ThrottlerModule` global con strict tier en rutas públicas — v1.12 (INFRA-01..03)
- ✓ Upload de PDF de consentimiento por zona desde Configuración (version-roll, historial preservado) + links de indicaciones preoperatorias por procedimiento — v1.12 (CONS-01, CONS-02)
- ✓ Portal de autogestión del paciente con token SHA-256 hasheado en BD (URL lleva UUID crudo), lock anti-fuerza-bruta por DNI (3 intentos/15 min → 429), JWT portal-scoped, escrituras confinadas a campos staged sin tocar datos clínicos curados — v1.12 (PORTAL-01, PORTAL-04, PORTAL-06)
- ✓ Portal frontend mobile-first: wizard de 4 pasos sin login (DNI-gate, Info básica editable, Salud staged con chips `*AutoReportad*`, caja de Consultas one-way → `MensajeInterno origenPaciente=true`) — v1.12 (PORTAL-02, PORTAL-03, PORTAL-05, CHAT-04)
- ✓ Consentimiento firmado: firma dibujada estampada sobre el PDF original (pdf-lib), PDF firmado archivado con metadata forense (fecha/IP/userAgent/versión/hash SHA-256), badge "Consentimiento firmado" en PatientSheet, check de indicaciones y badge visual "Paciente" (teal) en el chat del staff — v1.12 (CONS-03..08, CHAT-03)
- ✓ Backend CRM enriquecido: helper puro `computePasosCrm` (TDD) expone estado de 5 pasos + `todosCompletos` por paciente en `getKanban`; etapa "Cirugía Realizada" (reutiliza enum `PROCEDIMIENTO_REALIZADO`) como columna propia; `@Cron` diario de auto-move sobre fecha de cirugía pasada; guard forward-only relajado para reactivar a `TURNO_AGENDADO` al crear turno desde cualquier etapa — v1.13 (EMBUDO-02, EMBUDO-05)
- ✓ Board Kanban CRM: reorden de columnas (`SIN_CLASIFICAR` al final, `Cirugía Realizada` tras `Confirmado`), badge naranja en operados con pasos pendientes, filtro `todosCompletos` que oculta operados completos, y etiqueta de contacto ("Espera fecha"/"Cirugía programada") en tarjetas de Confirmado — v1.13 (EMBUDO-01/03/04, CONTACTO-01/02)
- ✓ Stepper accionable del sheet lateral: círculo verde (paso completo, sin acción) / naranja (pendiente) por estado de paso; click en paso naranja abre el modal que lo resuelve — wizard HC (`HCCreatorDialog`), presupuesto prellenado desde catálogo (`GenerarPresupuestoModal`), o agenda de cirugía (`SurgeryAppointmentModal`, `POST /turnos/cirugia`) — con invalidación `['crm-kanban']` por acción; consentimiento/indicaciones como sub-indicadores de solo lectura — v1.13 (STEPPER-01..06)
- ✓ Estadísticas sobre registros reales: `getKpis` calcula `cirugiasRealizadas` (`Cirugia`, fecha<now, notIn CANCELADA/SUSPENDIDA) y `tratamientosRealizados` (`HistoriaClinicaEntrada` TRATAMIENTO), scopeados por `profesionalId` e independientes de `etapaCRM`; dos `KpiCard`s nuevos en el dashboard; spec del invariante (8/8) + SECURED (5/5) — v1.13 (STATS-01, STATS-02)

### Active

**Milestone activo: v1.14 Portal — Firma Gated e Indicaciones Separadas** (ver `## Current Milestone` arriba). Requisitos frescos en `.planning/REQUIREMENTS.md`.

**Candidatos para próximos milestones / diferidos:**
- [ ] Dashboard de estadísticas ejecutivas con reportes exportables y comparativas por período (REPORT-F01, diferido de v1.13)
- [ ] Automatizaciones de seguimiento: triggers basados en tiempo/etapa (ej. "30 días sin respuesta → mensaje automático") (REPORT-F02, diferido de v1.13)
- [ ] Módulos financieros optimizados e interconectados con CRM
- [ ] Tipos de turno personalizados por profesional desde Configuración (TIPO-F01) + color por tipo en calendario (TIPO-F02) — diferido de v1.8
- [ ] CRM: vista de pacientes archivados con desarchivar en lote (CRM-F01) + archivado automático tras N días en PERDIDO (CRM-F02) — diferido de v1.8

### Out of Scope

- App móvil nativa — web-first, mobile a futuro
- Chat en tiempo real entre pacientes y clínica — WhatsApp cubre este caso por ahora
- Facturación electrónica AFIP real en v1.1 — completada la investigación, implementación real planificada para v1.2
- Tiers de suscripción con feature flags — deferido a cuando haya clientes reales con necesidades diferenciadas
- Eliminar el tipo "Cirugía" interno — la agenda quirúrgica lo requiere (v1.8)
- tipoEntrada retroactivo en entradas HC legacy — backfill innecesario, se tratan como CONSULTA_CIRUGIA por defecto (v1.8)

## Shipped: v1.13 Embudo CRM Accionable ✅

15/15 requisitos completados en 3 días (2026-07-03 → 2026-07-05). 4 fases (57–60), 8 planes, 19 tareas. Audit `tech_debt` (15/15 reqs code-verified, 11/11 wired, 2/2 flujos E2E, 0 blockers). El tramo post-consulta del embudo CRM quedó accionable y ordenado: el backend enriqueció `getKanban` con un helper puro `computePasosCrm` (TDD) que expone el estado de 5 pasos + `todosCompletos` por paciente, sumó la etapa "Cirugía Realizada" (reutilizando el enum `PROCEDIMIENTO_REALIZADO`), un `@Cron` diario de auto-move sobre fecha de cirugía pasada, y relajó el guard forward-only para reactivar a `TURNO_AGENDADO` al crear turno desde cualquier etapa. El board se reordenó (`Sin clasificar` al final, `Cirugía Realizada` tras Confirmado), oculta operados completos (tagueados para stats), marca en naranja los operados con pendientes y etiqueta las tarjetas de Confirmado ("Espera fecha"/"Cirugía programada"). El stepper del sheet lateral es accionable: cada paso muestra verde (completo) o naranja (pendiente) y al click abre el modal que lo resuelve — wizard HC, presupuesto prellenado desde catálogo o agenda de cirugía — con invalidación `['crm-kanban']`. Las estadísticas de cirugías/tratamientos se calculan sobre registros reales (`Cirugia`/`HistoriaClinicaEntrada`) independientes de `etapaCRM`, con spec del invariante (8/8) + SECURED (5/5). **Diferido al cierre:** 5 escenarios browser UAT de Phase 58 + display de KPI cards de Phase 60 (código verificado y wired) + 2 ítems de deuda carried. Ver `.planning/milestones/v1.13-ROADMAP.md` para detalles.

## Shipped: v1.12 Prequirúrgico Estructurado + Portal del Paciente ✅

33/33 requisitos completados en 8 días (2026-06-25 → 2026-07-02). 6 fases (51–56), 30 planes, 58 tareas. Audit ✅ PASSED (30/30 reqs, 6/6 flujos E2E). Dos capacidades nuevas: (1) la **plantilla HC Prequirúrgico estructurada** que reemplaza el texto libre por secciones con chips de antecedentes/alergias/medicación desde catálogos por profesional (con auto-learning vía "Otro"), checklist de estudios complementarios, check de consentimiento con timestamp y compartir link (WhatsApp/QR/email), sincronizando lo confirmado al perfil del paciente; y (2) el **portal de autogestión del paciente**, un wizard mobile-first de 4 pasos accesible por token persistente sin login (token SHA-256 hasheado en BD, lock anti-fuerza-bruta por DNI, JWT portal-scoped) donde el paciente corrige sus datos de contacto, auto-reporta salud a campos *staged* (sin tocar los registros clínicos curados), consulta al médico (one-way al chat del staff) y **firma el consentimiento** dibujando su firma — que se estampa sobre el PDF original y se archiva con metadata forense (fecha/IP/userAgent/versión/hash SHA-256). Soporte: `StorageService` en disco cloud-ready, upload validado por magic-bytes, `ThrottlerModule` global, y el fix del spam "Seguimiento CRM" (dedupe + limpieza atómica). Badges de estado de consentimiento y de origen de mensaje ("Paciente" teal) en la vista del staff. **Gate legal pendiente pre-go-live:** revisión del flujo de consentimiento (Ley 25506 / Ley 26529) antes del primer paciente quirúrgico real. Ver `.planning/milestones/v1.12-ROADMAP.md` para detalles.

## Shipped: v1.11 HC Completa en Ficha de Paciente ✅

3/3 requisitos completados en 1 día (2026-06-24). 1 fase (50), 1 plan. Las entradas de HC dentro del PatientSheet ahora renderizan el contenido completo con la misma riqueza visual que LiveTurno y la agenda: se creó el componente compartido `HCEntryContent.tsx` (`HCEntryChips` para tarjetas, `HCEntryFullContent` para el detalle) que muestra zona/diagnósticos/tratamientos como chips de color + observaciones + precios + comentario, manejando los 2 shapes de `contenido` (v1.9 `zonas[]` y legacy plano) y el texto libre; cableado en `FreeEntryPreview` (tarjetas) y `FreeEntryFullContent` (detalle), reemplazando el resumen truncado en texto plano. Trabajo solo de frontend (datos ya disponibles vía `useHistoriaClinica`). Verificación visual aprobada por el usuario. Ver `.planning/milestones/v1.11-ROADMAP.md` para detalles.

## Shipped: v1.10 Refinamiento Planilla de Tratamientos ✅

6/6 requisitos completados en 1 día (2026-06-22). 2 fases (48–49), 3 planes. La columna "Último tratamiento" ahora se resuelve por turno desde la HC correspondiente (extractor puro de 3 shapes, sin N+1); el snapshot de tratamientos se persiste siempre que haya `tratamientoIds` aunque `consumirInsumos=false` (fix LIVHC-05); los pacientes CIRUGIA sin tratamiento real se filtran automáticamente de la planilla preservando el estado dual de v1.8; y los chips de "Estado" tienen color-coding semántico para los 7 valores reales de `EstadoTurno` vía helper compartido. Audit ✅ PASSED. Ver `.planning/milestones/v1.10-ROADMAP.md` para detalles.

## Shipped: v1.9 Plantilla Primera Consulta ✅

14/14 requisitos completados en 1 día (2026-06-12 → 2026-06-13). 4 fases, 12 planes. Catálogo de zonas/diagnósticos/tratamientos de HC migrado del JSON hardcodeado a BD por profesional; PrimeraConsultaForm rediseñado con la zona como eje único y agrupación visual multi-zona; auto-aprendizaje vía "Otros" que persiste opciones nuevas y crea tratamientos en el catálogo (precio 0); Admin UI en Configuración para renombrar/eliminar. Ver `.planning/milestones/v1.9-ROADMAP.md` para detalles.

## Shipped: v1.8 Tipos de Turno y Flujo Clínico ✅

17/17 requisitos completados en 2 días (2026-06-08 → 2026-06-09). 4 fases, 8 planes. Tipos de turno simplificados a 4 públicos + Cirugía interno; tipo de entrada en HC con clasificación automática de flujo al cerrar sesión; estado dual cirugía+tratamiento; archivar del embudo CRM. Ver `.planning/milestones/v1.8-ROADMAP.md` para detalles.

## Shipped: v1.7 CRM Flexible ✅

17/17 requisitos completados en 6 días (2026-05-23 → 2026-05-28). 5 fases, 10 planes. CRM kanban: movimiento libre de etapas, warnings no bloqueantes, sheet redesign con stepper interactivo y acciones contextuales. Ver `.planning/milestones/v1.7-ROADMAP.md` para detalles.

## Shipped: v1.6 Agenda Operativa ✅

14/14 requisitos completados en 2 días (2026-05-13 → 2026-05-14). 3 fases, 6 planes. Ver `.planning/milestones/v1.6-ROADMAP.md` para detalles.

## Context

**Estado actual (post-v1.13):** El tramo post-consulta del embudo CRM es ahora accionable y ordenado. `getKanban` (`pacientes.service.ts`) expone, vía el helper puro `computePasosCrm` (TDD), el estado de los 5 pasos (turno de cirugía con fecha/estado, entrada de HC relevante, presupuesto enviado/aceptado, consentimiento firmado, indicaciones preop) más el flag `todosCompletos` por paciente. La etapa "Cirugía Realizada" es una columna propia (reutiliza el enum `PROCEDIMIENTO_REALIZADO`), alimentada por un `@Cron` diario que mueve a los operados cuando su fecha de cirugía pasó; el guard forward-only se relaja para reactivar a `TURNO_AGENDADO` al crear un turno desde cualquier etapa. El board reordena las columnas (`Sin clasificar` al final, `Cirugía Realizada` tras Confirmado), oculta operados completos (tagueados para stats), marca en naranja los operados con pendientes y etiqueta las tarjetas de Confirmado ("Espera fecha"/"Cirugía programada"). El `EtapaStepper` del sheet lateral (`CardActionsSheet`) muestra cada paso verde/naranja y al click abre el modal que lo resuelve — `HCCreatorDialog`, `GenerarPresupuestoModal` prellenado desde catálogo, o `SurgeryAppointmentModal` (`POST /turnos/cirugia`) — con invalidación `['crm-kanban']` por acción; consentimiento/indicaciones son sub-indicadores de solo lectura (completan vía el portal v1.12, sin invalidación inmediata — W-1). `getKpis` calcula `cirugiasRealizadas`/`tratamientosRealizados` sobre registros reales (`Cirugia`/`HistoriaClinicaEntrada`) independientes de `etapaCRM`, expuestos como dos `KpiCard`s nuevos. 15/15 requisitos v1.13 completados en 3 días (4 fases, 8 planes); audit `tech_debt` con 0 blockers. **Diferido:** browser UAT de Phase 58 (5 escenarios) + display de KPI cards de Phase 60 (ver STATE.md → Deferred Items).

**Estado previo (post-v1.12):** La HC prequirúrgica es ahora un formulario estructurado por secciones (chips de antecedentes/alergias/medicación con catálogos por profesional y auto-learning, estudios complementarios, check de consentimiento con timestamp) que reemplaza el texto libre y sincroniza lo confirmado al perfil del paciente. Existe un **portal de autogestión del paciente** por token persistente sin login (token SHA-256 hasheado, lock anti-fuerza-bruta por DNI, JWT portal-scoped, endpoints con rate limiting): un wizard mobile-first de 4 pasos donde el paciente corrige contacto, auto-reporta salud a campos *staged* (sin tocar registros clínicos curados), consulta al médico (one-way al chat del staff con badge "Paciente") y **firma el consentimiento** — la firma dibujada se estampa sobre el PDF original con pdf-lib y se archiva con metadata forense (fecha/IP/userAgent/versión/hash SHA-256). Nueva infraestructura: `StorageService` en disco cloud-ready, upload de PDF validado por magic-bytes, `ThrottlerModule` global, y el fix del spam "Seguimiento CRM". El estado de consentimiento firmado es visible en PatientSheet. **Pendiente pre-go-live:** revisión legal del flujo de consentimiento (Ley 25506 / Ley 26529) antes del primer paciente quirúrgico real; además 17 ítems de verificación/UAT humana diferidos al cierre (ver STATE.md → Deferred Items). 33/33 requisitos v1.12 completados en 8 días (6 fases, 30 planes); audit PASSED.

**Estado previo (post-v1.11):** La Historia Clínica dentro de la Ficha de Paciente (PatientSheet) ya no muestra resúmenes truncados en texto plano: renderiza el contenido completo de cada entrada con la misma riqueza visual que LiveTurno (`HistorialClinicoPanel`) y la agenda (`TurnoHCModal`). Se creó un componente de render compartido (`frontend/src/components/patient/PatientDrawer/views/HCEntryContent.tsx`) con dos variantes — `HCEntryChips` para las tarjetas de la lista (chips de color de zona/diagnósticos/tratamientos) y `HCEntryFullContent` para el detalle expandido (chips + bloque de observaciones + precios ARS por tratamiento + total + comentario). Ambas variantes manejan los dos shapes de `contenido` JSONB (v1.9 agrupado por zona `zonas[]` y legacy plano) más el caso de texto libre. Se cablearon en `FreeEntryPreview` y `FreeEntryFullContent` dentro de `HistoriaClinica.tsx`. Trabajo solo de frontend: los datos completos ya llegaban vía `useHistoriaClinica`. El componente queda disponible para una futura consolidación de `HistorialClinicoPanel` y `TurnoHCModal` (diferida). 3/3 requisitos v1.11 completados en 1 día (1 fase, 1 plan); verificación visual aprobada.

**Estado previo (post-v1.10):** La planilla de Tratamientos en `/dashboard/pacientes` es ahora confiable y legible. La columna "Último tratamiento" se resuelve por turno: un extractor puro (`resumirTratamientosDeContenido`) lee el `contenido` de la HC de cada turno y normaliza los tres shapes (v1.9 agrupado por zona, legacy plano, texto libre/consultorio) a un resumen-con-conteo, eliminando el query N+1 anterior. El snapshot de tratamientos se persiste siempre que la HC tenga `tratamientoIds`, aunque `consumirInsumos=false` (fix LIVHC-05), manteniendo la OrdenConsumo condicionada al consumo. Los pacientes con flujo CIRUGIA que no tienen ningún tratamiento real se filtran automáticamente de la planilla (predicado client-side sobre la fuente B), sin romper el estado dual de v1.8. Los chips de "Estado" usan un helper compartido (`getEstadoTurnoChip` en `@/lib/estadoTurno`) con color-coding semántico para los 7 valores reales de `EstadoTurno`. 6/6 requisitos v1.10 completados en 1 día (2 fases, 3 planes).

**Estado previo (post-v1.9):** La plantilla de Primera Consulta de la HC ahora tiene la zona anatómica como eje único: el profesional selecciona una zona (Abdomen, Mamas, Nariz, Facial, Locales, Otros) y se despliegan sus diagnósticos y tratamientos; con varias zonas la selección se agrupa visualmente. El catálogo de zonas/diagnósticos/tratamientos vive en BD por profesional (modelos ZonaHC/DiagnosticoHC/TratamientoHC con seed idempotente, reemplazando el `zonas-diagnostico.json` hardcodeado) y se autoenriquece: lo que el profesional escribe en "Otros" se persiste para la próxima consulta, y un tratamiento aprendido aparece también en su catálogo de tratamientos con precio 0. Desde Configuración → "Catálogo HC" puede ver, renombrar y eliminar (soft-delete) cualquier ítem, sin afectar las HC históricas. 14/14 requisitos v1.9 completados en 1 día (4 fases, 12 planes).

**Estado previo (post-v1.8):** Los tipos de turno se simplificaron a 4 públicos (Consulta, Control, Pre-Quirúrgico, Tratamiento) más el tipo interno Cirugía para la agenda quirúrgica. Al cerrar la sesión de una HC, el profesional clasifica el tipo de entrada (CONSULTA_CIRUGIA, TRATAMIENTO, CONTROL, SEGUIMIENTO, PREOPERATORIO) y el sistema actualiza automáticamente el flujo del paciente y su etapa CRM. Un paciente de cirugía que también recibe tratamientos vive en estado dual: aparece en el kanban CRM y en la planilla de tratamientos simultáneamente, sin perder etapa. La secretaria puede archivar pacientes del embudo CRM (`crmArchivado`) sin eliminarlos: desaparecen del kanban y de la lista de acción pero siguen en el sistema. 17/17 requisitos v1.8 completados en 2 días (4 fases, 8 planes).

**Estado previo (post-v1.7):** El CRM kanban es un entorno de trabajo completo para la secretaria: arrastre libre entre etapas con warnings no bloqueantes, sheet lateral con badge de flujo, stepper de 7 etapas clickeable con acciones contextuales, y botones para registrar contacto y gestionar lista de espera. Las auto-transiciones del sistema nunca sobreescriben etapas avanzadas puestas a mano. Tech debt cosmético: variable `maybyCRMUpdate` (typo) en rechazar(), animación de cierre del sheet cortada, SHEET-04 dice 6 etapas pero se muestran 7 en cadena + PERDIDO separado.

**Stack:** NestJS + Prisma + PostgreSQL (backend) | Next.js 16 + React 19 + TypeScript (frontend) | BullMQ + Redis (async) | WhatsApp Cloud API | node-forge (firma CMS WSAA) | qrcode 1.5.4 + PDFKit (QR en PDF).

**Deuda técnica acumulada (post-v1.2):**
- EncryptionService dev fallback key — configurar `ENCRYPTION_KEY` en .env de producción antes de deploy
- `console.log('DTO RECIBIDO')` en `pacientes.service.ts:33` — expone PII en logs
- SMTP password decryption no implementada per-tenant (funcional vía env vars)
- TypeScript strict mode desactivado, cobertura de tests <6%
- marcarPracticasPagadas deprecado con cuerpo intacto — limpiar cuando se confirme sin callers externos
- IVA alicuota ID 5 (21%) hardcoded en FECAESolicitar — production IVA matrix (mixed rates, exempt) necesaria antes de go-live
- RG 5782/2025 CAEA: verificar umbral 5% volumen y ventana 8 días en Boletín Oficial antes de activar en producción
- Human verification pendiente en staging: BullMQ async lifecycle E2E, CAEA fallback con Redis real, SMTP delivery
- Phase 11 VERIFICATION.md faltante (proceso, no funcional)

**Usuarios clave:**
- **Profesional (cirujano):** ve dashboard de conversión, aprueba acciones. No técnico.
- **Secretaria/coordinadora:** opera el CRM día a día, registra interacciones, envía presupuestos por WA/email.
- **Admin:** gestión completa, acceso a finanzas y reportes.

**Restricción de UX crítica:** la plataforma debe ser operada por personas sin conocimientos de marketing o sistemas. Todo debe ser automatizado, sugerido y en lenguaje simple.

## Constraints

- **Tech Stack:** NestJS + Prisma + PostgreSQL (backend), Next.js 16 + React 19 + TypeScript (frontend) — no cambiar
- **Multi-tenancy:** arquitectura actual filtra por profesional; la multi-tenancy por clínica/tenant debe considerarse en cada nuevo modelo
- **WhatsApp:** requiere aprobación Meta para WhatsApp Business API — tiempo de espera; email es fallback implementado
- **Tiers de suscripción:** nuevos features deben ser flaggeables por tier

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| CRM antes que finanzas | El diferencial de venta es la conversión, no las finanzas | ✓ Correcto — v1.0 entregó CRM completo |
| WhatsApp Business API (no links/templates externos) | Experiencia integrada, aunque tiene fricción de aprobación Meta | ✓ Correcto — integración completa implementada |
| Web-first, no app móvil | Velocidad de desarrollo, mercado objetivo usa desktop en clínica | ✓ Correcto — sin demanda de móvil hasta ahora |
| Decimal phases para gap-closure insertados | Permite cerrar gaps sin renumerar phases existentes | ✓ Correcto — 4 decimal phases (2.1, 4.1, 6, 7) cerraron todos los gaps del audit |
| SECRETARIA null-guard pattern (Phase 2.1) | Resolver profesionalId via DB lookup cuando el JWT no lo trae | ✓ Correcto — patrón replicado exitosamente en Phase 4.1 |
| Email channel removido de SendWAMessageModal | 404 persistente, mejor UX con modal dedicado (EnviarPresupuestoModal) | ✓ Correcto — modal WA-only es más claro |
| HMAC-SHA256 en webhook Meta (Phase 7) | Seguridad contra replay attacks y payloads falsificados | ✓ Correcto — dev fallback para testing local preservado |
| Raw SOAP/XML para AFIP (no library) — v1.1 | afipjs/afip-apis unmaintained, sin tipos TS | ✓ Correcto — 774-line reference doc cubre todo sin dependencia |
| ART offset UTC-3 hardcoded (no DST) — v1.1 | Argentina sin DST, más simple que librería timezone | ✓ Correcto — Date.UTC() evita midnight UTC pitfall |
| FACTURADOR no tiene Profesional record — v1.1 | Rol de billing/contabilidad distinto al profesional médico | ✓ Correcto — profesionalId siempre parámetro explícito |
| Prisma migrate deploy (no migrate dev) — v1.1 | Entorno no interactivo (no TTY), deploy diseñado para CI/prod | ✓ Correcto — migration SQL hand-written con backfill seguro |
| Montos server-side en transacción (no client totals) — v1.1 | Prevenir manipulación de totales financieros | ✓ Correcto — montoTotal calculado dentro de $transaction |
| node-forge 1.3.3 para firma CMS in-process — v1.2 | Evita openssl subprocess + /tmp key exposure | ✓ Correcto — firma funcional en homologación, no deps externas |
| Redis cache WSAA desde commit 1 (no Map en memoria) — v1.2 | Map no sobrevive horizontal scale | ✓ Correcto — TTL expiry-5min, mutex por CUIT |
| pg_advisory_xact_lock dentro de $transaction(45000ms) — v1.2 | Default 5s insuficiente para SLA AFIP 30s | ✓ Correcto — serialización CAE sin duplicados de numeración |
| AfipBusinessError → DLQ inmediato (no retry) — v1.2 | Error 10242 y resultado=R nunca se resuelven reintentando | ✓ Correcto — UnrecoverableError evita 5 reintentos inútiles |
| QR data como URL string en Factura.qrData — v1.2 | Re-renderizable si spec AFIP cambia, no blob PNG inmutable | ✓ Correcto — buildAfipQrUrl() re-ejecutable |
| CAEA como fallback únicamente — v1.2 | RG 5782/2025 lo restringe desde junio 2026 | ✓ Correcto — path primario siempre CAE; CAEA solo en AfipUnavailableException |
| FECAEAInformar + deadline alerts en mismo milestone — v1.2 | CAEA sin inform tracking es riesgo regulatorio (multas) | ✓ Correcto — 72 reintentos en 8 días + email alert antes de vencimiento |
| afipError persist incondicional en onFailed (BUG-1 fix) — v1.2 | Guard attemptsMade >= maxAttempts impedía persist para UnrecoverableError (attemptsMade=1) | ✓ Correcto — update antes del guard; Test 9 GREEN |
| Modal condition: EMISION_PENDIENTE \|\| CAEA_PENDIENTE_INFORMAR (BUG-2 fix) — v1.2 | EMISION_PENDIENTE solo dejaba error invisible tras CAEA fallback | ✓ Correcto — ambas rutas de error muestran panel rojo |
| Paciente.flujo sin SQL DEFAULT (null = legacy) — v1.4 | Backfill CIRUGIA para pacientes activos; null distingue legacy de PENDIENTE sin vaciar el kanban CRM | ✓ Correcto — kanban CRM preservado completamente post-migración |
| Auto-update flujo en crearTurno() best-effort (step 5.5) — v1.4 | No bloquear creación del turno si el update de flujo falla; resilience > exactitud | ✓ Correcto — clasificación correcta en todos los casos sin regressions |
| Guard PENDIENTE-only para auto-clasificación — v1.4 | No sobreescribir clasificaciones existentes (CIRUGIA/TRATAMIENTO) al agregar más turnos | ✓ Correcto — pacientes reclasificados manualmente vía banner o PATCH se respetan |
| Banner LiveTurno dismissible por sesión (no persist en DB) — v1.4 | UX no bloqueante; paciente permanece PENDIENTE hasta que el profesional clasifique explícitamente | ✓ Correcto — banner vuelve a mostrarse en nueva sesión sin DB write extra |
| Walk-in patients (flujo=null) excluidos del auto-update TRATAMIENTO — v1.4 | Preservar semántica legacy; flujo=null + etapaCRM activo = paciente CRM válido que no debe convertirse en tratamiento | ✓ Correcto — clasificación manual disponible vía banner o PATCH endpoint |
| HCCreatorForm extraído como componente único compartido — v1.5 | Evitar divergencia entre el creator de LiveTurno y el del PatientDrawer; misma lógica, misma UX | ✓ Correcto — HCCreatorDialog wraps HCCreatorForm; ambos contextos idénticos |
| OrdenConsumo PENDIENTE→CONFIRMADA (dos-step, no descuento inmediato) — v1.5 | Separación de roles: PROFESIONAL documenta, Admin/stock confirma; evita race conditions con escrituras concurrentes | ✓ Correcto — modelo pending→confirm funcional end-to-end |
| tratamientosSnapshot en OrdenConsumo.contenido (no Paciente desnormalizado) — v1.5 | Query-on-read más robusto que columna desnormalizada con entradas retroactivas | ✓ Correcto — pero expuso gap: snapshot no escrito sin consumirInsumos=true (tech debt aceptado) |
| Snapshot de precio al seleccionar ítem del catálogo en presupuesto — v1.5 | Immutabilidad del presupuesto: el precio del catálogo puede cambiar pero el presupuesto histórico queda intacto | ✓ Correcto — fromCatalog flag stripped antes de enviar al backend |
| Migration SQL manual para enum extension — v1.6 | pgBouncer de Supabase (puerto 6543) bloquea el schema engine de Prisma; ALTER TYPE ADD VALUE al final no requiere recrear el tipo | ✓ Correcto — migrate deploy (no dev) como patrón estándar para este entorno |
| SIENDO_ATENDIDO rechazado como origen de marcarEnEspera — v1.6 | Estado de sesión activa es diferente a estado de sala de espera; transición requiere cerrar sesión primero | ✓ Correcto — state machine predecible sin ambigüedad |
| DropdownMenu opacity-0 group-hover:opacity-100 — v1.6 | Columna Acciones queda limpia por defecto; el menú aparece en hover sin ocupar espacio visible | ✓ Correcto — UX limpia sin sacrificar accesibilidad |
| AlertDialogAction con e.preventDefault() para switch-session async — v1.6 | El dialog se cerraría automáticamente antes de que terminen las mutations sin el preventDefault | ✓ Correcto — cierre explícito con setShowSwitchDialog(false) en el handler |
| cerrarSesion sin entradaHCId al salir sin HC (exit y switch) — v1.6 | No auto-guardar HC draft: el profesional tomó la decisión explícita de salir sin registrar | ✓ Correcto — comportamiento intencional con aviso en el dialog |
| Movimiento libre CRM sin validación de negocio — v1.7 | El profesional (secretaria) conoce mejor que el sistema cuándo mover; solo PERDIDO requiere motivoPerdida para integridad | ✓ Correcto — 17/17 requisitos completados, UX significativamente más fluida |
| Forward-only guard por módulo (no shared) — v1.7 | Evita acoplamiento cross-module; si se centraliza, será en common/crm-helpers.ts | ✓ Correcto — patrón duplicado en presupuestos y turnos, fácil de localizar |
| getEtapaWarning en lib dedicada (no componente) — v1.7 | Reutilizable desde cualquier capa sin acoplamiento a KanbanBoard; Phase 38 stepper lo importa directamente | ✓ Correcto — reutilizado en EtapaStepper sin tocar KanbanBoard |
| Dialog-from-Sheet para modales dentro del kanban sheet — v1.7 | shadcn Sheet anidado genera conflictos z-index y focus-trap; Dialog con DialogPortal monta en document.body | ✓ Correcto — ContactoRapidoModal y ListaEsperaDialog funcionan sin conflictos |
| STEPPER_CHAIN hardcoded (no derivado de ETAPA_ORDER) — v1.7 | Incluye PROCEDIMIENTO_REALIZADO que está intencionalmente excluido del kanban ETAPA_ORDER | ✓ Correcto — evita inconsistencia silenciosa al agregar etapas al kanban futuro |
| etapasProtegidas pattern para PERDIDO — v1.7 | PERDIDO es terminal/lateral; lista explícita es más clara que threshold numérico del ETAPA_ORDEN | ✓ Correcto — patrón consistente entre rechazar() y rechazarByToken() |
| ACEPTADO-first en getKanban via find(ACEPTADO) ?? [0] — v1.7 | Pacientes con múltiples presupuestos (BORRADOR posterior a ACEPTADO) generaban falsos positivos en CRM-03 | ✓ Correcto — elimina false positives sin performance cost adicional |
| Migración TipoTurno data-only (SQL manual, sin DDL) — v1.8 | `prisma migrate dev` genera migración vacía sin cambios de schema; el cambio es puro reordenamiento de datos | ✓ Correcto — INSERT ON CONFLICT transfiere configs de TipoTurnoProfesional sin pérdida |
| Filtro `esCirugia=false` en service layer (no controller) — v1.8 | Mantiene Cirugía accesible internamente vía crearTurnoCirugia() para la agenda quirúrgica, oculto solo del selector normal | ✓ Correcto — 4 tipos públicos sin romper agenda quirúrgica |
| Helper puro `resolverNuevoFlujo` en `*.flujo.helpers.ts` — v1.8 | Jest config carece de moduleNameMapper para aliases src/; helper sin deps NestJS permite tests unitarios directos | ✓ Correcto — suite de 10 casos cubre todas las transiciones HC-03/HC-04 |
| Pre-fetch `turno.esCirugia` fuera de `$transaction` — v1.8 | Patrón pgBouncer consistente con otros pre-fetches (OS names, insumos) para evitar timeouts | ✓ Correcto — sin regresiones en cerrarSesion |
| Dual-source predicate client-side (fuente A OR B) en TratamientosTab — v1.8 | `tipoEntradaHC` expuesto vía nested select evita N+1; el predicado combina flujoPaciente y tipoTurno+tipoEntradaHC | ✓ Correcto — estado dual visible sin query extra |
| Toggle endpoint `PATCH :id/crm-archivo` (patrón whatsapp-opt-in) — v1.8 | Reutiliza patrón existente de toggle booleano; un solo endpoint archiva y desarchiva | ✓ Correcto — filtros en getKanban/getListaAccion sin flags manuales |
| Dialog-from-Sheet para confirmación de archivar — v1.8 | Radix Dialog dentro de Sheet evita conflictos z-index/focus-trap (mismo patrón que v1.7 ContactoRapidoModal) | ✓ Correcto — invalidación onSettled por key prefix cubre todas las variantes de profesionalId |
| Catálogo HC con `profesionalId` denormalizado en hijos (sin @relation) — v1.9 | Solo ZonaHC tiene relación real a Profesional; evita relaciones inversas extra y simplifica queries por profesional en diagnósticos/tratamientos | ✓ Correcto — GET /catalogo-hc filtra por profesional sin joins adicionales |
| `esSistema` Boolean en los 3 modelos del catálogo — v1.9 | Proteger ítems "Otros" del seed contra rename/delete del usuario; guard reutilizado en Phase 47 | ✓ Correcto — guard esSistema bloquea mutaciones sobre ítems del sistema |
| JSONB dual-shape en HC (zonas[] vs legacy) sin migración — v1.9 | `Array.isArray(contenido.zonas)` distingue entradas v1.9+ de legacy; entradas históricas quedan como snapshot intacto | ✓ Correcto — 3 lectores renderizan ambos shapes sin backfill |
| Helper puro `construirContenidoPrimeraVez`/`detectarAprendizaje` (TDD) — v1.9 | Lógica de agrupación y aprendizaje testeable sin deps NestJS/Prisma (patrón `*.flujo.helpers.ts`) | ✓ Correcto — motores cubiertos por specs RED/GREEN |
| Aprendizaje `aprenderDesdeZonas` best-effort post-transacción — v1.9 | No bloquear la creación de la HC si el enriquecimiento del catálogo falla; resilience > exactitud (patrón v1.4 crearTurno step 5.5) | ✓ Correcto — la entrada se guarda aunque el aprendizaje falle |
| Soft-delete con cascada lógica en catálogo HC (no hard delete) — v1.9 | Eliminar un ítem lo saca del formulario pero las HC históricas que lo registraron como texto quedan intactas | ✓ Correcto — ADM-03 verificado: historial sin cambios tras delete |
| Extractor puro `resumirTratamientosDeContenido` por turno (no query per-paciente) — v1.10 | Resolver el tratamiento del turno desde su `entradaHC.contenido` (3 shapes) en vez del último global del paciente; `contenido: true` en el select reusa la relación existente | ✓ Correcto — elimina query N+1 `historiaClinica.findMany`, 25/25 tests; resuelve TRAT-01/02 |
| Snapshot de contenido separado del consumo de insumos en `crearEntrada` — v1.10 | El snapshot (`contenido.tratamientos`) se calcula siempre con `tratamientoIds`; la agregación de insumos + OrdenConsumo quedan bajo `if (consumirInsumos)` | ✓ Correcto — fix LIVHC-05 sin regresión de stock (insumosAgregados=[] cuando false); patrón pgBouncer preservado |
| Filtro source-B null puramente client-side en TratamientosTab — v1.10 | `isFuenteB(t) && t.ultimoTratamiento != null` oculta CIRUGIA sin tratamiento sin tocar el contrato backend (`ultimoTratamiento: string\|null`) | ✓ Correcto — estado dual v1.8 (etapaCRM/flujo) intacto; TRAT-04/05 |
| `getEstadoTurnoChip` como módulo puro compartido en `@/lib/estadoTurno` — v1.10 | Evita triplicar el mapeo de los 7 EstadoTurno entre TratamientosTab, AppointmentDetailModal y CalendarGrid | ✓ Correcto — reemplaza keys legacy PROGRAMADO/REALIZADO; migración de los otros 2 consumidores diferida (tech debt) |
| Componente de render HC dedicado (`HCEntryContent.tsx`) en vez de inline en `HistoriaClinica.tsx` — v1.11 | Espeja el patrón existente y habilita la consolidación futura de `HistorialClinicoPanel`/`TurnoHCModal` sin tocarlos ahora | ✓ Correcto — HCSHEET-01/02/03 con paridad visual; componente disponible para reuso |
| Split `HCEntryChips` (tarjeta, sin precios) vs `HCEntryFullContent` (detalle, con precios + observaciones) — v1.11 | La tarjeta solo necesita chips compactos; el detalle necesita la vista rica completa | ✓ Correcto — ambas variantes manejan los 2 shapes + texto libre |
| `line-clamp-3` movido a `TemplateEntryPreview`-only — v1.11 | El clamp recortaba los chips a media fila; los badges deben envolver naturalmente en la tarjeta | ✓ Correcto — chips visibles completos sin recorte |
| `FreeEntryFullContent` mantenido como wrapper de delegación fino — v1.11 | Conserva la firma local esperada por `ExpandedEntryContent` mientras delega el render a `HCEntryFullContent` | ✓ Correcto — sin cambios en el contrato de `ExpandedEntryContent` |
| Migración big-bang del milestone en Phase 51 (todo el schema de una) — v1.12 | Evita drift entre fases y ventanas donde el cleanup CHAT-02 corre sin el guard CHAT-01; una release atómica | ✓ Correcto — flood eliminado y guard activo en el mismo deploy (SC#3) |
| Token de portal SHA-256 hasheado en BD, UUID crudo sólo en la URL — v1.12 | Un dump de BD no expone tokens usables; el raw se cifra AES-256-GCM sólo para re-mostrar el link al staff | ✓ Correcto — lookup por hash, 64-char hex verificable con SELECT |
| Datos de salud del paciente en campos `*AutoReportad*` staged (nunca `alergias[]`/`condiciones[]`) — v1.12 | Respaldo legal como declaración del paciente sin sobrescribir los registros curados por el médico | ✓ Correcto — PORTAL-06; escrituras confinadas por allow-list + ValidationPipe por-ruta |
| `ValidationPipe({ whitelist: true })` por-ruta (no pipe global) como único guard de mass-assignment del portal — v1.12 | El portal es público; un pipe explícito por-write descarta campos prohibidos en silencio sin depender de config global | ✓ Correcto — SC#3; campos clínicos/CRM nunca escribibles desde el portal |
| Lock anti-fuerza-bruta por bloque-de-duración (no rolling window) — v1.12 | 3 fallos DNI → bloqueo fijo 15 min; el counter resetea sólo cuando el bloqueo expiró, evitando una rama 429 muerta | ✓ Correcto — verificado con 11-case unit spec TDD |
| Magic-byte `%PDF-` sobre el buffer en disco (no MIME del cliente) para validar upload — v1.12 | El header MIME del cliente es falsificable; validar bytes reales tras escritura previene archivos no-PDF persistidos | ✓ Correcto — non-PDF → 400 y nada persiste (INFRA-03) |
| pdf-lib para estampar la firma sobre el PDF original subido — v1.12 | PDFKit no puede modificar PDFs existentes; pdf-lib carga y re-emite con la firma + caja forense visible | ✓ Correcto — PDF firmado inmutable con hash SHA-256 sobre el buffer final (CONS-05/06) |
| Migraciones aditivas via `prisma diff + db execute + migrate resolve` (no `migrate dev`) — v1.12 | pgBouncer de Supabase bloquea el schema engine de Prisma con drift; patrón ya estándar desde v1.6 | ✓ Correcto — todas las migraciones del milestone aplicadas sin pérdida |
| Reutilizar enum `PROCEDIMIENTO_REALIZADO` como etapa "Cirugía Realizada" (relabel UI) — v1.13 | Agregar `CIRUGIA_REALIZADA` obligaría a migrar el enum y actualizar todos los consumidores (funnel, constantes frontend, STEPPER_CHAIN) | ✓ Correcto — columna propia sin migración de enum ni ruptura de consumidores |
| Helper puro `computePasosCrm` (TDD, sin deps NestJS/Prisma) para estado de 5 pasos — v1.13 | Patrón `*.helpers.ts` establecido; lógica de pasos testeable sin infra y reusable por board + stepper | ✓ Correcto — payload de `getKanban` consumido 1:1 por Phase 58/59 |
| Bypass incondicional del guard forward-only al crear turno (reactivar a `TURNO_AGENDADO`) — v1.13 | EMBUDO-05: un paciente que pide nuevo turno debe volver a etapa anterior sin bloqueo; el guard sigue protegiendo solo auto-transiciones del sistema (D-09) | ✓ Correcto — advisory tech debt WR-01 (degrada etapas avanzadas en cualquier turno) aceptado |
| Auto-move a `PROCEDIMIENTO_REALIZADO` vía `@Cron` diario sobre fecha de cirugía pasada — v1.13 | Clasificación forward-only automática de operados sin intervención manual | ✓ Correcto — divergencia WR-02 (cuenta CANCELADA/SUSPENDIDA distinto al scheduler) advisory |
| Stats sobre registros reales (`Cirugia`/`HistoriaClinicaEntrada`) sin predicado `etapaCRM` — v1.13 | Conteos robustos a que la etapa CRM del paciente cambie después de operarse/tratarse | ✓ Correcto — invariante asertado por spec backend Test A (8/8) + SECURED (5/5) |
| Consentimiento/indicaciones como sub-indicadores read-only del stepper (sin quick-action ni invalidación) — v1.13 | Completan vía el portal v1.12 externo; agregar quick-action + invalidación quedó fuera de scope (D-04 Phase 59) | ⚠️ Revisit — W-1: board-hide EMBUDO-04 para pacientes con solo ese pendiente depende de refetch pasivo, no invalidación inmediata |

## Shipped: v1.1 Vista del Facturador ✅

13/13 requisitos completados en 3 días (2026-03-13 → 2026-03-16). Ver `.planning/milestones/v1.1-ROADMAP.md` para detalles completos.

## Shipped: v1.2 AFIP Real ✅

16/16 requisitos completados en 50 días (2026-02-09 → 2026-03-31). 8 fases, 24 planes. Ver `.planning/milestones/v1.2-ROADMAP.md` para detalles completos.

## Shipped: v1.3 Historial de Consultas ✅

2 phases (20–21), 4 plans. Widget agenda-first con navegación día a día, métricas del día, botón "Ver HC" por turno FINALIZADO, modal HC retroactivo con fecha histórica. Ver `.planning/milestones/v1.3-ROADMAP.md` para detalles.

## Shipped: v1.4 Flujo de Pacientes ✅

20/20 requisitos completados en 5 días (2026-04-15 → 2026-04-20). 4 fases, 10 planes. Ver `.planning/milestones/v1.4-ROADMAP.md` para detalles.

## Shipped: v1.5 Catálogos Clínicos y Flujos de Atención ✅

27/27 requisitos completados en 21 días (2026-04-22 → 2026-05-13). 6 fases, 16 planes. Tech debt aceptado: snapshot de tratamientos sin consumirInsumos y rol FACTURADOR en ordenes-consumo. Ver `.planning/milestones/v1.5-ROADMAP.md` para detalles.

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-17 after Phase 61 complete (backend v1.14 verificado). Milestone iniciado 2026-07-06 — Portal: Firma Gated e Indicaciones Separadas (gate de firma abrir-PDF+tildar, indicaciones como sección aparte con acuse en perfil, cierre W-1 invalidación crm-kanban). Milestone previo: 2026-07-05 after v1.13 milestone — Embudo CRM Accionable shipped (4 fases 57–60, 8 planes, 19 tareas, 15/15 reqs, audit `tech_debt` 0 blockers). Backend enriquecido (`computePasosCrm`, etapa "Cirugía Realizada", `@Cron` auto-move, guard relajado), board reordenado con indicadores/etiquetas, stepper accionable con 3 quick-actions e invalidación `crm-kanban`, y estadísticas sobre registros reales independientes de `etapaCRM`. Diferido: browser UAT Phase 58 + display KPI cards Phase 60. Próximo: `/gsd:new-milestone`.*
