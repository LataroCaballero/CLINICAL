# Roadmap: CLINICAL

## Milestones

- ✅ **v1.0 CRM Conversión** — Fases 1–7 (shipped 2026-03-03)
- ✅ **v1.1 Vista del Facturador** — Fases 8–11 (shipped 2026-03-16)
- ✅ **v1.2 AFIP Real** — Fases 12–19 (shipped 2026-03-31)
- ✅ **v1.3 Historial de Consultas** — Fases 20–21 (shipped 2026-04-09)
- ✅ **v1.4 Flujo de Pacientes** — Fases 22–25 (shipped 2026-04-20)
- ✅ **v1.5 Catálogos Clínicos y Flujos de Atención** — Fases 26–31 (shipped 2026-05-13)
- 🚧 **v1.6 Agenda Operativa** — Fases 32–34 (active)

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

<details>
<summary>✅ v1.5 Catálogos Clínicos y Flujos de Atención (Fases 26–31) — SHIPPED 2026-05-13</summary>

- [x] Phase 26: Schema Foundation + Catalog CRUD (7/7 planes) — completado 2026-04-22
- [x] Phase 27: HC Integration — LiveTurno + PatientDrawer (3/3 planes) — completado 2026-04-23
- [x] Phase 28: Presupuestos Catalog Integration (1/1 plan) — completado 2026-04-29
- [x] Phase 29: PatientDrawer Flujo Action (2/2 planes) — completado 2026-04-30
- [x] Phase 30: Tab Tratamientos Último Tratamiento (1/1 plan) — completado 2026-05-12
- [x] Phase 31: Stock Órdenes de Consumo UI (2/2 planes) — completado 2026-05-13

Full details: `.planning/milestones/v1.5-ROADMAP.md`

</details>

### 🚧 v1.6 Agenda Operativa (Fases 32–34)

- [x] **Phase 32: Schema + Backend Estados Extendidos** — Migración de enum y 3 nuevos endpoints de transición de estado (completed 2026-05-13)
- [ ] **Phase 33: Widget Agenda Operativo** — Columna reordenada, paciente clickeable, menú ⋮ con acciones contextuales, estados visibles
- [ ] **Phase 34: LiveTurno Simplificado** — Sin timer, sin bloqueo, exit sin HC finaliza turno

## Phase Details

### Phase 32: Schema + Backend Estados Extendidos
**Goal**: El backend puede representar el ciclo operativo completo de un turno — desde que el paciente llega (EN_ESPERA) hasta que está siendo atendido (SIENDO_ATENDIDO), más las transiciones de ausente y reactivación
**Depends on**: Phase 31 (v1.5 complete)
**Requirements**: EST-01, EST-02, EST-03, EST-04, EST-05
**Success Criteria** (what must be TRUE):
  1. La base de datos acepta turnos con estado EN_ESPERA y SIENDO_ATENDIDO sin errores de constraint
  2. La secretaria puede llamar PATCH /marcar-en-espera y el turno cambia de PENDIENTE a EN_ESPERA
  3. La secretaria puede llamar PATCH /marcar-ausente y el turno cambia a AUSENTE
  4. La secretaria puede llamar PATCH /reactivar y el turno cambia de AUSENTE a PENDIENTE
  5. Al iniciar sesión en LiveTurno, el turno cambia a SIENDO_ATENDIDO (no CONFIRMADO)
**Plans**: 2 planes
Plans:
- [ ] 32-01-PLAN.md — Migración Prisma: agregar EN_ESPERA y SIENDO_ATENDIDO al enum EstadoTurno
- [ ] 32-02-PLAN.md — Backend state machine (3 endpoints nuevos + fix iniciarSesion) + tipos frontend

### Phase 33: Widget Agenda Operativo
**Goal**: La tabla de agenda es la herramienta de operación diaria: la secretaria ve el estado de cada paciente, puede tomar acciones sin navegar, y puede abrir el perfil del paciente desde el nombre
**Depends on**: Phase 32
**Requirements**: WID-01, WID-02, WID-03, WID-04, WID-05, WID-06
**Success Criteria** (what must be TRUE):
  1. La columna "Tipo de Turno" aparece a la izquierda de "Tratamiento" en la tabla de agenda
  2. Hacer click en el nombre del paciente abre su PatientDrawer sin navegar a otra página
  3. Cada turno activo muestra un botón "Iniciar" y un menú ⋮ al final de la fila
  4. El menú ⋮ ofrece "En espera" y "Ausente" para turnos PENDIENTE/EN_ESPERA, y "Reactivar" para turnos AUSENTE
  5. Los estados EN_ESPERA y SIENDO_ATENDIDO se muestran con etiquetas/badges visibles en la columna Estado
**Plans**: TBD

### Phase 34: LiveTurno Simplificado
**Goal**: Abrir y cerrar una consulta en LiveTurno es sin fricción — sin timer visible, sin bloqueos que requieran fuerza bruta, y salir sin HC registrada es una operación válida que cierra el turno limpiamente
**Depends on**: Phase 33
**Requirements**: LT-01, LT-02, LT-03
**Success Criteria** (what must be TRUE):
  1. El panel de consulta activa no muestra ningún contador de tiempo transcurrido
  2. Intentar iniciar un segundo turno con uno activo muestra un diálogo de confirmación (no un botón gris deshabilitado)
  3. Cerrar o descartar el panel sin guardar HC llama al endpoint cerrar-sesion y el turno queda en estado FINALIZADO

**Plans**: TBD

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
| 27. HC Integration — LiveTurno + PatientDrawer | v1.5 | 3/3 | Complete | 2026-04-23 |
| 28. Presupuestos Catalog Integration | v1.5 | 1/1 | Complete | 2026-04-29 |
| 29. PatientDrawer Flujo Action | v1.5 | 2/2 | Complete | 2026-04-30 |
| 30. Tab Tratamientos Último Tratamiento | v1.5 | 1/1 | Complete | 2026-05-12 |
| 31. Stock Órdenes de Consumo UI | v1.5 | 2/2 | Complete | 2026-05-13 |
| 32. Schema + Backend Estados Extendidos | 2/2 | Complete   | 2026-05-13 | - |
| 33. Widget Agenda Operativo | v1.6 | 0/? | Not started | - |
| 34. LiveTurno Simplificado | v1.6 | 0/? | Not started | - |

---
*Roadmap initialized: 2026-02-23 | v1.0 shipped: 2026-03-03 | v1.1 shipped: 2026-03-16 | v1.2 shipped: 2026-03-31 | v1.3 shipped: 2026-04-09 | v1.4 shipped: 2026-04-20 | v1.5 shipped: 2026-05-13 | v1.6 started: 2026-05-13*
