# Roadmap: CLINICAL

## Milestones

- ✅ **v1.0 CRM Conversión** — Fases 1–7 (shipped 2026-03-03)
- 🚧 **v1.1 Vista del Facturador** — Fases 8–11 (in progress)

## Phases

<details>
<summary>✅ v1.0 CRM Conversión (Fases 1–7) — SHIPPED 2026-03-03</summary>

- [x] Phase 1: Infraestructura Async (3/3 planes) — completado 2026-02-23
- [x] Phase 2: Log de Contactos + Lista de Acción (3/3 planes) — completado 2026-02-24
- [x] Phase 2.1: Fix SECRETARIA Contact Logging [INSERTED] (1/1 plan) — completado 2026-02-24
- [x] Phase 3: Presupuestos Completos (4/4 planes) — completado 2026-02-27
- [x] Phase 4: WhatsApp + Etapas CRM Automáticas (6/6 planes) — completado 2026-02-28
- [x] Phase 4.1: WA Critical Fixes [INSERTED] (1/1 plan) — completado 2026-03-02
- [x] Phase 5: Dashboard de Conversión (3/3 planes) — completado 2026-03-02
- [x] Phase 6: CRM Data Wiring Fixes [INSERTED] (1/1 plan) — completado 2026-03-02
- [x] Phase 7: UX + Security Hardening [INSERTED] (1/1 plan) — completado 2026-03-03

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.1 Vista del Facturador (In Progress)

**Milestone Goal:** Darle al rol FACTURADOR una vista propia y un flujo completo de liquidación de obras sociales con control de límite mensual de facturación.

- [ ] **Phase 8: Schema Foundation + AFIP Research** - Migraciones DB prerequisito + documento de integración AFIP escrito
- [x] **Phase 9: Backend API Layer** - Extensión de FinanzasService/Controller + AfipStubService (completed 2026-03-13)
- [ ] **Phase 10: FACTURADOR Home Dashboard** - Routing, permisos, KPIs y configuración de límite mensual
- [ ] **Phase 11: Settlement Workflow** - Flujo de liquidación mejorado con filtro por OS y edición de montoPagado

## Phase Details

### Phase 8: Schema Foundation + AFIP Research
**Goal**: La base de datos soporta los datos del flujo de facturación y el equipo tiene un documento de integración AFIP accionable
**Depends on**: Phase 7 (v1.0 complete)
**Requirements**: SCHEMA-01, SCHEMA-02, SCHEMA-03, AFIP-01
**Success Criteria** (what must be TRUE):
  1. `PracticaRealizada` tiene campos `montoPagado`, `corregidoPor`, `corregidoAt`, `motivoCorreccion` y el cliente Prisma fue regenerado
  2. El modelo `LimiteFacturacionMensual` existe con `@@unique([profesionalId, mes])` y es accesible desde el ORM
  3. `Factura` tiene `condicionIVAReceptor` (non-nullable) y `tipoCambio` para cumplimiento RG 5616/2024
  4. El documento AFIP/ARCA cubre certificados, WSAA, WSFEv1, CAEA, RG 5616/2024 y biblioteca recomendada, y está escrito en `.planning/research/AFIP-INTEGRATION.md`
**Plans**: 2 plans

Plans:
- [ ] 08-01-PLAN.md — Prisma schema additions + migration `facturador_v1` (SCHEMA-01, SCHEMA-02, SCHEMA-03)
- [x] 08-02-PLAN.md — AFIP/ARCA integration research document (AFIP-01) — completed 2026-03-13

### Phase 9: Backend API Layer
**Goal**: El backend expone todos los endpoints que necesita el flujo del FACTURADOR, con lógica atómica y cálculos de timezone correctos
**Depends on**: Phase 8
**Requirements**: LMIT-02, LIQ-03, AFIP-02
**Success Criteria** (what must be TRUE):
  1. `POST /finanzas/liquidaciones/crear-lote` crea `LiquidacionObraSocial` y marca prácticas como PAGADO en una única transacción Prisma (`$transaction`)
  2. El cálculo de disponible mensual (límite − emitido en período) usa `getMonthBoundariesART()` con timezone `America/Argentina/Buenos_Aires`, verificable con una práctica al `2026-03-01T02:30:00Z`
  3. `AfipStubService.emitirComprobante()` devuelve una estructura CAE mock tipada y está registrado en `FinanzasModule`
  4. Todos los endpoints nuevos en `FinanzasController` aceptan `profesionalId` como parámetro explícito (nunca derivado del JWT) y están protegidos con `@Auth('ADMIN', 'FACTURADOR')`
**Plans**: 3 plans

Plans:
- [ ] 09-01-PLAN.md — FinanzasService: timezone utility + cinco nuevos métodos + test scaffolds (LMIT-02, LIQ-03)
- [ ] 09-02-PLAN.md — FinanzasController: siete nuevos endpoints + DTOs adicionales (LMIT-02, LIQ-03)
- [ ] 09-03-PLAN.md — AfipStubService: interfaces + stub + registro en FinanzasModule (AFIP-02)

### Phase 10: FACTURADOR Home Dashboard
**Goal**: El FACTURADOR llega a su propia página de inicio con KPIs de facturación y puede configurar el límite mensual
**Depends on**: Phase 9
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, LMIT-01
**Success Criteria** (what must be TRUE):
  1. Al entrar al sistema, el usuario con rol FACTURADOR es redirigido a `/dashboard/facturador` (no a la home del PROFESIONAL)
  2. La página muestra cantidad y monto total de prácticas pendientes agrupadas por obra social
  3. La página muestra una barra de progreso: límite configurado / facturado en el período / disponible restante
  4. El FACTURADOR puede ingresar o actualizar el límite mensual (valor del contador) y el cálculo se actualiza inmediatamente
  5. Si un lote a cerrar supera el disponible, aparece una advertencia visible antes de confirmar
**Plans**: 2 plans

Plans:
- [ ] 10-01-PLAN.md — Routing + permissions: permissions.ts rule, layout redirect, Sidebar Inicio link for FACTURADOR (DASH-01)
- [ ] 10-02-PLAN.md — TanStack Query hooks + FACTURADOR page: KPI cards, progress bar, limit input (DASH-02, DASH-03, DASH-04, LMIT-01)

### Phase 11: Settlement Workflow
**Goal**: El FACTURADOR puede trabajar un lote de prácticas por obra social, corregir montos reales y cerrar la liquidación en un solo paso atómico
**Depends on**: Phase 10
**Requirements**: LIQ-01, LIQ-02, LIQ-03
**Success Criteria** (what must be TRUE):
  1. El FACTURADOR puede filtrar la tabla de prácticas pendientes por obra social para preparar un lote específico
  2. Cada práctica tiene una celda editable donde se ingresa el monto real pagado por la OS (distinto del autorizado); el cambio se guarda al perder el foco
  3. Al cerrar el lote, un modal de confirmación muestra la cantidad de prácticas y el total antes de ejecutar
  4. Tras confirmar, las prácticas quedan en estado PAGADO y existe un registro `LiquidacionObraSocial` que las agrupa
**Plans**: TBD

Plans:
- [ ] 11-01: LiquidacionesPage mejorada — filtro por OS + columna montoPagado editable + hooks (LIQ-01, LIQ-02)
- [ ] 11-02: CerrarLoteModal + integración de cierre atómico (LIQ-03)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Infraestructura Async | v1.0 | 3/3 | Complete | 2026-02-23 |
| 2. Log de Contactos + Lista de Acción | v1.0 | 3/3 | Complete | 2026-02-24 |
| 2.1. Fix SECRETARIA Contact Logging | v1.0 | 1/1 | Complete | 2026-02-24 |
| 3. Presupuestos Completos | v1.0 | 4/4 | Complete | 2026-02-27 |
| 4. WhatsApp + CRM Automáticas | v1.0 | 6/6 | Complete | 2026-02-28 |
| 4.1. WA Critical Fixes | v1.0 | 1/1 | Complete | 2026-03-02 |
| 5. Dashboard de Conversión | v1.0 | 3/3 | Complete | 2026-03-02 |
| 6. CRM Data Wiring Fixes | v1.0 | 1/1 | Complete | 2026-03-02 |
| 7. UX + Security Hardening | v1.0 | 1/1 | Complete | 2026-03-03 |
| 8. Schema Foundation + AFIP Research | v1.1 | 0/2 | Not started | - |
| 9. Backend API Layer | 3/3 | Complete   | 2026-03-13 | - |
| 10. FACTURADOR Home Dashboard | v1.1 | 0/2 | Not started | - |
| 11. Settlement Workflow | v1.1 | 0/2 | Not started | - |

---
*Roadmap initialized: 2026-02-23 | v1.0 shipped: 2026-03-03 | v1.1 started: 2026-03-13*
