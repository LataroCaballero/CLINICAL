# CLINICAL — Plataforma SaaS para Clínicas de Cirugía Estética

## What This Is

Plataforma SaaS multi-tenant de gestión de clínicas, orientada especialmente a cirujanos plásticos y estéticos. Cubre la administración completa de la clínica (pacientes, turnos, historia clínica, finanzas, stock) con un diferencial competitivo en **conversión de pacientes en cirugías**: el módulo CRM permite registrar interacciones, enviar presupuestos con PDF, comunicarse por WhatsApp, y ver el dashboard de conversión completo (embudo, KPIs, motivos de pérdida, performance del coordinador).

El producto se vende por suscripción con tiers: el tier base incluye gestión de pacientes, turnos, estadísticas y CRM de conversión; los tiers superiores agregan módulos financieros y reportes ejecutivos.

## Core Value

**Que un cirujano plástico cierre más cirugías** — el sistema debe hacer visible qué pacientes seguir, cuándo contactarlos y cómo, de la manera más automatizada y simple posible para profesionales sin background en marketing o sistemas.

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
- ✓ Auto-aprendizaje vía "Otros": zonas/diagnósticos/tratamientos nuevos escritos se persisten en BD best-effort al crear la entrada y aparecen en la próxima consulta — v1.9
- ✓ Tratamiento aprendido se crea también en el catálogo del profesional con precio 0 y FK opcional, listo para completar en Configuración — v1.9
- ✓ Admin UI "Catálogo HC" en Configuración: ver, renombrar (PATCH) y eliminar (soft-delete con cascada lógica, guard esSistema) zonas/diagnósticos/tratamientos; HC históricas intactas — v1.9
- ✓ Columna "Último tratamiento" resuelta por turno: extractor puro `resumirTratamientosDeContenido` normaliza los 3 shapes de HC (v1.9 zona-agrupado, legacy plano, texto libre/consultorio) en `obtenerTurnosPorRango`, eliminando el query N+1 — v1.10 (TRAT-01/02)
- ✓ Snapshot de tratamientos persistido siempre que haya `tratamientoIds`, independiente de `consumirInsumos` (fix LIVHC-05); insumos y OrdenConsumo siguen condicionados al consumo — v1.10 (TRAT-03)
- ✓ Filtro automático: pacientes CIRUGIA sin tratamiento real ocultos de la planilla (predicado client-side source-B null) preservando el estado dual v1.8 — v1.10 (TRAT-04/05)
- ✓ Chips de "Estado" con color-coding semántico para los 7 valores reales de `EstadoTurno` vía helper puro `getEstadoTurnoChip` en `@/lib/estadoTurno` — v1.10 (TRAT-06)

### Active

- [ ] Automatizaciones de seguimiento: triggers basados en tiempo/etapa (ej. "30 días sin respuesta → mensaje automático")
- [ ] Módulos financieros optimizados e interconectados con CRM
- [ ] Página pública del paciente: historial, presupuestos, documentos
- [ ] Módulo de estadísticas ejecutivas (reportes exportables, comparativas)
- [ ] Tipos de turno personalizados por profesional desde Configuración (TIPO-F01) + color por tipo en calendario (TIPO-F02) — diferido de v1.8
- [ ] CRM: vista de pacientes archivados con desarchivar en lote (CRM-F01) + archivado automático tras N días en PERDIDO (CRM-F02) — diferido de v1.8

### Out of Scope

- App móvil nativa — web-first, mobile a futuro
- Chat en tiempo real entre pacientes y clínica — WhatsApp cubre este caso por ahora
- Facturación electrónica AFIP real en v1.1 — completada la investigación, implementación real planificada para v1.2
- Tiers de suscripción con feature flags — deferido a cuando haya clientes reales con necesidades diferenciadas
- Eliminar el tipo "Cirugía" interno — la agenda quirúrgica lo requiere (v1.8)
- tipoEntrada retroactivo en entradas HC legacy — backfill innecesario, se tratan como CONSULTA_CIRUGIA por defecto (v1.8)

## Next Milestone

Planificación pendiente — usar `/gsd:new-milestone` para definir objetivos, requisitos y roadmap. Candidatos diferidos: automatizaciones de seguimiento por tiempo/etapa, tipos de turno personalizados + color (TIPO-F01/F02), vista de pacientes archivados con desarchivar en lote (CRM-F01/F02).

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

**Estado actual (post-v1.10):** La planilla de Tratamientos en `/dashboard/pacientes` es ahora confiable y legible. La columna "Último tratamiento" se resuelve por turno: un extractor puro (`resumirTratamientosDeContenido`) lee el `contenido` de la HC de cada turno y normaliza los tres shapes (v1.9 agrupado por zona, legacy plano, texto libre/consultorio) a un resumen-con-conteo, eliminando el query N+1 anterior. El snapshot de tratamientos se persiste siempre que la HC tenga `tratamientoIds`, aunque `consumirInsumos=false` (fix LIVHC-05), manteniendo la OrdenConsumo condicionada al consumo. Los pacientes con flujo CIRUGIA que no tienen ningún tratamiento real se filtran automáticamente de la planilla (predicado client-side sobre la fuente B), sin romper el estado dual de v1.8. Los chips de "Estado" usan un helper compartido (`getEstadoTurnoChip` en `@/lib/estadoTurno`) con color-coding semántico para los 7 valores reales de `EstadoTurno`. 6/6 requisitos v1.10 completados en 1 día (2 fases, 3 planes).

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

---
*Last updated: 2026-06-22 after v1.10 Refinamiento Planilla de Tratamientos milestone*
