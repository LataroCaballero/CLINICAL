# Roadmap: CLINICAL

## Milestones

- ✅ **v1.0 CRM Conversión** — Fases 1–7 (shipped 2026-03-03)
- ✅ **v1.1 Vista del Facturador** — Fases 8–11 (shipped 2026-03-16)
- ✅ **v1.2 AFIP Real** — Fases 12–19 (shipped 2026-03-31)
- ✅ **v1.3 Historial de Consultas** — Fases 20–21 (shipped 2026-04-09)
- ✅ **v1.4 Flujo de Pacientes** — Fases 22–25 (shipped 2026-04-20)
- 🚧 **v1.5 Catálogos Clínicos y Flujos de Atención** — Fases 26–31 (in progress)
- 📋 **v2.0 TBD** — (planned)

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

<details>
<summary>✅ v1.1 Vista del Facturador (Fases 8–11) — SHIPPED 2026-03-16</summary>

- [x] Phase 8: Schema Foundation + AFIP Research (2/2 planes) — completado 2026-03-13
- [x] Phase 9: Backend API Layer (3/3 planes) — completado 2026-03-13
- [x] Phase 10: FACTURADOR Home Dashboard (2/2 planes) — completado 2026-03-14
- [x] Phase 11: Settlement Workflow (2/2 planes) — completado 2026-03-16

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v1.2 AFIP Real (Fases 12–19) — SHIPPED 2026-03-31</summary>

- [x] Phase 12: Schema AFIP Extendido + Gestión de Certificados (4/4 planes) — completado 2026-03-16
- [x] Phase 13: WSAA Token Service (2/2 planes) — completado 2026-03-20
- [x] Phase 14: Emisión CAE Real (WSFEv1) (4/4 planes) — completado 2026-03-21
- [x] Phase 15: QR AFIP + PDF + Frontend de Comprobantes (4/4 planes) — completado 2026-03-30
- [x] Phase 16: CAEA Contingency Mode (3/3 planes) — completado 2026-03-30
- [x] Phase 17: CAE Emission UX (3/3 planes) — completado 2026-03-31
- [x] Phase 18: CAE-03 Error Display Fixes [INSERTED] (2/2 planes) — completado 2026-03-31
- [x] Phase 19: getCierreMensual facturaId Extension [INSERTED] (2/2 planes) — completado 2026-03-31

Full details: `.planning/milestones/v1.2-ROADMAP.md`

</details>

<details>
<summary>✅ v1.3 Historial de Consultas (Fases 20–21) — SHIPPED 2026-04-09</summary>

- [x] Phase 20: Backend Data Fixes (1/1 plan) — completado 2026-04-02
- [x] Phase 21: Agenda Widget + Modal HC (3/3 planes) — completado 2026-04-09

Full details: `.planning/milestones/v1.3-ROADMAP.md`

</details>

<details>
<summary>✅ v1.4 Flujo de Pacientes (Fases 22–25) — SHIPPED 2026-04-20</summary>

- [x] Phase 22: Schema Foundation (3/3 planes) — completado 2026-04-15
- [x] Phase 23: Backend Logic (2/2 planes) — completado 2026-04-16
- [x] Phase 24: LiveTurno Banner (2/2 planes) — completado 2026-04-19
- [x] Phase 25: Tratamientos Tab (3/3 planes) — completado 2026-04-20

Full details: `.planning/milestones/v1.4-ROADMAP.md`

</details>

### 🚧 v1.5 Catálogos Clínicos y Flujos de Atención (In Progress)

**Milestone Goal:** Conectar catálogos de tratamientos y cirugías con LiveTurno, presupuestos y stock; mejorar flujos de clasificación y HC desde el perfil del paciente.

- [x] **Phase 26: Schema Foundation + Catalog CRUD** — Nuevos modelos Prisma + CRUD de catálogos en Configuración (completed 2026-04-22)
- [x] **Phase 27: HC Integration — LiveTurno + PatientDrawer** — Selector de catálogo en HC y entrada de HC desde perfil (completed 2026-04-23)
- [x] **Phase 28: Presupuestos Catalog Integration** — Selector de ítems del catálogo al armar presupuestos (completed 2026-04-29)
- [x] **Phase 29: PatientDrawer Flujo Action** — Cambio de flujo desde perfil con efectos CRM (completed 2026-04-30)
- [x] **Phase 30: Tab Tratamientos Último Tratamiento** — Columna de último tratamiento en el tab mensual (completed 2026-05-12)
- [x] **Phase 31: Stock Órdenes de Consumo UI** — Superficie de confirmación de órdenes de consumo pendientes (completed 2026-05-13)

## Phase Details

### Phase 26: Schema Foundation + Catalog CRUD
**Goal**: Los profesionales pueden gestionar sus catálogos de tratamientos (con insumos y precio base) y cirugías (con precios ARS/USD, insumos y duración) desde la sección de Configuración
**Depends on**: Nothing (first phase of milestone)
**Requirements**: CATLOG-01, CATLOG-02, CATLOG-03, CATLOG-04, CATLOG-05, CATLOG-06
**Success Criteria** (what must be TRUE):
  1. El profesional puede vincular insumos del stock a un tratamiento desde Configuración, con cantidad por insumo
  2. El tratamiento muestra un precio base calculado y un botón "Recalcular desde insumos" que lo actualiza bajo demanda
  3. El profesional puede crear, editar y eliminar cirugías propias (nombre, precio ARS/USD, insumos con cantidades, duración estimada)
  4. El precio base de una cirugía se muestra calculado a partir de sus insumos asociados
  5. Cada profesional ve y puede gestionar únicamente sus propias cirugías (aislamiento multi-profesional verificado)
**Plans**: 7 plans
Plans:
- [ ] 26-01-PLAN.md — Schema migration: TratamientoInsumo, precioBase, CirugiaCatalogo, CirugiaInsumo
- [ ] 26-02-PLAN.md — Backend: tratamientos insumos endpoints + recalcular-precio
- [ ] 26-03-PLAN.md — Backend: cirugias-catalogo full NestJS module (7 endpoints)
- [ ] 26-04-PLAN.md — Frontend: TypeScript types + TanStack Query hooks for cirugías catalog
- [ ] 26-05-PLAN.md — Frontend: InsumosEditor shared component + useTratamientosProfesional extensions
- [ ] 26-06-PLAN.md — Frontend: GestionTratamientos extended with insumos column + modal section
- [ ] 26-07-PLAN.md — Frontend: GestionCirugias component + Configuración tab wiring

### Phase 27: HC Integration — LiveTurno + PatientDrawer
**Goal**: Los profesionales pueden seleccionar tratamientos del catálogo en la sección de HC de LiveTurno, generar órdenes de consumo de insumos, y crear entradas de HC directamente desde el perfil del paciente sin turno activo
**Depends on**: Phase 26
**Requirements**: LIVHC-01, LIVHC-02, LIVHC-03, LIVHC-04, LIVHC-05, STOCK-01, STOCK-02, HCDR-01, HCDR-02, HCDR-03
**Success Criteria** (what must be TRUE):
  1. La sección "Práctica" en LiveTurno HC aparece renombrada a "Tratamiento en Consultorio" con un multi-selector del catálogo
  2. El campo de texto libre se conserva como complemento opcional al selector de catálogo
  3. Cuando el tratamiento seleccionado tiene insumos, aparece un checkbox "Consumir insumos del stock"; al guardar con el checkbox activo, se crea una OrdenConsumo con estado PENDIENTE
  4. El último tratamiento del paciente queda registrado tras guardar la HC con tratamientos seleccionados del catálogo
  5. Desde el PatientDrawer, el profesional puede abrir un creator de HC (mismo componente que LiveTurno) sin requerir turno activo, con fecha retroactiva seleccionable
**Plans**: 3 plans
Plans:
- [ ] 27-01-PLAN.md — Schema OrdenConsumo + backend HC service extension + ordenes-consumo module
- [ ] 27-02-PLAN.md — Frontend: HCCreatorForm extraction + Tratamiento en Consultorio multi-select
- [ ] 27-03-PLAN.md — Frontend: PatientDrawer HC creator button + HCCreatorDialog

### Phase 28: Presupuestos Catalog Integration
**Goal**: Los usuarios pueden agregar ítems del catálogo de cirugías y tratamientos al armar un presupuesto, con nombre y precio auto-completados como snapshot inmutable, sin perder la capacidad de agregar ítems de texto libre
**Depends on**: Phase 26
**Requirements**: PRESUP-01, PRESUP-02, PRESUP-03, PRESUP-04
**Success Criteria** (what must be TRUE):
  1. Al armar un presupuesto, el usuario puede seleccionar cirugías del catálogo del profesional desde un panel de selección
  2. Al armar un presupuesto, el usuario puede seleccionar tratamientos del catálogo desde el mismo panel
  3. Al seleccionar un ítem del catálogo, nombre y precio (ARS/USD) se auto-completan como snapshot en el ítem del presupuesto
  4. Se pueden seguir agregando ítems de texto libre al presupuesto sin restricciones (comportamiento anterior preservado)
**Plans**: 1 plan
Plans:
- [ ] 28-01-PLAN.md — GenerarPresupuestoModal catalog selector (Popover/Command with Cirugías + Tratamientos groups, snapshot pricing, badge)

### Phase 29: PatientDrawer Flujo Action
**Goal**: Los profesionales pueden cambiar el flujo de un paciente directamente desde el PatientDrawer con efectos CRM automáticos y feedback inmediato
**Depends on**: Phase 26
**Requirements**: PAC-02, PAC-03, PAC-04, PAC-05
**Success Criteria** (what must be TRUE):
  1. El PatientDrawer muestra un selector de flujo con confirmación modal antes de aplicar el cambio
  2. El cambio de flujo se aplica de inmediato en la UI (optimista) y muestra un toast de error si el endpoint falla
  3. Al cambiar el flujo, el paciente queda asignado automáticamente a la etapa CRM "Sin Clasificar" en la misma transacción
  4. Un contacto con nota "Paciente pendiente de clasificación" queda registrado automáticamente al cambiar el flujo
**Plans**: 2 plans
Plans:
- [ ] 29-01-PLAN.md — Backend: updateFlujo() $transaction extension (flujo + etapaCRM null + ContactoLog)
- [ ] 29-02-PLAN.md — Frontend: useUpdateFlujo hook + CambiarFlujoModal + PencilLine trigger en PacienteDetails

### Phase 30: Tab Tratamientos Último Tratamiento
**Goal**: El tab Tratamientos muestra la columna "Último tratamiento" por paciente, reflejando el nombre del tratamiento de catálogo más reciente registrado en HC
**Depends on**: Phase 27
**Requirements**: PAC-01
**Success Criteria** (what must be TRUE):
  1. El tab Tratamientos muestra una columna "Último tratamiento" con el nombre del tratamiento de catálogo más reciente de cada paciente
  2. La columna se actualiza tras guardar una nueva entrada de HC con tratamiento seleccionado, sin requerir recarga manual
  3. Para pacientes sin tratamientos registrados en catálogo, la columna muestra un estado vacío sin errores
**Plans**: 1 plan
Plans:
- [ ] 30-01-PLAN.md — Backend enrichment + frontend 5th column + cache invalidation for ultimo tratamiento

### Phase 31: Stock Órdenes de Consumo UI
**Goal**: El responsable de stock puede ver y confirmar las órdenes de consumo pendientes generadas por la HC, con descuento atómico del inventario al confirmar
**Depends on**: Phase 27
**Requirements**: STOCK-03, STOCK-04
**Success Criteria** (what must be TRUE):
  1. El módulo de stock muestra una página de órdenes de consumo pendientes con nombre de paciente, fecha de sesión, tratamientos realizados e insumos a consumir
  2. El responsable de stock puede confirmar cada orden individualmente; al confirmar, el movimiento SALIDA queda registrado en el stock correspondiente
  3. Una orden confirmada desaparece de la lista de pendientes y el stock actualizado es visible de inmediato
  4. El descuento de stock ocurre dentro de una transacción atómica (nunca se descuenta stock sin que la orden quede confirmada)
**Plans**: 2 plans
Plans:
- [ ] 31-01-PLAN.md — Backend: enriched GET + confirmarOrden() atomic $transaction + POST :id/confirmar controller
- [ ] 31-02-PLAN.md — Frontend: OrdenConsumo types + useOrdenesConsumo hooks + /dashboard/stock/consumo page + Sidebar link

### 📋 v2.0 TBD (Planned)

*(Next milestone to be defined via `/gsd:new-milestone`)*

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
| 8. Schema Foundation + AFIP Research | v1.1 | 2/2 | Complete | 2026-03-13 |
| 9. Backend API Layer | v1.1 | 3/3 | Complete | 2026-03-13 |
| 10. FACTURADOR Home Dashboard | v1.1 | 2/2 | Complete | 2026-03-14 |
| 11. Settlement Workflow | v1.1 | 2/2 | Complete | 2026-03-16 |
| 12. Schema AFIP Extendido + Certificados | v1.2 | 4/4 | Complete | 2026-03-16 |
| 13. WSAA Token Service | v1.2 | 2/2 | Complete | 2026-03-20 |
| 14. Emisión CAE Real (WSFEv1) | v1.2 | 4/4 | Complete | 2026-03-21 |
| 15. QR AFIP + PDF + Frontend | v1.2 | 4/4 | Complete | 2026-03-30 |
| 16. CAEA Contingency Mode | v1.2 | 3/3 | Complete | 2026-03-30 |
| 17. CAE Emission UX | v1.2 | 3/3 | Complete | 2026-03-31 |
| 18. CAE-03 Error Display Fixes | v1.2 | 2/2 | Complete | 2026-03-31 |
| 19. getCierreMensual facturaId Extension | v1.2 | 2/2 | Complete | 2026-03-31 |
| 20. Backend Data Fixes | v1.3 | 1/1 | Complete | 2026-04-02 |
| 21. Agenda Widget + Modal HC | v1.3 | 3/3 | Complete | 2026-04-09 |
| 22. Schema Foundation | v1.4 | 3/3 | Complete | 2026-04-15 |
| 23. Backend Logic | v1.4 | 2/2 | Complete | 2026-04-16 |
| 24. LiveTurno Banner | v1.4 | 2/2 | Complete | 2026-04-19 |
| 25. Tratamientos Tab | v1.4 | 3/3 | Complete | 2026-04-20 |
| 26. Schema Foundation + Catalog CRUD | v1.5 | 7/7 | Complete | 2026-04-22 |
| 27. HC Integration — LiveTurno + PatientDrawer | 3/3 | Complete    | 2026-04-24 | - |
| 28. Presupuestos Catalog Integration | 1/1 | Complete    | 2026-04-29 | - |
| 29. PatientDrawer Flujo Action | 2/2 | Complete    | 2026-05-04 | - |
| 30. Tab Tratamientos Último Tratamiento | 1/1 | Complete    | 2026-05-12 | - |
| 31. Stock Órdenes de Consumo UI | 2/2 | Complete   | 2026-05-13 | - |

---
*Roadmap initialized: 2026-02-23 | v1.0 shipped: 2026-03-03 | v1.1 shipped: 2026-03-16 | v1.2 shipped: 2026-03-31 | v1.3 shipped: 2026-04-09 | v1.4 shipped: 2026-04-20 | v1.5 started: 2026-04-22*
