# Roadmap: CLINICAL

## Milestones

- ✅ **v1.0 CRM Conversión** — Fases 1–7 (shipped 2026-03-03)
- ✅ **v1.1 Vista del Facturador** — Fases 8–11 (shipped 2026-03-16)
- ✅ **v1.2 AFIP Real** — Fases 12–19 (shipped 2026-03-31)
- 🚧 **v1.3 Historial de Consultas** — Fases 20–21 (in progress)
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

### 🚧 v1.3 Historial de Consultas (In Progress)

**Milestone Goal:** Expandir el widget "Turnos del día" para que el profesional pueda navegar a cualquier día, ver la agenda completa con métricas, y agregar entradas de HC retroactivas a turnos finalizados usando el mismo formato que LiveTurno.

- [x] **Phase 20: Backend Data Fixes** — Corregir selects de Prisma en turnos.service.ts y agregar soporte de fecha retroactiva en HC (completed 2026-04-02)
- [ ] **Phase 21: Agenda Widget + Modal HC** — Reescribir UpcomingAppointments.tsx con enfoque agenda-first y TurnoHCModal.tsx con formato LiveTurno

## Phase Details

### Phase 20: Backend Data Fixes
**Goal**: Los endpoints de turnos exponen todos los campos que el frontend necesita, y el backend acepta entradas HC con fecha histórica
**Depends on**: Nothing (first phase of v1.3)
**Requirements**: BACK-01, BACK-02, BACK-03
**Success Criteria** (what must be TRUE):
  1. `GET /turnos/agenda` devuelve `diagnostico` y `tratamiento` del paciente en cada turno
  2. `GET /turnos/proximos` devuelve `esCirugia` y `entradaHCId` en cada turno, sin error de compilación Prisma
  3. `POST /pacientes/:id/historia-clinica/entradas` acepta campo `fecha` opcional y la entrada queda registrada con esa fecha en la DB
  4. Intentar crear una entrada HC con fecha futura retorna error de validación (400)
**Plans**: 1 plan
Plans:
- [ ] 20-01-PLAN.md — Fixes quirúrgicos en turnos.service.ts y soporte fecha retroactiva en HC

### Phase 21: Agenda Widget + Modal HC
**Goal**: El profesional puede navegar día a día desde el dashboard, ver la agenda completa con métricas, y agregar entradas HC retroactivas a cualquier turno finalizado
**Depends on**: Phase 20
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, HC-01, HC-02, HC-03
**Success Criteria** (what must be TRUE):
  1. Al abrir el dashboard, el widget muestra los turnos del día actual (todos, no solo futuros)
  2. El profesional puede navegar al día anterior y siguiente con botones de flecha, y la lista de turnos se actualiza
  3. El profesional puede seleccionar cualquier fecha pasada o futura con un selector de calendario y la lista se actualiza
  4. Para el día de hoy y días pasados, el widget muestra métricas del día (total, finalizados, cirugías, ausentes, cancelados)
  5. Cada turno FINALIZADO muestra un botón "Ver HC" que abre un modal con las entradas HC del turno en modo solo-lectura
  6. El modal permite agregar una nueva entrada HC con el selector de tipo (Primera Consulta / Pre Quirúrgico / Control / Práctica) y el formulario correspondiente
  7. La nueva entrada retroactiva queda fechada en el día del turno seleccionado, no en la fecha actual
**Plans**: 3 planes
Plans:
- [ ] 21-01-PLAN.md — Fecha retroactiva en /hc/entries: backend DTO + service + tipo frontend
- [ ] 21-02-PLAN.md — UpcomingAppointments agenda-first: hoy por defecto, nav día-a-día, métricas, Ver HC
- [ ] 21-03-PLAN.md — TurnoHCModal wiring de fecha + checkpoint verificación humana

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
| 21. Agenda Widget + Modal HC | 2/3 | In Progress|  | - |

---
*Roadmap initialized: 2026-02-23 | v1.0 shipped: 2026-03-03 | v1.1 shipped: 2026-03-16 | v1.2 shipped: 2026-03-31 | v1.3 started: 2026-04-02*
