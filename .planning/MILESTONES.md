# Milestones

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

