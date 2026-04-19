# Roadmap: CLINICAL

## Milestones

- ✅ **v1.0 CRM Conversión** — Fases 1–7 (shipped 2026-03-03)
- ✅ **v1.1 Vista del Facturador** — Fases 8–11 (shipped 2026-03-16)
- ✅ **v1.2 AFIP Real** — Fases 12–19 (shipped 2026-03-31)
- ✅ **v1.3 Historial de Consultas** — Fases 20–21 (shipped 2026-04-09)
- 🚧 **v1.4 Flujo de Pacientes** — Fases 22–25 (in progress)
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

### 🚧 v1.4 Flujo de Pacientes (In Progress)

**Milestone Goal:** Clasificar pacientes en flujos independientes (cirugía vs. tratamiento en consultorio) al momento de dar el turno, separando el embudo CRM de la lista de tratamientos para que las estadísticas de conversión no sean distorsionadas por procedimientos de consultorio.

- [x] **Phase 22: Schema Foundation** — Enum FlujoPaciente + Paciente.flujo + TipoTurno.flujoPaciente + migración con backfill SQL + seed 5 TipoTurno + PATCH /pacientes/:id/flujo (completed 2026-04-15)
- [x] **Phase 23: Backend Logic** — Auto-update flujo al crear turno + guards CRM + 5+ queries crm-dashboard filtradas a CIRUGIA (completed 2026-04-16)
- [x] **Phase 24: LiveTurno Banner** — pacienteFlujo en session DTO + ClasificacionBanner + useClasificarFlujo (completed 2026-04-19)
- [ ] **Phase 25: Tratamientos Tab** — useTratamientosMes + TratamientosTab + badge flujo en PacientesDataTable

## Phase Details

### Phase 22: Schema Foundation
**Goal**: El schema expone FlujoPaciente y TipoTurno listos para que toda la lógica de negocio construya sobre ellos, con datos existentes migrados correctamente para que el embudo CRM no se vacíe
**Depends on**: Nothing (first phase of v1.4)
**Requirements**: TIPOS-01, TIPOS-02, FLUJO-06
**Success Criteria** (what must be TRUE):
  1. Los 5 nuevos tipos de turno aparecen en el selector al crear un turno (Consulta para cirugía, Consulta para tratamiento en consultorio, Pre-operatorio, Control, Consulta pendiente)
  2. Los pacientes existentes con historial de cirugía (Turno.esCirugia = true) tienen flujo = CIRUGIA tras la migración; los pacientes con etapaCRM activo también tienen flujo = CIRUGIA
  3. Los pacientes sin historial de cirugía ni etapaCRM activo tienen flujo = null (sin clasificar) tras la migración — no se vacía el kanban CRM
  4. El endpoint PATCH /pacientes/:id/flujo acepta { flujo: 'CIRUGIA' | 'TRATAMIENTO' | 'PENDIENTE' } y persiste el valor correctamente
**Plans**: 3 planes
- [ ] 22-01-PLAN.md — Schema DDL: enum FlujoPaciente + Paciente.flujo + TipoTurno.flujoPaciente + migration.sql
- [ ] 22-02-PLAN.md — Aplicar migración + actualizar seed + TiposTurnoService.findAll()
- [ ] 22-03-PLAN.md — PATCH /pacientes/:id/flujo (DTO + service + controller)

### Phase 23: Backend Logic
**Goal**: El flujo del paciente se actualiza automáticamente al crear turnos clasificatorios, y todas las vistas CRM (kanban, lista de acción, dashboard) muestran únicamente pacientes de cirugía sin romper datos legacy
**Depends on**: Phase 22
**Requirements**: FLUJO-01, FLUJO-02, FLUJO-03, FLUJO-04, CRM-01, CRM-02, CRM-03
**Success Criteria** (what must be TRUE):
  1. Al crear un turno "Consulta para cirugía" para un paciente PENDIENTE, su flujo cambia a CIRUGIA automáticamente; crear el mismo turno para un paciente TRATAMIENTO no cambia su flujo
  2. Al crear un turno "Consulta para tratamiento en consultorio" para un paciente PENDIENTE, su flujo cambia a TRATAMIENTO automáticamente
  3. Al crear un turno "Pre-operatorio" para un paciente PENDIENTE, su flujo cambia a CIRUGIA automáticamente; "Control" y "Consulta pendiente" no modifican el flujo en ningún caso
  4. El kanban CRM muestra pacientes con flujo = CIRUGIA y pacientes legacy (flujo IS NULL con etapaCRM activo); pacientes con flujo = TRATAMIENTO no aparecen
  5. La lista de acción diaria muestra solo pacientes CIRUGIA y legacy con etapaCRM activo; los KPIs del dashboard reflejan solo ese conjunto
**Plans**: 2 planes
- [ ] 23-01-PLAN.md — flujo auto-update step 5.5 en crearTurno() (FLUJO-01–04)
- [ ] 23-02-PLAN.md — filtro CRM en pacientes.service.ts + crm-dashboard.service.ts + crm-metrics.service.ts (CRM-01–03)

### Phase 24: LiveTurno Banner
**Goal**: El profesional puede clasificar pacientes PENDIENTE directamente desde la consulta en vivo, sin interrumpir el flujo de atención
**Depends on**: Phase 23
**Requirements**: LIVT-01, LIVT-02, LIVT-03
**Success Criteria** (what must be TRUE):
  1. Al abrir LiveTurno para un paciente con flujo = PENDIENTE, aparece un banner amber no bloqueante indicando que el paciente debe clasificarse
  2. Al hacer clic en "Cirugía" o "Tratamiento" en el banner, el flujo del paciente queda guardado, el banner desaparece y no vuelve a mostrarse en esa sesión
  3. Al descartar el banner (dismiss), el paciente permanece PENDIENTE y el banner reaparece al abrir LiveTurno en una nueva sesión
  4. Los pacientes con flujo = null (legacy sin clasificar) no muestran el banner en LiveTurno
**Plans**: 2 planes
- [ ] 24-01-PLAN.md — Store extension: pacienteFlujo + bannerDismissed + dismissBanner(); wire flujo into IniciarSesionResponse
- [ ] 24-02-PLAN.md — LiveTurnoFlujoBanner component + mount in LiveTurnoPanel

### Phase 25: Tratamientos Tab
**Goal**: La secretaria y el profesional tienen visibilidad completa de los tratamientos del mes, con navegación por período y filtrado por tipo, y la lista de pacientes muestra el flujo de cada uno de un vistazo
**Depends on**: Phase 23
**Requirements**: FLUJO-05, TRAT-01, TRAT-02, TRAT-03, TRAT-04, TRAT-05, TRAT-06
**Success Criteria** (what must be TRUE):
  1. La página /dashboard/pacientes tiene un tab "Tratamientos" junto a "Embudo" y "Lista"; al hacer clic muestra los turnos del mes actual con flujo TRATAMIENTO
  2. La lista de tratamientos puede navegarse por mes (botones anterior/siguiente) y el total del mes aparece en el header del tab
  3. La lista es filtrable por tipo de turno de tratamiento desde un dropdown; cada fila muestra fecha+hora, paciente (clickable al drawer), tipo de turno y estado
  4. Cada paciente en la tabla general de pacientes muestra un badge de flujo: CIRUGIA (azul), TRATAMIENTO (verde), PENDIENTE (amber), sin clasificar (gris)
**Plans**: TBD

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
| 24. LiveTurno Banner | 2/2 | Complete   | 2026-04-19 | - |
| 25. Tratamientos Tab | v1.4 | 0/TBD | Not started | - |

---
*Roadmap initialized: 2026-02-23 | v1.0 shipped: 2026-03-03 | v1.1 shipped: 2026-03-16 | v1.2 shipped: 2026-03-31 | v1.3 shipped: 2026-04-09 | v1.4 started: 2026-04-15*
